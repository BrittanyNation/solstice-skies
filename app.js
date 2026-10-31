/* ============================================================
   SOLSTICE SKIES — app.js
   Course skill on display: LIVE API + ASYNC JAVASCRIPT.
   Everything on the page is real data fetched from the
   Open-Meteo public APIs (no key needed, CORS enabled):
     1. Geocoding API  — turns a city name into coordinates
     2. Forecast API   — returns live weather for coordinates
   Read top to bottom: helpers -> geocoding -> forecast fetch
   -> rendering -> search autocomplete -> unit toggle
   -> browse by state -> favorites (localStorage).
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

/* ---------- Browse-by-state data ----------
   All 50 US states with two stable facts (capital + nickname) and
   a handful of notable cities each. This is plain reference data —
   NO weather lives here. Picking a city still geocodes it and
   fetches live weather exactly like the search box does. */
const US_STATES = [
  { name: "Alabama", capital: "Montgomery", nickname: "The Yellowhammer State", cities: ["Birmingham", "Montgomery", "Mobile", "Huntsville", "Tuscaloosa"] },
  { name: "Alaska", capital: "Juneau", nickname: "The Last Frontier", cities: ["Anchorage", "Juneau", "Fairbanks", "Sitka", "Ketchikan"] },
  { name: "Arizona", capital: "Phoenix", nickname: "The Grand Canyon State", cities: ["Phoenix", "Tucson", "Scottsdale", "Flagstaff", "Mesa"] },
  { name: "Arkansas", capital: "Little Rock", nickname: "The Natural State", cities: ["Little Rock", "Fayetteville", "Fort Smith", "Hot Springs", "Bentonville"] },
  { name: "California", capital: "Sacramento", nickname: "The Golden State", cities: ["Los Angeles", "San Francisco", "San Diego", "San Jose", "Sacramento", "Fresno"] },
  { name: "Colorado", capital: "Denver", nickname: "The Centennial State", cities: ["Denver", "Colorado Springs", "Boulder", "Fort Collins", "Aspen"] },
  { name: "Connecticut", capital: "Hartford", nickname: "The Constitution State", cities: ["Hartford", "New Haven", "Stamford", "Bridgeport", "Mystic"] },
  { name: "Delaware", capital: "Dover", nickname: "The First State", cities: ["Wilmington", "Dover", "Newark", "Rehoboth Beach", "Lewes"] },
  { name: "Florida", capital: "Tallahassee", nickname: "The Sunshine State", cities: ["Miami", "Orlando", "Tampa", "Jacksonville", "Key West"] },
  { name: "Georgia", capital: "Atlanta", nickname: "The Peach State", cities: ["Atlanta", "Savannah", "Athens", "Augusta", "Macon"] },
  { name: "Hawaii", capital: "Honolulu", nickname: "The Aloha State", cities: ["Honolulu", "Hilo", "Kailua-Kona", "Lahaina", "Lihue"] },
  { name: "Idaho", capital: "Boise", nickname: "The Gem State", cities: ["Boise", "Coeur d'Alene", "Idaho Falls", "Sun Valley", "Twin Falls"] },
  { name: "Illinois", capital: "Springfield", nickname: "The Prairie State", cities: ["Chicago", "Springfield", "Naperville", "Champaign", "Galena"] },
  { name: "Indiana", capital: "Indianapolis", nickname: "The Hoosier State", cities: ["Indianapolis", "Fort Wayne", "Bloomington", "South Bend", "Evansville"] },
  { name: "Iowa", capital: "Des Moines", nickname: "The Hawkeye State", cities: ["Des Moines", "Cedar Rapids", "Iowa City", "Davenport", "Ames"] },
  { name: "Kansas", capital: "Topeka", nickname: "The Sunflower State", cities: ["Wichita", "Kansas City", "Topeka", "Lawrence", "Manhattan"] },
  { name: "Kentucky", capital: "Frankfort", nickname: "The Bluegrass State", cities: ["Louisville", "Lexington", "Frankfort", "Bowling Green", "Covington"] },
  { name: "Louisiana", capital: "Baton Rouge", nickname: "The Pelican State", cities: ["New Orleans", "Baton Rouge", "Shreveport", "Lafayette", "Lake Charles"] },
  { name: "Maine", capital: "Augusta", nickname: "The Pine Tree State", cities: ["Portland", "Bangor", "Augusta", "Bar Harbor", "Lewiston"] },
  { name: "Maryland", capital: "Annapolis", nickname: "The Old Line State", cities: ["Baltimore", "Annapolis", "Frederick", "Ocean City", "Bethesda"] },
  { name: "Massachusetts", capital: "Boston", nickname: "The Bay State", cities: ["Boston", "Cambridge", "Worcester", "Salem", "Springfield", "Provincetown"] },
  { name: "Michigan", capital: "Lansing", nickname: "The Great Lakes State", cities: ["Detroit", "Grand Rapids", "Ann Arbor", "Lansing", "Traverse City"] },
  { name: "Minnesota", capital: "Saint Paul", nickname: "The North Star State", cities: ["Minneapolis", "Saint Paul", "Duluth", "Rochester", "St. Cloud"] },
  { name: "Mississippi", capital: "Jackson", nickname: "The Magnolia State", cities: ["Jackson", "Biloxi", "Gulfport", "Hattiesburg", "Oxford"] },
  { name: "Missouri", capital: "Jefferson City", nickname: "The Show-Me State", cities: ["Kansas City", "St. Louis", "Springfield", "Columbia", "Jefferson City"] },
  { name: "Montana", capital: "Helena", nickname: "The Treasure State", cities: ["Billings", "Missoula", "Bozeman", "Helena", "Great Falls"] },
  { name: "Nebraska", capital: "Lincoln", nickname: "The Cornhusker State", cities: ["Omaha", "Lincoln", "Grand Island", "Kearney", "Scottsbluff"] },
  { name: "Nevada", capital: "Carson City", nickname: "The Silver State", cities: ["Las Vegas", "Reno", "Henderson", "Carson City", "Elko"] },
  { name: "New Hampshire", capital: "Concord", nickname: "The Granite State", cities: ["Manchester", "Concord", "Portsmouth", "Nashua", "Hanover"] },
  { name: "New Jersey", capital: "Trenton", nickname: "The Garden State", cities: ["Newark", "Jersey City", "Atlantic City", "Princeton", "Trenton"] },
  { name: "New Mexico", capital: "Santa Fe", nickname: "The Land of Enchantment", cities: ["Albuquerque", "Santa Fe", "Taos", "Las Cruces", "Roswell"] },
  { name: "New York", capital: "Albany", nickname: "The Empire State", cities: ["New York", "Albany", "Buffalo", "Rochester", "Syracuse", "Ithaca"] },
  { name: "North Carolina", capital: "Raleigh", nickname: "The Tar Heel State", cities: ["Charlotte", "Raleigh", "Asheville", "Durham", "Wilmington"] },
  { name: "North Dakota", capital: "Bismarck", nickname: "The Peace Garden State", cities: ["Fargo", "Bismarck", "Grand Forks", "Minot", "Medora"] },
  { name: "Ohio", capital: "Columbus", nickname: "The Buckeye State", cities: ["Columbus", "Cincinnati", "Cleveland", "Dayton", "Toledo"] },
  { name: "Oklahoma", capital: "Oklahoma City", nickname: "The Sooner State", cities: ["Oklahoma City", "Tulsa", "Norman", "Broken Arrow", "Stillwater"] },
  { name: "Oregon", capital: "Salem", nickname: "The Beaver State", cities: ["Portland", "Eugene", "Salem", "Bend", "Ashland"] },
  { name: "Pennsylvania", capital: "Harrisburg", nickname: "The Keystone State", cities: ["Philadelphia", "Pittsburgh", "Harrisburg", "Erie", "Lancaster"] },
  { name: "Rhode Island", capital: "Providence", nickname: "The Ocean State", cities: ["Providence", "Newport", "Warwick", "Cranston", "Pawtucket"] },
  { name: "South Carolina", capital: "Columbia", nickname: "The Palmetto State", cities: ["Charleston", "Columbia", "Myrtle Beach", "Greenville", "Hilton Head Island"] },
  { name: "South Dakota", capital: "Pierre", nickname: "The Mount Rushmore State", cities: ["Sioux Falls", "Rapid City", "Pierre", "Aberdeen", "Deadwood"] },
  { name: "Tennessee", capital: "Nashville", nickname: "The Volunteer State", cities: ["Nashville", "Memphis", "Knoxville", "Chattanooga", "Clarksville"] },
  { name: "Texas", capital: "Austin", nickname: "The Lone Star State", cities: ["Houston", "Dallas", "Austin", "San Antonio", "Fort Worth", "El Paso"] },
  { name: "Utah", capital: "Salt Lake City", nickname: "The Beehive State", cities: ["Salt Lake City", "Park City", "Moab", "Provo", "St. George"] },
  { name: "Vermont", capital: "Montpelier", nickname: "The Green Mountain State", cities: ["Burlington", "Montpelier", "Stowe", "Rutland", "Brattleboro"] },
  { name: "Virginia", capital: "Richmond", nickname: "The Old Dominion", cities: ["Richmond", "Virginia Beach", "Norfolk", "Charlottesville", "Williamsburg"] },
  { name: "Washington", capital: "Olympia", nickname: "The Evergreen State", cities: ["Seattle", "Spokane", "Tacoma", "Olympia", "Bellingham"] },
  { name: "West Virginia", capital: "Charleston", nickname: "The Mountain State", cities: ["Charleston", "Morgantown", "Huntington", "Harpers Ferry", "Wheeling"] },
  { name: "Wisconsin", capital: "Madison", nickname: "The Badger State", cities: ["Milwaukee", "Madison", "Green Bay", "La Crosse", "Appleton"] },
  { name: "Wyoming", capital: "Cheyenne", nickname: "The Equality State", cities: ["Cheyenne", "Jackson", "Casper", "Cody", "Laramie"] },
];

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

