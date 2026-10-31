/* ============================================================
   SOLSTICE SKIES — app.js
   Course skill on display: LIVE API + ASYNC JAVASCRIPT.
   Everything on the page is real data fetched from the
   Open-Meteo public APIs (no key needed, CORS enabled):
     1. Geocoding API  — turns a city name into coordinates
     2. Forecast API   — returns live weather for coordinates
   Read top to bottom: helpers -> geocoding -> forecast fetch
   -> rendering -> unit toggle -> favorites (localStorage).
   ============================================================ */
"use strict";

/* ---------- WMO weather codes -> plain words + an icon ----------
   Open-Meteo returns a numeric "weather_code". This table is the
   official WMO code list, translated into friendly text. */
const WEATHER_CODES = {
  0:  { label: "Clear sky",           icon: "☀️" },
  1:  { label: "Mainly clear",        icon: "🌤️" },
  2:  { label: "Partly cloudy",       icon: "⛅" },
  3:  { label: "Overcast",            icon: "☁️" },
  45: { label: "Foggy",               icon: "🌫️" },
  48: { label: "Rime fog",            icon: "🌫️" },
  51: { label: "Light drizzle",       icon: "🌦️" },
  53: { label: "Drizzle",             icon: "🌦️" },
  55: { label: "Heavy drizzle",       icon: "🌦️" },
  56: { label: "Freezing drizzle",    icon: "🌧️" },
  57: { label: "Freezing drizzle",    icon: "🌧️" },
  61: { label: "Light rain",          icon: "🌧️" },
  63: { label: "Rain",                icon: "🌧️" },
  65: { label: "Heavy rain",          icon: "🌧️" },
  66: { label: "Freezing rain",       icon: "🌧️" },
  67: { label: "Freezing rain",       icon: "🌧️" },
  71: { label: "Light snow",          icon: "🌨️" },
  73: { label: "Snow",                icon: "🌨️" },
  75: { label: "Heavy snow",          icon: "❄️" },
  77: { label: "Snow grains",         icon: "🌨️" },
  80: { label: "Light showers",       icon: "🌦️" },
  81: { label: "Rain showers",        icon: "🌦️" },
  82: { label: "Violent showers",     icon: "⛈️" },
  85: { label: "Snow showers",        icon: "🌨️" },
  86: { label: "Snow showers",        icon: "🌨️" },
  95: { label: "Thunderstorm",        icon: "⛈️" },
  96: { label: "Thunderstorm + hail", icon: "⛈️" },
  99: { label: "Thunderstorm + hail", icon: "⛈️" },
};
const describe = (code) => WEATHER_CODES[code] || { label: "Unknown", icon: "🌡️" };

/* ---------- App state ---------- */
const state = {
  unit: "fahrenheit",          // "fahrenheit" | "celsius" — sent to the API
  place: null,                 // the place currently on screen
  favorites: loadFavorites(),  // [{name, admin1, country, latitude, longitude}]
};

/* Sensible first-load default: Clarksville, Tennessee. */
const DEFAULT_PLACE = {
  name: "Clarksville", admin1: "Tennessee", country: "United States",
  latitude: 36.5298, longitude: -87.3595,
};

/* ---------- Small DOM helpers ---------- */
const $ = (id) => document.getElementById(id);
const statusEl = $("status");
function setStatus(msg, kind = "") {
  statusEl.textContent = msg;
  statusEl.className = "status" + (kind ? " " + kind : "");
}
const unitSymbol = () => (state.unit === "fahrenheit" ? "°F" : "°C");
const windUnitLabel = () => (state.unit === "fahrenheit" ? "mph" : "km/h");

/* ============================================================
   STEP 1 — GEOCODING: city name -> coordinates
   fetch() returns a Promise; "await" pauses this async function
   until the response arrives, so the code reads top-to-bottom
   instead of nesting callbacks.
   ============================================================ */
