import "leaflet/dist/leaflet.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";

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

const root = ReactDOM.createRoot(document.getElementById("root")!);
const appKey = import.meta.env.VITE_KAKAO_MAP_KEY;

function renderError(message: string) {
  root.render(
    <div className="sdk-error">
      <h1>Kakao Maps failed to load</h1>
      <p>{message}</p>
    </div>,
  );
}

if (!appKey) {
  renderError("VITE_KAKAO_MAP_KEY is not set. Copy .env.example to .env and set the key.");
} else {
  loadKakaoSdk(appKey)
    .then(() => {
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      );
    })
    .catch((err: Error) => renderError(err.message));
}
