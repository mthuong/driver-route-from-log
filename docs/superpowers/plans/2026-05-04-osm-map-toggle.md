# OSM Map Toggle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an OpenStreetMap/Leaflet map as the default map provider, with a toggle button to switch to Kakao Maps.

**Architecture:** `mapType` state (`"osm" | "kakao"`, default `"osm"`) lives in the Zustand store. A new `MapView` dispatcher reads `mapType` and renders either `OsmMapView` (Leaflet) or `KakaoMapView` (existing Kakao logic, renamed). A `MapToggle` button overlaid on the map calls `setMapType`. Route rendering for OSM uses `react-leaflet` primitives mirroring the existing Kakao `RouteLayer` visually.

**Tech Stack:** React 18, TypeScript, Zustand, react-leaflet 4, leaflet 1, @types/leaflet

---

## Chunk 1: Store + Dependencies

### Task 1: Install Leaflet dependencies and add CSS import

**Files:**
- Modify: `package.json` (via npm)
- Modify: `src/main.tsx`

- [ ] **Step 1.1: Install packages**

```bash
npm install react-leaflet leaflet
npm install -D @types/leaflet
```

Expected: packages added to `node_modules`, `package.json` updated.

- [ ] **Step 1.2: Add Leaflet CSS import to `src/main.tsx`**

Open `src/main.tsx`. Add this import **before** the existing CSS imports:

```typescript
import "leaflet/dist/leaflet.css";
```

The file should look like:
```typescript
import "leaflet/dist/leaflet.css";
import "./index.css";  // (or whatever existing CSS imports are there)
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 1.3: Verify the app still builds**

```bash
npm run build 2>&1 | tail -10
```

Expected: Build succeeds with no errors.

- [ ] **Step 1.4: Commit**

```bash
git add package.json package-lock.json src/main.tsx
git commit -m "chore: install react-leaflet and add Leaflet CSS

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: Add `mapType` and `setMapType` to `routesStore` (TDD)

**Files:**
- Modify: `src/state/routesStore.ts`
- Modify: `src/state/routesStore.test.ts`

- [ ] **Step 2.1: Write the failing tests**

In `src/state/routesStore.test.ts`, add a new `describe` block after the existing one:

```typescript
describe("routesStore — mapType", () => {
  it("defaults to 'osm'", () => {
    expect(useRoutesStore.getState().mapType).toBe("osm");
  });

  it("setMapType switches to 'kakao'", () => {
    useRoutesStore.getState().setMapType("kakao");
    expect(useRoutesStore.getState().mapType).toBe("kakao");
  });

  it("setMapType switches back to 'osm'", () => {
    useRoutesStore.getState().setMapType("kakao");
    useRoutesStore.getState().setMapType("osm");
    expect(useRoutesStore.getState().mapType).toBe("osm");
  });
});
```

Also update `beforeEach` to reset `mapType` after each test. Replace the existing `beforeEach`:

```typescript
beforeEach(() => {
  useRoutesStore.getState().clear();
  useRoutesStore.getState().setMapType("osm");
});
```

- [ ] **Step 2.2: Run tests — verify new tests fail**

```bash
npm test -- --reporter=verbose 2>&1 | tail -20
```

Expected: 3 new tests FAIL (`mapType is not a function` / `undefined`).

- [ ] **Step 2.3: Add `mapType` and `setMapType` to the store**

In `src/state/routesStore.ts`, update `RoutesState` type:

```typescript
type RoutesState = {
  files: LoadedFile[];
  addFile: (file: LoadedFile) => void;
  removeFile: (id: string) => void;
  clear: () => void;
  mapType: "osm" | "kakao";
  setMapType: (t: "osm" | "kakao") => void;
};
```

Update the store implementation (inside `persist`):

```typescript
export const useRoutesStore = create<RoutesState>()(
  persist(
    (set) => ({
      files: [],
      addFile: (file) => set((state) => ({ files: [...state.files, file] })),
      removeFile: (id) =>
        set((state) => ({ files: state.files.filter((f) => f.id !== id) })),
      clear: () => set({ files: [] }),
      mapType: "osm",
      setMapType: (t) => set({ mapType: t }),
    }),
    {
      name: "driver-route-from-log:v1",
      storage: createJSONStorage(() =>
        typeof localStorage !== "undefined" && typeof localStorage.setItem === "function"
          ? localStorage
          : memoryStorage(),
      ),
      partialize: (state) => ({ files: state.files }),
      merge: (persisted, current) => {
        const p = persisted as { files?: LoadedFile[] } | undefined;
        if (!p?.files) return current;
        const rehydrated = p.files.map((f) => ({
          ...f,
          entries: f.entries.map((e) => ({
            ...e,
            timestamp: new Date(e.timestamp as unknown as string),
          })),
        }));
        return { ...current, files: rehydrated };
      },
    },
  ),
);
```

