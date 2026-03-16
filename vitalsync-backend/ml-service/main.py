from fastapi import FastAPI
from contextlib import asynccontextmanager
import logging

from routers import ecg, fall, hrv, risk

logging.basicConfig(level=logging.INFO)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Models are loaded lazily on first request
    # In production: pre-load here with app.state.model = load_model(...)
    logging.info("VitalSync ML Service started")
    yield

app = FastAPI(
    title="VitalSync ML Service",
    description="ECG classification, fall detection, HRV analysis, risk scoring",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(ecg.router,  prefix="/predict", tags=["ECG"])
app.include_router(fall.router, prefix="/predict", tags=["Fall"])
app.include_router(hrv.router,  prefix="/analyze", tags=["HRV"])
app.include_router(risk.router, prefix="/score",   tags=["Risk"])

@app.get("/health")
def health():
    return {"status": "ok"}
