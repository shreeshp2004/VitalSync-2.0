import logger from '../utils/logger.js';

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

async function post(path, body) {
  try {
    const res = await fetch(`${ML_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000) // 3s timeout
    });
    if (!res.ok) throw new Error(`ML service error: ${res.status}`);
    return res.json();
  } catch (err) {
    logger.warn({ err, path }, 'ML service call failed');
    return null;
  }
}

export const mlService = {
  async analyze(payload) {
    const [ecg, fall, hrv, risk] = await Promise.all([
      payload.ecg_batch?.length >= 10
        ? post('/predict/ecg', { samples: payload.ecg_batch })
        : null,

      payload.ax !== undefined
        ? post('/predict/fall', { accel_x: payload.ax, accel_y: payload.ay, accel_z: payload.az })
        : null,

      payload.hrv_rmssd
        ? post('/analyze/hrv', { rmssd: payload.hrv_rmssd, hr: payload.hr })
        : null,

      post('/score/risk', {
        hr: payload.hr, spo2: payload.spo2, hrv_rmssd: payload.hrv_rmssd,
        temp: payload.temp, humidity: payload.humidity, svm: payload.svm
      })
    ]);

    return { ecg, fall, hrv, risk };
  }
};