/* Dropdown picks need the RIGHT same-named city — there are more
   than 30 Springfields in the US! First try the everyday geocoder
   above with a literal "City, State" search. If its top hit's
   admin1 (the API's name for the state) is a different state, ask
   for up to 10 matches and pick the one whose admin1 is ours. */
async function geocodeCityInState(city, stateName) {
  const first = await geocodeCity(city + ", " + stateName);
  if (first && first.admin1 === stateName) return first;
  const url = "https://geocoding-api.open-meteo.com/v1/search"
    + "?name=" + encodeURIComponent(city)
    + "&count=10&language=en&format=json";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding request failed (" + res.status + ")");
  const data = await res.json();
  if (!data.results || data.results.length === 0) return null; // city not found
  const match = data.results.find((r) => r.admin1 === stateName);
  const r = match || data.results[0];
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
  closeSuggestions(); // a raw submit means the dropdown's job is done
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
   SEARCH AUTOCOMPLETE: a dropdown that appears under the search
   box WHILE YOU TYPE and lets you tap the exact city you meant.

   Two ideas worth studying here:

   1. DEBOUNCE. Fetching on every single keystroke would fire a
      network request per letter — wasteful, and the answers can
      arrive out of order. Instead each keystroke restarts a
      250ms timer, and only when the typing pauses do we fetch.
      So "C-l-a-r-k" costs ONE request, not five.

   2. A SEQUENCE NUMBER for races. Even debounced, a slow answer
      to an older query could land AFTER a newer one and show
      stale suggestions. Every fetch takes a ticket (suggestSeq);
      when its answer arrives, it only renders if its ticket is
      still the latest one issued.

   Tapping a row loads THAT result's own latitude/longitude via
   loadPlace() — no second search, so the city she tapped is
   guaranteed to be the city that loads, even with 30+ Springfields
   and Clarksvilles in the world.
   ============================================================ */
const cityInput = $("cityInput");
const searchWrap = $("searchWrap");
const suggestList = $("suggestions");
let suggestItems = [];   // places behind the rows currently shown
let suggestActive = -1;  // keyboard-highlighted row (-1 = none)
let suggestTimer = null; // the debounce timer
let suggestSeq = 0;      // race-guard ticket, see note 2 above

function closeSuggestions() {
  suggestList.hidden = true;
  suggestList.innerHTML = "";
  suggestItems = [];
  suggestActive = -1;
  cityInput.setAttribute("aria-expanded", "false");
  cityInput.removeAttribute("aria-activedescendant");
}

/* Move the keyboard highlight to row i and keep ARIA in sync. */
function setSuggestActive(i) {
  suggestActive = i;
  [...suggestList.children].forEach((row, j) => {
    row.classList.toggle("active", j === i);
    row.setAttribute("aria-selected", j === i ? "true" : "false");
  });
  if (i >= 0) cityInput.setAttribute("aria-activedescendant", "suggestion-" + i);
  else cityInput.removeAttribute("aria-activedescendant");
}

function renderSuggestions(places, query) {
  suggestList.innerHTML = "";
  suggestItems = places;
  suggestActive = -1;
  if (places.length === 0) {
    /* No matches is not an error — just one quiet, untappable row.
       The status line stays out of it while she is still typing. */
    const li = document.createElement("li");
    li.className = "suggestion-empty";
    li.textContent = "No matches for “" + query + "” — keep typing or try another spelling";
    suggestList.appendChild(li);
  } else {
    places.forEach((place, i) => {
      const li = document.createElement("li");
      li.className = "suggestion";
      li.id = "suggestion-" + i;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", "false");
      const name = document.createElement("span");
      name.className = "suggestion-name";
      name.textContent = place.name;
      const meta = document.createElement("span");
      meta.className = "suggestion-meta";
      meta.textContent = [place.admin1, place.country].filter(Boolean).join(" · ");
      li.append(name, meta);
      li.addEventListener("click", () => selectSuggestion(place));
      li.addEventListener("mouseenter", () => setSuggestActive(i));
      suggestList.appendChild(li);
    });
  }
  suggestList.hidden = false;
  cityInput.setAttribute("aria-expanded", "true");
}

async function fetchSuggestions(query) {
  const ticket = ++suggestSeq; // take a race-guard ticket
  const url = "https://geocoding-api.open-meteo.com/v1/search"
    + "?name=" + encodeURIComponent(query)
    + "&count=7&language=en&format=json";
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Geocoding request failed (" + res.status + ")");
    const data = await res.json();
    if (ticket !== suggestSeq) return; // a newer keystroke superseded us
    const places = (data.results || []).map((r) => ({
      name: r.name, admin1: r.admin1 || "", country: r.country || "",
      latitude: r.latitude, longitude: r.longitude,
    }));
    renderSuggestions(places, query);
  } catch (err) {
    /* A failed fetch mid-typing just hides the list — no error
       noise in the status line while she is still typing. */
    if (ticket === suggestSeq) closeSuggestions();
  }
}

