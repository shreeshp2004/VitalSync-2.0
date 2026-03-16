-- Migration 004: ECG raw readings hypertable
CREATE TABLE IF NOT EXISTS ecg_readings (
  time      TIMESTAMPTZ NOT NULL,
  device_id UUID NOT NULL REFERENCES devices(id),
  user_id   UUID NOT NULL REFERENCES users(id),
  raw_value SMALLINT NOT NULL,
  filtered  NUMERIC(7,4),
  rr_ms     SMALLINT
);

SELECT create_hypertable('ecg_readings', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_ecg_user_time ON ecg_readings (user_id, time DESC);
SELECT add_compression_policy('ecg_readings', INTERVAL '3 days', if_not_exists => TRUE);

-- Migration 005: Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  device_id     UUID REFERENCES devices(id),
  type          VARCHAR(50) NOT NULL,
  severity      VARCHAR(20) NOT NULL CHECK (severity IN ('info','warning','critical')),
  title         VARCHAR(200) NOT NULL,
  body          TEXT,
  data          JSONB,
  is_read       BOOLEAN DEFAULT false,
  triggered_at  TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts (user_id, triggered_at DESC);

-- Migration 006: Training sessions
CREATE TABLE IF NOT EXISTS sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id),
  device_id       UUID REFERENCES devices(id),
  started_at      TIMESTAMPTZ NOT NULL,
  ended_at        TIMESTAMPTZ,
  duration_mins   SMALLINT,
  avg_hr          SMALLINT,
  max_hr          SMALLINT,
  min_hr          SMALLINT,
  avg_spo2        NUMERIC(4,1),
  avg_hrv_rmssd   NUMERIC(6,2),
  recovery_score  SMALLINT,
  stress_index    SMALLINT,
  activity_type   VARCHAR(50),
  alert_count     SMALLINT DEFAULT 0,
  summary_json    JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id, started_at DESC);
