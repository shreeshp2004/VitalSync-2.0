/* ============================================================
   VITALSYNC — chatbot.js
   Smart floating FAQ chatbot with VitalSync knowledge base
   ============================================================ */
(function () {
  'use strict';

  /* ── Knowledge Base ─────────────────────────────────────────
   * Each entry: { keywords: [], response: string (HTML ok), chips?: [] }
   * Keywords are matched against lowercased, tokenized user input.
   * The entry with the most keyword hits wins.
   ─────────────────────────────────────────────────────────── */
  const KB = [
    // ── Project overview ──────────────────────────────────────
    {
      keywords: ['what', 'is', 'vitalsync', 'about', 'overview', 'project', 'intro'],
      response: `VitalSync is an IoT-powered wearable health monitoring system for athletes. It uses an <strong>ESP8266 microcontroller</strong> with three sensors — <strong>AD8232 ECG</strong>, <strong>ADXL345 accelerometer</strong>, and <strong>DHT11 temperature/humidity</strong> — to stream real-time vitals to a cloud dashboard with AI analysis.`,
      chips: ['What sensors?', 'How does it work?', 'Who is it for?']
    },
    // ── Hardware ──────────────────────────────────────────────
    {
      keywords: ['sensor', 'sensors', 'hardware', 'device', 'wearable', 'components'],
      response: `VitalSync uses <strong>3 sensors + 1 microcontroller</strong>:<br><br>
• <strong>ESP8266</strong> — WiFi microcontroller, sends data to cloud<br>
• <strong>AD8232</strong> — ECG / cardiac electrical signal capture<br>
• <strong>ADXL345</strong> — 3-axis accelerometer for movement & fall detection<br>
• <strong>DHT11</strong> — ambient temperature & humidity<br>
• <strong>SSD1306</strong> — small OLED display for local readings`,
      chips: ['Tell me about ECG', 'What is ADXL345?', 'DHT11 accuracy?']
    },
    {
      keywords: ['esp8266', 'nodemcu', 'microcontroller', 'wifi', 'wireless'],
      response: `The <strong>ESP8266 NodeMCU</strong> is the brain of VitalSync. It reads all sensors, computes a basic HR estimate, and <strong>POSTs data to the cloud API every 250ms</strong> via HTTPS — sending 25 raw ECG samples per batch. It costs ~$3 and runs on a Li-Po battery for 8–12 hours.`,
      chips: ['What is the API?', 'Battery life?', 'How to flash firmware?']
    },
    {
      keywords: ['ad8232', 'ecg', 'electrocardiogram', 'cardiac', 'heart', 'rhythm', 'electrical'],
      response: `The <strong>AD8232</strong> captures the heart's electrical activity via chest electrodes. VitalSync samples it at <strong>100Hz</strong>, applies a 0.5–40Hz bandpass filter on the server, runs <strong>Pan-Tompkins R-peak detection</strong>, and feeds the cleaned signal to a 1D-CNN for arrhythmia classification.`,
      chips: ['What is arrhythmia?', 'ECG accuracy?', 'What is HRV?']
    },
    {
      keywords: ['adxl345', 'accelerometer', 'accel', 'movement', 'motion', 'fall', 'impact'],
      response: `The <strong>ADXL345</strong> measures 3-axis acceleration (X, Y, Z). VitalSync computes the <strong>Scalar Vector Magnitude (SVM = √(ax²+ay²+az²))</strong> to detect falls. A threshold of 2.5g triggers the <strong>FallDetectAgent</strong>, which uses an SVM classifier for confirmation before sending an alert.`,
      chips: ['How does fall detection work?', 'What is SVM?', 'AI agents?']
    },
    {
      keywords: ['dht11', 'temperature', 'humidity', 'temp', 'heat', 'environment'],
      response: `The <strong>DHT11</strong> measures ambient temperature (0–50°C, ±2°C) and humidity (20–80%, ±5%). VitalSync uses this to compute the <strong>Steadman heat index</strong> — when it exceeds 41°C equivalent, the EnvironmentAgent fires a heat exhaustion alert.`,
      chips: ['Heat index formula?', 'Environment alerts?', 'Accuracy?']
    },
    // ── Vitals & metrics ──────────────────────────────────────
    {
      keywords: ['hrv', 'heart', 'rate', 'variability', 'rmssd', 'sdnn'],
      response: `<strong>HRV (Heart Rate Variability)</strong> measures the variation in time between heartbeats. VitalSync computes <strong>RMSSD</strong> (Root Mean Square of Successive Differences) from RR intervals detected in the ECG signal.<br><br>Higher RMSSD = better recovery and parasympathetic activity. Elite athletes often have RMSSD > 70ms. <strong>Recovery scores</strong> are mapped 0–100 from RMSSD ranges.`,
      chips: ['Recovery score?', 'Stress index?', 'Training advice?']
    },
    {
      keywords: ['spo2', 'oxygen', 'saturation', 'pulse', 'oximeter'],
      response: `SpO₂ is blood oxygen saturation. Normal range is <strong>95–100%</strong>. Below 94% is flagged as low and triggers a <strong>"low_spo2" risk flag</strong> in the RiskScorerAgent. VitalSync currently uses a placeholder value (98%) — a <strong>MAX30102</strong> pulse oximeter module will be added in Phase 3 to measure this directly.`,
      chips: ['Risk scoring?', 'Phase 3 features?', 'Sensors?']
    },
    {
      keywords: ['recovery', 'score', 'readiness', 'training', 'recommendation'],
      response: `The <strong>Recovery Score (0–100)</strong> is computed by the Python ML service from your RMSSD:<br><br>
• <strong>0–30:</strong> Poor — rest day strongly recommended<br>
• <strong>30–60:</strong> Fair — light activity only<br>
• <strong>60–85:</strong> Good — moderate training<br>
• <strong>85–100:</strong> Excellent — high-intensity training ready<br><br>
The <strong>HRVCoachAgent</strong> proactively pushes coaching advice every 5 minutes when recovery is below "good".`,
      chips: ['HRV Coach Agent?', 'Stress index?', 'AI agents?']
    },
    {
      keywords: ['stress', 'index', 'baevsky', 'strain'],
      response: `The <strong>Stress Index</strong> uses the Baevsky formula: <code>SI = AMo / (2 × Mo × MxDMn)</code>, computed from the RR interval histogram. A high stress index (>100) indicates high autonomic strain — the body is working harder than normal even at rest.`,
      chips: ['What is HRV?', 'Recovery score?', 'Training advice?']
    },
    // ── AI & ML ───────────────────────────────────────────────
    {
      keywords: ['ai', 'ml', 'machine', 'learning', 'model', 'intelligence', 'artificial'],
      response: `VitalSync has <strong>4 ML models</strong> running in a Python FastAPI service:<br><br>
1. <strong>1D-CNN</strong> — ECG arrhythmia classification (5 classes)<br>
2. <strong>SVM</strong> — Fall detection from accelerometer windows<br>
3. <strong>HRV scorer</strong> — Recovery score from RMSSD<br>
4. <strong>XGBoost risk model</strong> — Aggregate risk score from all signals<br><br>
Plus <strong>Claude AI</strong> generates natural-language weekly health summaries.`,
      chips: ['AI agents?', 'Arrhythmia detection?', 'Risk scoring?']
    },
    {
      keywords: ['agent', 'agents', 'autonomous', 'monitor', 'watch'],
      response: `VitalSync has <strong>6 AI Agents</strong> running in real time:<br><br>
• <strong>ECGWatchAgent</strong> — Detects sustained arrhythmias (3 in 15s)<br>
• <strong>FallDetectAgent</strong> — Fall impact with 30s cooldown<br>
• <strong>HRVCoachAgent</strong> — Recovery coaching every 5 min<br>
• <strong>EnvironmentAgent</strong> — Heat index alerts (10 min cooldown)<br>
• <strong>RiskScorerAgent</strong> — Live aggregate risk gauge<br>
• <strong>TrendAnalystAgent</strong> — Nightly weekly report via Claude AI`,
      chips: ['ECG agent?', 'Fall detection?', 'Weekly reports?']
    },
    {
      keywords: ['arrhythmia', 'irregular', 'abnormal', 'tachycardia', 'bradycardia', 'detect'],
      response: `The <strong>ECGWatchAgent</strong> fires an alert when the 1D-CNN classifies an ECG window as abnormal (arrhythmia, tachycardia, or bradycardia) with >80% confidence — and this anomaly appears in <strong>3 of the last 5 windows (within 15 seconds)</strong>. This debounce prevents false alarms from motion artifacts.`,
      chips: ['What is sustained?', 'ECG accuracy?', 'Alert types?']
    },
    {
      keywords: ['fall', 'detect', 'detection', 'impact', 'drop', 'collapse'],
      response: `Fall detection works in two stages:<br><br>
1. <strong>Fast threshold filter:</strong> If SVM < 1.8g → not a fall (no model needed)<br>
2. <strong>SVM classifier:</strong> For SVM 1.8–3.5g → machine learning model decides<br>
3. <strong>High impact:</strong> SVM > 3.5g → always flagged as critical fall<br><br>
A 30-second cooldown prevents duplicate alerts from the same event.`,
      chips: ['What is SVM?', 'ADXL345 sensor?', 'Alert notifications?']
    },
    // ── Backend & tech ────────────────────────────────────────
    {
      keywords: ['backend', 'server', 'api', 'node', 'express', 'rest'],
      response: `The VitalSync backend runs on <strong>Node.js 20 + Express 5</strong> with:<br><br>
• <strong>TimescaleDB</strong> (PostgreSQL + time-series extension) for vitals storage<br>
• <strong>Redis</strong> for caching and pub/sub between services<br>
• <strong>Socket.io</strong> for real-time WebSocket push to dashboards<br>
• <strong>JWT</strong> for authentication<br><br>
The folder is at <code>vitalsync-backend/</code> in your project.`,
      chips: ['How to run backend?', 'WebSocket?', 'Docker setup?']
    },
    {
      keywords: ['run', 'start', 'launch', 'setup', 'install', 'how', 'docker'],
      response: `To run the VitalSync backend:<br><br>
<strong>Step 1:</strong> Install <a href="https://nodejs.org" target="_blank">Node.js 20</a> and <a href="https://www.docker.com/products/docker-desktop" target="_blank">Docker Desktop</a><br>
<strong>Step 2:</strong> In <code>vitalsync-backend/</code>, copy <code>.env.example</code> → <code>.env</code> and fill secrets<br>
<strong>Step 3:</strong> Run <code>docker compose up -d</code> (starts DB + Redis)<br>
<strong>Step 4:</strong> Run <code>npm install</code> then <code>npm run migrate</code><br>
<strong>Step 5:</strong> Run <code>npm run dev</code><br><br>
The full guide is in the <a href="vitalsync-backend/README.md">README</a>.`,
      chips: ['What is Docker?', 'Environment variables?', 'Deploy to Railway?']
    },
    {
      keywords: ['websocket', 'realtime', 'real-time', 'socket', 'live', 'stream'],
      response: `VitalSync uses <strong>Socket.io</strong> for sub-5ms real-time data push. The ESP8266 POSTs every 250ms to <code>/api/ingest</code>, which stores data in TimescaleDB and instantly emits <code>vitals</code>, <code>alert</code>, <code>risk_update</code>, and <code>coach_insight</code> events via WebSocket to the connected dashboard.`,
      chips: ['How to connect frontend?', 'Backend setup?', 'ESP8266 firmware?']
    },
    {
      keywords: ['deploy', 'deployment', 'railway', 'vercel', 'production', 'cloud', 'host'],
      response: `Deployment is split:<br><br>
• <strong>Frontend</strong> → <a href="https://vercel.com" target="_blank">Vercel</a> (free, auto-deploys on git push)<br>
• <strong>Backend API</strong> → <a href="https://railway.app" target="_blank">Railway</a> (add TimescaleDB + Redis plugins)<br>
• <strong>ML Service</strong> → Railway (separate service pointing to <code>ml-service/</code> folder)<br><br>
After deploying, update <code>vs_api_url</code> in localStorage to your Railway URL.`,
      chips: ['How to deploy?', 'Environment variables?', 'Railway cost?']
    },
    {
      keywords: ['database', 'db', 'timescale', 'postgres', 'postgresql', 'storage', 'data'],
      response: `VitalSync uses <strong>TimescaleDB</strong> — a PostgreSQL extension built for time-series data. Key tables:<br><br>
• <strong>vitals</strong> — hypertable, one row per reading (~4/sec)<br>
• <strong>ecg_readings</strong> — raw ADC values, compressed after 3 days<br>
• <strong>alerts</strong> — all triggered alerts<br>
• <strong>sessions</strong> — training session summaries<br><br>
TimescaleDB automatically compresses chunks older than 7 days.`,
      chips: ['How to run DB?', 'Docker setup?', 'Migrations?']
    },
    // ── Features & Pages ──────────────────────────────────────
    {
      keywords: ['feature', 'features', 'capability', 'capabilities', 'page'],
      response: `VitalSync has <strong>6 pages</strong>:<br><br>
• <strong>Home</strong> — Live dashboard preview with ECG animation<br>
• <strong>Features</strong> — Deep dive into each sensor + ML pipeline<br>
• <strong>Health Monitor</strong> — Full real-time dashboard<br>
• <strong>Analysis</strong> — HR trends, activity charts, session history<br>
• <strong>About</strong> — Hardware diagram, tech stack, roadmap<br>
• <strong>Contact</strong> — Early access request form (EmailJS)`,
      chips: ['Health monitor?', 'Analysis charts?', 'Contact form?']
    },
    {
      keywords: ['chart', 'charts', 'graph', 'analysis', 'trends', 'history'],
      response: `The Analysis page uses <strong>Chart.js</strong> to display:<br><br>
• <strong>HR Trend Line</strong> — avg/max/min heart rate over time<br>
• <strong>Activity Stacked Bar</strong> — rest / light / moderate / intense<br>
• <strong>Time Distribution Donut</strong> — activity breakdown %<br><br>
When the backend is connected, charts pull real data from <code>/api/vitals/history</code> using TimescaleDB <code>time_bucket</code> aggregation.`,
      chips: ['Connect to backend?', 'Export data?', 'AI insights?']
    },
    // ── Access & pricing ──────────────────────────────────────
    {
      keywords: ['access', 'early', 'waitlist', 'join', 'signup', 'sign', 'up', 'register'],
      response: `VitalSync is currently in <strong>early access</strong>. To request access:<br><br>
1. Go to the <a href="contact.html">Contact page</a><br>
2. Select <strong>"Early Access"</strong> as the subject<br>
3. Tell us your sport, training level, and what you want to monitor<br><br>
We prioritise athletes with active training schedules. 🏃‍♂️`,
      chips: ['What sensors are included?', 'How does it work?', 'Contact form?']
    },
    {
      keywords: ['price', 'cost', 'pricing', 'cheap', 'expensive', 'free', 'pay', 'money'],
      response: `VitalSync hardware costs approximately <strong>$15 in components</strong> (ESP8266 ~$3, AD8232 ~$4, ADXL345 ~$3, DHT11 ~$1, OLED ~$3). The software and dashboard are <strong>completely open-source</strong>. Cloud hosting for the backend on Railway starts free.`,
      chips: ['Get early access?', 'Open source?', 'Hardware specs?']
    },
    // ── Contact & alerts ──────────────────────────────────────
    {
      keywords: ['contact', 'email', 'message', 'reach', 'talk', 'form'],
      response: `You can reach the VitalSync team at <strong>vitalsync.team@gmail.com</strong> or use the <a href="contact.html">Contact form</a>. We respond within 24 hours.`,
      chips: ['Early access?', 'Partnership?', 'Technical help?']
    },
    {
      keywords: ['alert', 'alerts', 'notification', 'notify', 'warning', 'critical'],
      response: `VitalSync has <strong>5 alert types</strong>:<br><br>
• <strong>arrhythmia</strong> — ECG anomaly (warning/critical)<br>
• <strong>fall</strong> — Impact detected (always critical)<br>
• <strong>heat_stress</strong> — Dangerous heat index (warning/critical)<br>
• <strong>high_risk</strong> — Aggregate risk score > 65<br>
• <strong>hrv_advice</strong> — Low recovery coaching (info/warning)<br><br>
Critical alerts trigger both <strong>browser push notifications and email</strong>.`,
      chips: ['How to enable push?', 'AI agents?', 'Fall detection?']
    },
    // ── Future / roadmap ──────────────────────────────────────
    {
      keywords: ['future', 'roadmap', 'next', 'coming', 'version', 'v2', 'phase'],
      response: `VitalSync Phase 3 roadmap includes:<br><br>
• <strong>MAX30102</strong> pulse oximeter for real SpO₂<br>
• <strong>BLE broadcasting</strong> to iOS/Android app<br>
• <strong>Coach dashboard</strong> — view multiple athletes' vitals<br>
• <strong>Model retraining</strong> with user-collected ECG data<br>
• <strong>GPS module</strong> for location-tagged workouts`,
      chips: ['Current features?', 'Get early access?', 'AI models?']
    },
    // ── EmailJS ───────────────────────────────────────────────
    {
      keywords: ['emailjs', 'email', 'js', 'contact', 'setup', 'configure'],
      response: `To activate the contact form (send emails to your Gmail):<br><br>
1. Go to <a href="https://emailjs.com" target="_blank">emailjs.com</a> → sign up free<br>
2. Add Gmail service → connect your email<br>
3. Create a template with <code>{{from_name}}</code>, <code>{{reply_to}}</code>, <code>{{subject}}</code>, <code>{{message}}</code><br>
4. In <code>contact.html</code>, replace the 3 <code>YOUR_*</code> constants at the bottom<br><br>
Takes about 5 minutes!`,
      chips: ['Contact form?', 'Backend setup?', 'Deploy?']
    },
    // ── ESP8266 Firmware ──────────────────────────────────────
    {
      keywords: ['firmware', 'arduino', 'flash', 'upload', 'ino', 'sketch'],
      response: `The updated firmware is at <code>vitalsync-backend/scripts/esp8266_firmware_v2.ino</code>.<br><br>
To flash it:<br>
1. Open Arduino IDE<br>
2. Install <strong>ESP8266 board support</strong> + <strong>ArduinoJson</strong>, <strong>Adafruit ADXL345</strong>, <strong>DHT sensor</strong> libraries<br>
3. Set your WiFi SSID/password and backend API URL in the config section<br>
4. Upload to NodeMCU board`,
      chips: ['Backend URL?', 'Device token?', 'Hardware sensors?']
    },
  ];

  /* ── Fuzzy Matcher ─────────────────────────────────────────── */
  function findBestMatch(input) {
    const tokens = input.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
    let best = null;
    let bestScore = 0;

    for (const entry of KB) {
      const score = entry.keywords.reduce((acc, kw) => {
        if (tokens.includes(kw)) return acc + 2;
        if (tokens.some(t => t.includes(kw) || kw.includes(t))) return acc + 1;
        return acc;
      }, 0);

      if (score > bestScore) { best = entry; bestScore = score; }
    }

    return bestScore >= 1 ? best : null;
  }

  /* ── DOM Builder ───────────────────────────────────────────── */
  function buildWidget() {
    // FAB Button
    const fab = document.createElement('button');
    fab.className = 'vs-chat-fab';
    fab.setAttribute('aria-label', 'Open VitalSync help chat');
    fab.innerHTML = `
      <svg class="icon-chat" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M7 9h10v2H7zm0-3h10v2H7zm0 6h6v2H7z"/></svg>
      <svg class="icon-close" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      <span class="notif-dot" id="chatNotifDot"></span>
    `;

    // Panel
    const panel = document.createElement('div');
    panel.className = 'vs-chat-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'VitalSync assistant');
    panel.innerHTML = `
      <div class="vs-chat-header">
        <div class="vs-chat-avatar">🤖</div>
        <div class="vs-chat-header-info">
          <div class="bot-name">
            VitalSync AI <span class="bot-status" title="Online"></span>
          </div>
          <div class="bot-sub">Health monitoring assistant</div>
        </div>
        <button class="vs-chat-header-clear" id="vsChatClear" title="Clear conversation">Clear</button>
      </div>
      <div class="vs-chat-messages" id="vsChatMessages"></div>
      <div class="vs-quick-replies" id="vsQuickReplies"></div>
      <div class="vs-chat-input-row">
        <input class="vs-chat-input" id="vsChatInput" type="text"
               placeholder="Ask me anything about VitalSync…"
               aria-label="Chat message input" maxlength="200">
        <button class="vs-chat-send" id="vsChatSend" aria-label="Send message">
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(panel);
    return { fab, panel };
  }

  /* ── Message renderer ─────────────────────────────────────── */
  function addMessage(messagesEl, text, role) {
    const wrap = document.createElement('div');
    wrap.className = `vs-msg ${role}`;
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = text;
    wrap.appendChild(bubble);
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return wrap;
  }

  function showTyping(messagesEl) {
    const wrap = addMessage(messagesEl, '', 'bot');
    wrap.classList.add('vs-typing');
    wrap.querySelector('.bubble').innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span>`;
    return wrap;
  }

  function setQuickReplies(repliesEl, chips, sendFn) {
    repliesEl.innerHTML = '';
    (chips || []).slice(0, 4).forEach(chip => {
      const btn = document.createElement('button');
      btn.className = 'vs-chip';
      btn.textContent = chip;
      btn.addEventListener('click', () => sendFn(chip));
      repliesEl.appendChild(btn);
    });
  }

  /* ── Core logic ───────────────────────────────────────────── */
  function init() {
    const { fab, panel } = buildWidget();
    const messagesEl = panel.querySelector('#vsChatMessages');
    const repliesEl  = panel.querySelector('#vsQuickReplies');
    const inputEl    = panel.querySelector('#vsChatInput');
    const sendBtn    = panel.querySelector('#vsChatSend');
    const clearBtn   = panel.querySelector('#vsChatClear');
    const notifDot   = fab.querySelector('#chatNotifDot');

    let isOpen = false;
    let hasInteracted = false;

    // Welcome message
    function showWelcome() {
      messagesEl.innerHTML = '';
      addMessage(messagesEl,
        `👋 Hi! I'm the <strong>VitalSync AI assistant</strong>.<br><br>
        Ask me anything about the hardware, AI agents, how to set up the backend, health metrics, or early access!`,
        'bot'
      );
      setQuickReplies(repliesEl, ['What is VitalSync?', 'What sensors does it use?', 'How do I run the backend?', 'What is HRV?'], sendMessage);
    }

    // Toggle panel
    function togglePanel() {
      isOpen = !isOpen;
      panel.classList.toggle('open', isOpen);
      fab.classList.toggle('open', isOpen);
      fab.setAttribute('aria-expanded', isOpen);
      if (isOpen) {
        if (!hasInteracted) showWelcome();
        notifDot.style.display = 'none';
        setTimeout(() => inputEl.focus(), 350);
      }
    }

    // Send a message
    function sendMessage(text) {
      text = (text || inputEl.value).trim();
      if (!text) return;
      inputEl.value = '';
      sendBtn.disabled = true;
      hasInteracted = true;
      repliesEl.innerHTML = '';

      addMessage(messagesEl, text, 'user');

      // Typing indicator
      const typing = showTyping(messagesEl);

      setTimeout(() => {
        typing.remove();
        const match = findBestMatch(text);
        const response = match
          ? match.response
          : `🤔 I'm not sure about that. For help with anything not covered here, please <a href="contact.html">send us a message</a> — we respond within 24 hours.`;
        const chips = match?.chips || ['What is VitalSync?', 'How to run backend?', 'Get early access?'];

        addMessage(messagesEl, response, 'bot');
        setQuickReplies(repliesEl, chips, sendMessage);
        sendBtn.disabled = false;
        inputEl.focus();
      }, 600 + Math.random() * 400);
    }

    // Events
    fab.addEventListener('click', togglePanel);
    sendBtn.addEventListener('click', () => sendMessage());
    clearBtn.addEventListener('click', () => { showWelcome(); });
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    // Show notif dot after 4s if not yet opened
    setTimeout(() => {
      if (!isOpen && !hasInteracted) notifDot.style.display = 'block';
    }, 4000);
  }

  /* ── Boot ─────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
