/* ============================================================
   VITALSYNC — ecg.js
   Realistic P-QRS-T scrolling ECG waveform on <canvas>
   ============================================================ */
(function () {
  'use strict';

  /* Build one full P-QRS-T cycle as an array of [x_offset, y_norm] points.
     y_norm: 0 = baseline (center), +1 = max up, -1 = max down.
     x values are normalised to a cycle width of 1 (0→1). */
  function buildECGCycle() {
    const pts = [];

    function addSegment(x0, y0, x1, y1, steps) {
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
      }
    }

    function addCubic(x0, y0, cx1, cy1, cx2, cy2, x1, y1, steps) {
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const mt = 1 - t;
        const x = mt*mt*mt*x0 + 3*mt*mt*t*cx1 + 3*mt*t*t*cx2 + t*t*t*x1;
        const y = mt*mt*mt*y0 + 3*mt*mt*t*cy1 + 3*mt*t*t*cy2 + t*t*t*y1;
        pts.push([x, y]);
      }
    }

    // ─ Baseline before P wave ─
    addSegment(0.00, 0, 0.08, 0, 6);
    // ─ P wave (small bump) ─
    addCubic(0.08, 0,  0.11, -0.28, 0.14, -0.28,  0.17, -0.28, 8);
    addCubic(0.17, -0.28,  0.20, -0.28, 0.23, 0,  0.26, 0, 8);
    // ─ PR interval baseline ─
    addSegment(0.26, 0, 0.34, 0, 6);
    // ─ Q dip ─
    addCubic(0.34, 0,  0.36, 0.18,  0.37, 0.22,  0.38, 0.22, 6);
    addCubic(0.38, 0.22, 0.39, 0.22, 0.40, 0,  0.41, 0, 4);
    // ─ R spike (tall narrow) ─
    addCubic(0.41, 0,  0.42, -0.9, 0.43, -1.0,  0.445, -1.0, 5);
    addCubic(0.445, -1.0,  0.46, -1.0, 0.47, 0,  0.48, 0, 5);
    // ─ S dip ─
    addCubic(0.48, 0,  0.49, 0.30, 0.50, 0.35,  0.51, 0.35, 4);
    addCubic(0.51, 0.35,  0.52, 0.35, 0.53, 0,  0.55, 0, 4);
    // ─ ST segment ─
    addSegment(0.55, 0, 0.60, 0, 4);
    // ─ T wave ─
    addCubic(0.60, 0,  0.63, -0.35, 0.68, -0.42,  0.72, -0.42, 8);
    addCubic(0.72, -0.42,  0.76, -0.42, 0.80, 0,  0.83, 0, 8);
    // ─ End baseline ─
    addSegment(0.83, 0, 1.00, 0, 8);

    return pts;
  }

  const ECG_CYCLE = buildECGCycle();

  /* Render a normalised ECG sample for scrolling use.
     Returns y pixel value given a position 0→1 in the cycle. */
  function sampleECG(pos) {
    const t = ((pos % 1) + 1) % 1;   // wrap 0→1
    const n = ECG_CYCLE.length;
    const idx = Math.floor(t * (n - 1));
    const nxt = Math.min(idx + 1, n - 1);
    const frac = (t * (n - 1)) - idx;
    const y = ECG_CYCLE[idx][1] * (1 - frac) + ECG_CYCLE[nxt][1] * frac;
    return y;
  }

  /* Initialise all canvases with class="ecg-canvas" */
  function initECGCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    const color = canvas.dataset.color || '#5B5BD6';
    const lineWidth = parseFloat(canvas.dataset.linewidth) || 1.5;
    const speedPx = parseFloat(canvas.dataset.speed) || 2.5;   // px per frame

    let width, height, buffer, bufCtx, offset = 0;
    let animId;

    function resize() {
      width  = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width  = width;
      canvas.height = height;

      // off-screen buffer
      buffer = document.createElement('canvas');
      buffer.width  = width;
      buffer.height = height;
      bufCtx = buffer.getContext('2d');
    }

    function draw() {
      if (!bufCtx) return;

      const amplitude = height * 0.38;
      const midY      = height * 0.52;
      const cycleW    = width * 0.42;   // how many px per ECG cycle

      // scroll buffer left by speedPx
      ctx.clearRect(0, 0, width, height);
      bufCtx.clearRect(0, 0, width, height);

      // draw new line at right edge into buffer
      bufCtx.strokeStyle = color;
      bufCtx.lineWidth   = lineWidth;
      bufCtx.lineJoin    = 'round';
      bufCtx.lineCap     = 'round';
      bufCtx.shadowColor = color;
      bufCtx.shadowBlur  = 4;
      bufCtx.beginPath();

      for (let x = 0; x < width; x++) {
        const pos = (offset + x) / cycleW;
        const ySample = sampleECG(pos);
        const y = midY + ySample * amplitude;
        x === 0 ? bufCtx.moveTo(x, y) : bufCtx.lineTo(x, y);
      }

      bufCtx.stroke();

      // blit onto visible canvas
      ctx.drawImage(buffer, 0, 0);

      offset += speedPx;
      if (offset > cycleW * 1000) offset = 0;  // prevent overflow

      animId = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });
    draw();

    // expose stop/start
    canvas._ecgStop  = () => { cancelAnimationFrame(animId); };
    canvas._ecgStart = () => { draw(); };
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.ecg-canvas').forEach(initECGCanvas);
  });

  // Expose for external use
  window.VitalSync = window.VitalSync || {};
  window.VitalSync.sampleECG = sampleECG;
  window.VitalSync.initECGCanvas = initECGCanvas;
})();
