# Driver Route from Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static web app that parses Rails-format driver location logs and visualizes each file's GPS route on a Kakao Map with chronological connecting polylines.

**Architecture:** Vite + React + TypeScript SPA. All parsing happens client-side. Zustand store with `localStorage` persistence holds loaded files. `react-kakao-maps-sdk` renders markers, polylines, and custom-overlay timestamp labels. Deployed to Vercel as static assets.

**Tech Stack:** Vite, React 18, TypeScript (strict), Zustand, react-kakao-maps-sdk, Vitest, uuid.

**Spec:** `docs/superpowers/specs/2026-04-29-driver-route-from-log-design.md`

---

## File map

```
driver-route-from-log/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── .env.example
├── vercel.json
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── App.css
    ├── types.ts                  # LogEntry, LoadedFile
    ├── lib/
    │   ├── parseLog.ts
    │   ├── parseLog.test.ts
    │   ├── colors.ts
    │   ├── colors.test.ts
    │   └── time.ts               # KST formatter
    ├── state/
    │   ├── routesStore.ts
    │   └── routesStore.test.ts
    └── components/
        ├── MapView.tsx
        ├── RouteLayer.tsx
        ├── UploadPanel.tsx
        ├── UploadPanel.css
        ├── Legend.tsx
        └── Legend.css
```

Real driver logs in `tasks/` are gitignored. Parser tests use small inline fixtures rather than the real file so tests don't depend on local-only data.

---

