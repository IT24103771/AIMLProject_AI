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
    Improved 3-Level Risk Logic
    1. HIGH RISK (1): ratio > 1.5
    2. NORMAL RISK (2): ratio > 1.0
    3. LOW RISK (0): ELSE
    
    ratio = remainingQty / (salesVelocity * daysToExpiry)
    """
    # Extract inputs
    days_to_expiry = float(data.get('days_to_expiry', 30))
    remaining_qty = float(data.get('remaining_quantity', 0))
    sales_velocity = float(data.get('sales_velocity', 0))
    
    # Pre-checks
    if remaining_qty <= 0:
        return {
            "risk_level": "LOW",
            "risk_code": 0,
            "action": "Sold out"
        }
        
    # Expected Sales = salesVelocity * daysToExpiry
    # Avoid div by zero if days_to_expiry is 0 (expires today)
    safe_days = max(days_to_expiry, 0.5) 
    expected_sales = sales_velocity * safe_days
    
    # Calculate ratio
    # If expected_sales is 0, and we have quantity, it's infinite risk
    if expected_sales <= 0:
        ratio = 999.0 if remaining_qty > 0 else 0.0
    else:
        ratio = remaining_qty / expected_sales

    # Assign risk based on user's exact logic
    if ratio > 1.5:
        risk_level = "HIGH"
        risk_code = 1
        action = "CRITICAL: Urgent discount required"
    elif ratio > 1.0:
        risk_level = "NORMAL"
        risk_code = 2
        action = "MONITOR: Consider minor discount"
    else:
        risk_level = "LOW"
        risk_code = 0
        action = "SAFE: No action needed"

    return {
        "risk_level": risk_level,
        "risk_code": risk_code,
        "ratio": round(ratio, 2),
        "action": action
    }
