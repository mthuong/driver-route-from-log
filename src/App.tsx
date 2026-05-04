import MapView from "./components/MapView";
import MapToggle from "./components/MapToggle";
import UploadPanel from "./components/UploadPanel";
import Legend from "./components/Legend";

export default function App() {
  return (
    <div className="app">
      <MapView />
      <MapToggle />
      <UploadPanel />
      <Legend />
    </div>
  );
}