/* Picking a suggestion: fill the box, close the list, and load
   exactly that place (its own coordinates, via the shared loader),
   so the °F/°C toggle afterwards re-loads the same city. */
function selectSuggestion(place) {
  cityInput.value = place.name;
  closeSuggestions();
  loadPlace(place);
}

/* The typing listener: debounce first (note 1), then fetch. */
cityInput.addEventListener("input", () => {
  const query = cityInput.value.trim();
  clearTimeout(suggestTimer);
  if (query.length < 2) { closeSuggestions(); return; }
  suggestTimer = setTimeout(() => fetchSuggestions(query), 250);
});

/* Keyboard: arrows move the highlight, Enter picks the highlighted
   row INSTEAD of submitting the raw text, Escape closes the list. */
cityInput.addEventListener("keydown", (event) => {
  if (suggestList.hidden || suggestItems.length === 0) {
    if (event.key === "Escape") closeSuggestions();
    return;
  }
  if (event.key === "ArrowDown") {
    event.preventDefault(); // keep the text cursor where it is
    setSuggestActive(Math.min(suggestActive + 1, suggestItems.length - 1));
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    setSuggestActive(Math.max(suggestActive - 1, 0));
  } else if (event.key === "Enter" && suggestActive >= 0) {
    event.preventDefault(); // ours, not the form's submit
    selectSuggestion(suggestItems[suggestActive]);
  } else if (event.key === "Escape") {
    closeSuggestions();
  }
});

