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
const EXPLORE_LINE_RE =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+\-]\d{2}:\d{2})\t(\{.*\})\s*$/;
const EXPLORE_TIME_RE = /"time":"([^"]+)"/;
const EXPLORE_MSG_RE = /"message":"(.*)"\}$/;

export function parseLog(text: string): ParseResult {
  const lines = text.split(/\r?\n/);
  const entries: LogEntry[] = [];
  const userIds = new Set<string>();

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
  const m = line.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const utcMs = Date.UTC(+y, +mo - 1, +d, +h - 9, +mi, +s);
  return new Date(utcMs);
}

function parseRubyHash(blob: string): Record<string, unknown> | null {
  const jsonish = blob.replace(/=>/g, ":");
  try {
    return JSON.parse(jsonish);
  } catch {
    return null;
  }
}
