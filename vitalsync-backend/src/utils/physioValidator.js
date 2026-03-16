/**
 * Validates that incoming sensor readings fall within physiological ranges.
 * Rejects garbage data from faulty sensors or transmission errors.
 */
export const physioValidator = {
  RANGES: {
    hr:       { min: 30,   max: 220,  name: 'Heart Rate (bpm)' },
    spo2:     { min: 50,   max: 100,  name: 'SpO₂ (%)' },
    hrv:      { min: 0,    max: 300,  name: 'HRV RMSSD (ms)' },
    temp:     { min: 20,   max: 50,   name: 'Temperature (°C)' },
    humidity: { min: 0,    max: 100,  name: 'Humidity (%)' },
    ax:       { min: -20,  max: 20,   name: 'Accel X (g)' },
    ay:       { min: -20,  max: 20,   name: 'Accel Y (g)' },
    az:       { min: -20,  max: 20,   name: 'Accel Z (g)' },
  },

  check(payload) {
    const errors = [];
    for (const [field, range] of Object.entries(this.RANGES)) {
      if (payload[field] === undefined || payload[field] === null) continue; // optional field
      const v = Number(payload[field]);
      if (isNaN(v) || v < range.min || v > range.max) {
        errors.push(`${range.name} out of range: ${payload[field]} (expected ${range.min}–${range.max})`);
      }
    }
    return { ok: errors.length === 0, errors };
  }
};
