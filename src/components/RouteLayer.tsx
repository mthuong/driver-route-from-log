import { CustomOverlayMap, Polyline } from "react-kakao-maps-sdk";
import type { LoadedFile, LogEntry } from "../types";
import { isLowAccuracy } from "../types";
import { formatKstTime } from "../lib/time";

type Props = { file: LoadedFile };

const LINE_COLOR = "#000";
const START_COLOR = "#2bb673";

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
          strokeColor={LINE_COLOR}
          strokeOpacity={seg.degraded ? 0.4 : 0.9}
          strokeStyle={seg.degraded ? "shortdash" : "solid"}
        />
      ))}

      {file.entries.map((entry, i) => {
        const degraded = isLowAccuracy(entry);
        const isStart = i === 0;
        const dotColor = isStart ? START_COLOR : file.color;
        return (
          <CustomOverlayMap
            key={`mk-${file.id}-${i}`}
            position={{ lat: entry.lat, lng: entry.lng }}
            yAnchor={0.5}
            xAnchor={isStart ? 0 : 0.5}
          >
            <div className="route-marker" style={{ opacity: degraded ? 0.55 : 1 }}>
              <span
                className="route-marker__dot"
                style={{
                  background: degraded ? "transparent" : dotColor,
                  borderColor: dotColor,
                }}
              />
              {isStart && (
                <span className="route-marker__label">{formatKstTime(entry.timestamp)}</span>
              )}
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
