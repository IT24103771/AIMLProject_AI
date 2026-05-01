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
        
    # Improved 3-Level Risk Logic matching User's Manual
    # Step 1: Calculate Days to Expiry (Floor at 1)
    safe_days = max(days_to_expiry, 1.0) 
    
    # Step 2: Calculate Sales Velocity (Floor at 1)
    safe_velocity = max(sales_velocity, 1.0)
    
    # Step 3: Calculate Expected Sales
    expected_sales = safe_velocity * safe_days
    
    # Step 4: Calculate Ratio
    ratio = remaining_qty / expected_sales

    # Assign risk based on user's exact Binary logic
    if ratio > 1.0:
        risk_level = "HIGH"
        risk_code = 1
        action = "CRITICAL: Urgent discount required"
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
