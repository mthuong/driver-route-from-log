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
   /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+\-]\d{2}:\d{2})\t(\{.*\})\s*$/
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

3. In the explore branch, use **regex extraction** rather than `JSON.parse` — the actual files contain unescaped double-quotes inside the `message` value, making the outer blob invalid JSON:
   - Extract timestamp: `blob.match(/"time":"([^"]+)"/)` → group 1.
   - Extract message: `blob.match(/"message":"(.*)"\}$/)` → group 1.
   - If either regex fails to match, **silently `continue`**.
   - Run `INFO_LINE_RE` against `message`. If no match, `continue`.
   - The `message` string contains **literal `\u003e`** (the 6-character escape sequence, not the `>` character). Decode it before parsing params: `paramsBlob.replace(/\\u003e/g, '>')`, then pass to `parseRubyHash` as usual.
   - Use the extracted `time` value (`2026-05-04T08:26:05.615+00:00`) as the timestamp via `new Date(timeStr)` — ISO 8601 strings are natively supported by the `Date` constructor. Do **not** reuse `parseKstLine`, which only handles `YYYY-MM-DD HH:MM:SS` and would return `null` for this format.

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
- Silently skips explore-format lines where the blob has no `"time"` or `"message"` regex match (e.g., truncated line).
- Silently skips explore-format lines where the `"message"` regex matches but the message content does not contain `GgtController#location user_id=… params=…`.

## Out of Scope

- UI changes to the file-upload flow (no format selector needed).
- Support for any other log formats not yet observed.
- Validation of the `type` field in the JSON (always `"INFO"` in observed data; silently skipped if not).
