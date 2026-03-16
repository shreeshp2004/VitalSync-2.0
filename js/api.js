/* ============================================================
   VITALSYNC — api.js
   REST API wrapper + WebSocket setup for real backend connection
   ============================================================ */
(function (global) {
  'use strict';

  /* ── Config ────────────────────────────────────────────────
   * The API base URL is read from localStorage so it can be
   * set at runtime without re-deploying the frontend.
   *
   * To activate real backend:
   *   localStorage.setItem('vs_api_url', 'http://localhost:3001');
   *   localStorage.setItem('vs_access_token', '<your JWT token>');
   *   Then refresh the page.
   */
  const API_URL    = localStorage.getItem('vs_api_url')   || '';
  const TOKEN      = localStorage.getItem('vs_access_token') || '';

  const headers = () => ({
    'Content-Type': 'application/json',
    ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {})
  });

  const VitalSyncAPI = {
    baseUrl: API_URL,
    token:   TOKEN,
    isConfigured: !!API_URL && !!TOKEN,

    async request(method, path, body) {
      if (!this.isConfigured) return null;
      try {
        const res = await fetch(`${this.baseUrl}${path}`, {
          method,
          headers: headers(),
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(5000)
        });
        if (!res.ok) throw new Error(`API ${res.status}`);
        return res.json();
      } catch (err) {
        console.warn('[VitalSyncAPI] Request failed:', path, err.message);
        return null;
      }
    },

    /* Auth */
    async login(email, password) {
      const data = await this.request('POST', '/api/auth/login', { email, password });
      if (data?.accessToken) {
        localStorage.setItem('vs_access_token', data.accessToken);
        localStorage.setItem('vs_refresh_token', data.refreshToken);
        this.token = data.accessToken;
        this.isConfigured = true;
      }
      return data;
    },

    /* Vitals */
    async getLatestVitals() {
      return this.request('GET', '/api/vitals/latest');
    },

    async getHistory(range = '24h') {
      return this.request('GET', `/api/vitals/history?range=${range}`);
    },

    /* Analysis */
    async getSummary(range = '24h') {
      return this.request('GET', `/api/analysis/summary?range=${range}`);
    },

    async getTrends(range = '7d') {
      return this.request('GET', `/api/analysis/trends?range=${range}`);
    },

    /* Alerts */
    async getAlerts() {
      return this.request('GET', '/api/alerts');
    }
  };

  /* Expose globally */
  global.VitalSyncAPI = VitalSyncAPI;

  /* ── WebSocket Setup ─────────────────────────────────────── */
  let socketConnected = false;

  function tryWebSocket() {
    if (!API_URL || !TOKEN) return;
    if (typeof io === 'undefined') return;   // Socket.io CDN not loaded

    const socket = io(API_URL, {
      auth: { token: TOKEN },
      transports: ['websocket'],
      timeout: 3000,
      reconnectionAttempts: 2
    });

    socket.on('connect', () => {
      socketConnected = true;
      console.log('[VitalSync] WebSocket connected — using live data');
      document.querySelectorAll('.live-badge').forEach(el => el.classList.add('active'));
      // Signal to vitals.js that real data is coming
      global.vsSocketReady = socket;
    });

    socket.on('vitals', (data) => {
      if (typeof global.vsHandleVitals === 'function') global.vsHandleVitals(data);
    });

    socket.on('alert', (alert) => {
      if (typeof global.vsHandleAlert === 'function') global.vsHandleAlert(alert);
    });

    socket.on('risk_update', (risk) => {
      if (typeof global.vsHandleRisk === 'function') global.vsHandleRisk(risk);
    });

    socket.on('coach_insight', (insight) => {
      if (typeof global.vsHandleCoach === 'function') global.vsHandleCoach(insight);
    });

    socket.on('connect_error', () => {
      if (!socketConnected) {
        console.info('[VitalSync] WebSocket unavailable — using simulation mode');
      }
    });
  }

  /* Try to connect after DOM ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryWebSocket);
  } else {
    tryWebSocket();
  }

})(window);
