# Driver Route from Log

Visualize a driver's GPS trail from server log files on an interactive map. Drop in one or more `.txt` log exports and the app parses location entries, draws each driver's route as a colored polyline, and lets you toggle between OpenStreetMap and Kakao Maps.

## Features

- Drag-and-drop or browse to upload `.txt`/`.log` files
- Parses two log formats: `GgtController#location` info lines and explore-style JSON-per-line entries
- Renders one route per file with a unique color, start/end markers, and a hover tooltip per point
- Toggle between OpenStreetMap (default) and Kakao Maps
- Multiple files at once with a legend showing each driver

## Getting started

```bash
npm install
cp .env.example .env   # then fill in VITE_KAKAO_MAP_KEY (only needed for the Kakao view)
npm run dev
```

Open the URL Vite prints (typically http://localhost:5173).

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_KAKAO_MAP_KEY` | Only for Kakao view | Kakao Maps JS SDK app key |

The OSM view works without any keys.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |

## Tech stack

React 18 + TypeScript, Vite, Zustand for state, react-leaflet 4 + Leaflet for OSM, react-kakao-maps-sdk for Kakao, Vitest for tests.

## Project layout

```
src/
  components/   MapView dispatcher, OSM/Kakao views, route layers, upload panel, legend, toggle
  lib/          Log parser, color picker, time helpers (with tests)
  state/        Zustand store for loaded files
  types.ts      Shared types (LogEntry, LoadedFile)
```