Note: `mapType` is intentionally NOT in `partialize` — it resets to `"osm"` on every page load.

- [ ] **Step 2.4: Run all tests — verify everything passes**

```bash
npm test -- --reporter=verbose 2>&1 | tail -20
```

Expected: all 30 tests pass.

- [ ] **Step 2.5: Commit**

```bash
git add src/state/routesStore.ts src/state/routesStore.test.ts
git commit -m "feat: add mapType state to routesStore (default: osm)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Chunk 2: Map Components

### Task 3: Extract current MapView into KakaoMapView

**Files:**
- Create: `src/components/KakaoMapView.tsx` (content from current MapView.tsx)
- Modify: `src/components/MapView.tsx` (becomes dispatcher)

The existing `MapView.tsx` uses `react-kakao-maps-sdk` and Kakao SDK types. We extract it unchanged into `KakaoMapView.tsx`, then replace `MapView.tsx` with a dispatcher.

- [ ] **Step 3.1: Create `src/components/KakaoMapView.tsx`**

Create with the exact content of the current `src/components/MapView.tsx`:

```typescript
import { useEffect, useRef } from "react";
import { Map } from "react-kakao-maps-sdk";
import { useRoutesStore } from "../state/routesStore";
import RouteLayer from "./RouteLayer";

const SEOUL = { lat: 37.5665, lng: 126.978 };

export default function KakaoMapView() {
  const files = useRoutesStore((s) => s.files);
  const mapRef = useRef<kakao.maps.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (files.length === 0) return;

    const bounds = new kakao.maps.LatLngBounds();
    for (const f of files) {
      for (const e of f.entries) {
        bounds.extend(new kakao.maps.LatLng(e.lat, e.lng));
      }
    }
    if (!bounds.isEmpty()) {
      mapRef.current.setBounds(bounds);
    }
  }, [files]);

  return (
    <Map
      center={SEOUL}
      level={6}
      style={{ width: "100%", height: "100%" }}
      onCreate={(map) => {
        mapRef.current = map;
      }}
    >
      {files.map((f) => (
        <RouteLayer key={f.id} file={f} />
      ))}
    </Map>
  );
}
```

- [ ] **Step 3.2: Replace `src/components/MapView.tsx` with the dispatcher**

```typescript
import { useRoutesStore } from "../state/routesStore";
import KakaoMapView from "./KakaoMapView";
import OsmMapView from "./OsmMapView";

export default function MapView() {
  const mapType = useRoutesStore((s) => s.mapType);
  return mapType === "kakao" ? <KakaoMapView /> : <OsmMapView />;
}
```

- [ ] **Step 3.3: Verify build passes**

```bash
npm run build 2>&1 | tail -10
```

Expected: Build succeeds (OsmMapView doesn't exist yet — TypeScript will error). If it fails only because OsmMapView is missing, that's expected; create a temporary placeholder if needed:

```typescript
// src/components/OsmMapView.tsx — temporary placeholder
export default function OsmMapView() {
  return <div style={{ width: "100%", height: "100%", background: "#e0e0e0" }}>OSM placeholder</div>;
}
```

- [ ] **Step 3.4: Run tests**

```bash
npm test 2>&1 | tail -10
```

Expected: all 30 tests pass (no component tests affected).

- [ ] **Step 3.5: Commit**

```bash
git add src/components/KakaoMapView.tsx src/components/MapView.tsx src/components/OsmMapView.tsx
git commit -m "refactor: extract KakaoMapView, add MapView dispatcher

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 4: Create `OsmRouteLayer`

**Files:**
- Create: `src/components/OsmRouteLayer.tsx`

This component mirrors the Kakao `RouteLayer` visually using `react-leaflet` primitives. It receives a `LoadedFile` and renders polyline segments + markers.

