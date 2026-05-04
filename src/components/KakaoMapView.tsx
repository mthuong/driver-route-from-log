import { useEffect, useRef, useState } from "react";
import { Map } from "react-kakao-maps-sdk";
import { useRoutesStore } from "../state/routesStore";
import RouteLayer from "./RouteLayer";

const SEOUL = { lat: 37.5665, lng: 126.978 };

function loadKakaoSdk(appKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).kakao?.maps) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = () => {
      const kakao = (window as any).kakao;
      if (!kakao?.maps?.load) {
        reject(new Error("Kakao SDK loaded but window.kakao.maps.load is missing"));
        return;
      }
      kakao.maps.load(() => resolve());
    };
    script.onerror = () => reject(new Error("Failed to load Kakao Maps SDK"));
    document.head.appendChild(script);
  });
}

type SdkState = "loading" | "ready" | "error";

export default function KakaoMapView() {
  const files = useRoutesStore((s) => s.files);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const [sdkState, setSdkState] = useState<SdkState>("loading");
  const [sdkError, setSdkError] = useState<string | null>(null);

  useEffect(() => {
    const appKey = import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined;
    if (!appKey) {
      setSdkError("VITE_KAKAO_MAP_KEY is not set. Copy .env.example to .env and set the key.");
      setSdkState("error");
      return;
    }
    loadKakaoSdk(appKey)
      .then(() => setSdkState("ready"))
      .catch((err: Error) => {
        setSdkError(err.message);
        setSdkState("error");
      });
  }, []);

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

  if (sdkState === "error") {
    return (
      <div className="sdk-error">
        <h1>Kakao Maps failed to load</h1>
        <p>{sdkError}</p>
      </div>
    );
  }

  if (sdkState === "loading") {
    return <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading Kakao Maps…</div>;
  }

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
