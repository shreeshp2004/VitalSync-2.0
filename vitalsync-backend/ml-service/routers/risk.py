from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

class RiskInput(BaseModel):
    hr:         Optional[float] = None
    spo2:       Optional[float] = None
    hrv_rmssd:  Optional[float] = None
    temp:       Optional[float] = None
    humidity:   Optional[float] = None
    svm:        Optional[float] = None

@router.post("/risk")
def score_risk(data: RiskInput):
    flags = []
    risk_components = []

    # HR risk
    if data.hr:
        if data.hr > 110:   flags.append("elevated_hr");   risk_components.append(0.7)
        elif data.hr > 100: flags.append("borderline_hr"); risk_components.append(0.4)
        elif data.hr < 45:  flags.append("low_hr");        risk_components.append(0.5)
        else:               risk_components.append(0.1)

    # SpO2 risk
    if data.spo2:
        if data.spo2 < 90:   flags.append("critical_spo2"); risk_components.append(0.9)
        elif data.spo2 < 94: flags.append("low_spo2");      risk_components.append(0.6)
        else:                 risk_components.append(0.05)

    # HRV risk
    if data.hrv_rmssd:
        if data.hrv_rmssd < 15:  flags.append("very_low_hrv"); risk_components.append(0.6)
        elif data.hrv_rmssd < 30: risk_components.append(0.3)
        else:                     risk_components.append(0.1)

    # Environmental risk
    if data.temp and data.humidity:
        if data.temp > 35 and data.humidity > 70:
            flags.append("heat_humidity_combined"); risk_components.append(0.75)
        elif data.temp > 35:
            flags.append("heat_stress"); risk_components.append(0.5)

    # SVM (fall/impact)
    if data.svm and data.svm > 2.5:
        flags.append("high_impact"); risk_components.append(0.65)

    risk_prob = sum(risk_components) / len(risk_components) if risk_components else 0.1
    risk_prob = min(1.0, risk_prob)
    risk_score = round(risk_prob * 100, 1)
    risk_level = "low" if risk_score < 30 else "medium" if risk_score < 65 else "high"

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "flags": flags,
        "explanation": f"{'Active flags: ' + ', '.join(flags) if flags else 'All vitals within normal ranges.'}"
    }
