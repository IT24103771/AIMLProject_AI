from flask import Flask, request, jsonify
from flask_cors import CORS
import traceback

# Import our custom prediction logic
from predict import get_predictions

app = Flask(__name__)
CORS(app) # Allow CORS for frontend and backend

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "Expiry Risk API"})

@app.route("/predict", methods=["POST"])
def predict_endpoint():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON provided"}), 400
        
        # Get the prediction results
        result = get_predictions(data)
        
        # Merge input data with result (useful for tracking)
        result["product_id"] = data.get("product_id", "Unknown")
        result["product_name"] = data.get("product_name", "Unknown")
        
        return jsonify(result), 200
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print("🚀 Starting Expiry Risk API on port 5000...")
    app.run(host="0.0.0.0", port=5000, debug=True)