Key `react-leaflet` notes:
- `Polyline` takes `positions: [number, number][][]` or `LatLngExpression[]`
- `CircleMarker` takes `center: [lat, lng]` and renders a circle
- `Marker` takes `position: [lat, lng]` and an optional `icon`
- `Tooltip` with `permanent` renders a persistent label — must be a child of a Marker/CircleMarker
- Use `DivIcon` for the start pin (custom SVG, no default Leaflet icon)

- [ ] **Step 4.1: Create `src/components/OsmRouteLayer.tsx`**

```typescript
import L from "leaflet";
import { CircleMarker, Marker, Polyline, Tooltip } from "react-leaflet";
import type { LoadedFile, LogEntry } from "../types";
import { isLowAccuracy } from "../types";
import { formatKstTime } from "../lib/time";

type Props = { file: LoadedFile };

type Segment = { from: LogEntry; to: LogEntry; degraded: boolean };

function buildSegments(entries: LogEntry[]): Segment[] {
  const segs: Segment[] = [];
  for (let i = 1; i < entries.length; i++) {
    segs.push({
      from: entries[i - 1],
      to: entries[i],
      degraded: isLowAccuracy(entries[i - 1]) || isLowAccuracy(entries[i]),
    });
  }
  return segs;
}

function startPinIcon(color: string): L.DivIcon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 99.6094 99.6582" width="24" height="24">
    <circle cx="49.8047" cy="49.8535" r="49.8047" fill="${color}"/>
    <path fill="#fff" d="M38.2812 31.0059C38.2812 36.1816 41.6992 40.4785 46.2891 41.8945L46.2891 67.1387C46.2891 74.5117 47.5098 81.1523 49.8047 81.1523C52.1484 81.1523 53.2715 74.6582 53.2715 67.1387L53.2715 41.8945C57.9102 40.5273 61.3281 36.2305 61.3281 31.0059C61.3281 24.6582 56.1523 19.5312 49.8047 19.5312C43.5059 19.5312 38.2812 24.6582 38.2812 31.0059ZM50.4883 28.0762C50.4883 30.0293 48.8281 31.7383 46.8262 31.7383C44.9219 31.7383 43.2129 30.0293 43.2129 28.0762C43.1641 26.0742 44.9219 24.3652 46.8262 24.3652C48.8281 24.3652 50.4883 26.0742 50.4883 28.0762Z"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [0, 12],
  });
}

export default function OsmRouteLayer({ file }: Props) {
  const segments = buildSegments(file.entries);
  const lastIdx = file.entries.length - 1;

  return (
    <>
      {segments.map((seg, i) => (
        <Polyline
          key={`seg-${file.id}-${i}`}
          positions={[
            [seg.from.lat, seg.from.lng],
            [seg.to.lat, seg.to.lng],
          ]}
          color="#000"
          weight={3}
          opacity={seg.degraded ? 0.4 : 0.9}
          dashArray={seg.degraded ? "6 6" : undefined}
        />
      ))}

      {file.entries.map((entry, i) => {
        const degraded = isLowAccuracy(entry);
        const isStart = i === 0;
        const isEnd = i === lastIdx && lastIdx > 0;

        if (isStart) {
          return (
            <Marker
              key={`mk-${file.id}-${i}`}
              position={[entry.lat, entry.lng]}
              icon={startPinIcon(file.color)}
              zIndexOffset={100}
            >
              <Tooltip permanent direction="right" offset={[12, 0]} opacity={1}>
                <span className="route-marker__label">{formatKstTime(entry.timestamp)}</span>
              </Tooltip>
            </Marker>
          );
        }

        return (
          <CircleMarker
            key={`mk-${file.id}-${i}`}
            center={[entry.lat, entry.lng]}
            radius={isEnd ? 6 : 4}
            fillColor={file.color}
            color="#000"
            weight={1}
            fillOpacity={degraded ? 0.4 : 0.9}
          >
            <Tooltip permanent direction="right" offset={[8, 0]} opacity={1}>
              <span className="route-marker__label">{formatKstTime(entry.timestamp)}</span>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
```

- [ ] **Step 4.2: Run tests**

```bash
npm test 2>&1 | tail -10
```

Expected: all 30 tests pass (no unit tests for this component).

- [ ] **Step 4.3: Commit**

