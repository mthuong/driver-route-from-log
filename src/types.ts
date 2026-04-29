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