async function geocodeCity(query) {
  const url = "https://geocoding-api.open-meteo.com/v1/search"
    + "?name=" + encodeURIComponent(query)
    + "&count=1&language=en&format=json";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding request failed (" + res.status + ")");
  const data = await res.json();
  if (!data.results || data.results.length === 0) return null; // city not found
  const r = data.results[0];
  return {
    name: r.name, admin1: r.admin1 || "", country: r.country || "",
    latitude: r.latitude, longitude: r.longitude,
  };
}

/* ============================================================
   STEP 2 — FORECAST: coordinates -> live weather
   We ask the API for temperatures in the unit the user picked,
   so there is NO manual F<->C math to get wrong: the toggle
   simply re-fetches with temperature_unit=<unit>.
   ============================================================ */
function forecastUrl(place) {
  const params = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    temperature_unit: state.unit,
    wind_speed_unit: state.unit === "fahrenheit" ? "mph" : "kmh",
    timezone: "auto",
    forecast_days: 7,
  });
  return "https://api.open-meteo.com/v1/forecast?" + params.toString();
}

async function fetchWeather(place) {
  const res = await fetch(forecastUrl(place));
  if (!res.ok) throw new Error("Forecast request failed (" + res.status + ")");
  return res.json();
}

/* Just the current temperature — used to fill the favorite chips. */
async function fetchCurrentTemp(place) {
  const params = new URLSearchParams({
    latitude: place.latitude, longitude: place.longitude,
    current: "temperature_2m", temperature_unit: state.unit,
  });
  const res = await fetch("https://api.open-meteo.com/v1/forecast?" + params.toString());
  if (!res.ok) throw new Error("Temp request failed");
  const data = await res.json();
  return Math.round(data.current.temperature_2m);
}

/* ============================================================
   STEP 3 — RENDERING: put the API data on the page
   ============================================================ */
function renderWeather(place, data) {
  const cur = data.current;
  const info = describe(cur.weather_code);
  $("placeName").textContent =
    place.name + (place.admin1 ? ", " + place.admin1 : "") + (place.country ? " · " + place.country : "");
  $("curTemp").textContent = Math.round(cur.temperature_2m);
  $("curUnit").textContent = unitSymbol();
  $("curDesc").textContent = info.icon + " " + info.label;
  $("feelsLike").textContent = Math.round(cur.apparent_temperature) + unitSymbol();
  $("humidity").textContent = cur.relative_humidity_2m + "%";
  $("wind").textContent = Math.round(cur.wind_speed_10m) + " " + windUnitLabel();
  /* The API returns the location's own local time when timezone=auto. */
  $("localTime").textContent = cur.time.replace("T", " · ");
  updateFavButton();

  /* Daily forecast cards: zip the parallel arrays by index. */
  const grid = $("forecastGrid");
  grid.innerHTML = "";
  data.daily.time.forEach((dateStr, i) => {
    const d = describe(data.daily.weather_code[i]);
    const dayName = new Date(dateStr + "T12:00:00")
      .toLocaleDateString("en-US", { weekday: "short" });
    const card = document.createElement("article");
    card.className = "day-card";
    card.innerHTML =
      '<p class="day-name">' + dayName + "</p>" +
      '<div class="day-icon" aria-hidden="true">' + d.icon + "</div>" +
      '<p class="day-desc">' + d.label + "</p>" +
      '<p class="day-temps">' + Math.round(data.daily.temperature_2m_max[i]) + "° " +
      '<span class="lo">' + Math.round(data.daily.temperature_2m_min[i]) + "°</span></p>";
    grid.appendChild(card);
  });
  $("weatherPanel").hidden = false;
}

/* ============================================================
   THE MAIN FLOW: load one place, with loading + error states.
   try/catch is how async code handles failure: any throw inside
   try lands in catch, where we show a real error message.
   ============================================================ */
async function loadPlace(place) {
  state.place = place;
  setStatus("Fetching live skies for " + place.name + "…", "loading");
  try {
    const data = await fetchWeather(place);
    renderWeather(place, data);
    setStatus("Live from Open-Meteo · updated just now");
  } catch (err) {
    console.error(err);
    setStatus("Could not load weather for " + place.name +
      ". Check your connection and try again.", "error");
  }
  renderFavorites(); // chip temps depend on the current unit
}

