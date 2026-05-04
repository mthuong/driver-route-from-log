import { useRoutesStore } from "../state/routesStore";
import KakaoMapView from "./KakaoMapView";
import OsmMapView from "./OsmMapView";

export default function MapView() {
  const mapType = useRoutesStore((s) => s.mapType);
  return mapType === "kakao" ? <KakaoMapView /> : <OsmMapView />;
}