## Task 1: Scaffold the Vite + React + TypeScript project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `.env.example`, `vercel.json`
- Create: `src/main.tsx`, `src/App.tsx`, `src/App.css`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "driver-route-from-log",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-kakao-maps-sdk": "^1.1.27",
    "uuid": "^10.0.0",
    "zustand": "^4.5.5"
  },
  "devDependencies": {
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.0",
    "@types/uuid": "^10.0.0",
    "@vitejs/plugin-react": "^4.3.2",
    "typescript": "^5.6.2",
    "vite": "^5.4.8",
    "vitest": "^2.1.2"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Create `vite.config.ts`**

```ts
/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
  },
});
```

- [ ] **Step 5: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Driver Route from Log</title>
    <script>
      // Read VITE_KAKAO_MAP_KEY at build time and inject the SDK loader.
      // The script tag below is rewritten by index.html template at runtime via main.tsx.
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

(The Kakao SDK script is injected dynamically in `main.tsx` so the env var works in dev and prod identically — see Task 5.)

- [ ] **Step 6: Create `.env.example`**

```
VITE_KAKAO_MAP_KEY=
```

- [ ] **Step 7: Create `vercel.json`**

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

- [ ] **Step 8: Create `src/main.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 9: Create `src/App.tsx` skeleton**

```tsx
export default function App() {
  return (
    <div className="app">
      <h1>Driver Route from Log</h1>
    </div>
  );
}
```

- [ ] **Step 10: Create `src/App.css`**

```css
* { box-sizing: border-box; }
html, body, #root { margin: 0; height: 100%; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.app { position: relative; height: 100vh; width: 100vw; overflow: hidden; }
```

- [ ] **Step 11: Install dependencies and verify dev server runs**

Run: `npm install`
Then run: `npm run dev`
Expected: Vite dev server starts on `http://localhost:5173`. Open the URL — you see the "Driver Route from Log" heading. Stop the server (Ctrl-C).

- [ ] **Step 12: Commit**

```bash
git add .
git commit -m "feat: scaffold vite + react + typescript project"
```

---

## Task 2: Define shared types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create `src/types.ts`**

```ts
export type LogEntry = {
  timestamp: Date;
  lat: number;
  lng: number;
  gpsAccuracy: number;
  gpsAge: number;
  gpsContext: string;
  deviceBattery: number;
  deviceBatteryState: string;
  deviceLowPower: boolean;
};

export type LoadedFile = {
  id: string;
  fileName: string;
  userId: string;
  color: string;
  entries: LogEntry[];
  uploadedAt: number;
};

export const LOW_ACCURACY_METERS = 100;
export const STALE_FIX_SECONDS = 60;

export function isLowAccuracy(entry: LogEntry): boolean {
  return entry.gpsAccuracy > LOW_ACCURACY_METERS || entry.gpsAge > STALE_FIX_SECONDS;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: define LogEntry and LoadedFile types"
```

---

## Task 3: Implement the log parser (TDD)

**Files:**
- Test: `src/lib/parseLog.test.ts`
- Create: `src/lib/parseLog.ts`

The parser converts Rails-format log text into `LogEntry[]` plus a `userId`.

- [ ] **Step 1: Write `src/lib/parseLog.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { parseLog, ParseLogError } from "./parseLog";

const wellFormed = `
2026-04-23 17:12:03
I, [2026-04-23T08:12:03.795559 #19]  INFO -- : [fc417048-3d07-492b-a3d5-10ca279cba7b] GgtController#location user_id=404909 params={"lat"=>37.50156698512974, "long"=>127.14854051703823, "gps_accuracy"=>39.97, "gps_age"=>218.56, "gps_context"=>"location_update", "device_battery"=>0.75, "device_battery_state"=>"unplugged", "device_low_power"=>false}
2026-04-23 16:39:10
I, [2026-04-23T07:39:10.597750 #20]  INFO -- : [9c70b7ea-1db9-46d1-839d-9184880ff87b] GgtController#location user_id=404909 params={"lat"=>37.557818769715304, "long"=>127.20604586121574, "gps_accuracy"=>126.27, "gps_age"=>0.03, "gps_context"=>"location_update", "device_battery"=>0.8, "device_battery_state"=>"unplugged", "device_low_power"=>false}
`.trim();

describe("parseLog", () => {
  it("parses a well-formed log into entries with the user id", () => {
    const result = parseLog(wellFormed);
    expect(result.userId).toBe("404909");
    expect(result.entries).toHaveLength(2);
  });

  it("sorts entries chronologically (input was descending)", () => {
    const result = parseLog(wellFormed);
    expect(result.entries[0].timestamp.getTime()).toBeLessThan(
      result.entries[1].timestamp.getTime(),
    );
  });

  it("extracts coordinates as numbers", () => {
    const result = parseLog(wellFormed);
    const last = result.entries[1];
    expect(last.lat).toBeCloseTo(37.50156698512974);
    expect(last.lng).toBeCloseTo(127.14854051703823);
  });

  it("treats the KST line as Asia/Seoul time", () => {
    const result = parseLog(wellFormed);
    // 2026-04-23 16:39:10 KST = 2026-04-23 07:39:10 UTC
    expect(result.entries[0].timestamp.toISOString()).toBe("2026-04-23T07:39:10.000Z");
  });

  it("captures gps fields and device fields", () => {
    const e = parseLog(wellFormed).entries[1];
    expect(e.gpsAccuracy).toBeCloseTo(39.97);
    expect(e.gpsAge).toBeCloseTo(218.56);
    expect(e.gpsContext).toBe("location_update");
    expect(e.deviceBattery).toBeCloseTo(0.75);
    expect(e.deviceBatteryState).toBe("unplugged");
    expect(e.deviceLowPower).toBe(false);
  });

  it("rejects an empty file", () => {
    expect(() => parseLog("")).toThrow(ParseLogError);
  });

  it("rejects a file with no GgtController#location lines", () => {
    expect(() => parseLog("nothing relevant\nstill nothing")).toThrow(ParseLogError);
  });

  it("rejects a file with multiple distinct user_ids", () => {
    const multi = `
2026-04-23 17:12:03
I, [...] INFO -- : [a] GgtController#location user_id=111 params={"lat"=>1.0, "long"=>2.0, "gps_accuracy"=>1, "gps_age"=>1, "gps_context"=>"x", "device_battery"=>1, "device_battery_state"=>"y", "device_low_power"=>false}
2026-04-23 17:12:04
I, [...] INFO -- : [b] GgtController#location user_id=222 params={"lat"=>1.0, "long"=>2.0, "gps_accuracy"=>1, "gps_age"=>1, "gps_context"=>"x", "device_battery"=>1, "device_battery_state"=>"y", "device_low_power"=>false}
`.trim();
    expect(() => parseLog(multi)).toThrow(ParseLogError);
  });

  it("handles negative numbers in params", () => {
    const negative = `
2026-04-23 17:12:03
I, [...] INFO -- : [a] GgtController#location user_id=1 params={"lat"=>-37.5, "long"=>-127.1, "gps_accuracy"=>1, "gps_age"=>0, "gps_context"=>"x", "device_battery"=>0.1, "device_battery_state"=>"y", "device_low_power"=>true}
`.trim();
    const e = parseLog(negative).entries[0];
    expect(e.lat).toBeCloseTo(-37.5);
    expect(e.lng).toBeCloseTo(-127.1);
    expect(e.deviceLowPower).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they all fail**

Run: `npm test`
Expected: 9 tests fail with "parseLog is not defined" or "Cannot find module './parseLog'".

- [ ] **Step 3: Implement `src/lib/parseLog.ts`**

```ts
import type { LogEntry } from "../types";

export class ParseLogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseLogError";
  }
}

export type ParseResult = {
  userId: string;
  entries: LogEntry[];
};

const INFO_LINE_RE = /GgtController#location\s+user_id=(\d+)\s+params=(\{.*\})\s*$/;
const KST_LINE_RE = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s*$/;

export function parseLog(text: string): ParseResult {
  const lines = text.split(/\r?\n/);
  const entries: LogEntry[] = [];
  const userIds = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(INFO_LINE_RE);
    if (!m) continue;

    const userId = m[1];
    const paramsBlob = m[2];

    const tsLine = findPreviousNonEmpty(lines, i);
    if (!tsLine || !KST_LINE_RE.test(tsLine.trim())) continue;

    const timestamp = parseKstLine(tsLine.trim());
    if (!timestamp) continue;

    const params = parseRubyHash(paramsBlob);
    if (!params) continue;

    userIds.add(userId);

    entries.push({
      timestamp,
      lat: Number(params.lat),
      lng: Number(params.long),
      gpsAccuracy: Number(params.gps_accuracy),
      gpsAge: Number(params.gps_age),
      gpsContext: String(params.gps_context),
      deviceBattery: Number(params.device_battery),
      deviceBatteryState: String(params.device_battery_state),
      deviceLowPower: Boolean(params.device_low_power),
    });
  }

  if (entries.length === 0) {
    throw new ParseLogError("No GgtController#location entries found");
  }
  if (userIds.size > 1) {
    throw new ParseLogError(
      `File contains multiple user_ids (${[...userIds].join(", ")}). One file must contain a single user.`,
    );
  }

  entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return { userId: [...userIds][0], entries };
}

