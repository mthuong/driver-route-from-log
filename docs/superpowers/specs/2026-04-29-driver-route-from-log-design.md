# Driver Route from Log — Design

**Date:** 2026-04-29
**Status:** Approved (pending user review of spec doc)

## Goal

A static web app that lets a user upload Rails-style driver location log files and visualizes each file's GPS fixes as a route on a Kakao Map: one marker per fix labeled with `HH:mm:ss`, connected by a polyline in chronological order, with multiple files coexisting on the map in distinct colors.

The reference visual is `tasks/Screenshot 2026-04-29 at 6.10.53 PM.png`.

## Non-goals

- No backend, no database, no auth.
- No analytics on the routes (distance, speed, dwell time).
- No editing or annotation of routes.
- No support for log formats other than the Rails `GgtController#location` log shape.

## Stack

- Vite + React + TypeScript
- Zustand (state) with `persist` middleware
- `react-kakao-maps-sdk` for map bindings
- Vitest for unit tests
- Deployed to Vercel as a static site
- Kakao JS API key supplied via `VITE_KAKAO_MAP_KEY` env var (Vercel env var in production), domain-restricted in the Kakao Developers console

## File layout

```
driver-route-from-log/
├── index.html              # Loads Kakao SDK <script> with VITE_KAKAO_MAP_KEY
├── vite.config.ts
├── tsconfig.json
├── package.json
├── .env.example            # VITE_KAKAO_MAP_KEY=
├── vercel.json             # SPA rewrite
└── src/
    ├── main.tsx
    ├── App.tsx                 # Layout: <MapView/> + <UploadPanel/> + <Legend/>
    ├── lib/
    │   ├── parseLog.ts         # Rails log → LogEntry[]
    │   ├── colors.ts           # deterministic color per user_id
    │   └── storage.ts          # zustand persist config
    ├── state/
    │   └── routesStore.ts      # { files, addFile, removeFile, clear }
    └── components/
        ├── MapView.tsx
        ├── RouteLayer.tsx
        ├── UploadPanel.tsx
        └── Legend.tsx
```

Three responsibilities are kept apart:

- **Parsing** (`lib/parseLog.ts`) — pure function, fully unit-testable, no DOM or map dependencies.
- **State** (`state/routesStore.ts`) — Zustand store with localStorage persistence; the only place mutations live.
- **Rendering** (`components/`) — reads from the store; no parsing logic in components.

Zustand chosen over lifted `useState` because three components (Map, Legend, UploadPanel) all read `files`, and Zustand's `persist` middleware gives localStorage sync for free.

## Data model

```ts
type LogEntry = {
  timestamp: Date;          // from the KST line above the INFO line
  lat: number;
  lng: number;
  gpsAccuracy: number;      // meters
  gpsAge: number;           // seconds
  gpsContext: string;       // e.g. "location_update"
  deviceBattery: number;
  deviceBatteryState: string;
  deviceLowPower: boolean;
};

type LoadedFile = {
  id: string;               // uuid
  fileName: string;
  userId: string;           // extracted from log content (user_id=...)
  color: string;            // assigned from a fixed palette
  entries: LogEntry[];      // sorted ascending by timestamp
  uploadedAt: number;
};
```

## Log parser

The file is a sequence of pairs:

```
2026-04-23 17:12:03            ← KST timestamp line
I, [...] INFO -- : [req-id] GgtController#location user_id=404909 params={"lat"=>..., "long"=>..., ...}
```

Algorithm:

1. Walk lines. Whenever an `INFO` line contains `GgtController#location`, look back at the previous non-empty line for the KST timestamp.
2. Extract `user_id` with regex `/user_id=(\d+)/`.
3. Extract the `params={...}` blob, replace `=>` with `:`, then `JSON.parse`. Keys in the sample are already double-quoted, so this is sufficient; we do not need to handle bare-symbol keys.
4. Build a `LogEntry`, push to array.
5. Reject the file if zero entries parsed, or if more than one distinct `user_id` appears.
6. Sort entries ascending by `timestamp`.

