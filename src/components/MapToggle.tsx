import { useRoutesStore } from "../state/routesStore";

export default function MapToggle() {
  const mapType = useRoutesStore((s) => s.mapType);
  const setMapType = useRoutesStore((s) => s.setMapType);

  const label = mapType === "osm" ? "🗺 Switch to Kakao" : "🗺 Switch to OSM";

  return (
    <button
      className="floating-card map-toggle"
      onClick={() => setMapType(mapType === "osm" ? "kakao" : "osm")}
      title={label}
    >
      {label}
    </button>
  );
}
