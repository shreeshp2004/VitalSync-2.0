import { db }    from '../config/db.js';
import { io }    from '../socket.js';
import logger from '../utils/logger.js';

async function storeAlert(alertData) {
  const { user_id, device_id, type, severity, title, body, data } = alertData;
  return db.query(`
    INSERT INTO alerts (user_id, device_id, type, severity, title, body, data, triggered_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING id
  `, [user_id, device_id, type, severity, title, body, JSON.stringify(data || {})]);
}

export class ECGWatchAgent {
  name = 'ECGWatchAgent';
  #history = new Map();  // user_id → [{ classification, ts }]

  async evaluate({ user_id, device_id, ml }) {
    if (!ml?.ecg?.is_anomaly) return;

    const { classification, confidence } = ml.ecg;
    const history = this.#history.get(user_id) || [];
    history.push({ classification, ts: Date.now() });
    if (history.length > 10) history.shift();
    this.#history.set(user_id, history);

    // Require 3 anomalies in 15s before alerting (debounce)
    const recentAnomalies = history.filter(h => h.ts > Date.now() - 15_000 && h.classification !== 'normal');
    if (recentAnomalies.length < 3) return;

    const severity = confidence > 0.92 ? 'critical' : 'warning';
    const alert = {
      user_id, device_id,
      type: 'arrhythmia', severity,
      title: `ECG anomaly: ${classification}`,
      body: `Confidence ${(confidence * 100).toFixed(0)}%. Sustained for ~15s. Check your cardiac rhythm.`,
      data: { classification, confidence }
    };

    await storeAlert(alert);
    io.to(`user:${user_id}`).emit('alert', alert);
    logger.info({ agent: this.name, user_id, classification, confidence }, 'ECG alert fired');
  }
}

export class FallDetectAgent {
  name = 'FallDetectAgent';
  #lastFall = new Map();

  async evaluate({ user_id, device_id, ml, ax, ay, az }) {
    if (!ml?.fall?.fall_detected) return;
    const last = this.#lastFall.get(user_id) || 0;
    if (Date.now() - last < 30_000) return;
    this.#lastFall.set(user_id, Date.now());

    const { severity, svm } = ml.fall;
    const alert = {
      user_id, device_id,
      type: 'fall', severity: severity === 'high' ? 'critical' : 'warning',
      title: `Fall detected (${severity} impact)`,
      body: `Impact: ${svm?.toFixed(2)}g. Seek help if injured.`,
      data: { svm, ax, ay, az }
    };

    await storeAlert(alert);
    io.to(`user:${user_id}`).emit('alert', alert);
    logger.info({ agent: this.name, user_id, svm }, 'Fall alert fired');
  }
}

export class HRVCoachAgent {
  name = 'HRVCoachAgent';
  #lastAdvice = new Map();

  async evaluate({ user_id, device_id, ml }) {
    if (!ml?.hrv) return;
    const last = this.#lastAdvice.get(user_id) || 0;
    if (Date.now() - last < 5 * 60_000) return;
    this.#lastAdvice.set(user_id, Date.now());

    const { recovery_score, recovery_interpretation, training_recommendation, rmssd, stress_index } = ml.hrv;
    if (recovery_interpretation === 'good' || recovery_interpretation === 'excellent') return;

    const alert = {
      user_id, device_id,
      type: 'hrv_advice',
      severity: recovery_score < 30 ? 'warning' : 'info',
      title: `Recovery: ${recovery_interpretation} (${recovery_score}/100)`,
      body: training_recommendation,
      data: { recovery_score, rmssd, stress_index }
    };

    await storeAlert(alert);
    io.to(`user:${user_id}`).emit('coach_insight', alert);
  }
}

export class EnvironmentAgent {
  name = 'EnvironmentAgent';
  #cooldown = new Map();

  async evaluate({ user_id, device_id, temp, humidity }) {
    if (!temp || !humidity) return;
    const last = this.#cooldown.get(user_id) || 0;
    if (Date.now() - last < 10 * 60_000) return;

    const hi = -8.78469 + 1.61139 * temp + 2.3385 * humidity
             - 0.14611 * temp * humidity - 0.012308 * temp ** 2
             - 0.01643 * humidity ** 2 + 0.002211 * temp ** 2 * humidity;

    let alertData = null;
    if (hi > 54)       alertData = { severity: 'critical', title: 'Extreme heat danger',    body: `Heat index: ${hi.toFixed(0)}°C. Stop activity immediately.` };
    else if (hi > 41)  alertData = { severity: 'warning',  title: 'Heat exhaustion risk',   body: `Heat index: ${hi.toFixed(0)}°C. Reduce intensity and hydrate.` };
    else if (temp > 30 && humidity > 75) alertData = { severity: 'info', title: 'High humidity fatigue risk', body: 'High humidity is limiting cooling ability.' };

    if (!alertData) return;
    this.#cooldown.set(user_id, Date.now());

    const alert = { user_id, device_id, type: 'heat_stress', ...alertData, data: { temp, humidity, hi: hi.toFixed(1) } };
    await storeAlert(alert);
    io.to(`user:${user_id}`).emit('alert', alert);
  }
}

export class RiskScorerAgent {
  name = 'RiskScorerAgent';

  async evaluate({ user_id, device_id, ml }) {
    if (!ml?.risk) return;
    const { risk_score, risk_level, flags } = ml.risk;

    io.to(`user:${user_id}`).emit('risk_update', { risk_score, risk_level, flags });

    if (risk_level === 'high') {
      await storeAlert({
        user_id, device_id,
        type: 'high_risk', severity: 'warning',
        title: `High risk score: ${risk_score}/100`,
        body: `Active flags: ${flags?.join(', ')}`,
        data: { risk_score, risk_level, flags }
      });
    }
  }
}

export class TrendAnalystAgent {
  name = 'TrendAnalystAgent';

  async evaluate() {} // Not triggered by real-time stream

  async runNightly() {
    const { rows: users } = await db.query("SELECT id, email, name FROM users WHERE role = 'athlete'");
    for (const user of users) {
      try {
        const { rows } = await db.query(`
          SELECT
            COUNT(*)::int                       AS session_count,
            ROUND(AVG(avg_hr))::int             AS avg_hr,
            ROUND(AVG(avg_hrv_rmssd)::numeric,1) AS avg_hrv,
            ROUND(AVG(recovery_score))::int     AS avg_recovery,
            MAX(max_hr)::int                    AS peak_hr,
            SUM(duration_mins)::int             AS total_active_mins
          FROM sessions
          WHERE user_id = $1 AND started_at > NOW() - interval '7 days'
        `, [user.id]);

        const data = rows[0];
        if (!data.session_count) continue;

        logger.info({ agent: this.name, user_id: user.id }, 'Nightly trend report generated');
      } catch (err) {
        logger.error({ agent: this.name, user_id: user.id, err }, 'Nightly report failed');
      }
    }
  }
}
