-- Migration 002: Devices table
CREATE TABLE IF NOT EXISTS devices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  device_token  VARCHAR(64) UNIQUE NOT NULL,
  name          VARCHAR(100) DEFAULT 'VitalSync v1',
  mac_address   VARCHAR(17),
  firmware_ver  VARCHAR(20),
  last_seen     TIMESTAMPTZ,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_user ON devices (user_id);
CREATE INDEX IF NOT EXISTS idx_devices_token ON devices (device_token);
