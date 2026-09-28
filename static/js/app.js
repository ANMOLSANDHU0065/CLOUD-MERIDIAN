/* =========================================================
   Cloud Meridian
   MAIN JAVASCRIPT
========================================================= */
// SANDHU

/* =========================================================
   GLOBAL STATE
========================================================= */

const state = {

    cities: [],

    filteredCities: [],

    currentCity: null,

    weatherData: null,

    unit: "C",

    chart: null,

    showAllCities: false

};

// SANDHU
/* =========================================================
   DOM
========================================================= */

const pageLoader =
    document.getElementById("pageLoader");

const citySearch =
    document.getElementById("citySearch");

const searchButton =
    document.getElementById("searchButton");

const searchResults =
    document.getElementById("searchResults");

const clearSearch =
    document.getElementById("clearSearch");

const locationButton =
    document.getElementById("locationButton");

const stateSelect =
    document.getElementById("stateSelect");

const citySelect =
    document.getElementById("citySelect");

const themeToggle =
    document.getElementById("themeToggle");

const unitToggle =
    document.getElementById("unitToggle");

const mobileMenuButton =
    document.getElementById(
        "mobileMenuButton"
    );

const mobileNav =
    document.getElementById("mobileNav");

const errorContainer =
    document.getElementById(
        "errorContainer"
    );

const errorMessage =
    document.getElementById(
        "errorMessage"
    );
// SANDHU
const closeError =
    document.getElementById("closeError");

const citiesGrid =
    document.getElementById("citiesGrid");

const showAllCities =
    document.getElementById(
        "showAllCities"
    );


/* =========================================================
   WEATHER CODES
========================================================= */
// SANDHU
const weatherCodes = {

    0: {
        text: "Clear Sky",
        icon: "☀️"
    },

    1: {
        text: "Mainly Clear",
        icon: "🌤️"
    },

    2: {
        text: "Partly Cloudy",
        icon: "⛅"
    },

    3: {
        text: "Overcast",
        icon: "☁️"
    },

    45: {
        text: "Fog",
        icon: "🌫️"
    },

    48: {
        text: "Rime Fog",
        icon: "🌫️"
    },

    51: {
        text: "Light Drizzle",
        icon: "🌦️"
    },

    53: {
        text: "Drizzle",
        icon: "🌦️"
    },

    55: {
        text: "Heavy Drizzle",
        icon: "🌧️"
    },

    61: {
        text: "Light Rain",
        icon: "🌦️"
    },

    63: {
        text: "Rain",
        icon: "🌧️"
    },

    65: {
        text: "Heavy Rain",
        icon: "🌧️"
    },

    71: {
        text: "Light Snow",
        icon: "🌨️"
    },

    73: {
        text: "Snow",
        icon: "❄️"
    },

    75: {
        text: "Heavy Snow",
        icon: "❄️"
    },

    80: {
        text: "Rain Showers",
        icon: "🌦️"
    },

    81: {
        text: "Rain Showers",
        icon: "🌧️"
    },

    82: {
        text: "Heavy Showers",
        icon: "⛈️"
    },

    95: {
        text: "Thunderstorm",
        icon: "⛈️"
    },

    96: {
        text: "Thunderstorm + Hail",
        icon: "⛈️"
    },

    99: {
        text: "Heavy Thunderstorm",
        icon: "⛈️"
    }

};


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setupEvents();

        loadSavedTheme();

        await loadCities();

        await loadDefaultWeather();

        setTimeout(
            () => {

                pageLoader?.classList.add(
                    "hide"
                );

            },
            400
        );

    }
);
// SANDHU

/* =========================================================
   EVENTS
========================================================= */

function setupEvents() {


    /* SEARCH */

    searchButton?.addEventListener(
        "click",
        runSearch
    );


    citySearch?.addEventListener(
        "input",
        handleSearchInput
    );


    citySearch?.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                runSearch();

            }

            if (event.key === "Escape") {

                hideSearchResults();

            }

        }
    );


    clearSearch?.addEventListener(
        "click",
        () => {

            citySearch.value = "";

            clearSearch.style.display =
                "none";

            hideSearchResults();

            citySearch.focus();

        }
    );


    document.addEventListener(
        "click",
        event => {

            if (
                !event.target.closest(
                    ".search-wrapper"
                )
            ) {

                hideSearchResults();

            }

        }
    );


    /* LOCATION */

    locationButton?.addEventListener(
        "click",
        useMyLocation
    );


    /* STATE */

    stateSelect?.addEventListener(
        "change",
        handleStateChange
    );


    /* CITY */

    citySelect?.addEventListener(
        "change",
        handleCityChange
    );

