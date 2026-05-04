import { useEffect, useRef } from "react";
import { Map } from "react-kakao-maps-sdk";
import { useRoutesStore } from "../state/routesStore";
import RouteLayer from "./RouteLayer";

const SEOUL = { lat: 37.5665, lng: 126.978 };

export default function KakaoMapView() {
  const files = useRoutesStore((s) => s.files);
  const mapRef = useRef<kakao.maps.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (files.length === 0) return;

    const bounds = new kakao.maps.LatLngBounds();
    for (const f of files) {
      for (const e of f.entries) {
        bounds.extend(new kakao.maps.LatLng(e.lat, e.lng));
      }
    }
    if (!bounds.isEmpty()) {
      mapRef.current.setBounds(bounds);
    }
  }, [files]);

  return (
    <Map
      center={SEOUL}
      level={6}
      style={{ width: "100%", height: "100%" }}
      onCreate={(map) => {
        mapRef.current = map;
      }}
    >
      {files.map((f) => (
        <RouteLayer key={f.id} file={f} />
      ))}
    </Map>
  );
}