/* Tap/click anywhere outside the search wrap closes the list.
   pointerdown (not click) so the list is gone before focus moves. */
document.addEventListener("pointerdown", (event) => {
  if (!searchWrap.contains(event.target)) closeSuggestions();
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
   BROWSE BY STATE: two linked <select> dropdowns.
   Picking a state fills the city dropdown from US_STATES (plain
   reference data, no fetch needed) and shows that state's info
   line — capital + nickname. Picking a city then runs the SAME
   geocode -> forecast flow as the search box (loadPlace), so
   dropdown weather is every bit as live, and the °F/°C toggle
   re-loads it in the other unit just like a searched city.
   Note the results header already prints "City, State" for US
   places: renderWeather() appends place.admin1 (see STEP 3).
   ============================================================ */
const stateSelect = $("stateSelect");
const citySelect = $("citySelect");
const stateInfoEl = $("stateInfo");
const stateByName = (name) => US_STATES.find((s) => s.name === name);

/* Fill the state dropdown once, on page load. */
US_STATES.forEach((s) => {
  const opt = document.createElement("option");
  opt.value = s.name;
  opt.textContent = s.name;
  stateSelect.appendChild(opt);
});

stateSelect.addEventListener("change", () => {
  const entry = stateByName(stateSelect.value);
  /* Reset the city dropdown to its placeholder before refilling. */
  citySelect.innerHTML = '<option value="">Choose a city…</option>';
  if (!entry) {
    /* Back on "Choose a state…" — disable cities, hide the info. */
    citySelect.disabled = true;
    stateInfoEl.hidden = true;
    return;
  }
  entry.cities.forEach((city) => {
    const opt = document.createElement("option");
    opt.value = city;
    opt.textContent = city;
    citySelect.appendChild(opt);
  });
  citySelect.disabled = false;
  /* State info line: capital + nickname, from the data object. */
  stateInfoEl.innerHTML =
    '<span class="state-info-label">' + entry.name + "</span>" +
    " · Capital: " + entry.capital +
    " · Known as: " + entry.nickname;
  stateInfoEl.hidden = false;
});

citySelect.addEventListener("change", async () => {
  const city = citySelect.value;
  const entry = stateByName(stateSelect.value);
  if (!city || !entry) return; // placeholder picked, or no state yet
  setStatus("Searching for “" + city + ", " + entry.name + "”…", "loading");
  try {
    const place = await geocodeCityInState(city, entry.name);
    if (!place) {
      setStatus("No place found for “" + city + ", " + entry.name + "”.", "error");
      return;
    }
    await loadPlace(place); // the one shared weather loader
  } catch (err) {
    console.error(err);
    setStatus("Search failed. Check your connection and try again.", "error");
  }
});

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
