# Explore Log Format Support — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `parseLog` to auto-detect and parse the Grafana/Loki "Explore" log format alongside the existing Ruby-logger format.

**Architecture:** A single extra regex branch (`EXPLORE_LINE_RE`) is added at the top of the existing parse loop. Each explore line is self-contained (timestamp + payload in one line), so no look-behind to find a previous KST timestamp line is needed. All downstream validation (no entries, multiple user IDs, sort) is unchanged.

**Tech Stack:** TypeScript, Vitest

---

## Chunk 1: Tests + Implementation

### Task 1: Write the failing tests for the Explore format

**Files:**
- Modify: `src/lib/parseLog.test.ts`

The test fixture uses real data shape from the actual log files. Key format details:
- Each line: `<ISO8601+TZ>\t{"time":"<UTC ISO with ms>","type":"INFO","message":"[id] GgtController#location user_id=X params={\"key\"=\\u003evalue, ...}"}`
- The blob is **not** valid JSON (unescaped quotes inside `message`).
- `\u003e` is a literal 6-char sequence (`\`, `u`, `0`, `0`, `3`, `e`), not `>`.
- Timestamp to use: `json.time` field (millisecond precision), parsed with `new Date(timeStr)`.

- [ ] **Step 1.1: Add the Explore-format test fixture and first two cases**

Append to `src/lib/parseLog.test.ts` (after the existing `describe` block):

```typescript
// Two entries, descending order (as logs are typically exported).
// Note: params keys use plain " (unescaped in template literals) and literal \\u003e (6-char sequence).
const exploreLog = [
  `2026-05-04T15:26:05+07:00\t{"time":"2026-05-04T08:26:05.615+00:00","type":"INFO","message":"[aaa] GgtController#location user_id=241273 params={"lat"=\\u003e10.8398, "long"=\\u003e106.8396, "gps_accuracy"=\\u003e15.47, "gps_age"=\\u003e0.016, "gps_context"=\\u003e"location_update", "device_battery"=\\u003e1, "device_battery_state"=\\u003e"unplugged", "device_low_power"=\\u003efalse}"}`,
  `2026-05-04T15:25:53+07:00\t{"time":"2026-05-04T08:25:53.911+00:00","type":"INFO","message":"[bbb] GgtController#location user_id=241273 params={"lat"=\\u003e10.8392, "long"=\\u003e106.8390, "gps_accuracy"=\\u003e22.17, "gps_age"=\\u003e0.071, "gps_context"=\\u003e"location_update", "device_battery"=\\u003e0.5, "device_battery_state"=\\u003e"charging", "device_low_power"=\\u003etrue}"}`,
].join("\n");

describe("parseLog — Explore format", () => {
  it("parses user ID and entry count", () => {
    const result = parseLog(exploreLog);
    expect(result.userId).toBe("241273");
    expect(result.entries).toHaveLength(2);
  });

  it("sorts entries chronologically (input is descending)", () => {
    const result = parseLog(exploreLog);
    expect(result.entries[0].timestamp.getTime()).toBeLessThan(
      result.entries[1].timestamp.getTime(),
    );
  });
```

- [ ] **Step 1.2: Add field-extraction and timestamp-precision tests**

Continue the same `describe` block:

```typescript
  it("extracts coordinates and GPS fields", () => {
    const result = parseLog(exploreLog);
    const first = result.entries[0]; // chronologically first = second line
    expect(first.lat).toBeCloseTo(10.8392);
    expect(first.lng).toBeCloseTo(106.8390);
    expect(first.gpsAccuracy).toBeCloseTo(22.17);
    expect(first.gpsAge).toBeCloseTo(0.071);
    expect(first.gpsContext).toBe("location_update");
  });

  it("extracts device fields", () => {
    const first = parseLog(exploreLog).entries[0];
    expect(first.deviceBattery).toBeCloseTo(0.5);
    expect(first.deviceBatteryState).toBe("charging");
    expect(first.deviceLowPower).toBe(true);
  });

  it("uses json.time for millisecond-precision timestamps", () => {
    const result = parseLog(exploreLog);
    // 2026-05-04T08:25:53.911+00:00 → first chronological entry
    expect(result.entries[0].timestamp.toISOString()).toBe("2026-05-04T08:25:53.911Z");
  });
```

- [ ] **Step 1.3: Add error and skip-behaviour tests**

Continue the `describe` block:

```typescript
  it("rejects an Explore-format file with no matching entries", () => {
    expect(() => parseLog("2026-05-04T15:26:05+07:00\t{}")).toThrow(ParseLogError);
  });

  it("rejects an Explore-format file with multiple distinct user_ids", () => {
    const multi = [
      `2026-05-04T15:26:05+07:00\t{"time":"2026-05-04T08:26:05.000+00:00","type":"INFO","message":"[a] GgtController#location user_id=111 params={"lat"=\\u003e1.0, "long"=\\u003e2.0, "gps_accuracy"=\\u003e1, "gps_age"=\\u003e0, "gps_context"=\\u003e"x", "device_battery"=\\u003e1, "device_battery_state"=\\u003e"y", "device_low_power"=\\u003efalse}"}`,
      `2026-05-04T15:25:00+07:00\t{"time":"2026-05-04T08:25:00.000+00:00","type":"INFO","message":"[b] GgtController#location user_id=222 params={"lat"=\\u003e1.0, "long"=\\u003e2.0, "gps_accuracy"=\\u003e1, "gps_age"=\\u003e0, "gps_context"=\\u003e"x", "device_battery"=\\u003e1, "device_battery_state"=\\u003e"y", "device_low_power"=\\u003efalse}"}`,
    ].join("\n");
    expect(() => parseLog(multi)).toThrow(ParseLogError);
  });

  it("silently skips a line where time or message regex does not match", () => {
    // Truncated / malformed blob — no "time" or "message" fields
    const withGarbage = `2026-05-04T15:26:05+07:00\t{"broken":true}\n` + exploreLog;
    const result = parseLog(withGarbage);
    expect(result.entries).toHaveLength(2); // garbage line skipped
  });

  it("silently skips an explore line whose message lacks GgtController#location", () => {
    const withIrrelevant = [
      `2026-05-04T15:26:05+07:00\t{"time":"2026-05-04T08:26:05.000+00:00","type":"INFO","message":"[x] SomeOtherController#action user_id=241273"}`,
      ...exploreLog.split("\n"),
    ].join("\n");
    const result = parseLog(withIrrelevant);
    expect(result.entries).toHaveLength(2); // irrelevant line skipped
  });
});
```

- [ ] **Step 1.4: Add the mixed-format integration test**

This is its own `describe` to keep the two test blocks readable:

```typescript
describe("parseLog — mixed format (Explore + Ruby-logger, same user)", () => {
  it("produces a unified sorted result", () => {
    // One Ruby-logger entry: 2026-04-23 16:39:10 KST = 2026-04-23T07:39:10.000Z
    const rubyLine = [
      "2026-04-23 16:39:10",
      `I, [2026-04-23T07:39:10.597750 #1]  INFO -- : [old] GgtController#location user_id=241273 params={"lat"=>1.0, "long"=>2.0, "gps_accuracy"=>5, "gps_age"=>0.1, "gps_context"=>"location_update", "device_battery"=>0.9, "device_battery_state"=>"unplugged", "device_low_power"=>false}`,
    ].join("\n");

    // One Explore entry: 2026-05-04T08:26:05.615Z (newer)
    const exploreLine = `2026-05-04T15:26:05+07:00\t{"time":"2026-05-04T08:26:05.615+00:00","type":"INFO","message":"[new] GgtController#location user_id=241273 params={"lat"=\\u003e10.8398, "long"=\\u003e106.8396, "gps_accuracy"=\\u003e15.47, "gps_age"=\\u003e0.016, "gps_context"=\\u003e"location_update", "device_battery"=\\u003e1, "device_battery_state"=\\u003e"unplugged", "device_low_power"=\\u003efalse}"}`;

    const result = parseLog(`${rubyLine}\n${exploreLine}`);
    expect(result.userId).toBe("241273");
    expect(result.entries).toHaveLength(2);
    // Ruby entry (older) must come first after sort
    expect(result.entries[0].timestamp.toISOString()).toBe("2026-04-23T07:39:10.000Z");
    expect(result.entries[1].timestamp.toISOString()).toBe("2026-05-04T08:26:05.615Z");
  });
});
```

- [ ] **Step 1.5: Run tests — verify they all fail (implementation not yet written)**

```bash
npm test -- --reporter=verbose 2>&1 | tail -30
```

Expected: all new tests FAIL with "No GgtController#location entries found" or similar.

---

### Task 2: Implement the Explore-format branch in `parseLog.ts`

**Files:**
- Modify: `src/lib/parseLog.ts`

- [ ] **Step 2.1: Add `EXPLORE_LINE_RE` constant**

In `src/lib/parseLog.ts`, add directly after the existing `KST_LINE_RE` constant:

```typescript
const EXPLORE_LINE_RE =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+\-]\d{2}:\d{2})\t(\{.*\})\s*$/;
```

- [ ] **Step 2.2: Add `EXPLORE_TIME_RE` and `EXPLORE_MSG_RE` field-extraction constants**

Add directly after `EXPLORE_LINE_RE`:

```typescript
const EXPLORE_TIME_RE = /"time":"([^"]+)"/;
const EXPLORE_MSG_RE = /"message":"(.*)"\}$/;
```

- [ ] **Step 2.3: Restructure the parse loop to check explore format first**

Replace the current loop body:

```typescript
// BEFORE
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
```

With:

```typescript
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  const exploreM = line.match(EXPLORE_LINE_RE);
  if (exploreM) {
    const blob = exploreM[2];
    const timeM = blob.match(EXPLORE_TIME_RE);
    const msgM = blob.match(EXPLORE_MSG_RE);
    if (!timeM || !msgM) continue;

    const infoM = msgM[1].match(INFO_LINE_RE);
    if (!infoM) continue;

    const timestamp = new Date(timeM[1]);
    const paramsBlob = infoM[2].replace(/\\u003e/g, ">");
    const params = parseRubyHash(paramsBlob);
    if (!params) continue;

    userIds.add(infoM[1]);
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
    continue;
  }

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
```

- [ ] **Step 2.4: Run all tests — verify everything passes**

```bash
npm test -- --reporter=verbose 2>&1 | tail -40
```

Expected: all existing tests PASS, all new Explore-format tests PASS.

- [ ] **Step 2.5: Commit**

```bash
git add src/lib/parseLog.ts src/lib/parseLog.test.ts
git commit -m "feat: support Explore log format in parseLog

Add EXPLORE_LINE_RE branch checked before INFO_LINE_RE. Uses regex
extraction (not JSON.parse — blobs contain unescaped quotes). Decodes
literal \\u003e sequences before passing to parseRubyHash. Timestamp
taken from json.time for millisecond precision.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
