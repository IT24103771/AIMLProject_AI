import os
import sys

# Add the current directory to sys.path so we can import predict
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from predict import get_predictions

# Mock data based on the screenshot (adssd123)
# Expiring today (0 days to expiry), huge quantity
test_inputs = [
    {
        "name": "Expiring Today, High Qty (HIGH RISK)",
        "data": {
            "days_to_expiry": 0,
            "remaining_quantity": 2978,
            "sales_velocity": 0.8
        }
    },
    {
        "name": "Slightly Over (NORMAL RISK)",
        "data": {
            "days_to_expiry": 10,
            "remaining_quantity": 12,
            "sales_velocity": 1.0  # expected = 10, ratio = 1.2
        }
    },
    {
        "name": "Well Within (LOW RISK)",
        "data": {
            "days_to_expiry": 10,
            "remaining_quantity": 5,
            "sales_velocity": 1.0  # expected = 10, ratio = 0.5
        }
    },
    {
        "name": "Zero Sales High Qty (HIGH RISK)",
        "data": {
            "days_to_expiry": 30,
            "remaining_quantity": 100,
            "sales_velocity": 0
        }
    },
    {
        "name": "Sold Out",
        "data": {
            "days_to_expiry": 10,
            "remaining_quantity": 0,
            "sales_velocity": 10
        }
    }
]

print("--- Testing 3-Level Expiry Risk Predictions ---")
for test in test_inputs:
    try:
        res = get_predictions(test["data"])
        print(f"\nTest  : {test['name']}")
        print(f"Inputs: {test['data']}")
        print(f"Result: {res}")
    except Exception as e:
        print(f"Error testing {test['name']}: {e}")