The KST line is the canonical timestamp; the inner UTC ISO string in the INFO line is ignored. KST is parsed as `Asia/Seoul` and stored as a `Date`.

## State & persistence

- Zustand store with shape `{ files: LoadedFile[] }` and actions `addFile(file)`, `removeFile(id)`, `clear()`.
- `persist` middleware writes to `localStorage` under key `driver-route-from-log:v1`.
- `Date` values are serialized as ISO strings on save and rehydrated on load.
- Schema version is encoded in the key. If the shape changes, bump the version; old data is silently dropped on key mismatch.
- If `localStorage` is unavailable (private mode), state remains in-memory; no error shown.

## Color assignment

`colors.ts` exports a fixed palette of 8 visually distinct colors. Color is assigned by hashing `user_id` to a palette index, so re-uploading the same `user_id` gets the same color across sessions. Collisions across different `user_id`s are tolerated.

## Map rendering

**`MapView.tsx`:**

- On mount, renders a `<Map>` from `react-kakao-maps-sdk`.
- Initial center: average of all loaded entries; if no files, defaults to Seoul (`37.5665, 126.9780`).
- When `files` change, fits bounds to encompass all entries.

**`RouteLayer.tsx`** (one per loaded file):

- **Polyline** through entries in chronological order, color = file color.
  - A segment where either endpoint has `gpsAccuracy > 100` OR `gpsAge > 60` renders as dashed at 50% opacity.
  - All other segments render solid at full opacity.
- **Marker** per entry, implemented as a Kakao custom overlay containing a small filled circle in the file's color and an `HH:mm:ss` label to the right (matches screenshot).
  - Low-accuracy markers (`gpsAccuracy > 100` OR `gpsAge > 60`) use a hollow circle and 50% opacity.
  - Label text is formatted in `Asia/Seoul` time (the canonical timezone of the log), regardless of the user's browser timezone — verified via `Intl.DateTimeFormat` with `timeZone: 'Asia/Seoul'`.
- No deduplication: stacked fixes at identical coordinates render as stacked markers (matches screenshot).

## UI

**`UploadPanel.tsx`:** top-left floating card with an "Upload log file" button. Drag-drop onto the window also accepted. After successful upload, the map auto-fits to bounds. Errors render as red inline text in the card.

**`Legend.tsx`:** bottom-right floating panel matching the screenshot. One row per loaded file: color swatch · `user_id: <id>` · `<count>건` · `×` remove button. A "Clear all" link appears when ≥2 files are loaded.

## Error handling

Errors are handled only at boundaries:

- **Parser** rejects malformed files with a user-facing message in the upload card. No crash.
- **Kakao SDK load failure** (missing/invalid key, blocked, network) shows a full-screen banner: "Kakao Maps failed to load. Check `VITE_KAKAO_MAP_KEY`." No silent degraded state.
- **localStorage unavailable** falls back to in-memory state, silently.

## Testing

**Unit tests (Vitest)** cover `parseLog.ts`:

- Well-formed file (`tasks/driver_location_log_404909.txt`) — exact entry count, correct first/last timestamp, correct lat/lng on a known entry.
- Empty file → rejected.
- File with no `GgtController#location` lines → rejected.
- File with multiple distinct `user_id` values → rejected.
- Ruby hash with float, boolean, and negative values parses correctly.
- Entries appear in chronological order in output even when out of order in input.
- Color assignment is deterministic for a given `user_id`.

**No E2E or map rendering tests.** The map is third-party; visual verification is manual against the screenshot using sample log files.

## Out of scope (explicit YAGNI)

- Time-range filter UI
- Per-file on/off visibility toggles (only remove button)
- Speed / distance / heading derivations
- Server upload, sharing, permalinks
- Multi-user files (rejected at parse time)
- Custom palette / color picker per file
