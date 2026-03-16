from fastapi import APIRouter
from pydantic import BaseModel
import numpy as np

router = APIRouter()

class FallInput(BaseModel):
    accel_x: float
    accel_y: float
    accel_z: float

@router.post("/fall")
def predict_fall(data: FallInput):
    svm = float(np.sqrt(data.accel_x**2 + data.accel_y**2 + data.accel_z**2))

    # Stage 1: simple threshold
    if svm < 1.8:
        return {"fall_detected": False, "method": "threshold", "svm": round(svm, 4), "confidence": 0.0}

    # Stage 2: SVM-based classification (stub — replace with sklearn model)
    confidence = min(1.0, (svm - 1.8) / 2.0)
    fall_detected = svm > 2.5 or confidence > 0.75

    return {
        "fall_detected": fall_detected,
        "confidence": round(confidence, 4),
        "svm": round(svm, 4),
        "severity": "high" if svm > 3.5 else "medium" if svm > 2.5 else "low",
        "method": "svm_stub"
    }
