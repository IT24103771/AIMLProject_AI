import os
import sys

# Add the current directory to sys.path so we can import predict
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from predict import get_predictions

# Mock data based on the screenshot (adssd123)
# Expiring today (0 days to expiry), huge quantity
test_inputs = [
    {
        "name": "Expiring Today, High Qty",
        "data": {
            "days_to_expiry": 0,
            "remaining_quantity": 2978,
            "avg_daily_sales": 0.8
        }
    },
    {
        "name": "Sold Out Today",
        "data": {
            "days_to_expiry": 0,
            "remaining_quantity": 0,
            "avg_daily_sales": 10
        }
    },
    {
        "name": "Fast Mover Expiring Today (Low Risk)",
        "data": {
            "days_to_expiry": 0,
            "remaining_quantity": 5,
            "avg_daily_sales": 100
        }
    },
    {
        "name": "Expiring Tomorrow, High Qty",
        "data": {
            "days_to_expiry": 1,
            "remaining_quantity": 100,
            "avg_daily_sales": 0.5
        }
    },
    {
        "name": "Safe Product",
        "data": {
            "days_to_expiry": 100,
            "remaining_quantity": 10,
            "avg_daily_sales": 2.0
        }
    }
]

print("--- Testing Expiry Risk Predictions ---")
for test in test_inputs:
    try:
        res = get_predictions(test["data"])
        print(f"\nTest: {test['name']}")
        print(f"Inputs: {test['data']}")
        print(f"Result: {res}")
    except Exception as e:
        print(f"Error testing {test['name']}: {e}")