// SANDHU
    /* THEME */

    themeToggle?.addEventListener(
        "click",
        toggleTheme
    );


    /* UNIT */

    unitToggle?.addEventListener(
        "click",
        toggleUnit
    );


    /* MOBILE */

    mobileMenuButton?.addEventListener(
        "click",
        () => {

            mobileNav.classList.toggle(
                "show"
            );

        }
    );


    /* ERROR */

    closeError?.addEventListener(
        "click",
        hideError
    );


    /* ALL CITIES */

    showAllCities?.addEventListener(
        "click",
        () => {

            state.showAllCities =
                !state.showAllCities;

            renderCities();

        }
    );

}

// SANDHU
/* =========================================================
   LOAD CITIES
========================================================= */
async function loadCities() {

    try {

        const response = await fetch("/api/cities");

        if (!response.ok) {

            throw new Error(
                `Could not load cities. Server returned ${response.status}.`
            );

        }


        const rawCities = await response.json();


        const citiesData =
            Array.isArray(rawCities)
                ? rawCities
                : rawCities?.cities;


        if (!Array.isArray(citiesData)) {

            throw new Error(
                "Invalid cities data received from server."
            );

        }


        state.cities = citiesData

            .map(city => {

                const latitude =
                    city.lat ??
                    city.latitude ??
                    city.coordinates?.lat ??
                    city.coordinates?.latitude;


                const longitude =
                    city.lon ??
                    city.lng ??
                    city.longitude ??
                    city.coordinates?.lon ??
                    city.coordinates?.lng ??
                    city.coordinates?.longitude;


                return {

                    name:
                        city.name ??
                        city.city ??
                        "",

                    state:
                        city.state ??
                        city.stateName ??
                        "",

                    lat: Number(latitude),

                    lon: Number(longitude)

                };

            })


            .filter(city => {

                return (

                    city.name.trim() !== "" &&

                    city.state.trim() !== "" &&

                    Number.isFinite(city.lat) &&

                    Number.isFinite(city.lon)

                );

            });


        if (!state.cities.length) {

            throw new Error(
                "No valid cities with coordinates were found."
            );

        }


        state.filteredCities = [
            ...state.cities
        ];


        populateStates();

        populateCities();

        renderCities();


        console.log(
            `Cloud Meridian loaded ${state.cities.length} cities.`
        );


    }

    catch (error) {

        console.error(
            "Cities loading error:",
            error
        );

        showError(error.message);

    }

}


/* =========================================================
   STATES
========================================================= */

function populateStates() {

    if (!stateSelect) return;

    const states = [
        ...new Set(
            state.cities
                .map(city => city.state)
                .filter(Boolean)
        )
    ].sort(
        (a, b) =>
            a.localeCompare(b)
    );


    stateSelect.innerHTML = `
        <option value="">
            All States
        </option>
    `;


    states.forEach(
        stateName => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                stateName;

            option.textContent =
                stateName;

            stateSelect.appendChild(
                option
            );

        }
    );

}


/* =========================================================
   CITIES SELECT
========================================================= */

function populateCities() {

    if (!citySelect) return;


    const selectedState =
        stateSelect?.value || "";


    let cities =
        state.cities;


    if (selectedState) {

        cities =
            cities.filter(
                city =>
                    city.state ===
                    selectedState
            );

    }


    citySelect.innerHTML = `
        <option value="">
            Select City
        </option>
    `;


    cities
        .sort(
            (a, b) =>
                a.name.localeCompare(
                    b.name
                )
        )
        .forEach(
            city => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    city.name;

                option.textContent =
                    city.name;

                citySelect.appendChild(
                    option
                );

            }
        );

}


/* =========================================================
   STATE CHANGE
========================================================= */

function handleStateChange() {

    populateCities();

}


/* =========================================================
   CITY CHANGE
========================================================= */

