import joblib
import pandas as pd
import numpy as np
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'random_forest_model.pkl')
FEATURES_JSON = os.path.join(BASE_DIR, 'outputs', 'feature_list.json')

# Load the model globally
model = None
try:
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        print("Model loaded successfully")
except Exception as e:
    print(f"Failed to load model: {e}")

def get_predictions(data):
    """
    data expects a dictionary with minimal keys:
    remaining_quantity, days_to_expiry, avg_daily_sales
    """
    if model is None:
        raise Exception("Model not loaded")

    # Extract given inputs or default to 0
    days_to_expiry = float(data.get('days_to_expiry', 30))
    remaining_qty = float(data.get('remaining_quantity', 10))
    avg_daily_sales = float(data.get('avg_daily_sales', 1.0))

    # Calculate missing features (ALIGNED WITH STEP 2)
    # total_units_sold is used for sell_through_rate
    # In API, we might not have historical units_sold, so we approximate
    total_units_sold = avg_daily_sales * 20 # assumption for recent window
    sell_through_rate = total_units_sold / max(total_units_sold + remaining_qty, 1)
    
    # stock pressure ratio = remaining_qty / (avg_daily_sales + 1)
    stock_pressure_ratio = remaining_qty / (avg_daily_sales + 1)
    
    # Sales velocity: 1 if above median (approx 1.5 based on dataset), else 0
    sales_velocity = 1 if avg_daily_sales > 1.5 else 0
    
    recent_sales_trend = float(data.get('demand_variability', 1.0))
    quality_grade_encoded = 1 # default
    category_encoded = 2 # default

    # Construct the feature array in exactly the right order:
    # 0: days_to_expiry
    # 1: remaining_qty
    # 2: total_units_sold
    # 3: avg_daily_sales
    # 4: sales_velocity
    # 5: sell_through_rate
    # 6: stock_pressure_ratio
    # 7: recent_sales_trend
    # 8: quality_grade_encoded
    # 9: category_encoded
    features = [
        days_to_expiry,
        remaining_qty,
        total_units_sold,
        avg_daily_sales,
        sales_velocity,
        sell_through_rate,
        stock_pressure_ratio,
        recent_sales_trend,
        quality_grade_encoded,
        category_encoded
    ]

    # Model prediction
    X = np.array(features).reshape(1, -1)
    probability = float(model.predict_proba(X)[0][1])

    # Rule based mapping
    # 1. If no quantity left, it's not a risk anymore
    if remaining_qty <= 0:
        return {
            "risk_level": "LOW",
            "risk_probability": round(probability, 4),
            "action": "Sold out"
        }

    # 2. Math fallback for high risk
    # If expiring today (days=0), only high risk if qty > expected daily sales
    if days_to_expiry == 0:
        is_math_high_risk = remaining_qty > avg_daily_sales
    else:
        is_math_high_risk = stock_pressure_ratio > days_to_expiry

    if probability > 0.6 or is_math_high_risk:
        risk_level = "HIGH"
        action = "URGENT: Apply 50% markdown immediately"
    elif probability >= 0.3:
        risk_level = "MEDIUM"
        action = "Consider 20% discount"
    else:
        risk_level = "LOW"
        action = "No action needed"

    return {
        "risk_level": risk_level,
        "risk_probability": round(probability, 4),
        "action": action
    }
