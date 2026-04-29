import MapView from "./components/MapView";
import UploadPanel from "./components/UploadPanel";
import Legend from "./components/Legend";

export default function App() {
  return (
    <div className="app">
      <MapView />
      <UploadPanel />
      <Legend />
    </div>
  );
}
