from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS  # Enable cross-origin requests
import json
import os
from datetime import datetime

app = Flask(__name__, static_url_path='', static_folder='.')
CORS(app)

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

@app.before_request
def log_homepage_visit():
    """
    Log a visit every time the homepage ("/") is requested.
    """
    if request.path == "/":
        data = load_data()
        data.setdefault("timeseries", [])
        data["totalVisits"] += 1
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        data["timeseries"].append({"timestamp": now_str})
        save_data(data)
        # Print to the console for debugging purposes.
        print(f"Logged homepage visit at {now_str}. Total visits: {data['totalVisits']}")

@app.route("/analytics", methods=["GET"], strict_slashes=False)
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

@app.route("/")
def index():
    return send_from_directory(".", "index.html")

@app.route("/<path:path>")
def static_proxy(path):
    # Serve static files (script.js, style.css, images, docs, etc.)
    return send_from_directory(".", path)

if __name__ == "__main__":
    # Disable the auto-reloader to prevent file-change triggered restarts.
    app.run(host="0.0.0.0", port=5000, use_reloader=False)
