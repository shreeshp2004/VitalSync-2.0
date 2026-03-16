/* ============================================================
   VITALSYNC — vitals.js
   Simulation-first vitals updater with real WebSocket hook.
   When api.js connects to the backend, real data takes over.
   ============================================================ */
(function () {
  'use strict';

  const VITALS = {
    hr:   { min: 68,  max: 82,  step: 2,   current: 74 },
    spo2: { min: 96,  max: 100, step: 1,   current: 98 },
    hrv:  { min: 45,  max: 65,  step: 2,   current: 54 },
    temp: { min: 36.2, max: 37.4, step: 0.1, current: 36.8 },
    hum:  { min: 42,  max: 68,  step: 2,   current: 55 },
  };

  function randomWalk(v) {
    const delta = (Math.random() * 2 - 1) * v.step;
    v.current = Math.max(v.min, Math.min(v.max, v.current + delta));
    return v.current;
  }

  function fmt(val, d = 0) {
    return d > 0 ? val.toFixed(d) : Math.round(val).toString();
  }

  function updateElements(selector, value, decimals) {
    document.querySelectorAll(selector).forEach(el => {
      el.textContent = fmt(value, decimals);
    });
  }

  function applyVitals(hr, spo2, hrv, temp, hum) {
    updateElements('[data-vital="hr"]',   hr);
    updateElements('[data-vital="spo2"]', spo2);
    updateElements('[data-vital="hrv"]',  hrv);
    updateElements('[data-vital="temp"]', temp, 1);
    updateElements('[data-vital="hum"]',  hum);

    // SpO2 progress bar
    document.querySelectorAll('.spo2-progress').forEach(b => { b.style.width = `${spo2}%`; });

    // HRV status text
    document.querySelectorAll('[data-vital="hrv-status"]').forEach(el => {
      el.textContent = hrv >= 60 ? 'Excellent' : hrv >= 52 ? 'Good' : hrv >= 46 ? 'Fair' : 'Poor';
    });

    // Alert trigger
    if (window.VitalSync?.checkAlert) window.VitalSync.checkAlert(hr);

    // SpO2 ring
    updateSpO2Ring(spo2);
  }

  function tick() {
    applyVitals(
      randomWalk(VITALS.hr),
      randomWalk(VITALS.spo2),
      randomWalk(VITALS.hrv),
      randomWalk(VITALS.temp),
      randomWalk(VITALS.hum)
    );
  }

  function updateSpO2Ring(val) {
    const arc = document.querySelector('.spo2-arc-fill');
    if (!arc) return;
    const r = parseFloat(arc.getAttribute('r') || 54);
    const c = 2 * Math.PI * r;
    arc.style.strokeDasharray  = c;
    arc.style.strokeDashoffset = c * (1 - val / 100);
  }

  /* ── WebSocket Real-Data Handler ─────────────────────────────
   * api.js calls window.vsHandleVitals(data) when live data
   * arrives. If set, simulation is paused.
   ─────────────────────────────────────────────────────────── */
  let usingRealData = false;
  let simInterval   = null;

  window.vsHandleVitals = function (data) {
    if (!usingRealData) {
      usingRealData = true;
      if (simInterval) { clearInterval(simInterval); simInterval = null; }
      console.info('[VitalSync] Switched to live WebSocket data ✅');
    }

    const hr   = data.hr   ?? VITALS.hr.current;
    const spo2 = data.spo2 ?? VITALS.spo2.current;
    const hrv  = data.hrv  ?? VITALS.hrv.current;
    const temp = data.temp ?? VITALS.temp.current;
    const hum  = data.humidity ?? VITALS.hum.current;

    // Sync simulation state so fallback stays realistic if we drop back
    VITALS.hr.current   = hr;
    VITALS.spo2.current = spo2;
    VITALS.hrv.current  = hrv;
    VITALS.temp.current = temp;
    VITALS.hum.current  = hum;

    applyVitals(hr, spo2, hrv, temp, hum);

    // Update live-badge active state
    document.querySelectorAll('.live-badge').forEach(el => el.classList.add('active'));
  };

  window.vsHandleAlert = function (alert) {
    if (window.VitalSync?.showAlert) {
      window.VitalSync.showAlert(alert.title, alert.severity);
    }
  };

  window.vsHandleRisk = function (risk) {
    // Update any risk gauge elements
    document.querySelectorAll('[data-risk-score]').forEach(el => {
      el.textContent = risk.risk_score;
      el.dataset.riskLevel = risk.risk_level;
    });
  };

  window.vsHandleCoach = function (insight) {
    console.info('[VitalSync Coach]', insight.title, '—', insight.body);
  };

  /* ── Start simulation (fallback) ───────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    const hasVitals = document.querySelector('[data-vital]') || document.querySelector('.spo2-arc-fill');
    if (!hasVitals) return;

    tick(); // Initial tick immediately
    simInterval = setInterval(() => {
      if (!usingRealData) tick();  // Only while not on real data
    }, 1200);
  });
})();
