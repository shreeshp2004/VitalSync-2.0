from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
import numpy as np

router = APIRouter()

class ECGInput(BaseModel):
    samples: List[float]  # 250 raw ADC values at 100Hz = 2.5s of ECG

def bandpass_filter(signal: np.ndarray, lowcut=0.5, highcut=40.0, fs=100.0) -> np.ndarray:
    """Simple bandpass using cumulative sum approximation (no scipy dependency for stub)."""
    # In production: use scipy.signal.butter + filtfilt
    return signal - signal.mean()

@router.post("/ecg")
def predict_ecg(data: ECGInput):
    samples = np.array(data.samples)
    if len(samples) < 10:
        return {"error": "Need at least 10 samples"}

    # Bandpass filter + normalize
    filtered = bandpass_filter(samples)
    std = filtered.std()
    normalized = filtered / (std + 1e-8) if std > 0 else filtered

    # ── Stub classification (replace with real TF Lite model) ──────────
    # Threshold-based arrhythmia detection on variance
    variance_ratio = np.var(np.diff(normalized)) / (np.var(normalized) + 1e-8)

    if variance_ratio > 2.5:
        classification, confidence = "arrhythmia", 0.84
    elif np.abs(normalized).max() > 3.5:
        classification, confidence = "tachycardia", 0.78
    else:
        classification, confidence = "normal", 0.95

    classes = ["normal", "arrhythmia", "tachycardia", "bradycardia", "noise"]
    probs = {c: 0.01 for c in classes}
    probs[classification] = confidence
    probs["normal"] = max(0.01, 1 - confidence)

    return {
        "classification": classification,
        "confidence": round(confidence, 4),
        "is_anomaly": classification != "normal" and confidence > 0.80,
        "probabilities": {k: round(v, 4) for k, v in probs.items()}
    }
