/**
 * ECG signal processing utilities
 * Pan-Tompkins-inspired R-peak detection and HRV calculation from RR intervals
 */
export const ecgProcessor = {
  /**
   * Detect R-peaks in a raw ECG sample array.
   * Uses a simplified threshold + refractory period approach.
   * @param {number[]} samples - Raw ADC values (0–1023)
   * @param {number} fs - Sample rate in Hz (default 100)
   * @returns {number[]} - Indices of detected R-peaks
   */
  detectRPeaks(samples, fs = 100) {
    const refractoryMs = 250; // minimum refractory period (ms)
    const refractorySamples = Math.floor((refractoryMs / 1000) * fs);

    // Step 1: Differentiate and square for QRS enhancement
    const diff = samples.map((v, i) => i > 0 ? (v - samples[i - 1]) ** 2 : 0);

    // Step 2: Moving average (integration window ~150ms)
    const windowSize = Math.floor(0.15 * fs);
    const integrated = diff.map((_, i) => {
      const start = Math.max(0, i - windowSize + 1);
      return diff.slice(start, i + 1).reduce((a, b) => a + b, 0) / (i - start + 1);
    });

    // Step 3: Adaptive threshold (initially 50% of max)
    let threshold = Math.max(...integrated) * 0.5;
    const peaks = [];
    let lastPeakIdx = -refractorySamples;

    for (let i = 1; i < integrated.length - 1; i++) {
      if (
        integrated[i] > threshold &&
        integrated[i] > integrated[i - 1] &&
        integrated[i] > integrated[i + 1] &&
        i - lastPeakIdx >= refractorySamples
      ) {
        peaks.push(i);
        lastPeakIdx = i;
        // Adapt threshold
        threshold = 0.875 * threshold + 0.125 * integrated[i] * 0.5;
      }
    }

    return peaks;
  },

  /**
   * Calculate RR intervals in milliseconds from R-peak sample indices.
   * @param {number[]} peakIndices
   * @param {number} fs - Sample rate in Hz
   * @returns {number[]} - RR intervals in ms
   */
  getRRIntervals(peakIndices, fs = 100) {
    const rr = [];
    for (let i = 1; i < peakIndices.length; i++) {
      rr.push(((peakIndices[i] - peakIndices[i - 1]) / fs) * 1000);
    }
    return rr;
  },

  /**
   * Compute RMSSD (root mean square of successive differences) from RR intervals.
   * @param {number[]} rrIntervals - in ms
   * @returns {number} - RMSSD in ms
   */
  computeRMSSD(rrIntervals) {
    if (rrIntervals.length < 2) return 0;
    const diffs = [];
    for (let i = 1; i < rrIntervals.length; i++) {
      diffs.push((rrIntervals[i] - rrIntervals[i - 1]) ** 2);
    }
    return Math.sqrt(diffs.reduce((a, b) => a + b, 0) / diffs.length);
  },

  /**
   * Estimate heart rate from RR intervals.
   * @param {number[]} rrIntervals - in ms
   * @returns {number} - HR in bpm
   */
  hrFromRR(rrIntervals) {
    const mean = rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length;
    return Math.round(60000 / mean);
  }
};
