# ml_service.py
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import joblib
import pandas as pd
import numpy as np
import math
import traceback

# Paths to your uploaded models
OHE_PATH = "finalohe.pkl"
SCALER_PATH = "finalsc.pkl"
SVR_PATH = "finalsvr.pkl"

app = FastAPI(title="FixRoute ML Service")

# Load models (best-effort). If a loader fails, keep it None and fallback later.
def safe_load(path):
    try:
        return joblib.load(path)
    except Exception as e:
        print(f"Warning: failed to load {path}: {e}")
        return None

ohe = safe_load(OHE_PATH)
scaler = safe_load(SCALER_PATH)
svr = safe_load(SVR_PATH)

class Serviceman(BaseModel):
    id: str
    full_name: Optional[str] = None
    base_cost: Optional[float] = 0.0
    rating: Optional[float] = 0.0
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    # optional extras allowed

class PredictRequest(BaseModel):
    user_lat: float
    user_lng: float
    service_type: Optional[str] = ""
    servicemen: List[Serviceman]

def haversine_km(lat1, lon1, lat2, lon2):
    if lat2 is None or lon2 is None:
        return 9999.0
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return R * 2 * math.asin(math.sqrt(a))

@app.post("/predict")
def predict(req: PredictRequest):
    try:
        user_lat = float(req.user_lat)
        user_lng = float(req.user_lng)
        service = req.service_type or ""
        rows = []
        for s in req.servicemen:
            dist = haversine_km(user_lat, user_lng, s.location_lat, s.location_lng)
            rows.append({
                "id": s.id,
                "full_name": s.full_name or "",
                "distance_km": dist,
                "base_cost": float(s.base_cost or 0.0),
                "rating": float(s.rating or 0.0),
                "service_type": service
            })

        df = pd.DataFrame(rows)
        if df.empty:
            return {"results": []}

        # Build feature matrix. We'll try:
        # numeric = [distance_km, base_cost, rating]
        X_num = df[["distance_km", "base_cost", "rating"]].astype(float).values

        # Try to add OHE of service_type (if available)
        X = X_num
        if ohe is not None:
            try:
                svc_ohe = ohe.transform(df[["service_type"]])
                # convert sparse to dense if needed
                try:
                    svc_ohe = svc_ohe.toarray()
                except Exception:
                    pass
                X = np.hstack([X_num, svc_ohe])
            except Exception as e:
                # fallback: attempt to OHE other columns or skip
                print("OHE transform failed on service_type:", e)
                # don't augment X in this case

        # Scale if scaler loaded
        X_scaled = X
        if scaler is not None:
            try:
                X_scaled = scaler.transform(X)
            except Exception as e:
                print("Scaler transform failed, using unscaled X:", e)
                X_scaled = X

        # Predict with SVR
        if svr is not None:
            try:
                preds = svr.predict(X_scaled)
                df["eta_predicted"] = [float(p) for p in preds]
            except Exception as e:
                print("SVR predict failed:", e)
                traceback.print_exc()
                # fallback heuristic
                df["eta_predicted"] = df["distance_km"] * 2.0 - df["rating"] * 0.5
                df["eta_predicted"] = df["eta_predicted"].clip(lower=1.0)
        else:
            # no model loaded -> heuristic
            df["eta_predicted"] = df["distance_km"] * 2.0 - df["rating"] * 0.5
            df["eta_predicted"] = df["eta_predicted"].clip(lower=1.0)

        df_sorted = df.sort_values("eta_predicted").reset_index(drop=True)

        results = []
        for _, r in df_sorted.iterrows():
            results.append({
                "id": r["id"],
                "full_name": r["full_name"],
                "distance_km": float(r["distance_km"]),
                "base_cost": float(r["base_cost"]),
                "rating": float(r["rating"]),
                "eta_predicted": float(r["eta_predicted"])
            })

        return {"results": results}

    except Exception as e:
        print("Predict exception:", e)
        traceback.print_exc()
        return {"results": []}
