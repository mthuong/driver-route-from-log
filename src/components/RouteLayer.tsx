import { CustomOverlayMap, Polyline } from "react-kakao-maps-sdk";
import type { LoadedFile, LogEntry } from "../types";
import { isLowAccuracy } from "../types";
import { formatKstTime } from "../lib/time";

type Props = { file: LoadedFile };

const LINE_COLOR = "#000";

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

export default function RouteLayer({ file }: Props) {
  const segments = buildSegments(file.entries);
  const lastIdx = file.entries.length - 1;

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
          strokeColor={LINE_COLOR}
          strokeOpacity={seg.degraded ? 0.4 : 0.9}
          strokeStyle={seg.degraded ? "shortdash" : "solid"}
        />
      ))}

      {file.entries.map((entry, i) => {
        const degraded = isLowAccuracy(entry);
        const isStart = i === 0;
        const isEnd = i === lastIdx && lastIdx > 0;
        return (
          <CustomOverlayMap
            key={`mk-${file.id}-${i}`}
            position={{ lat: entry.lat, lng: entry.lng }}
            yAnchor={0.5}
            xAnchor={isStart ? 0 : 0.5}
            zIndex={isStart || isEnd ? 100 : 1}
          >
            <div className="route-marker">
              <span
                className="route-marker__icon"
                style={{ opacity: degraded ? 0.6 : 1 }}
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
