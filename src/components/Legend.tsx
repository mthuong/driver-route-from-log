import { useRoutesStore } from "../state/routesStore";
import "./Legend.css";

export default function Legend() {
  const files = useRoutesStore((s) => s.files);
  const removeFile = useRoutesStore((s) => s.removeFile);
  const clear = useRoutesStore((s) => s.clear);

  if (files.length === 0) return null;

  return (
    <div className="floating-card legend">
      <div className="legend__title">DB Location Data</div>
      {files.map((f) => (
        <div key={f.id} className="legend__row">
          <span className="legend__swatch" style={{ background: f.color }} />
          <span className="legend__id">user_id: {f.userId}</span>
          <span className="legend__count">{f.entries.length}건</span>
          <button
            type="button"
            className="legend__remove"
            aria-label={`Remove ${f.fileName}`}
            onClick={() => removeFile(f.id)}
          >
            ×
          </button>
        </div>
      ))}
      {files.length >= 2 && (
        <button type="button" className="legend__clear" onClick={() => clear()}>
          Clear all
        </button>
      )}
    </div>
  );
}
