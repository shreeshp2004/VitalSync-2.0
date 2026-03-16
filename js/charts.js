/* ============================================================
   VITALSYNC — charts.js
   Chart.js analysis page charts
   ============================================================ */
(function () {
  'use strict';

  const PALETTE = {
    primary:   '#5B5BD6',
    secondary: '#8A8FE8',
    accent:    '#B8BCEF',
    surface:   '#F0D6E8',
    dark:      '#0D0D14',
  };

  /* Shared Chart.js defaults */
  function applyDefaults() {
    if (!window.Chart) return;
    Chart.defaults.font.family = "'DM Sans', sans-serif";
    Chart.defaults.color = 'rgba(13,13,20,0.6)';
    Chart.defaults.plugins.legend.labels.boxWidth = 10;
    Chart.defaults.plugins.legend.labels.padding  = 16;
  }

  /* ── Generate simulated HR & HRV data ── */
  function generateHRData(days) {
    const labels = [];
    const hrData = [];
    const hrvData = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      hrData.push(Math.round(68 + Math.random() * 16));
      hrvData.push(Math.round(44 + Math.random() * 22));
    }
    return { labels, hrData, hrvData };
  }

  /* ── HR Trend Chart ── */
  function initHRChart(canvasId, days) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return;

    const { labels, hrData, hrvData } = generateHRData(days);

    new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Heart Rate (bpm)',
            data: hrData,
            borderColor: PALETTE.primary,
            backgroundColor: 'rgba(91,91,214,0.08)',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: PALETTE.primary,
            borderWidth: 2,
          },
          {
            label: 'HRV Score (ms)',
            data: hrvData,
            borderColor: PALETTE.secondary,
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: PALETTE.secondary,
            borderWidth: 2,
            borderDash: [5, 4],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', align: 'end' },
          tooltip: {
            backgroundColor: PALETTE.dark,
            titleColor: '#fff',
            bodyColor: 'rgba(255,255,255,0.75)',
            padding: 12,
            borderColor: 'rgba(184,188,239,0.2)',
            borderWidth: 1,
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(184,188,239,0.15)' },
            ticks: { maxTicksLimit: 8 },
          },
          y: {
            grid: { color: 'rgba(184,188,239,0.15)' },
            beginAtZero: false,
          },
        },
      },
    });
  }

  /* ── Activity Stacked Bar Chart ── */
  function initActivityChart(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return;

    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Rest',
            data: [40, 50, 35, 45, 30, 60, 55],
            backgroundColor: 'rgba(184,188,239,0.45)',
            stack: 'activity',
            borderRadius: 3,
          },
          {
            label: 'Light',
            data: [25, 20, 30, 25, 35, 15, 20],
            backgroundColor: PALETTE.accent,
            stack: 'activity',
            borderRadius: 3,
          },
          {
            label: 'Moderate',
            data: [20, 15, 25, 20, 25, 12, 18],
            backgroundColor: PALETTE.secondary,
            stack: 'activity',
            borderRadius: 3,
          },
          {
            label: 'Intense',
            data: [15, 10, 10, 10, 10, 8, 7],
            backgroundColor: PALETTE.primary,
            stack: 'activity',
            borderRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            backgroundColor: PALETTE.dark,
            titleColor: '#fff',
            bodyColor: 'rgba(255,255,255,0.75)',
            padding: 10,
          },
        },
        scales: {
          x: { grid: { display: false }, stacked: true },
          y: {
            stacked: true,
            grid: { color: 'rgba(184,188,239,0.15)' },
            ticks: { callback: v => v + ' min' },
          },
        },
      },
    });
  }

  /* ── Time Distribution Doughnut ── */
  function initDoughnutChart(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return;

    new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Training', 'Recovery', 'Sleep', 'Active'],
        datasets: [{
          data: [22, 18, 34, 26],
          backgroundColor: [
            PALETTE.primary,
            PALETTE.secondary,
            PALETTE.accent,
            PALETTE.surface,
          ],
          hoverOffset: 8,
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            backgroundColor: PALETTE.dark,
            bodyColor: 'rgba(255,255,255,0.75)',
            titleColor: '#fff',
            padding: 10,
          },
        },
      },
    });
  }

  /* ── Time range switcher ── */
  const dayMap = { '24h': 1, '7d': 7, '30d': 30, '3m': 90 };
  let hrChartInstance;

  function initRangeSwitcher() {
    const pills = document.querySelectorAll('.range-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        // Could regenerate charts here for the selected range
        // For now just a visual toggle
      });
    });

    // Set first pill active
    if (pills.length) pills[0].classList.add('active');
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyDefaults();
    initHRChart('hr-chart', 14);
    initActivityChart('activity-chart');
    initDoughnutChart('donut-chart');
    initRangeSwitcher();
  });
})();
