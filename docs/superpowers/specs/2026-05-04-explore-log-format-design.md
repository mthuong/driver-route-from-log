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

1. Add `EXPLORE_LINE_RE` anchored regex that captures the leading ISO timestamp and the JSON blob:
   ```
   /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+\-]\d{2}:\d{2})\t(\{.*\})$/
   ```
   Group 1 = ISO timestamp, Group 2 = JSON blob.

2. In the main loop, **check `EXPLORE_LINE_RE` first**, before `INFO_LINE_RE`. This is critical: `INFO_LINE_RE` is unanchored and would also match explore-format lines (the `GgtController#location` text is present inline), causing the old KST check to discard them before the explore branch is ever reached.

   Loop structure:
   ```
   if (exploreLineMatch) {
     // explore format path
   } else if (infoLineMatch) {
     // existing KST/Ruby-logger path
   }
   ```

3. In the explore branch:
   - `JSON.parse` the blob. If it throws or the result has no `message` string, **silently `continue`** (same pattern as the existing `if (!params) continue`).
   - Run `INFO_LINE_RE` against `message`. If no match, `continue`.
   - Parse timestamp using **`json.time`** (the UTC field with millisecond precision: `2026-05-04T08:26:05.615+00:00`) rather than the leading tab field, to preserve sub-second precision needed for stable sort order when multiple entries share the same second.
   - Parse `paramsBlob` with the existing `parseRubyHash`. After `JSON.parse`, `\u003e` is already decoded to `>`, so `parseRubyHash` works unchanged.

4. All existing file-level validations (no entries, multiple user IDs, sort) remain unchanged.

### `src/lib/parseLog.test.ts`

Add a `describe("parseLog — Explore format")` block:

- Parses user ID and entry count from a well-formed Explore-format snippet.
- Extracts lat/lng, GPS fields, and device fields correctly.
- Parses the timestamp with millisecond precision (uses `json.time`, not the leading field).
- Entries are sorted chronologically when input is descending.
- Rejects an Explore-format file with no matching entries.
- Rejects an Explore-format file with multiple distinct user IDs.
- **Required:** A file mixing both formats from the same user produces a unified sorted result (validates that auto-detection works across both paths in one file).
- Silently skips explore-format lines where `JSON.parse` fails (truncated line).
- Silently skips explore-format lines where the JSON parses but `message` does not match `GgtController#location`.

## Out of Scope

- UI changes to the file-upload flow (no format selector needed).
- Support for any other log formats not yet observed.
- Validation of the `type` field in the JSON (always `"INFO"` in observed data; silently skipped if not).
