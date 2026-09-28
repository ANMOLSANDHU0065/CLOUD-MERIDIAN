from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from pathlib import Path
import requests
import json
from datetime import datetime, timezone
import time

# SANDHU
app = Flask(__name__)

# Change this before real deployment
app.secret_key = "cloud-meridian-change-this-secret-key"
BASE_DIR = Path(__file__).resolve().parent

DATA_DIR = BASE_DIR / "data"

CITIES_FILE = DATA_DIR / "cities.json"
USERS_FILE = DATA_DIR / "users.json"
CONTACTS_FILE = DATA_DIR / "contacts.json"

OPEN_METEO_FORECAST = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_GEOCODING = "https://geocoding-api.open-meteo.com/v1/search"

# Weather cache
WEATHER_CACHE = {}
WEATHER_CACHE_TTL = 600  # 10 minutes

# SANDHU
# =========================================================
# JSON HELPERS
# =========================================================

def load_json(path, default):
    try:
        if not path.exists():
            path.write_text(
                json.dumps(default, indent=2),
                encoding="utf-8"
            )
            return default

        return json.loads(
            path.read_text(encoding="utf-8")
        )

    except (json.JSONDecodeError, OSError):
        return default


def save_json(path, data):
    path.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    path.write_text(
        json.dumps(
            data,
            indent=2,
            ensure_ascii=False
        ),
        encoding="utf-8"
    )


def get_cities():
    return load_json(
        CITIES_FILE,
        []
    )
# SANDHU

# =========================================================
# MAIN PAGES
# =========================================================




@app.route("/")
def home():
    return render_template("index.html")


@app.route("/contact")
def contact():
    return render_template("contact.html")


@app.route("/get-in-touch")
def get_in_touch():
    return render_template("get-in-touch.html")


@app.route("/login")
def login_page():

    if session.get("user"):
        return redirect(url_for("home"))

    return render_template("login.html")

# SANDHU
@app.route("/signup")
def signup_page():

    if session.get("user"):
        return redirect(url_for("home"))

    return render_template("signup.html")

# SANDHU
# =========================================================
# CITY API
# =========================================================

@app.get("/api/cities")
def api_cities():

    return jsonify(get_cities())


@app.get("/api/states")
def api_states():

    states = sorted({
        city["state"]
        for city in get_cities()
        if city.get("state")
    })

    return jsonify(states)

# SANDHU
# =========================================================
# CITY SEARCH
# =========================================================

@app.get("/api/search")
def search_city():

    query = request.args.get(
        "q",
        ""
    ).strip()

    if len(query) < 2:
        return jsonify([])

    try:

        response = requests.get(
            OPEN_METEO_GEOCODING,
            params={
                "name": query,
                "count": 12,
                "language": "en",
                "format": "json",
                "countryCode": "IN"
            },
            timeout=10
        )

        response.raise_for_status()

        results = response.json().get(
            "results",
            []
        )
# SANDHU
        formatted = []

        seen = set()

        for item in results:

            latitude = item.get("latitude")
            longitude = item.get("longitude")

            key = (
                round(latitude or 0, 4),
                round(longitude or 0, 4)
            )

            if key in seen:
                continue

            seen.add(key)

            formatted.append({
                "name": item.get(
                    "name",
                    query
                ),

                "state": item.get(
                    "admin1",
                    "India"
                ),

                "country": item.get(
                    "country",
                    "India"
                ),

                "latitude": latitude,
                "longitude": longitude,

                "timezone": item.get(
                    "timezone",
                    "Asia/Kolkata"
                )
            })

        return jsonify(formatted)

    except requests.RequestException as error:

        return jsonify({
            "error": f"Location search failed: {error}"
        }), 502
# SANDHU

# =========================================================
# WEATHER API
# =========================================================

@app.get("/api/weather")
def weather():

    latitude = request.args.get(
        "lat",
        type=float
    )

    longitude = request.args.get(
        "lon",
        type=float
    )

    if latitude is None or longitude is None:

        return jsonify({
            "error": "Latitude and longitude are required."
        }), 400

    # ---------------------------------------------------------
    # CACHE KEY
    # ---------------------------------------------------------

    cache_key = (
        round(latitude, 4),
        round(longitude, 4)
    )

    # ---------------------------------------------------------
    # RETURN CACHED WEATHER IF AVAILABLE
    # ---------------------------------------------------------

    cached = WEATHER_CACHE.get(cache_key)

    if cached:

        cached_data, cached_time = cached

        if time.time() - cached_time < WEATHER_CACHE_TTL:

            return jsonify(cached_data)

    # ---------------------------------------------------------
    # OPEN-METEO REQUEST
    # ---------------------------------------------------------

    params = {

        "latitude": latitude,

        "longitude": longitude,

        "current": ",".join([

            "temperature_2m",

            "relative_humidity_2m",

            "apparent_temperature",

            "is_day",

            "precipitation",

            "rain",

            "weather_code",

            "cloud_cover",

            "pressure_msl",

            "surface_pressure",

            "wind_speed_10m",

            "wind_direction_10m",

            "wind_gusts_10m"
        ]),

        "hourly": ",".join([

            "visibility",

            "temperature_2m",

            "apparent_temperature",

            "precipitation_probability",

            "precipitation",

            "relative_humidity_2m",

            "cloud_cover",

            "weather_code",

            "wind_speed_10m"
        ]),

        "daily": ",".join([

            "weather_code",

            "temperature_2m_max",

            "temperature_2m_min",

            "apparent_temperature_max",

            "apparent_temperature_min",

            "sunrise",

            "sunset",

            "uv_index_max",

            "precipitation_sum",

            "precipitation_probability_max",

            "wind_speed_10m_max"
        ]),

        "forecast_days": 7,

        "timezone": "auto",

        "temperature_unit": "celsius",

        "wind_speed_unit": "kmh",

        "precipitation_unit": "mm"
    }

    try:

        response = requests.get(
            OPEN_METEO_FORECAST,
            params=params,
            timeout=20
        )

        # -----------------------------------------------------
        # HANDLE RATE LIMIT
        # -----------------------------------------------------

        if response.status_code == 429:

            # If old cached data exists, use it
            if cached:

                cached_data, cached_time = cached

                return jsonify(cached_data)

            return jsonify({
                "error": "Weather service is temporarily busy. Please try again in a minute."
            }), 429

        response.raise_for_status()

        weather_data = response.json()

        # -----------------------------------------------------
        # SAVE RESPONSE IN CACHE
        # -----------------------------------------------------

        WEATHER_CACHE[cache_key] = (
            weather_data,
            time.time()
        )

        return jsonify(weather_data)

    except requests.RequestException as error:

        # -----------------------------------------------------
        # FALLBACK TO OLD CACHE
        # -----------------------------------------------------

        if cached:

            cached_data, cached_time = cached

            return jsonify(cached_data)

        return jsonify({
            "error": f"Weather service is temporarily unavailable. Please try again shortly."
        }), 502

