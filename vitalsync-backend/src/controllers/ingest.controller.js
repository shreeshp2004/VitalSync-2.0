import { db }              from '../config/db.js';
import { redis }           from '../config/redis.js';
import { io }              from '../socket.js';
import { mlService }       from '../services/mlService.js';
import { agentRunner }     from '../agents/agentRunner.js';
import { physioValidator } from '../utils/physioValidator.js';
import { ecgProcessor }    from '../utils/ecgProcessor.js';
import logger from '../utils/logger.js';

export async function ingest(req, res) {
  const deviceToken = req.headers['x-device-token'];
  if (!deviceToken) return res.status(401).json({ error: 'X-Device-Token header required' });

  const payload = req.body;

  // 1. Authenticate device
  const { rows: deviceRows } = await db.query(
    'SELECT * FROM devices WHERE device_token = $1 AND is_active = true', [deviceToken]
  );
  if (!deviceRows.length) return res.status(401).json({ error: 'Unknown or inactive device' });

  const { id: device_id, user_id } = deviceRows[0];

  // 2. Update device last_seen
  await db.query('UPDATE devices SET last_seen = NOW() WHERE id = $1', [device_id]);

  // 3. Validate physiological ranges
  const valid = physioValidator.check(payload);
  if (!valid.ok) {
    return res.status(422).json({ error: 'Sensor reading out of physiological range', details: valid.errors });
  }

  // 4. Compute derived metrics
  let hrv_rmssd = payload.hrv || 0;
  if (payload.ecg_batch?.length >= 10) {
    const peaks = ecgProcessor.detectRPeaks(payload.ecg_batch);
    const rr    = ecgProcessor.getRRIntervals(peaks);
    if (rr.length >= 2) hrv_rmssd = Math.round(ecgProcessor.computeRMSSD(rr));
  }

  const svm = payload.ax && payload.ay && payload.az
    ? Math.sqrt(payload.ax ** 2 + payload.ay ** 2 + payload.az ** 2)
    : null;

  // 5. Insert into TimescaleDB vitals table
  await db.query(`
    INSERT INTO vitals (time, device_id, user_id, hr, spo2, hrv_rmssd, temp, humidity, accel_x, accel_y, accel_z, svm)
    VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [device_id, user_id, payload.hr, payload.spo2, hrv_rmssd,
      payload.temp, payload.humidity, payload.ax, payload.ay, payload.az, svm]);

  // 6. Bulk insert raw ECG readings
  if (payload.ecg_batch?.length) {
    const n   = payload.ecg_batch.length;
    const vals = payload.ecg_batch
      .map((v, i) => `(NOW() - interval '${(n - i) * 10} milliseconds', '${device_id}', '${user_id}', ${v})`)
      .join(',');
    await db.query(`INSERT INTO ecg_readings (time, device_id, user_id, raw_value) VALUES ${vals}`);
  }

  // 7. Cache latest reading in Redis (TTL 10s)
  await redis.setEx(`latest:${user_id}`, 10, JSON.stringify({ ...payload, hrv_rmssd, svm, ts: Date.now() }));

  // 8. Push live data to WebSocket connected dashboards
  io.to(`user:${user_id}`).emit('vitals', {
    hr: payload.hr, spo2: payload.spo2, hrv: hrv_rmssd,
    temp: payload.temp, humidity: payload.humidity,
    ax: payload.ax, ay: payload.ay, az: payload.az, svm,
    ecg: payload.ecg_batch?.slice(-30) || [],
    ts: Date.now()
  });

  // 9. Publish to Redis pub/sub for AI agent layer
  await redis.publish('vitals:new', JSON.stringify({ user_id, device_id, ...payload, hrv_rmssd, svm }));

  // 10. Fire ML inference + agent dispatch asynchronously
  setImmediate(async () => {
    try {
      const mlResult = await mlService.analyze({ ...payload, hrv_rmssd, svm });
      agentRunner.dispatch(user_id, device_id, { ...payload, hrv_rmssd, svm }, mlResult);
    } catch (err) {
      logger.warn({ err }, 'ML inference failed — continuing without ML results');
    }
  });

  res.json({ ok: true, ts: Date.now() });
}