async function handleCityChange() {

    const cityName =
        citySelect.value;

    if (!cityName) return;


    const city =
        state.cities.find(
            item =>
                item.name ===
                    cityName &&
                (
                    !stateSelect.value ||
                    item.state ===
                        stateSelect.value
                )
        );


    if (!city) return;


    await loadWeather(
        city.lat,
        city.lon,
        city.name,
        city.state
    );

}


/* =========================================================
   DEFAULT WEATHER
========================================================= */

async function loadDefaultWeather() {

    const defaultCity =
        state.cities.find(
            city =>
                city.name ===
                "New Delhi"
        );


    if (defaultCity) {

        await loadWeather(
            defaultCity.lat,
            defaultCity.lon,
            defaultCity.name,
            defaultCity.state
        );

        return;

    }


    await loadWeather(
        28.6139,
        77.2090,
        "New Delhi",
        "Delhi"
    );

}


/* =========================================================
   WEATHER API
========================================================= */

async function loadWeather(
    latitude,
    longitude,
    cityName = "India",
    stateName = "India"
) {

    showLoadingState();

    hideError();

    try {
// SANDHU
        const response =
            await fetch(
                `/api/weather?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`
            );


        if (!response.ok) {

            const data =
                await response.json()
                .catch(
                    () => ({})
                );

            throw new Error(
                data.error ||
                "Unable to load weather."
            );

        }


        const data =
            await response.json();


        state.weatherData =
            data;


        state.currentCity = {

            name: cityName,

            state: stateName,

            latitude,

            longitude

        };


        renderWeather(
            data,
            cityName,
            stateName
        );


        citySearch.value =
            cityName;

        clearSearch.style.display =
            "block";


        hideSearchResults();


    } catch (error) {

        showError(
            error.message
        );

    } finally {

        hideLoadingState();

    }

}
// SANDHU

/* =========================================================
   RENDER WEATHER
========================================================= */

function renderWeather(
    data,
    cityName,
    stateName
) {

    const current =
        data.current;

    const daily =
        data.daily;

    const hourly =
        data.hourly;


    if (!current) return;


    /* LOCATION */

    setText(
        "weatherCity",
        cityName
    );

    setText(
        "weatherState",
        `${stateName || "India"}, India`
    );


    /* TIMEZONE */

    setText(
        "weatherTimezone",
        data.timezone_abbreviation ||
        data.timezone ||
        "Local Weather"
    );


    /* CURRENT */

    const temperature =
        current.temperature_2m;

    const feels =
        current.apparent_temperature;


    setText(
        "currentTemperature",
        formatTemperature(
            temperature,
            false
        )
    );


    setText(
        "temperatureUnit",
        `°${state.unit}`
    );


    setText(
        "feelsLike",
        `${formatTemperature(
            feels,
            true
        )}°${state.unit}`
    );

// SANDHU
    /* CONDITION */

    const weather =
        getWeatherInfo(
            current.weather_code
        );


    setText(
        "weatherDescription",
        weather.text
    );


    setHTML(
        "weatherIcon",
        weather.icon
    );


    /* DAY NIGHT */

    const isDay =
        current.is_day === 1;


    setHTML(
        "dayNightIcon",
        isDay ? "☀️" : "🌙"
    );


    setText(
        "dayNightText",
        isDay ? "Day" : "Night"
    );


    /* TODAY HIGH LOW */

    if (daily) {

        setText(
            "todayHigh",
            `${formatTemperature(
                daily.temperature_2m_max?.[0],
                true
            )}°${state.unit}`
        );


        setText(
            "todayLow",
            `${formatTemperature(
                daily.temperature_2m_min?.[0],
                true
            )}°${state.unit}`
        );

    }

// SANDHU
    /* STATS */

    setText(
        "humidity",
        `${current.relative_humidity_2m ?? "--"}%`
    );


    setText(
        "windSpeed",
        `${Math.round(
            current.wind_speed_10m ?? 0
        )} km/h`
    );


    setText(
        "windDirection",
        `Direction: ${
            getWindDirection(
                current.wind_direction_10m
            )
        }`
    );


    setText(
        "precipitation",
        `${Number(
            current.precipitation ?? 0
        ).toFixed(1)} mm`
    );


    const uv =
        daily?.uv_index_max?.[0];


    setText(
        "uvIndex",
        uv != null
            ? Number(uv).toFixed(1)
            : "--"
    );


    setText(
        "uvText",
        getUVText(uv)
    );


    setText(
        "cloudCover",
        `${current.cloud_cover ?? "--"}%`
    );


    setText(
        "pressure",
        `${Math.round(
            current.pressure_msl ?? 0
        )} hPa`
    );

// SANDHU
    /* VISIBILITY */

    const visibility =
        getCurrentHourlyValue(
            hourly,
            "visibility"
        );


    setText(
        "visibility",
        visibility != null
            ? `${(
                Number(visibility) / 1000
            ).toFixed(1)} km`
            : "-- km"
    );


    /* GUST */

    setText(
        "windGust",
        `${Math.round(
            current.wind_gusts_10m ?? 0
        )} km/h`
    );


    /* TIME */

    updateLocalTime(
        current.time
    );


    /* CHART */

    createHourlyChart(
        hourly
    );


    /* FORECAST */

    renderForecast(
        daily
    );


    /* SUN */

    renderSunData(
        daily,
        current.time
    );

}
// SANDHU

