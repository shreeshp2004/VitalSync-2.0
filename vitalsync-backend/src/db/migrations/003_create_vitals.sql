-- Migration 003: Vitals hypertable (TimescaleDB)
CREATE TABLE IF NOT EXISTS vitals (
  time        TIMESTAMPTZ NOT NULL,
  device_id   UUID NOT NULL REFERENCES devices(id),
  user_id     UUID NOT NULL REFERENCES users(id),
  hr          SMALLINT,
  spo2        NUMERIC(4,1),
  hrv_rmssd   NUMERIC(6,2),
  hrv_sdnn    NUMERIC(6,2),
  temp        NUMERIC(4,1),
  humidity    NUMERIC(4,1),
  accel_x     NUMERIC(7,4),
  accel_y     NUMERIC(7,4),
  accel_z     NUMERIC(7,4),
  svm         NUMERIC(7,4),
  activity    VARCHAR(20),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('vitals', 'time', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_vitals_user_time   ON vitals (user_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_vitals_device_time ON vitals (device_id, time DESC);

-- Compress chunks older than 7 days
SELECT add_compression_policy('vitals', INTERVAL '7 days', if_not_exists => TRUE);
