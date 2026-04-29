import { useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { parseLog, ParseLogError } from "../lib/parseLog";
import { colorForUserId } from "../lib/colors";
import { useRoutesStore } from "../state/routesStore";
import "./UploadPanel.css";

export default function UploadPanel() {
  const addFile = useRoutesStore((s) => s.addFile);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    try {
      const text = await file.text();
      const { userId, entries } = parseLog(text);
      addFile({
        id: uuid(),
        fileName: file.name,
        userId,
        color: colorForUserId(userId),
        entries,
        uploadedAt: Date.now(),
      });
    } catch (e) {
      const message =
        e instanceof ParseLogError
          ? e.message
          : `Couldn't read ${file.name}: ${(e as Error).message}`;
      setError(message);
    }
  }

  return (
    <div
      className={`floating-card upload-panel${dragOver ? " upload-panel--drag" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) void handleFile(f);
      }}
    >
      <button
        type="button"
        className="upload-panel__btn"
        onClick={() => inputRef.current?.click()}
      >
        Upload log file
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.log,text/plain"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      <p className="upload-panel__hint">or drag a `.txt` log here</p>
      {error && <p className="upload-panel__error">{error}</p>}
    </div>
  );
}
