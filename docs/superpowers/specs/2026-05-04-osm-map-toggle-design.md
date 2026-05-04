# Design: OpenStreetMap Toggle (Kakao / OSM)

**Date:** 2026-05-04
**Status:** Approved

## Problem

Kakao Maps only renders correctly inside South Korea. Routes logged from Vietnam (or any non-Korean location) show correctly in the parser but display on an empty/broken map. Users need a free, globally-functional map alternative.

## Solution

Add **OpenStreetMap via Leaflet** as a second map provider. A manual toggle in the UI lets the user switch between Kakao Maps and OSM. OSM is the default on load.

## Architecture

A `mapType` field (`"osm" | "kakao"`) in the Zustand store drives which map is rendered. `MapView` becomes a thin dispatcher component that renders either `<KakaoMapView>` or `<OsmMapView>` based on `mapType`. Each map view is fully self-contained. A `MapToggle` button in the app UI calls `setMapType` to flip between them.

## File Changes

### New files

| File | Responsibility |
|------|----------------|
| `src/components/KakaoMapView.tsx` | Current `MapView.tsx` logic, renamed |
| `src/components/OsmMapView.tsx` | Leaflet `MapContainer`, fits bounds, renders `OsmRouteLayer` per file |
| `src/components/OsmRouteLayer.tsx` | Leaflet equivalents of Kakao `RouteLayer`: Polyline segments + Marker/CircleMarker + Tooltip timestamps |
| `src/components/MapToggle.tsx` | Small button that reads `mapType` from the store and calls `setMapType` |

### Modified files

| File | Change |
|------|--------|
| `src/components/MapView.tsx` | Replaced with dispatcher: reads `mapType`, renders `KakaoMapView` or `OsmMapView` |
| `src/state/routesStore.ts` | Add `mapType: "osm" \| "kakao"` (default `"osm"`) and `setMapType` action |
| `src/App.tsx` | Add `<MapToggle />` positioned as an overlay on the map |

### Dependencies

```
npm install react-leaflet leaflet
npm install -D @types/leaflet
```

Import Leaflet CSS in `src/main.tsx`:
```typescript
import "leaflet/dist/leaflet.css";
```

## Component Details

### `OsmMapView`

- Wraps `react-leaflet` `MapContainer` with OpenStreetMap tile layer (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`)
- `useEffect` on `files` → fits map to all entry bounds using Leaflet's `fitBounds`
- Renders `<OsmRouteLayer>` for each loaded file
- Default center: Ho Chi Minh City (`{ lat: 10.7769, lng: 106.7009 }`) at zoom 12

### `OsmRouteLayer`

Mirrors the Kakao `RouteLayer` visually:

- **Segments**: `<Polyline>` with `color="#000"`, `opacity: seg.degraded ? 0.4 : 0.9`, `dashArray: seg.degraded ? "6 6" : undefined`
- **Start pin**: `<Marker>` with a custom Leaflet `DivIcon` containing the same SVG `StartPin` used in the Kakao layer, coloured with `file.color`
- **Intermediate dots**: `<CircleMarker>` radius 4, `fillColor: file.color`, `color="#000"`, `weight=1`, `fillOpacity: degraded ? 0.4 : 0.9`
- **End dot**: `<CircleMarker>` radius 6 (larger), same colours
- **Timestamp labels**: `<Tooltip permanent direction="right" offset={[8,0]}>` containing `formatKstTime(entry.timestamp)` — same data as the current Kakao overlay

### `MapToggle`

- Reads `mapType` from the store
- Renders a button labelled with the **inactive** map (what clicking will switch to): `"🗺 Switch to Kakao"` when OSM is active, `"🗺 Switch to OSM"` when Kakao is active
- On click: calls `setMapType(mapType === "osm" ? "kakao" : "osm")`
- Positioned as an absolute overlay (top-right corner of the map, below any browser chrome)
- Minimal styling — a small pill button with white background

### `routesStore` additions

```typescript
mapType: "osm" | "kakao";   // default: "osm"
setMapType: (t: "osm" | "kakao") => void;
```

## Out of Scope

- Remembering map preference across page reloads (no localStorage)
- Auto-detecting the region from loaded coordinates
- Any map other than Kakao and OSM
- Changing the Legend or UploadPanel components
