# Design: Support Explore Log Format

**Date:** 2026-05-04  
**Status:** Approved

## Problem

The application currently only parses one log format (the "Ruby logger" format used by `driver_location_log_*.txt` files). A second log format — exported from a Grafana/Loki-style log explorer — has surfaced in `tasks/Explore-logs-*.txt`. Users need to be able to load these files without any extra steps.

## New Format

Each line is a tab-separated pair:

```
<ISO8601 timestamp with TZ offset>\t<JSON object>
```

Example:

```
2026-05-04T15:26:05+07:00\t{"time":"2026-05-04T08:26:05.615+00:00","type":"INFO","message":"[67551b56-...] GgtController#location user_id=241273 params={\"lat\"=\u003e10.839842377785573, \"long\"=\u003e106.83964026118743, ...}"}
```

The JSON `message` field contains the same `GgtController#location user_id=X params={...}` payload as the existing format. The `\u003e` sequences decode to `>` via `JSON.parse`, so the params string becomes standard Ruby-hash syntax that `parseRubyHash` already handles.

## Approach

Extend the existing `parseLog` function (Option A — single parser, dual-regex).

No new files. No format selector. Auto-detection is implicit: the parser tries both line patterns and collects whatever matches.

## Implementation Details

### `src/lib/parseLog.ts`

1. Add `EXPLORE_LINE_RE` regex that matches lines of the form `<ISO8601+TZ>\t<JSON>`.
2. In the main loop, after the existing `INFO_LINE_RE` branch, add an `else` branch:
   - Match `EXPLORE_LINE_RE` against the line.
   - `JSON.parse` the JSON blob to extract `message` and timestamp.
   - Run `INFO_LINE_RE` against `message` to get `userId` and `paramsBlob`.
   - Parse `paramsBlob` with the existing `parseRubyHash`.
   - Parse timestamp with `new Date(isoString)` (the leading field includes the TZ offset, so `Date` resolves it to UTC correctly).
3. All existing validations (no entries, multiple user IDs, sort) remain unchanged.

### `src/lib/parseLog.test.ts`

Add a `describe("parseLog — Explore format")` block:

- Parses user ID and entry count from a well-formed Explore-format snippet.
- Extracts lat/lng, GPS fields, and device fields correctly.
- Parses the timestamp with the correct timezone offset.
- Entries are sorted chronologically when input is descending.
- Rejects an Explore-format file with no matching entries.
- Rejects an Explore-format file with multiple distinct user IDs.
- (Bonus) A file mixing both formats from the same user produces a unified sorted result.

## Out of Scope

- UI changes to the file-upload flow (no format selector needed).
- Support for any other log formats not yet observed.
- Validation of the `type` field in the JSON (always `"INFO"` in observed data; silently skipped if not).