function findPreviousNonEmpty(lines: string[], from: number): string | null {
  for (let j = from - 1; j >= 0; j--) {
    if (lines[j].trim() !== "") return lines[j];
  }
  return null;
}

function parseKstLine(line: string): Date | null {
  // "2026-04-23 17:12:03" interpreted as Asia/Seoul (UTC+9, no DST).
  const m = line.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  // Build the equivalent UTC instant by subtracting 9 hours.
  const utcMs = Date.UTC(+y, +mo - 1, +d, +h - 9, +mi, +s);
  return new Date(utcMs);
}

function parseRubyHash(blob: string): Record<string, unknown> | null {
  // Convert Ruby hash rocket syntax to JSON. Sample uses double-quoted keys
  // and JSON-compatible primitive values, so a simple `=>` -> `:` replace is sufficient.
  const jsonish = blob.replace(/=>/g, ":");
  try {
    return JSON.parse(jsonish);
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests to verify they all pass**

Run: `npm test`
Expected: all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/parseLog.ts src/lib/parseLog.test.ts
git commit -m "feat: parse rails-format driver location logs"
```

---

## Task 4: Color palette (TDD)

**Files:**
- Test: `src/lib/colors.test.ts`
- Create: `src/lib/colors.ts`

- [ ] **Step 1: Write `src/lib/colors.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { colorForUserId, PALETTE } from "./colors";

describe("colorForUserId", () => {
  it("returns a value from the palette", () => {
    const c = colorForUserId("404909");
    expect(PALETTE).toContain(c);
  });

  it("is deterministic for the same user id", () => {
    expect(colorForUserId("404909")).toBe(colorForUserId("404909"));
  });

  it("tends to assign different colors to different user ids", () => {
    const ids = ["404909", "404801", "225714"];
    const colors = ids.map(colorForUserId);
    // With 3 ids and 8-color palette, expect at least 2 distinct.
    expect(new Set(colors).size).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: 3 tests fail with "Cannot find module './colors'".

- [ ] **Step 3: Implement `src/lib/colors.ts`**

```ts
export const PALETTE = [
  "#e85d4a", // red
  "#3a82f7", // blue
  "#2bb673", // green
  "#f5a623", // amber
  "#9b59b6", // purple
  "#1abc9c", // teal
  "#e67e22", // orange
  "#34495e", // slate
] as const;

export function colorForUserId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: 3 new tests pass; all 12 total tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/colors.ts src/lib/colors.test.ts
git commit -m "feat: deterministic color palette per user id"
```

---

## Task 5: KST time formatter

**Files:**
- Create: `src/lib/time.ts`

- [ ] **Step 1: Create `src/lib/time.ts`**

```ts
const formatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "Asia/Seoul",
});

export function formatKstTime(date: Date): string {
  return formatter.format(date);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/time.ts
git commit -m "feat: KST HH:mm:ss formatter"
```

---

## Task 6: Zustand store with persistence (TDD)

**Files:**
- Test: `src/state/routesStore.test.ts`
- Create: `src/state/routesStore.ts`

- [ ] **Step 1: Write `src/state/routesStore.test.ts`**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import type { LoadedFile } from "../types";
import { useRoutesStore } from "./routesStore";

function fileFixture(overrides: Partial<LoadedFile> = {}): LoadedFile {
  return {
    id: "id-1",
    fileName: "f.txt",
    userId: "404909",
    color: "#e85d4a",
    entries: [
      {
        timestamp: new Date("2026-04-23T07:39:10Z"),
        lat: 37.5,
        lng: 127.1,
        gpsAccuracy: 10,
        gpsAge: 0,
        gpsContext: "location_update",
        deviceBattery: 0.8,
        deviceBatteryState: "unplugged",
        deviceLowPower: false,
      },
    ],
    uploadedAt: 1,
    ...overrides,
  };
}

beforeEach(() => {
  useRoutesStore.getState().clear();
});

describe("routesStore", () => {
  it("starts empty", () => {
    expect(useRoutesStore.getState().files).toEqual([]);
  });

  it("addFile appends a file", () => {
    useRoutesStore.getState().addFile(fileFixture());
    expect(useRoutesStore.getState().files).toHaveLength(1);
  });

  it("removeFile removes by id", () => {
    useRoutesStore.getState().addFile(fileFixture({ id: "a" }));
    useRoutesStore.getState().addFile(fileFixture({ id: "b" }));
    useRoutesStore.getState().removeFile("a");
    expect(useRoutesStore.getState().files.map((f) => f.id)).toEqual(["b"]);
  });

  it("clear removes all", () => {
    useRoutesStore.getState().addFile(fileFixture({ id: "a" }));
    useRoutesStore.getState().addFile(fileFixture({ id: "b" }));
    useRoutesStore.getState().clear();
    expect(useRoutesStore.getState().files).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: routesStore tests fail with "Cannot find module './routesStore'".

- [ ] **Step 3: Implement `src/state/routesStore.ts`**

```ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { LoadedFile } from "../types";

type RoutesState = {
  files: LoadedFile[];
  addFile: (file: LoadedFile) => void;
  removeFile: (id: string) => void;
  clear: () => void;
};

export const useRoutesStore = create<RoutesState>()(
  persist(
    (set) => ({
      files: [],
      addFile: (file) => set((state) => ({ files: [...state.files, file] })),
      removeFile: (id) =>
        set((state) => ({ files: state.files.filter((f) => f.id !== id) })),
      clear: () => set({ files: [] }),
    }),
    {
      name: "driver-route-from-log:v1",
      storage: createJSONStorage(() => localStorage),
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: 4 store tests pass; all 16 tests pass total.

- [ ] **Step 5: Commit**

```bash
git add src/state/routesStore.ts src/state/routesStore.test.ts
git commit -m "feat: zustand store with localStorage persistence"
```

---

## Task 7: Kakao SDK loader and App shell

The Kakao Maps SDK is loaded via a `<script>` tag. We inject it from `main.tsx` so the env var works in dev and prod identically. `react-kakao-maps-sdk` requires `window.kakao.maps.load(...)` to have been called before its components mount.

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Update `src/main.tsx` to load the Kakao SDK before mounting**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";

function loadKakaoSdk(appKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).kakao?.maps) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = () => {
      const kakao = (window as any).kakao;
      if (!kakao?.maps?.load) {
        reject(new Error("Kakao SDK loaded but window.kakao.maps.load is missing"));
        return;
      }
      kakao.maps.load(() => resolve());
    };
    script.onerror = () => reject(new Error("Failed to load Kakao Maps SDK"));
    document.head.appendChild(script);
  });
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
const appKey = import.meta.env.VITE_KAKAO_MAP_KEY;

function renderError(message: string) {
  root.render(
    <div className="sdk-error">
      <h1>Kakao Maps failed to load</h1>
      <p>{message}</p>
    </div>,
  );
}

if (!appKey) {
  renderError("VITE_KAKAO_MAP_KEY is not set. Copy .env.example to .env and set the key.");
} else {
  loadKakaoSdk(appKey)
    .then(() => {
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      );
    })
    .catch((err: Error) => renderError(err.message));
}
```

- [ ] **Step 2: Update `src/App.tsx` to compose the layout**

```tsx
import MapView from "./components/MapView";
import UploadPanel from "./components/UploadPanel";
import Legend from "./components/Legend";

export default function App() {
  return (
    <div className="app">
      <MapView />
      <UploadPanel />
      <Legend />
    </div>
  );
}
```

- [ ] **Step 3: Update `src/App.css` with layout primitives**

```css
* { box-sizing: border-box; }
html, body, #root { margin: 0; height: 100%; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.app { position: relative; height: 100vh; width: 100vw; overflow: hidden; }

.sdk-error {
  padding: 2rem;
  color: #b00020;
  font-family: monospace;
}

.floating-card {
  position: absolute;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  padding: 0.75rem 1rem;
  z-index: 10;
}
```

- [ ] **Step 4: Add type stub for `window.kakao` (skipped for now)**

`react-kakao-maps-sdk` ships its own ambient types. No additional declaration needed; the `(window as any).kakao` casts in `main.tsx` are intentional because the SDK isn't loaded synchronously at TypeScript compile time.

- [ ] **Step 5: Commit (the components are referenced but not yet created — next tasks add them, build will fail until then; that is expected)**

```bash
git add src/main.tsx src/App.tsx src/App.css
git commit -m "feat: kakao sdk loader and app layout shell"
```

---

## Task 8: MapView component

**Files:**
- Create: `src/components/MapView.tsx`

- [ ] **Step 1: Create `src/components/MapView.tsx`**

```tsx
import { useEffect, useRef } from "react";
import { Map } from "react-kakao-maps-sdk";
import { useRoutesStore } from "../state/routesStore";
import RouteLayer from "./RouteLayer";

const SEOUL = { lat: 37.5665, lng: 126.978 };

export default function MapView() {
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

- [ ] **Step 2: Commit (build still fails until RouteLayer exists — next task)**

```bash
git add src/components/MapView.tsx
git commit -m "feat: MapView with bounds auto-fit"
```

---

## Task 9: RouteLayer component (markers, polyline segments, labels)

**Files:**
- Create: `src/components/RouteLayer.tsx`

The polyline is rendered as one segment per consecutive pair of entries so we can style low-accuracy segments differently. Markers use `CustomOverlayMap` to show a colored circle plus an `HH:mm:ss` label.

- [ ] **Step 1: Create `src/components/RouteLayer.tsx`**

```tsx
import { CustomOverlayMap, Polyline } from "react-kakao-maps-sdk";
import type { LoadedFile, LogEntry } from "../types";
import { isLowAccuracy } from "../types";
import { formatKstTime } from "../lib/time";

type Props = { file: LoadedFile };

export default function RouteLayer({ file }: Props) {
  const segments = buildSegments(file.entries);

  return (
    <>
      {segments.map((seg, i) => (
        <Polyline
          key={`seg-${file.id}-${i}`}
          path={[
            { lat: seg.from.lat, lng: seg.from.lng },
            { lat: seg.to.lat, lng: seg.to.lng },
          ]}
          strokeWeight={3}
          strokeColor={file.color}
          strokeOpacity={seg.degraded ? 0.4 : 0.9}
          strokeStyle={seg.degraded ? "shortdash" : "solid"}
        />
      ))}

      {file.entries.map((entry, i) => {
        const degraded = isLowAccuracy(entry);
        return (
          <CustomOverlayMap
            key={`mk-${file.id}-${i}`}
            position={{ lat: entry.lat, lng: entry.lng }}
            yAnchor={0.5}
            xAnchor={0.5}
          >
            <div className="route-marker" style={{ opacity: degraded ? 0.55 : 1 }}>
              <span
                className="route-marker__dot"
                style={{
                  background: degraded ? "transparent" : file.color,
                  borderColor: file.color,
                }}
              />
              <span className="route-marker__label">{formatKstTime(entry.timestamp)}</span>
            </div>
          </CustomOverlayMap>
        );
      })}
    </>
  );
}

type Segment = { from: LogEntry; to: LogEntry; degraded: boolean };

function buildSegments(entries: LogEntry[]): Segment[] {
  const segs: Segment[] = [];
  for (let i = 1; i < entries.length; i++) {
    const a = entries[i - 1];
    const b = entries[i];
    segs.push({
      from: a,
      to: b,
      degraded: isLowAccuracy(a) || isLowAccuracy(b),
    });
  }
  return segs;
}
```

- [ ] **Step 2: Add marker styles to `src/App.css`**

Append:

```css
.route-marker {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  transform: translateY(-1px);
  pointer-events: none;
}
.route-marker__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid;
  display: inline-block;
}
.route-marker__label {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.1);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  color: #222;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/RouteLayer.tsx src/App.css
git commit -m "feat: RouteLayer renders markers, labels, and polyline segments"
```

---

## Task 10: UploadPanel component

**Files:**
- Create: `src/components/UploadPanel.tsx`
- Create: `src/components/UploadPanel.css`

- [ ] **Step 1: Create `src/components/UploadPanel.tsx`**

```tsx
import { useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { parseLog, ParseLogError } from "../lib/parseLog";
import { colorForUserId } from "../lib/colors";
import { useRoutesStore } from "../state/routesStore";
import "./UploadPanel.css";

export default function UploadPanel() {
  const addFile = useRoutesStore((s) => s.addFile);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    try {
      const text = await file.text();
      const { userId, entries } = parseLog(text);
      addFile({
        id: uuid(),
        fileName: file.name,
        userId,
        color: colorForUserId(userId),
        entries,
        uploadedAt: Date.now(),
      });
    } catch (e) {
      const message =
        e instanceof ParseLogError
          ? e.message
          : `Couldn't read ${file.name}: ${(e as Error).message}`;
      setError(message);
    }
  }

  return (
    <div
      className={`floating-card upload-panel${dragOver ? " upload-panel--drag" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) void handleFile(f);
      }}
    >
      <button
        type="button"
        className="upload-panel__btn"
        onClick={() => inputRef.current?.click()}
      >
        Upload log file
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.log,text/plain"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      <p className="upload-panel__hint">or drag a `.txt` log here</p>
      {error && <p className="upload-panel__error">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/UploadPanel.css`**

```css
.upload-panel {
  top: 16px;
  left: 16px;
  min-width: 220px;
}
.upload-panel--drag {
  outline: 2px dashed #3a82f7;
}
.upload-panel__btn {
  background: #3a82f7;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
}
.upload-panel__btn:hover { background: #2c6dde; }
.upload-panel__hint {
  margin: 8px 0 0;
  color: #666;
  font-size: 12px;
}
.upload-panel__error {
  margin: 8px 0 0;
  color: #b00020;
  font-size: 12px;
  white-space: pre-wrap;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/UploadPanel.tsx src/components/UploadPanel.css
git commit -m "feat: UploadPanel with drag-drop and inline error"
```

---

## Task 11: Legend component

**Files:**
- Create: `src/components/Legend.tsx`
- Create: `src/components/Legend.css`

- [ ] **Step 1: Create `src/components/Legend.tsx`**

```tsx
import { useRoutesStore } from "../state/routesStore";
import "./Legend.css";

export default function Legend() {
  const files = useRoutesStore((s) => s.files);
  const removeFile = useRoutesStore((s) => s.removeFile);
  const clear = useRoutesStore((s) => s.clear);

  if (files.length === 0) return null;

  return (
    <div className="floating-card legend">
      <div className="legend__title">DB Location Data</div>
      {files.map((f) => (
        <div key={f.id} className="legend__row">
          <span className="legend__swatch" style={{ background: f.color }} />
          <span className="legend__id">user_id: {f.userId}</span>
          <span className="legend__count">{f.entries.length}건</span>
          <button
            type="button"
            className="legend__remove"
            aria-label={`Remove ${f.fileName}`}
            onClick={() => removeFile(f.id)}
          >
            ×
          </button>
        </div>
      ))}
      {files.length >= 2 && (
        <button type="button" className="legend__clear" onClick={() => clear()}>
          Clear all
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/Legend.css`**

```css
.legend {
  bottom: 16px;
  right: 16px;
  min-width: 220px;
  font-size: 12px;
}
.legend__title {
  font-weight: 700;
  margin-bottom: 6px;
}
.legend__row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
}
.legend__swatch {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.legend__id { flex: 1; }
.legend__count { color: #666; }
.legend__remove {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 0 4px;
  font-size: 14px;
  line-height: 1;
}
.legend__remove:hover { color: #b00020; }
.legend__clear {
  margin-top: 8px;
  width: 100%;
  background: none;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 4px;
  cursor: pointer;
  font-size: 11px;
  color: #555;
}
.legend__clear:hover { background: #f5f5f5; }
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Legend.tsx src/components/Legend.css
git commit -m "feat: Legend panel with per-file remove and clear all"
```

---

## Task 12: Manual verification

- [ ] **Step 1: Set up the env var locally**

```bash
cp .env.example .env
```

Edit `.env`, set `VITE_KAKAO_MAP_KEY=<your kakao js key>`.

In the Kakao Developers console for this app, register `localhost:5173` and your eventual Vercel domain under "Web platform domains".

- [ ] **Step 2: Run the dev server**

Run: `npm run dev`
Open: `http://localhost:5173`
Expected: empty Seoul-centered map; UploadPanel visible top-left; no Legend.

- [ ] **Step 3: Verify upload + render against the real sample log**

Upload `tasks/driver_location_log_404909.txt` from the local file picker.
Expected:
- Map auto-fits to bounds covering the log's points.
- 45 markers appear, each with an `HH:mm:ss` label.
- A polyline connects them in chronological order.
- Some segments / markers near the eastern points (where `gps_accuracy=1000`) appear dashed and at reduced opacity.
- Legend appears bottom-right showing `user_id: 404909` · `45건` with the file's color.

- [ ] **Step 4: Verify multi-file accumulation**

If you have 404801 and 225714 sample logs (matching the screenshot), upload them one at a time. Expected: each adds a new colored route + legend row; map re-fits to all loaded files. Map should resemble `tasks/Screenshot 2026-04-29 at 6.10.53 PM.png`.

- [ ] **Step 5: Verify persistence**

Refresh the browser. Expected: previously loaded files reappear with the same colors and routes.

- [ ] **Step 6: Verify per-file remove and clear all**

Click `×` on a legend row → that file's markers and polyline disappear. With 2+ files loaded, click "Clear all" → map clears.

- [ ] **Step 7: Verify error path**

Upload a non-log `.txt` (e.g., `echo "garbage" > /tmp/bad.txt`). Expected: red error message in the upload card; map state unchanged.

- [ ] **Step 8: Verify SDK error path**

Temporarily clear `VITE_KAKAO_MAP_KEY` in `.env`, restart `npm run dev`. Expected: full-page error "Kakao Maps failed to load. VITE_KAKAO_MAP_KEY is not set...". Restore the key after.

---

## Task 13: Deploy to Vercel

- [ ] **Step 1: Verify production build works locally**

Run: `npm run build`
Expected: build completes; `dist/` contains `index.html` and assets. No TypeScript errors.

Run: `npm run preview`
Open the printed URL and re-verify a single upload works.

- [ ] **Step 2: Deploy to Vercel**

Run: `vercel` (first run links the directory; pick the `mthuong` scope, accept defaults — `Vite` framework preset is auto-detected).

After link succeeds, set the env var on the project:

```bash
vercel env add VITE_KAKAO_MAP_KEY production
# paste the key when prompted
vercel env add VITE_KAKAO_MAP_KEY preview
vercel env add VITE_KAKAO_MAP_KEY development
```

Then deploy production:

```bash
vercel --prod
```

- [ ] **Step 3: Register the production domain in Kakao Developers**

In the Kakao Developers console for this app, add the printed Vercel domain (e.g., `https://driver-route-from-log.vercel.app`) under "Web platform domains".

- [ ] **Step 4: Verify the live deploy**

Open the production URL and repeat Task 12 steps 3-7 against the live site.

- [ ] **Step 5: Commit any production-config tweaks**

If `vercel.json` or `.env.example` was updated:

```bash
git add vercel.json .env.example
git commit -m "chore: vercel deploy configuration"
git push
```

---

## Self-review notes

- **Spec coverage:** Stack (Task 1), data model (Task 2), parser including all rejection cases (Task 3), color palette (Task 4), KST formatting (Task 5), persistence with Date rehydration (Task 6), SDK loader + error banner (Task 7), MapView with bounds-fit (Task 8), RouteLayer with low-accuracy styling (Task 9), UploadPanel (Task 10), Legend with remove + clear all (Task 11), manual verification (Task 12), deploy (Task 13). Spec sections all covered.
- **Type consistency:** `LogEntry`, `LoadedFile`, `isLowAccuracy`, `colorForUserId`, `formatKstTime`, `parseLog`, `ParseLogError`, `useRoutesStore` are all named identically across tasks.
- **No placeholders.**
