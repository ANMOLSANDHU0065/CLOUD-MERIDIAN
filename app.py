from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from pathlib import Path
import requests
import os
import json
from datetime import datetime, timezone
import time
from dotenv import load_dotenv

load_dotenv()

# SANDHU
app = Flask(__name__)

# Change this before real deployment
app.secret_key = "cloud-meridian-change-this-secret-key"
BASE_DIR = Path(__file__).resolve().parent

DATA_DIR = BASE_DIR / "data"

CITIES_FILE = DATA_DIR / "cities.json"
USERS_FILE = DATA_DIR / "users.json"
CONTACTS_FILE = DATA_DIR / "contacts.json"



OPENWEATHER_CURRENT = "https://api.openweathermap.org/data/2.5/weather"
OPENWEATHER_FORECAST = "https://api.openweathermap.org/data/2.5/forecast"
OPENWEATHER_GEOCODING = "https://api.openweathermap.org/geo/1.0/direct"

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "").strip()





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

    query = request.args.get("q", "").strip()

    if len(query) < 2:
        return jsonify([])

    formatted = []
    seen = set()

    # Search local cities.json first
    try:
        cities = get_cities()
        if isinstance(cities, list):
            query_lower = query.lower()

            for city in cities:
                if not isinstance(city, dict):
                    continue

                name = str(city.get("name", "")).strip()
                state = str(city.get("state", "")).strip()

                if not name:
                    continue

                if query_lower not in name.lower() and query_lower not in state.lower():
                    continue

                latitude = city.get("latitude", city.get("lat"))
                longitude = city.get("longitude", city.get("lon"))

                try:
                    latitude = float(latitude)
                    longitude = float(longitude)
                except (TypeError, ValueError):
                    continue

                key = (round(latitude, 4), round(longitude, 4))
                if key in seen:
                    continue

                seen.add(key)
                formatted.append({
                    "name": name,
                    "state": state or "India",
                    "country": "IN",
                    "latitude": latitude,
                    "longitude": longitude,
                    "timezone": "Asia/Kolkata"
                })

    except Exception as error:
        print("Local city search failed:", error)

    # Search OpenWeather as well
    if OPENWEATHER_API_KEY:
        try:
            response = requests.get(
                OPENWEATHER_GEOCODING,
                params={
                    "q": f"{query},IN",
                    "limit": 12,
                    "appid": OPENWEATHER_API_KEY
                },
                timeout=10
            )

            response.raise_for_status()
            results = response.json()

            if isinstance(results, list):
                for item in results:
                    latitude = item.get("lat")
                    longitude = item.get("lon")

                    if latitude is None or longitude is None:
                        continue

                    if item.get("country", "IN") != "IN":
                        continue

                    latitude = float(latitude)
                    longitude = float(longitude)
                    key = (round(latitude, 4), round(longitude, 4))

                    if key in seen:
                        continue

                    seen.add(key)
                    formatted.append({
                        "name": item.get("name", query),
                        "state": item.get("state", "India"),
                        "country": "IN",
                        "latitude": latitude,
                        "longitude": longitude,
                        "timezone": "Asia/Kolkata"
                    })

        except (requests.RequestException, ValueError) as error:
            print("OpenWeather location search failed:", error)

    return jsonify(formatted[:12])

# =========================================================
# WEATHER API
# =========================================================

def openweather_code_to_wmo(code):

    if 200 <= code <= 232:
        return 95

    if 300 <= code <= 321:
        return 51

    if 500 <= code <= 504:
        if code == 500:
            return 61
        if code in (501, 502):
            return 63
        return 65

    if 600 <= code <= 622:
        return 73

    if 701 <= code <= 781:
        return 45

    if code == 800:
        return 0

    if code == 801:
        return 1

    if code == 802:
        return 2

    if code in (803, 804):
        return 3

    return 3


