# VitalSync Backend — Phase 2

Full-stack IoT health monitoring platform backend.

## Quick Start (with Docker)

```bash
# 1. Clone this folder
cp .env.example .env
# 2. Fill in your secrets in .env
nano .env
# 3. Start all services
docker compose up -d
# 4. Run DB migrations
docker compose exec api node scripts/migrate.js
```

## Stack

| Layer | Technology |
|---|---|
| API | Node.js 20 + Express 5 |
| WebSocket | Socket.io 4 |
| Database | TimescaleDB (PostgreSQL extension) |
| Cache / Pub-Sub | Redis 7 |
| ML Service | Python 3.11 + FastAPI |
| Auth | JWT (access + refresh tokens) |
| Email | SendGrid REST API |
| Containers | Docker + Docker Compose |

## API Endpoints

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register athlete |
| POST | `/api/auth/login` | Login, get tokens |
| POST | `/api/auth/refresh` | Refresh access token |

### Ingest (ESP8266 → Cloud)
| Method | Path | Header | Description |
|---|---|---|---|
| POST | `/api/ingest` | `X-Device-Token` | Receive live sensor data |

### Vitals (Frontend)
| Method | Path | Description |
|---|---|---|
| GET | `/api/vitals/latest` | Redis-cached latest reading |
| GET | `/api/vitals/history?range=24h` | TimescaleDB time_bucket aggregation |
| GET | `/api/vitals/session` | Paginated session history |

### Analysis
| GET | `/api/analysis/summary` | Stats for time range |
| GET | `/api/analysis/trends`  | HR/HRV/SpO₂ trend data |

## AI Agent Layer

| Agent | Trigger | Action |
|---|---|---|
| ECGWatchAgent | Every ECG batch | Debounced arrhythmia alert (3 in 15s) |
| FallDetectAgent | Every accel reading | Fall alert (30s cooldown) |
| HRVCoachAgent | Every 5 minutes | Low recovery coaching push |
| EnvironmentAgent | Heat index calc | Heat stress alert (10m cooldown) |
| RiskScorerAgent | Every reading | Aggregate risk score → WebSocket |
| TrendAnalystAgent | Nightly 23:55 | Weekly report + Claude AI narrative |

## ML Service (Python FastAPI)

Running on port 8000:

| Endpoint | Input | Output |
|---|---|---|
| POST `/predict/ecg` | 25+ raw ADC samples | Classification + confidence |
| POST `/predict/fall` | ax, ay, az | Fall detected + severity |
| POST `/analyze/hrv` | RMSSD | Recovery score + recommendation |
| POST `/score/risk` | Multi-signal | Risk score + active flags |

## EmailJS Setup (Contact Form)

The frontend `contact.html` uses EmailJS. To activate:

1. Go to [emailjs.com](https://emailjs.com) → sign up free
2. Add Gmail service → connect `ddini5410@gmail.com`
3. Create a template with variables: `{{from_name}}`, `{{reply_to}}`, `{{subject}}`, `{{message}}`
4. In `contact.html`, replace:
   - `EMAILJS_SERVICE_ID` → your service ID
   - `EMAILJS_TEMPLATE_ID` → your template ID
   - `EMAILJS_PUBLIC_KEY` → your public key

## ESP8266 Firmware Update

Flash `scripts/esp8266_firmware_v2.ino` to your device. Set:
- `WIFI_SSID` / `WIFI_PASS`
- `API_URL` → your Railway backend URL
- `DEVICE_TOKEN` → token from `POST /api/devices/register`

## Deployment

**Backend** → Railway: connect repo, add TimescaleDB + Redis plugins  
**ML Service** → Railway: separate service pointing to `ml-service/`  
**Frontend** → Vercel: update socket URL in `vitals.js`
