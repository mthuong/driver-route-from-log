import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { useRoutesStore } from "../state/routesStore";
import type { LoadedFile } from "../types";
import OsmRouteLayer from "./OsmRouteLayer";

const HCM_CENTER: [number, number] = [10.7769, 106.7009];

function BoundsController({ files }: { files: LoadedFile[] }) {
  const map = useMap();

  useEffect(() => {
    if (files.length === 0) return;
    const points: [number, number][] = files.flatMap((f) =>
      f.entries.map((e) => [e.lat, e.lng] as [number, number]),
    );
    if (points.length > 0) {
      map.fitBounds(points, { padding: [40, 40] });
    }
  }, [files, map]);

  return null;
}

export default function OsmMapView() {
  const files = useRoutesStore((s) => s.files);

  return (
    <MapContainer
      center={HCM_CENTER}
      zoom={12}
      style={{ width: "100%", height: "100%" }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <BoundsController files={files} />
      {files.map((f) => (
        <OsmRouteLayer key={f.id} file={f} />
      ))}
    </MapContainer>
  );
}