# SANDHU
# =========================================================
# LOGIN SESSION
# =========================================================

@app.get("/api/me")
def get_current_user():

    return jsonify({
        "user": session.get("user")
    })







# =========================================================
# SIGNUP
# =========================================================

@app.post("/api/signup")
def signup():

    data = request.get_json(
        silent=True
    ) or {}

    name = data.get(
        "name",
        ""
    ).strip()

    email = data.get(
        "email",
        ""
    ).strip().lower()

    password = data.get(
        "password",
        ""
    )

    # Validation

    if len(name) < 2:

        return jsonify({
            "error": "Please enter your full name."
        }), 400

    if "@" not in email or "." not in email:

        return jsonify({
            "error": "Please enter a valid email address."
        }), 400

    if len(password) < 6:

        return jsonify({
            "error": "Password must be at least 6 characters."
        }), 400

    users = load_json(
        USERS_FILE,
        []
    )

    # Check duplicate email

    if any(
        user["email"] == email
        for user in users
    ):

        return jsonify({
            "error": "An account with this email already exists."
        }), 409

    user = {

        "id": len(users) + 1,

        "name": name,

        "email": email,

        "password_hash":
            generate_password_hash(password),

        "created_at":
            datetime.now(
                timezone.utc
            ).isoformat()
    }

    users.append(user)

    save_json(
        USERS_FILE,
        users
    )

    session["user"] = {

        "id": user["id"],

        "name": name,

        "email": email
    }
# SANDHU
    return jsonify({

        "message":
            "Account created successfully.",

        "user":
            session["user"]

    }), 201


# =========================================================
# LOGIN
# =========================================================

@app.post("/api/login")
def login():

    data = request.get_json(
        silent=True
    ) or {}

    email = data.get(
        "email",
        ""
    ).strip().lower()

    password = data.get(
        "password",
        ""
    )
# SANDHU
    users = load_json(
        USERS_FILE,
        []
    )

    user = next(
        (
            user
            for user in users
            if user["email"] == email
        ),
        None
    )

    if not user:

        return jsonify({
            "error": "Incorrect email or password."
        }), 401

    if not check_password_hash(
        user["password_hash"],
        password
    ):

        return jsonify({
            "error": "Incorrect email or password."
        }), 401

    session["user"] = {

        "id": user["id"],

        "name": user["name"],

        "email": user["email"]
    }
# SANDHU
    return jsonify({

        "message":
            "Login successful.",

        "user":
            session["user"]

    })


# =========================================================
# LOGOUT
# =========================================================

@app.post("/api/logout")
def logout():

    session.clear()

    return jsonify({
        "message": "Logged out successfully."
    })


# =========================================================
# CONTACT FORM
# =========================================================
# SANDHU
@app.post("/api/contact")
def contact_message():

    data = request.get_json(
        silent=True
    ) or {}

    name = data.get(
        "name",
        ""
    ).strip()

    email = data.get(
        "email",
        ""
    ).strip().lower()

    subject = data.get(
        "subject",
        ""
    ).strip()

    message = data.get(
        "message",
        ""
    ).strip()

    if not name or not email or not subject or not message:

        return jsonify({
            "error": "Please fill in every field."
        }), 400

    if "@" not in email:

        return jsonify({
            "error": "Please enter a valid email."
        }), 400
# SANDHU
    if len(message) < 10:

        return jsonify({
            "error":
                "Message should be at least 10 characters."
        }), 400

    contacts = load_json(
        CONTACTS_FILE,
        []
    )




    contacts.append({

        "id": len(contacts) + 1,

        "name": name,

        "email": email,

        "subject": subject,

        "message": message,

        "created_at":
            datetime.now(
                timezone.utc
            ).isoformat()
    })




# SANDHU




    save_json(
        CONTACTS_FILE,
        contacts
    )

    return jsonify({

        "message":
            "Thanks! Your message has been received."

    }), 201

# SANDHU
# =========================================================
# START SERVER
# =========================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )




    # MADE WITH LOVE BY ANMOL SINGH SANDHU 