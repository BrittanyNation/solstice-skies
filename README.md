# Solstice Skies — Live Weather App

A fully functional live weather web app for **Solstice Skies**, a fictional weather studio brand. Search any city in the world and see real current conditions plus a 7-day forecast — every number on the page is live data fetched in the browser from the [Open-Meteo](https://open-meteo.com/) public API. Nothing is stored or faked.

**Live site:** https://brittanynation.github.io/solstice-skies/

## What it does

- **City search worldwide** — the Open-Meteo Geocoding API turns a city name into coordinates, then the Forecast API returns live weather for that spot.
- **Browse by state dropdowns** — pick any of the 50 US states and a second dropdown fills with that state's notable cities; choosing a city runs it through the same live geocoding + forecast flow, so dropdown weather is 100% live API data too (with a same-name guard, so Springfield, Illinois never loads Springfield, Missouri).
- **State info** — selecting a state shows its capital and nickname, and the results header always names the state for US places ("City, State"), whatever route you took to get there.
- **Current conditions** — temperature, feels-like, humidity, wind, local time, and a plain-language description translated from WMO weather codes.
- **7-day forecast** — daily high/low and conditions.
- **°F / °C toggle** — re-fetches from the API in the other unit so every value re-renders consistently.
- **Favorite cities** — star a city to save it; favorites persist in `localStorage`, each chip shows that city's live current temperature, and clicking a chip loads it.
- **Real loading and error states** — including a clear message when a city isn't found or a request fails.

## The course skill behind it

This is the first **course-track** project in the portfolio, built alongside Dr. Angela Yu's *Full-Stack Web Development Bootcamp* (Udemy). The skill it demonstrates is **live API work with async JavaScript**: `fetch`, `async`/`await`, `try`/`catch` error handling, `Promise.all` for parallel requests, and rendering real external data. The JavaScript is commented step by step to read as study material.

## Design & build

Front-end design and build by Brittany Nation. Original concept work: brand, layout, and a fresh sky-inspired palette (Cerulean `#2F7FC4`, Sun Coral `#FF7A59`, Apricot `#FFB25E`, Mist `#DCEBF5`, Cloud `#F8FBFD`, Slate Ink `#26313B`). Built with HTML, CSS, and vanilla JavaScript — no frameworks, no API key, no build step.

## Files

- `index.html` — page structure and Open Graph tags
- `styles.css` — the full design system for the app
- `app.js` — geocoding, forecast fetching, rendering, unit toggle, favorites
