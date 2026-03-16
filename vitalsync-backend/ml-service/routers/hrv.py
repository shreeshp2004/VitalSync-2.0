from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class HRVInput(BaseModel):
    rmssd: float
    hr: Optional[float] = None

@router.post("/hrv")
def analyze_hrv(data: HRVInput):
    rmssd = data.rmssd

    # Recovery score from RMSSD normative ranges for athletes
    if rmssd < 20:
        recovery_score = int(rmssd / 20 * 30)
        interpretation = "poor"
        recommendation = "Rest day strongly recommended. Avoid intense training."
    elif rmssd < 40:
        recovery_score = int(30 + (rmssd - 20) / 20 * 30)
        interpretation = "fair"
        recommendation = "Light activity or active recovery only."
    elif rmssd < 70:
        recovery_score = int(60 + (rmssd - 40) / 30 * 25)
        interpretation = "good"
        recommendation = "Moderate training recommended."
    else:
        recovery_score = min(100, int(85 + (rmssd - 70) / 30 * 15))
        interpretation = "excellent"
        recommendation = "Ready for high-intensity training."

    # Simple stress index estimation
    stress_index = max(0, round(100 - recovery_score + (data.hr or 70) / 3, 1))

    return {
        "rmssd": round(rmssd, 2),
        "recovery_score": recovery_score,
        "recovery_interpretation": interpretation,
        "training_recommendation": recommendation,
        "stress_index": round(stress_index, 1)
    }
