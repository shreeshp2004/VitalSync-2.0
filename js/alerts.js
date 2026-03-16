/* ============================================================
   VITALSYNC — alerts.js
   Slide-up alert ribbon when HR > 110 or fall detected
   ============================================================ */
(function () {
  'use strict';

  let dismissTimer;
  let ribbonVisible = false;
  const COOLDOWN = 8000;  // ms before it can alert again
  let lastAlertTime = 0;

  function getOrCreateRibbon() {
    let ribbon = document.getElementById('alert-ribbon');
    if (!ribbon) {
      ribbon = document.createElement('div');
      ribbon.id = 'alert-ribbon';
      ribbon.className = 'alert-ribbon';
      ribbon.setAttribute('role', 'alert');
      ribbon.setAttribute('aria-live', 'assertive');
      ribbon.innerHTML = `
        <div class="alert-ribbon-msg">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          </svg>
          <span class="alert-ribbon-text">⚠ Elevated heart rate detected — <strong><span id="alert-hr">--</span> bpm</strong></span>
        </div>
        <button class="alert-ribbon-dismiss" id="alert-dismiss" aria-label="Dismiss alert">Dismiss</button>
      `;
      document.body.appendChild(ribbon);

      document.getElementById('alert-dismiss').addEventListener('click', hideAlert);
    }
    return ribbon;
  }

  function showAlert(hr) {
    const ribbon = getOrCreateRibbon();
    const hrEl = document.getElementById('alert-hr');
    if (hrEl) hrEl.textContent = hr;
    ribbon.classList.add('show');
    ribbonVisible = true;
    clearTimeout(dismissTimer);
    dismissTimer = setTimeout(hideAlert, 5000);
  }

  function hideAlert() {
    const ribbon = document.getElementById('alert-ribbon');
    if (ribbon) ribbon.classList.remove('show');
    ribbonVisible = false;
  }

  function checkAlert(hr) {
    const now = Date.now();
    if (hr > 110 && !ribbonVisible && (now - lastAlertTime > COOLDOWN)) {
      lastAlertTime = now;
      showAlert(Math.round(hr));
    }
  }

  window.VitalSync = window.VitalSync || {};
  window.VitalSync.checkAlert = checkAlert;
  window.VitalSync.showAlert  = showAlert;
  window.VitalSync.hideAlert  = hideAlert;
})();