```bash
git add src/components/OsmRouteLayer.tsx
git commit -m "feat: add OsmRouteLayer using react-leaflet

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 5: Create `OsmMapView`

**Files:**
- Modify: `src/components/OsmMapView.tsx` (replace placeholder with real implementation)

`OsmMapView` uses a `react-leaflet` `MapContainer`. Bounds-fitting requires a child component that calls `useMap()` (a react-leaflet hook that only works inside a `MapContainer`).

- [ ] **Step 5.1: Replace `src/components/OsmMapView.tsx` with the real implementation**

```typescript
import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { useRoutesStore } from "../state/routesStore";
import type { LoadedFile } from "../types";
import OsmRouteLayer from "./OsmRouteLayer";

const HCM_CENTER: [number, number] = [10.7769, 106.7009];

function BoundsController({ files }: { files: LoadedFile[] }) {
  const map = useMap();

  useEffect(() => {
    if (files.length === 0) return;
    const points: [number, number][] = files.flatMap((f) =>
      f.entries.map((e) => [e.lat, e.lng] as [number, number]),
    );
    if (points.length > 0) {
      map.fitBounds(points, { padding: [40, 40] });
    }
  }, [files, map]);

  return null;
}

export default function OsmMapView() {
  const files = useRoutesStore((s) => s.files);

  return (
    <MapContainer
      center={HCM_CENTER}
      zoom={12}
      style={{ width: "100%", height: "100%" }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <BoundsController files={files} />
      {files.map((f) => (
        <OsmRouteLayer key={f.id} file={f} />
      ))}
    </MapContainer>
  );
}
```

- [ ] **Step 5.2: Run tests and build**

```bash
npm test 2>&1 | tail -10 && npm run build 2>&1 | tail -10
```

Expected: all 30 tests pass, build succeeds.

- [ ] **Step 5.3: Commit**

```bash
git add src/components/OsmMapView.tsx
git commit -m "feat: add OsmMapView using react-leaflet + OpenStreetMap tiles

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 6: Create `MapToggle` and wire it into `App`

**Files:**
- Create: `src/components/MapToggle.tsx`
- Modify: `src/App.tsx`

The toggle button sits as an absolute overlay in the top-right corner of the map, above all map controls (z-index 1000). It shows the label of the **inactive** map (the one you'd switch to).

- [ ] **Step 6.1: Create `src/components/MapToggle.tsx`**

```typescript
import { useRoutesStore } from "../state/routesStore";

export default function MapToggle() {
  const mapType = useRoutesStore((s) => s.mapType);
  const setMapType = useRoutesStore((s) => s.setMapType);

  const label = mapType === "osm" ? "🗺 Switch to Kakao" : "🗺 Switch to OSM";

  return (
    <button
      className="floating-card map-toggle"
      onClick={() => setMapType(mapType === "osm" ? "kakao" : "osm")}
      title={label}
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 6.2: Add `.map-toggle` styles to `src/App.css`**

Append to `src/App.css`:

```css
.map-toggle {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 1000;
  cursor: pointer;
  border: none;
  font-size: 13px;
  font-weight: 600;
}
```

- [ ] **Step 6.3: Add `<MapToggle />` to `src/App.tsx`**

```typescript
import MapView from "./components/MapView";
import MapToggle from "./components/MapToggle";
import UploadPanel from "./components/UploadPanel";
import Legend from "./components/Legend";

export default function App() {
  return (
    <div className="app">
      <MapView />
      <MapToggle />
      <UploadPanel />
      <Legend />
    </div>
  );
}
```

- [ ] **Step 6.4: Run tests and build**

```bash
npm test 2>&1 | tail -10 && npm run build 2>&1 | tail -10
```

Expected: all 30 tests pass, build succeeds.

- [ ] **Step 6.5: Commit**

```bash
git add src/components/MapToggle.tsx src/App.css src/App.tsx
git commit -m "feat: add MapToggle button to switch between OSM and Kakao

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Manual Verification

After all tasks complete, verify the feature works end-to-end:

```bash
npm run dev
```

1. Open http://localhost:5173
2. Confirm the map loads showing **OpenStreetMap** tiles by default
3. Confirm the **"🗺 Switch to Kakao"** button is visible top-right
4. Load `tasks/Explore-logs-2026-05-04 15_34_55.txt` — route should appear on OSM (Vietnam)
5. Click **"Switch to Kakao"** — map switches to Kakao, button now shows **"Switch to OSM"**
6. Load `tasks/driver_location_log_404909.txt` — route should appear on Kakao (Korea)
7. Click **"Switch to OSM"** — map switches back