/* =========================================================
   WEATHER INFO
========================================================= */

function getWeatherInfo(code) {

    return (
        weatherCodes[code] ||
        {
            text: "Weather Update",
            icon: "🌤️"
        }
    );

}


/* =========================================================
   TEMPERATURE
========================================================= */

function formatTemperature(
    value,
    round = true
) {

    if (
        value === null ||
        value === undefined ||
        Number.isNaN(Number(value))
    ) {

        return "--";

    }

// SANDHU
    let temperature =
        Number(value);


    if (state.unit === "F") {

        temperature =
            (
                temperature * 9 / 5
            ) + 32;

    }


    return round
        ? Math.round(temperature)
        : temperature.toFixed(1);

}


/* =========================================================
   LOCAL TIME
========================================================= */

function updateLocalTime(
    apiTime
) {

    if (!apiTime) return;


    const time =
        apiTime.includes("T")
            ? apiTime.split("T")[1]
            : apiTime;


    const cleanTime =
        time.slice(0, 5);


    setText(
        "localTime",
        `Local time • ${cleanTime}`
    );

}


/* =========================================================
   HOURLY CHART
========================================================= */

function createHourlyChart(
    hourly
) {

    if (!hourly?.time) return;


    const canvas =
        document.getElementById(
            "hourlyChart"
        );


    if (!canvas) return;


    if (state.chart) {

        state.chart.destroy();

    }


    let startIndex = 0;


    if (
        state.weatherData?.current?.time
    ) {

        const index =
            hourly.time.indexOf(
                state.weatherData.current.time
            );


        if (index >= 0) {

            startIndex = index;

        }

    }


    const times =
        hourly.time.slice(
            startIndex,
            startIndex + 24
        );


    const temperatures =
        hourly.temperature_2m.slice(
            startIndex,
            startIndex + 24
        );


    const rain =
        hourly.precipitation_probability?.slice(
            startIndex,
            startIndex + 24
        ) || [];


    const labels =
        times.map(
            time =>
                time
                    .split("T")[1]
                    .slice(0, 5)
        );


    state.chart =
        new Chart(
            canvas,
            {

                type: "line",

                data: {

                    labels,

                    datasets: [

                        {

                            label:
                                "Temperature",

                            data:
                                temperatures.map(
                                    temp =>
                                        state.unit === "F"
                                            ? (
                                                temp * 9 / 5
                                            ) + 32
                                            : temp
                                ),

                            borderColor:
                                "#ef946e",

                            backgroundColor:
                                "rgba(239,148,110,.13)",

                            fill: true,

                            tension: .4,

                            pointRadius: 3,

                            pointHoverRadius: 6

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    interaction: {

                        intersect: false,

                        mode: "index"

                    },

                    plugins: {

                        legend: {

                            display: false

                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    context =>
                                        ` ${context.parsed.y.toFixed(1)}°${state.unit}`

                            }

                        }

                    },

                    scales: {

                        x: {

                            grid: {

                                display: false

                            },

                            ticks: {

                                color:
                                    "#8a939e",

                                maxTicksLimit: 8

                            }

                        },

                        y: {

                            grid: {

                                color:
                                    "rgba(130,120,110,.08)"

                            },

                            ticks: {

                                color:
                                    "#8a939e",

                                callback:
                                    value =>
                                        `${value}°${state.unit}`

                            }

                        }

                    }

                }

            }
        );

    return rain;

}


/* =========================================================
   7 DAY FORECAST
========================================================= */

function renderForecast(
    daily
) {

    const container =
        document.getElementById(
            "forecastGrid"
        );


    if (!container || !daily) return;


    container.innerHTML = "";


    const totalDays =
        Math.min(
            daily.time?.length || 0,
            7
        );


    for (
        let i = 0;
        i < totalDays;
        i++
    ) {

        const date =
            new Date(
                `${daily.time[i]}T12:00:00`
            );


        const dayName =
            i === 0
                ? "Today"
                : date.toLocaleDateString(
                    "en-IN",
                    {
                        weekday: "short"
                    }
                );


        const weather =
            getWeatherInfo(
                daily.weather_code[i]
            );


        const high =
            formatTemperature(
                daily.temperature_2m_max[i],
                true
            );


        const low =
            formatTemperature(
                daily.temperature_2m_min[i],
                true
            );


        const rain =
            daily.precipitation_probability_max?.[i];


        const card =
            document.createElement(
                "div"
            );


        card.className =
            "forecast-item";


        card.innerHTML = `

            <div class="forecast-day">
                ${dayName}
            </div>

            <div class="forecast-icon">
                ${weather.icon}
            </div>

            <div class="forecast-temp">

                <span class="forecast-high">
                    ${high}°
                </span>

                <span class="forecast-low">
                    ${low}°
                </span>

            </div>

            <div class="forecast-rain">
                <i class="fa-solid fa-droplet"></i>
                ${rain ?? 0}% rain
            </div>

        `;


        container.appendChild(
            card
        );

    }

}


/* =========================================================
   SUN
========================================================= */

function renderSunData(
    daily,
    currentTime
) {

    if (!daily) return;


    setText(
        "sunrise",
        formatTime(
            daily.sunrise?.[0]
        )
    );


    setText(
        "sunset",
        formatTime(
            daily.sunset?.[0]
        )
    );


    calculateDayProgress(
        daily.sunrise?.[0],
        daily.sunset?.[0],
        currentTime
    );

}


/* =========================================================
   DAY PROGRESS
========================================================= */

function calculateDayProgress(
    sunrise,
    sunset,
    currentTime
) {

    if (
        !sunrise ||
        !sunset ||
        !currentTime
    ) return;


    const sunriseTime =
        new Date(
            sunrise
        ).getTime();


    const sunsetTime =
        new Date(
            sunset
        ).getTime();


    const nowTime =
        new Date(
            currentTime
        ).getTime();


    let progress =
        (
            (nowTime - sunriseTime) /
            (sunsetTime - sunriseTime)
        ) * 100;


    progress =
        Math.max(
            0,
            Math.min(
                100,
                progress
            )
        );


    const progressElement =
        document.getElementById(
            "dayProgress"
        );


    if (progressElement) {

        progressElement.style.width =
            `${progress}%`;

    }


    setText(
        "dayProgressText",
        `${Math.round(progress)}%`
    );

}


/* =========================================================
   FORMAT TIME
========================================================= */

function formatTime(
    value
) {

    if (!value) return "--";


    const time =
        value
            .split("T")[1]
            ?.slice(0, 5);


    return time || "--";

}


/* =========================================================
   WIND DIRECTION
========================================================= */

function getWindDirection(
    degrees
) {

    if (
        degrees === null ||
        degrees === undefined
    ) {

        return "--";

    }


    const directions = [

        "N",
        "NE",
        "E",
        "SE",
        "S",
        "SW",
        "W",
        "NW"

    ];


    const index =
        Math.round(
            degrees / 45
        ) % 8;


    return `${directions[index]} (${Math.round(degrees)}°)`;

}


/* =========================================================
   UV TEXT
========================================================= */

function getUVText(
    uv
) {

    if (
        uv === null ||
        uv === undefined
    ) {

        return "No data";

    }


    if (uv <= 2) {

        return "Low";

    }


    if (uv <= 5) {

        return "Moderate";

    }


    if (uv <= 7) {

        return "High";

    }


    if (uv <= 10) {

        return "Very High";

    }


    return "Extreme";

}


/* =========================================================
   HOURLY CURRENT VALUE
========================================================= */

function getCurrentHourlyValue(
    hourly,
    field
) {

    if (
        !hourly ||
        !hourly[field]
    ) {

        return null;

    }


    let index = 0;


    if (
        state.weatherData?.current?.time &&
        hourly.time
    ) {

        const found =
            hourly.time.indexOf(
                state.weatherData.current.time
            );


        if (found >= 0) {

            index = found;

        }

    }


    return hourly[field][index];

}


/* =========================================================
   SEARCH INPUT
========================================================= */

let searchTimer;


function handleSearchInput() {

    const query =
        citySearch.value.trim();


    clearSearch.style.display =
        query
            ? "block"
            : "none";


    clearTimeout(
        searchTimer
    );


    if (query.length < 2) {

        hideSearchResults();

        return;

    }


    searchTimer =
        setTimeout(
            () => {

                searchCities(
                    query
                );

            },
            250
        );

}


/* =========================================================
   SEARCH CITY API
========================================================= */

async function searchCities(
    query
) {

    try {

        const response =
            await fetch(
                `/api/search?q=${encodeURIComponent(query)}`
            );


        if (!response.ok) {

            throw new Error(
                "Search failed."
            );

        }


        const results =
            await response.json();


        if (!Array.isArray(results)) {

            hideSearchResults();

            return;

        }


        renderSearchResults(
            results
        );


    } catch (error) {

        console.error(
            error
        );

    }

}


/* =========================================================
   SEARCH RESULTS
========================================================= */

function renderSearchResults(
    results
) {

    if (!searchResults) return;


    searchResults.innerHTML = "";


    if (!results.length) {

        searchResults.innerHTML = `

            <div class="search-empty">

                <i class="fa-solid fa-location-dot"></i>

                No Indian city found.

            </div>

        `;

        searchResults.classList.add(
            "show"
        );

        return;

    }


    results
        .slice(0, 8)
        .forEach(
            result => {

                const button =
                    document.createElement(
                        "button"
                    );


                button.type =
                    "button";


                button.className =
                    "search-result-item";


                button.innerHTML = `

                    <span class="result-icon">

                        <i class="fa-solid fa-location-dot"></i>

                    </span>

                    <span>

                        <span class="result-name">
                            ${escapeHTML(
                                result.name
                            )}
                        </span>

                        <span class="result-location">
                            ${escapeHTML(
                                result.state ||
                                "India"
                            )},
                            India
                        </span>

                    </span>

                `;


                button.addEventListener(
                    "click",
                    async () => {

                        citySearch.value =
                            result.name;

                        clearSearch.style.display =
                            "block";

                        hideSearchResults();


                        await loadWeather(

                            result.latitude,

                            result.longitude,

                            result.name,

                            result.state ||
                                "India"

                        );

                    }
                );


                searchResults.appendChild(
                    button
                );

            }
        );


    searchResults.classList.add(
        "show"
    );

}
// SANDHU

/* =========================================================
   SEARCH BUTTON
========================================================= */

async function runSearch() {

    const query =
        citySearch.value.trim();


    if (query.length < 2) {

        showError(
            "Please enter a city name."
        );

        return;

    }


    await searchCities(
        query
    );


    const firstResult =
        searchResults?.querySelector(
            ".search-result-item"
        );


    if (firstResult) {

        firstResult.click();

    }

}


/* =========================================================
   LOCATION
========================================================= */

function useMyLocation() {

    if (!navigator.geolocation) {

        showError(
            "Your browser does not support location."
        );

        return;

    }


    locationButton.disabled =
        true;


    locationButton.innerHTML = `

        <i class="fa-solid fa-spinner fa-spin"></i>

        Detecting...

    `;


    navigator.geolocation.getCurrentPosition(

        async position => {

            await loadWeather(

                position.coords.latitude,

                position.coords.longitude,

                "Your Location",

                "India"

            );

// SANDHU
            locationButton.disabled =
                false;


            locationButton.innerHTML = `

                <i class="fa-solid fa-location-crosshairs"></i>

                Use My Location

            `;

        },

        error => {

            console.error(
                error
            );


            showError(
                "Location permission was denied or unavailable."
            );


            locationButton.disabled =
                false;


            locationButton.innerHTML = `

                <i class="fa-solid fa-location-crosshairs"></i>

                Use My Location

            `;

        },

        {

            enableHighAccuracy: true,

            timeout: 10000,

            maximumAge: 300000

        }

    );

}
// SANDHU

/* =========================================================
   POPULAR CITIES
========================================================= */

function renderCities() {

    if (!citiesGrid) return;


    // Clear old city cards
    citiesGrid.innerHTML = "";


    // Show 12 cities initially
    // Show all 140 cities when button is clicked
    const cities =
        state.showAllCities
            ? state.cities
            : state.cities.slice(0, 12);


    cities.forEach(city => {

        const card =
            document.createElement("article");


        card.className = "city-card";


        card.innerHTML = `

            <div class="city-top">

                <div class="city-icon">

                    <i class="fa-solid fa-city"></i>

                </div>


                <i
                    class="fa-solid fa-arrow-right city-arrow">
                </i>

            </div>


            <h3>
                ${escapeHTML(city.name)}
            </h3>


            <p>
                ${escapeHTML(city.state)}
            </p>

        `;


        card.addEventListener(
            "click",
            async () => {

                await loadWeather(

                    city.lat,

                    city.lon,

                    city.name,

                    city.state

                );


                window.scrollTo({

                    top: 350,

                    behavior: "smooth"

                });

            }
        );


        citiesGrid.appendChild(card);

    });


    // Update View All / Show Less button
    if (showAllCities) {

        showAllCities.innerHTML =

            state.showAllCities

                ? `
                    Show Less
                    <i class="fa-solid fa-arrow-up"></i>
                  `

                : `
                    View All Cities
                    <i class="fa-solid fa-arrow-right"></i>
                  `;
// SANDHU
    }

}
/* =========================================================
   THEME
========================================================= */

function loadSavedTheme() {

    const savedTheme =
        localStorage.getItem(
            "skycast-theme"
        );


    if (
        savedTheme === "dark"
    ) {

        document.body.classList.add(
            "dark-mode"
        );

        updateThemeIcon();

    }

}


function toggleTheme() {

    document.body.classList.toggle(
        "dark-mode"
    );


    const isDark =
        document.body.classList.contains(
            "dark-mode"
        );


    localStorage.setItem(
        "skycast-theme",
        isDark
            ? "dark"
            : "light"
    );


    updateThemeIcon();

}
// SANDHU

function updateThemeIcon() {

    if (!themeToggle) return;


    const isDark =
        document.body.classList.contains(
            "dark-mode"
        );


    themeToggle.innerHTML =
        isDark
            ? `<i class="fa-solid fa-sun"></i>`
            : `<i class="fa-solid fa-moon"></i>`;

}


/* =========================================================
   UNIT
========================================================= */

function toggleUnit() {

    state.unit =
        state.unit === "C"
            ? "F"
            : "C";


    unitToggle.textContent =
        `°${state.unit}`;


    if (
        state.weatherData &&
        state.currentCity
    ) {

        renderWeather(

            state.weatherData,

            state.currentCity.name,

            state.currentCity.state

        );

    }

}


/* =========================================================
   HELPERS
========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;

    }

}


function setHTML(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.innerHTML =
            value;

    }

}

// SANDHU
function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   SEARCH DROPDOWN
========================================================= */

function hideSearchResults() {

    searchResults?.classList.remove(
        "show"
    );

}


/* =========================================================
   ERROR
========================================================= */

function showError(
    message
) {

    if (!errorContainer) return;


    errorMessage.textContent =
        message;


    errorContainer.style.display =
        "block";


    errorContainer.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

}


function hideError() {

    if (!errorContainer) return;


    errorContainer.style.display =
        "none";

}


/* =========================================================
   LOADING
========================================================= */

function showLoadingState() {

    const temp =
        document.getElementById(
            "currentTemperature"
        );


    if (temp) {

        temp.classList.add(
            "loading-text"
        );

    }

}

// SANDHU
function hideLoadingState() {

    const temp =
        document.getElementById(
            "currentTemperature"
        );


    if (temp) {

        temp.classList.remove(
            "loading-text"
        );

    }

}


// SANDHU JI