@app.get("/api/weather")
def weather():

    latitude = request.args.get("lat", type=float)
    longitude = request.args.get("lon", type=float)

    if latitude is None or longitude is None:
        return jsonify({
            "error": "Latitude and longitude are required."
        }), 400

    if not OPENWEATHER_API_KEY:
        return jsonify({
            "error": "OpenWeather API key is not configured on the server."
        }), 500

    cache_key = (
        round(latitude, 4),
        round(longitude, 4)
    )

    cached = WEATHER_CACHE.get(cache_key)

    if cached:
        cached_data, cached_time = cached
        if time.time() - cached_time < WEATHER_CACHE_TTL:
            return jsonify(cached_data)

    try:

        current_response = requests.get(
            OPENWEATHER_CURRENT,
            params={
                "lat": latitude,
                "lon": longitude,
                "appid": OPENWEATHER_API_KEY,
                "units": "metric"
            },
            timeout=12
        )

        forecast_response = requests.get(
            OPENWEATHER_FORECAST,
            params={
                "lat": latitude,
                "lon": longitude,
                "appid": OPENWEATHER_API_KEY,
                "units": "metric"
            },
            timeout=12
        )

        if current_response.status_code == 429 or forecast_response.status_code == 429:
            if cached:
                cached_data, cached_time = cached
                return jsonify(cached_data)

            return jsonify({
                "error": "OpenWeather rate limit reached. Please try again shortly."
            }), 429

        if current_response.status_code == 401 or forecast_response.status_code == 401:
            return jsonify({
                "error": "OpenWeather API key is not active yet. Please wait for activation."
            }), 401

        current_response.raise_for_status()
        forecast_response.raise_for_status()

        current = current_response.json()
        forecast = forecast_response.json()
        forecast_list = forecast.get("list", [])

        current_weather = current.get("weather", [{}])[0]
        current_dt = current.get("dt", int(time.time()))

        current_data = {
            "time": datetime.fromtimestamp(
                current_dt,
                timezone.utc
            ).isoformat(),
            "temperature_2m": current.get("main", {}).get("temp"),
            "relative_humidity_2m": current.get("main", {}).get("humidity"),
            "apparent_temperature": current.get("main", {}).get("feels_like"),
            "is_day": 1 if "d" in current_weather.get("icon", "") else 0,
            "precipitation": current.get("rain", {}).get(
                "1h",
                current.get("snow", {}).get("1h", 0)
            ),
            "rain": current.get("rain", {}).get("1h", 0),
            "weather_code": openweather_code_to_wmo(
                current_weather.get("id", 800)
            ),
            "cloud_cover": current.get("clouds", {}).get("all"),
            "pressure_msl": current.get("main", {}).get("pressure"),
            "surface_pressure": current.get("main", {}).get("pressure"),
            "wind_speed_10m": (
                current.get("wind", {}).get("speed", 0) * 3.6
            ),
            "wind_direction_10m": current.get("wind", {}).get("deg", 0),
            "wind_gusts_10m": (
                current.get("wind", {}).get("gust", 0) * 3.6
            )
        }

        hourly = {
            "time": [],
            "visibility": [],
            "temperature_2m": [],
            "apparent_temperature": [],
            "precipitation_probability": [],
            "precipitation": [],
            "relative_humidity_2m": [],
            "cloud_cover": [],
            "weather_code": [],
            "wind_speed_10m": []
        }

        for item in forecast_list:

            main = item.get("main", {})
            weather_item = item.get("weather", [{}])[0]
            rain = item.get("rain", {}).get(
                "3h",
                item.get("snow", {}).get("3h", 0)
            )

            hourly["time"].append(
                item.get("dt_txt") or datetime.fromtimestamp(
                    item.get("dt", current_dt),
                    timezone.utc
                ).isoformat()
            )
            hourly["visibility"].append(item.get("visibility", 10000))
            hourly["temperature_2m"].append(main.get("temp"))
            hourly["apparent_temperature"].append(main.get("feels_like"))
            hourly["precipitation_probability"].append(
                round(item.get("pop", 0) * 100)
            )
            hourly["precipitation"].append(rain)
            hourly["relative_humidity_2m"].append(main.get("humidity"))
            hourly["cloud_cover"].append(
                item.get("clouds", {}).get("all")
            )
            hourly["weather_code"].append(
                openweather_code_to_wmo(
                    weather_item.get("id", 800)
                )
            )
            hourly["wind_speed_10m"].append(
                item.get("wind", {}).get("speed", 0) * 3.6
            )

        daily = {
            "time": [],
            "weather_code": [],
            "temperature_2m_max": [],
            "temperature_2m_min": [],
            "apparent_temperature_max": [],
            "apparent_temperature_min": [],
            "sunrise": [],
            "sunset": [],
            "uv_index_max": [],
            "precipitation_sum": [],
            "precipitation_probability_max": [],
            "wind_speed_10m_max": []
        }

        grouped = {}

        for item in forecast_list:

            date_key = item.get("dt_txt", "")[:10]

            if not date_key:
                continue

            grouped.setdefault(date_key, []).append(item)

        for date_key, items in list(grouped.items())[:5]:

            temps = [
                item.get("main", {}).get("temp")
                for item in items
                if item.get("main", {}).get("temp") is not None
            ]

            feels = [
                item.get("main", {}).get("feels_like")
                for item in items
                if item.get("main", {}).get("feels_like") is not None
            ]

            rain_total = sum(
                item.get("rain", {}).get(
                    "3h",
                    item.get("snow", {}).get("3h", 0)
                )
                for item in items
            )

            pop_max = max(
                [item.get("pop", 0) * 100 for item in items],
                default=0
            )

            wind_max = max(
                [
                    item.get("wind", {}).get("speed", 0) * 3.6
                    for item in items
                ],
                default=0
            )

            weather_id = items[len(items) // 2].get(
                "weather",
                [{}]
            )[0].get("id", 800)

            daily["time"].append(date_key)
            daily["weather_code"].append(
                openweather_code_to_wmo(weather_id)
            )
            daily["temperature_2m_max"].append(max(temps) if temps else None)
            daily["temperature_2m_min"].append(min(temps) if temps else None)
            daily["apparent_temperature_max"].append(
                max(feels) if feels else None
            )
            daily["apparent_temperature_min"].append(
                min(feels) if feels else None
            )
            # Frontend expects Open-Meteo-style ISO date strings here.
            # OpenWeather returns Unix timestamps, so convert them first.
            sunrise_ts = current.get("sys", {}).get("sunrise")
            sunset_ts = current.get("sys", {}).get("sunset")

            daily["sunrise"].append(
                datetime.fromtimestamp(
                    sunrise_ts,
                    timezone.utc
                ).isoformat() if sunrise_ts else ""
            )

            daily["sunset"].append(
                datetime.fromtimestamp(
                    sunset_ts,
                    timezone.utc
                ).isoformat() if sunset_ts else ""
            )
            daily["uv_index_max"].append(None)
            daily["precipitation_sum"].append(rain_total)
            daily["precipitation_probability_max"].append(pop_max)
            daily["wind_speed_10m_max"].append(wind_max)

        # Keep the existing 7-day forecast structure for the UI.
        # OpenWeather 2.5 supplies up to 5 actual forecast days;
        # the remaining slots stay empty instead of inventing weather data.
        while len(daily["time"]) < 7:
            daily["time"].append("")
            daily["weather_code"].append(None)
            daily["temperature_2m_max"].append(None)
            daily["temperature_2m_min"].append(None)
            daily["apparent_temperature_max"].append(None)
            daily["apparent_temperature_min"].append(None)
            daily["sunrise"].append("")
            daily["sunset"].append("")
            daily["uv_index_max"].append(None)
            daily["precipitation_sum"].append(None)
            daily["precipitation_probability_max"].append(None)
            daily["wind_speed_10m_max"].append(None)


        weather_data = {
            "latitude": latitude,
            "longitude": longitude,
            "timezone": "Asia/Kolkata",
            "current": current_data,
            "hourly": hourly,
            "daily": daily
        }

        WEATHER_CACHE[cache_key] = (
            weather_data,
            time.time()
        )

        return jsonify(weather_data)

    except requests.RequestException:

        if cached:
            cached_data, cached_time = cached
            return jsonify(cached_data)

        return jsonify({
            "error": "OpenWeather service is temporarily unavailable. Please try again shortly."
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