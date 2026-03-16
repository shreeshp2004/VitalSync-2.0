/* ============================================================
   VITALSYNC — countup.js
   Animate count-up for elements with data-target attribute
   ============================================================ */
(function () {
  'use strict';

  function easeOutQuad(t) { return t * (2 - t); }

  function countUp(el) {
    const raw = el.dataset.target;
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const isFloat = raw.includes('.');
    const target  = parseFloat(raw.replace(/[^0-9.]/g, ''));
    const duration = 1500;
    const start    = performance.now();

    function step(now) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const val = target * easeOutQuad(t);
      el.textContent = prefix + (isFloat ? val.toFixed(1) : Math.round(val)) + suffix;
      if (t < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          countUp(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    document.querySelectorAll('[data-target]').forEach(el => {
      observer.observe(el);
    });
  });
})();
