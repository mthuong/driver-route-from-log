import { beforeEach, describe, expect, it } from "vitest";
import type { LoadedFile } from "../types";
import { useRoutesStore } from "./routesStore";

function fileFixture(overrides: Partial<LoadedFile> = {}): LoadedFile {
  return {
    id: "id-1",
    fileName: "f.txt",
    userId: "404909",
    color: "#e85d4a",
    entries: [
      {
        timestamp: new Date("2026-04-23T07:39:10Z"),
        lat: 37.5,
        lng: 127.1,
        gpsAccuracy: 10,
        gpsAge: 0,
        gpsContext: "location_update",
        deviceBattery: 0.8,
        deviceBatteryState: "unplugged",
        deviceLowPower: false,
      },
    ],
    uploadedAt: 1,
    ...overrides,
  };
}

beforeEach(() => {
  useRoutesStore.getState().clear();
});

describe("routesStore", () => {
  it("starts empty", () => {
    expect(useRoutesStore.getState().files).toEqual([]);
  });

  it("addFile appends a file", () => {
    useRoutesStore.getState().addFile(fileFixture());
    expect(useRoutesStore.getState().files).toHaveLength(1);
  });

  it("removeFile removes by id", () => {
    useRoutesStore.getState().addFile(fileFixture({ id: "a" }));
    useRoutesStore.getState().addFile(fileFixture({ id: "b" }));
    useRoutesStore.getState().removeFile("a");
    expect(useRoutesStore.getState().files.map((f) => f.id)).toEqual(["b"]);
  });

  it("clear removes all", () => {
    useRoutesStore.getState().addFile(fileFixture({ id: "a" }));
    useRoutesStore.getState().addFile(fileFixture({ id: "b" }));
    useRoutesStore.getState().clear();
    expect(useRoutesStore.getState().files).toEqual([]);
  });
});
