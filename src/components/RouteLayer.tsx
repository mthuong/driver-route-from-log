import { useMemo } from "react";
import { CustomOverlayMap, Polyline } from "react-kakao-maps-sdk";
import type { LoadedFile, LogEntry } from "../types";
import { isLowAccuracy } from "../types";
import { formatKstTime } from "../lib/time";

type Props = { file: LoadedFile };

const LINE_COLOR = "#000";
const ARROW_EVERY_N_SEGMENTS = 10;

type Run = { degraded: boolean; path: { lat: number; lng: number }[] };

function buildRuns(entries: LogEntry[]): Run[] {
  if (entries.length < 2) return [];
  const runs: Run[] = [];
  let current: Run | null = null;
  for (let i = 0; i < entries.length - 1; i++) {
    const a = entries[i];
    const b = entries[i + 1];
    const degraded = isLowAccuracy(a) || isLowAccuracy(b);
    if (!current || current.degraded !== degraded) {
      if (current) current.path.push({ lat: a.lat, lng: a.lng });
      current = { degraded, path: [{ lat: a.lat, lng: a.lng }] };
      runs.push(current);
    }
    current.path.push({ lat: b.lat, lng: b.lng });
  }
  return runs;
}

function bearingDeg(a: LogEntry, b: LogEntry): number {
  const toRad = Math.PI / 180;
  const φ1 = a.lat * toRad;
  const φ2 = b.lat * toRad;
  const Δλ = (b.lng - a.lng) * toRad;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function StartPin({ color }: { color: string }) {
  return (
    <svg
      className="route-marker__pin"
      viewBox="0 0 99.6094 99.6582"
      width="24"
      height="24"
      aria-hidden="true"
    >
      <circle cx="49.8047" cy="49.8535" r="49.8047" fill={color} />
      <path
        fill="#fff"
        d="M38.2812 31.0059C38.2812 36.1816 41.6992 40.4785 46.2891 41.8945L46.2891 67.1387C46.2891 74.5117 47.5098 81.1523 49.8047 81.1523C52.1484 81.1523 53.2715 74.6582 53.2715 67.1387L53.2715 41.8945C57.9102 40.5273 61.3281 36.2305 61.3281 31.0059C61.3281 24.6582 56.1523 19.5312 49.8047 19.5312C43.5059 19.5312 38.2812 24.6582 38.2812 31.0059ZM50.4883 28.0762C50.4883 30.0293 48.8281 31.7383 46.8262 31.7383C44.9219 31.7383 43.2129 30.0293 43.2129 28.0762C43.1641 26.0742 44.9219 24.3652 46.8262 24.3652C48.8281 24.3652 50.4883 26.0742 50.4883 28.0762Z"
      />
    </svg>
  );
}

function Arrow({ angle }: { angle: number }) {
  return (
    <svg
      className="route-arrow"
      viewBox="0 0 12 12"
      width="12"
      height="12"
      style={{ transform: `rotate(${angle}deg)` }}
      aria-hidden="true"
    >
      <path
        d="M6 0 L11 11 L6 8 L1 11 Z"
        fill="#000"
        stroke="#fff"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function RouteLayer({ file }: Props) {
  const runs = useMemo(() => buildRuns(file.entries), [file.entries]);
  const lastIdx = file.entries.length - 1;

  const arrows = useMemo(() => {
    const out: { lat: number; lng: number; angle: number; key: string }[] = [];
    for (let i = ARROW_EVERY_N_SEGMENTS; i < file.entries.length - 1; i += ARROW_EVERY_N_SEGMENTS) {
      const a = file.entries[i];
      const b = file.entries[i + 1];
      out.push({
        lat: (a.lat + b.lat) / 2,
        lng: (a.lng + b.lng) / 2,
        angle: bearingDeg(a, b),
        key: `arr-${file.id}-${i}`,
      });
    }
    return out;
  }, [file.entries, file.id]);

  return (
    <>
      {runs.map((run, i) => (
        <Polyline
          key={`run-${file.id}-${i}`}
          path={run.path}
          strokeWeight={3}
          strokeColor={LINE_COLOR}
          strokeOpacity={run.degraded ? 0.4 : 0.9}
          strokeStyle={run.degraded ? "shortdash" : "solid"}
        />
      ))}

      {arrows.map((a) => (
        <CustomOverlayMap
          key={a.key}
          position={{ lat: a.lat, lng: a.lng }}
          xAnchor={0.5}
          yAnchor={0.5}
          zIndex={2}
        >
          <Arrow angle={a.angle} />
        </CustomOverlayMap>
      ))}

      {file.entries.map((entry, i) => {
        const degraded = isLowAccuracy(entry);
        const isStart = i === 0;
        const isEnd = i === lastIdx && lastIdx > 0;
        const showLabelAlways = isStart || isEnd;
        return (
          <CustomOverlayMap
            key={`mk-${file.id}-${i}`}
            position={{ lat: entry.lat, lng: entry.lng }}
            yAnchor={0.5}
            xAnchor={isStart ? 0 : 0.5}
            zIndex={isStart || isEnd ? 100 : 1}
          >
            <div className={`route-marker${showLabelAlways ? "" : " route-marker--hover"}`}>
              <span
                className="route-marker__icon"
                style={{ opacity: degraded && !isStart ? 0.6 : 1 }}
              >
                {isStart ? (
                  <StartPin color={file.color} />
                ) : (
                  <span
                    className={`route-marker__dot${isEnd ? " route-marker__dot--end" : ""}`}
                    style={{ background: file.color }}
                  />
                )}
              </span>
              <span className="route-marker__label">{formatKstTime(entry.timestamp)}</span>
            </div>
          </CustomOverlayMap>
        );
      })}
    </>
  );
}