/* Search form: geocode first, then load. Not found = error state. */
$("searchForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = $("cityInput").value.trim();
  if (!query) { setStatus("Type a city name first.", "error"); return; }
  setStatus("Searching for “" + query + "”…", "loading");
  try {
    const place = await geocodeCity(query);
    if (!place) {
      setStatus("No place found for “" + query + "”. Try another spelling or a nearby city.", "error");
      return;
    }
    await loadPlace(place);
  } catch (err) {
    console.error(err);
    setStatus("Search failed. Check your connection and try again.", "error");
  }
});

/* ============================================================
   UNIT TOGGLE: flipping units re-fetches the current place with
   the other temperature_unit, so every number (current, daily,
   favorites) re-renders consistently from the API.
   ============================================================ */
function setUnit(unit) {
  if (state.unit === unit) return;
  state.unit = unit;
  $("unitF").classList.toggle("active", unit === "fahrenheit");
  $("unitC").classList.toggle("active", unit === "celsius");
  if (state.place) loadPlace(state.place);
}
$("unitF").addEventListener("click", () => setUnit("fahrenheit"));
$("unitC").addEventListener("click", () => setUnit("celsius"));

/* ============================================================
   FAVORITES: saved in localStorage so they survive reloads.
   localStorage only stores strings, so objects go through
   JSON.stringify on the way in and JSON.parse on the way out.
   ============================================================ */
const FAV_KEY = "solsticeSkiesFavorites";
function loadFavorites() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; }
  catch { return []; }
}
function saveFavorites() {
  localStorage.setItem(FAV_KEY, JSON.stringify(state.favorites));
}
const samePlace = (a, b) =>
  a && b && Math.abs(a.latitude - b.latitude) < 0.01 &&
  Math.abs(a.longitude - b.longitude) < 0.01;
const isFavorite = (place) => state.favorites.some((f) => samePlace(f, place));

function updateFavButton() {
  const btn = $("favBtn");
  const saved = state.place && isFavorite(state.place);
  btn.textContent = saved ? "★ Saved" : "☆ Save";
  btn.classList.toggle("saved", !!saved);
}

$("favBtn").addEventListener("click", () => {
  if (!state.place) return;
  if (isFavorite(state.place)) {
    state.favorites = state.favorites.filter((f) => !samePlace(f, state.place));
  } else {
    state.favorites.push({ ...state.place });
  }
  saveFavorites();
  updateFavButton();
  renderFavorites();
});

/* Each favorite chip shows that city's LIVE temperature, fetched
   fresh (Promise.all runs the fetches in parallel). Clicking a
   chip loads the city; the × removes it. */
async function renderFavorites() {
  const panel = $("favoritesPanel");
  const list = $("favoritesList");
  if (state.favorites.length === 0) { panel.hidden = true; list.innerHTML = ""; return; }
  panel.hidden = false;
  list.innerHTML = "";
  const temps = await Promise.all(
    state.favorites.map((f) => fetchCurrentTemp(f).catch(() => null))
  );
  state.favorites.forEach((fav, i) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "fav-chip";
    chip.innerHTML =
      "<span>" + fav.name + "</span>" +
      '<span class="fav-temp">' + (temps[i] === null ? "—" : temps[i] + unitSymbol()) + "</span>" +
      '<span class="fav-remove" title="Remove" aria-label="Remove ' + fav.name + '">×</span>';
    chip.addEventListener("click", (e) => {
      if (e.target.classList.contains("fav-remove")) {
        state.favorites = state.favorites.filter((f) => f !== fav);
        saveFavorites();
        updateFavButton();
        renderFavorites();
      } else {
        loadPlace(fav);
      }
    });
    list.appendChild(chip);
  });
}

/* ---------- First load: default city + any saved favorites ---------- */
loadPlace(DEFAULT_PLACE);
