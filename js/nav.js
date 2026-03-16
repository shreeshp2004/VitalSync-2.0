/* ============================================================
   VITALSYNC — nav.js
   Hamburger toggle · Mobile overlay · Scroll effect
   ============================================================ */
(function () {
  'use strict';

  function initNav() {
    const navbar     = document.querySelector('.navbar');
    const hamburger  = document.querySelector('.nav-hamburger');
    const overlay    = document.querySelector('.nav-overlay');
    const overlayLinks = document.querySelectorAll('.nav-overlay-links a');

    if (!navbar) return;

    /* ── Scroll behaviour ── */
    function handleScroll() {
      if (window.scrollY > 20) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    /* ── Hamburger toggle ── */
    if (hamburger && overlay) {
      hamburger.addEventListener('click', () => toggleMenu());
      hamburger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMenu(); }
      });

      /* Keyboard close */
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('open')) closeMenu();
      });

      /* Stagger delays on overlay links */
      overlayLinks.forEach((link, i) => {
        link.style.transitionDelay = `${i * 55}ms`;
      });
    }

    function toggleMenu() {
      const isOpen = overlay.classList.contains('open');
      isOpen ? closeMenu() : openMenu();
    }

    function openMenu() {
      overlay.classList.add('open');
      hamburger.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      overlay.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    /* Close when clicking an overlay link */
    overlayLinks.forEach(link => {
      link.addEventListener('click', closeMenu);
    });

    const overlayCta = document.querySelector('.btn-overlay-cta');
    if (overlayCta) overlayCta.addEventListener('click', closeMenu);

    /* ── Active link highlighting ── */
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const allNavLinks = document.querySelectorAll('.nav-links a, .nav-overlay-links a');

    allNavLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPage || (currentPage === '' && href === 'index.html')) {
        link.classList.add('active');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', initNav);
})();
