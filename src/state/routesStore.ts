import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { LoadedFile } from "../types";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    key: (i) => Array.from(map.keys())[i] ?? null,
    removeItem: (k) => {
      map.delete(k);
    },
    setItem: (k, v) => {
      map.set(k, v);
    },
  };
}

type RoutesState = {
  files: LoadedFile[];
  addFile: (file: LoadedFile) => void;
  removeFile: (id: string) => void;
  clear: () => void;
  mapType: "osm" | "kakao";
  setMapType: (t: "osm" | "kakao") => void;
};

export const useRoutesStore = create<RoutesState>()(
  persist(
    (set) => ({
      files: [],
      addFile: (file) => set((state) => ({ files: [...state.files, file] })),
      removeFile: (id) =>
        set((state) => ({ files: state.files.filter((f) => f.id !== id) })),
      clear: () => set({ files: [] }),
      mapType: "osm",
      setMapType: (t) => set({ mapType: t }),
    }),
    {
      name: "driver-route-from-log:v1",
      storage: createJSONStorage(() =>
        typeof localStorage !== "undefined" && typeof localStorage.setItem === "function"
          ? localStorage
          : memoryStorage(),
      ),
      partialize: (state) => ({ files: state.files }),
      merge: (persisted, current) => {
        const p = persisted as { files?: LoadedFile[] } | undefined;
        if (!p?.files) return current;
        const rehydrated = p.files.map((f) => ({
          ...f,
          entries: f.entries.map((e) => ({
            ...e,
            timestamp: new Date(e.timestamp as unknown as string),
          })),
        }));
        return { ...current, files: rehydrated };
      },
    },
  ),
);

