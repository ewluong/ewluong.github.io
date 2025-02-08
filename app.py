from flask import Flask, jsonify
from flask_cors import CORS  # Enable cross-origin requests
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests

# Path to the JSON file where analytics data will be stored.
DATA_FILE = "analytics_data.json"

def load_data():
    """
    Load the analytics data from a JSON file, or initialize defaults if file does not exist or is invalid.
    """
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                data = {"totalVisits": 0, "uniqueVisitors": 0, "timeseries": []}
    else:
        data = {"totalVisits": 0, "uniqueVisitors": 0, "timeseries": []}
    return data

def save_data(data):
    """
    Save the analytics data to the JSON file.
    """
    with open(DATA_FILE, "w") as f:
        json.dump(data, f)

@app.route("/log_visit", methods=["GET"])
def log_visit():
    """
    This endpoint is called once on initial page load to log the new visit.
    It increments the total visit count and appends a new record with a timestamp.
    """
    data = load_data()
    data.setdefault("timeseries", [])
    data["totalVisits"] += 1
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    data["timeseries"].append({"timestamp": now_str})
    save_data(data)
    return jsonify({"status": "logged", "totalVisits": data["totalVisits"]})

@app.route("/analytics", methods=["GET"])
def analytics():
    """
    This endpoint only reads the analytics data to generate the visualization.
    It does not update the data.
    """
    data = load_data()
    return jsonify({
        "totalVisits": data["totalVisits"],
        "uniqueVisitors": data["uniqueVisitors"],
        "timeseries": data["timeseries"]
    })

if __name__ == "__main__":
    # Run the server on all available IP addresses on port 5000.
    app.run(host="0.0.0.0", port=5000)
