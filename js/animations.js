/* ============================================================
   VITALSYNC — animations.js
   IntersectionObserver scroll animations with stagger
   ============================================================ */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = el.dataset.delay || 0;
          setTimeout(() => el.classList.add('visible'), parseInt(delay));
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.12 });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
      observer.observe(el);
    });
  });
})();
