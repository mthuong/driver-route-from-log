import L from "leaflet";
import { CircleMarker, Marker, Polyline, Tooltip } from "react-leaflet";
import type { LoadedFile, LogEntry } from "../types";
import { isLowAccuracy } from "../types";
import { formatKstTime } from "../lib/time";

type Props = { file: LoadedFile };

type Segment = { from: LogEntry; to: LogEntry; degraded: boolean };

function buildSegments(entries: LogEntry[]): Segment[] {
  const segs: Segment[] = [];
  for (let i = 1; i < entries.length; i++) {
    segs.push({
      from: entries[i - 1],
      to: entries[i],
      degraded: isLowAccuracy(entries[i - 1]) || isLowAccuracy(entries[i]),
    });
  }
  return segs;
}

function startPinIcon(color: string): L.DivIcon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 99.6094 99.6582" width="24" height="24">
    <circle cx="49.8047" cy="49.8535" r="49.8047" fill="${color}"/>
    <path fill="#fff" d="M38.2812 31.0059C38.2812 36.1816 41.6992 40.4785 46.2891 41.8945L46.2891 67.1387C46.2891 74.5117 47.5098 81.1523 49.8047 81.1523C52.1484 81.1523 53.2715 74.6582 53.2715 67.1387L53.2715 41.8945C57.9102 40.5273 61.3281 36.2305 61.3281 31.0059C61.3281 24.6582 56.1523 19.5312 49.8047 19.5312C43.5059 19.5312 38.2812 24.6582 38.2812 31.0059ZM50.4883 28.0762C50.4883 30.0293 48.8281 31.7383 46.8262 31.7383C44.9219 31.7383 43.2129 30.0293 43.2129 28.0762C43.1641 26.0742 44.9219 24.3652 46.8262 24.3652C48.8281 24.3652 50.4883 26.0742 50.4883 28.0762Z"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [0, 12],
  });
}

export default function OsmRouteLayer({ file }: Props) {
  const segments = buildSegments(file.entries);
  const lastIdx = file.entries.length - 1;

  return (
    <>
      {segments.map((seg, i) => (
        <Polyline
          key={`seg-${file.id}-${i}`}
          positions={[
            [seg.from.lat, seg.from.lng],
            [seg.to.lat, seg.to.lng],
          ]}
          color="#000"
          weight={3}
          opacity={seg.degraded ? 0.4 : 0.9}
          dashArray={seg.degraded ? "6 6" : undefined}
        />
      ))}

      {file.entries.map((entry, i) => {
        const degraded = isLowAccuracy(entry);
        const isStart = i === 0;
        const isEnd = i === lastIdx && lastIdx > 0;

        if (isStart) {
          return (
            <Marker
              key={`mk-${file.id}-${i}`}
              position={[entry.lat, entry.lng]}
              icon={startPinIcon(file.color)}
              zIndexOffset={100}
            >
              <Tooltip permanent direction="right" offset={[12, 0]} opacity={1}>
                <span className="route-marker__label">{formatKstTime(entry.timestamp)}</span>
              </Tooltip>
            </Marker>
          );
        }

        return (
          <CircleMarker
            key={`mk-${file.id}-${i}`}
            center={[entry.lat, entry.lng]}
            radius={isEnd ? 6 : 4}
            fillColor={file.color}
            color="#000"
            weight={1}
            fillOpacity={degraded ? 0.4 : 0.9}
          >
            <Tooltip permanent direction="right" offset={[8, 0]} opacity={1}>
              <span className="route-marker__label">{formatKstTime(entry.timestamp)}</span>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
