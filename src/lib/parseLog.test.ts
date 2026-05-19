import { describe, expect, it } from "vitest";
import { parseLog, ParseLogError } from "./parseLog";

const wellFormed = `
2026-04-23 17:12:03
I, [2026-04-23T08:12:03.795559 #19]  INFO -- : [fc417048-3d07-492b-a3d5-10ca279cba7b] GgtController#location user_id=404909 params={"lat"=>37.50156698512974, "long"=>127.14854051703823, "gps_accuracy"=>39.97, "gps_age"=>218.56, "gps_context"=>"location_update", "device_battery"=>0.75, "device_battery_state"=>"unplugged", "device_low_power"=>false}
2026-04-23 16:39:10
I, [2026-04-23T07:39:10.597750 #20]  INFO -- : [9c70b7ea-1db9-46d1-839d-9184880ff87b] GgtController#location user_id=404909 params={"lat"=>37.557818769715304, "long"=>127.20604586121574, "gps_accuracy"=>126.27, "gps_age"=>0.03, "gps_context"=>"location_update", "device_battery"=>0.8, "device_battery_state"=>"unplugged", "device_low_power"=>false}
`.trim();

describe("parseLog", () => {
  it("parses a well-formed log into entries with the user id", () => {
    const result = parseLog(wellFormed);
    expect(result.userId).toBe("404909");
    expect(result.entries).toHaveLength(2);
  });

  it("sorts entries chronologically (input was descending)", () => {
    const result = parseLog(wellFormed);
    expect(result.entries[0].timestamp.getTime()).toBeLessThan(
      result.entries[1].timestamp.getTime(),
    );
  });

  it("extracts coordinates as numbers", () => {
    const result = parseLog(wellFormed);
    const last = result.entries[1];
    expect(last.lat).toBeCloseTo(37.50156698512974);
    expect(last.lng).toBeCloseTo(127.14854051703823);
  });

  it("treats the KST line as Asia/Seoul time", () => {
    const result = parseLog(wellFormed);
    // 2026-04-23 16:39:10 KST = 2026-04-23 07:39:10 UTC
    expect(result.entries[0].timestamp.toISOString()).toBe("2026-04-23T07:39:10.000Z");
  });

  it("captures gps fields and device fields", () => {
    const e = parseLog(wellFormed).entries[1];
    expect(e.gpsAccuracy).toBeCloseTo(39.97);
    expect(e.gpsAge).toBeCloseTo(218.56);
    expect(e.gpsContext).toBe("location_update");
    expect(e.deviceBattery).toBeCloseTo(0.75);
    expect(e.deviceBatteryState).toBe("unplugged");
    expect(e.deviceLowPower).toBe(false);
  });

  it("rejects an empty file", () => {
    expect(() => parseLog("")).toThrow(ParseLogError);
  });

  it("rejects a file with no GgtController#location lines", () => {
    expect(() => parseLog("nothing relevant\nstill nothing")).toThrow(ParseLogError);
  });

  it("rejects a file with multiple distinct user_ids", () => {
    const multi = `
2026-04-23 17:12:03
I, [...] INFO -- : [a] GgtController#location user_id=111 params={"lat"=>1.0, "long"=>2.0, "gps_accuracy"=>1, "gps_age"=>1, "gps_context"=>"x", "device_battery"=>1, "device_battery_state"=>"y", "device_low_power"=>false}
2026-04-23 17:12:04
I, [...] INFO -- : [b] GgtController#location user_id=222 params={"lat"=>1.0, "long"=>2.0, "gps_accuracy"=>1, "gps_age"=>1, "gps_context"=>"x", "device_battery"=>1, "device_battery_state"=>"y", "device_low_power"=>false}
`.trim();
    expect(() => parseLog(multi)).toThrow(ParseLogError);
  });

  it("handles negative numbers in params", () => {
    const negative = `
2026-04-23 17:12:03
I, [...] INFO -- : [a] GgtController#location user_id=1 params={"lat"=>-37.5, "long"=>-127.1, "gps_accuracy"=>1, "gps_age"=>0, "gps_context"=>"x", "device_battery"=>0.1, "device_battery_state"=>"y", "device_low_power"=>true}
`.trim();
    const e = parseLog(negative).entries[0];
    expect(e.lat).toBeCloseTo(-37.5);
    expect(e.lng).toBeCloseTo(-127.1);
    expect(e.deviceLowPower).toBe(true);
  });
});

// Two entries, descending order (as logs are typically exported).
// Note: params keys use plain " (unescaped in template literals) and literal \\u003e (6-char sequence).
const exploreLog = [
  `2026-05-04T15:26:05+07:00\t{"time":"2026-05-04T08:26:05.615+00:00","type":"INFO","message":"[aaa] GgtController#location user_id=241273 params={"lat"=\\u003e10.8398, "long"=\\u003e106.8396, "gps_accuracy"=\\u003e15.47, "gps_age"=\\u003e0.016, "gps_context"=\\u003e"location_update", "device_battery"=\\u003e1, "device_battery_state"=\\u003e"unplugged", "device_low_power"=\\u003efalse}"}`,
  `2026-05-04T15:25:53+07:00\t{"time":"2026-05-04T08:25:53.911+00:00","type":"INFO","message":"[bbb] GgtController#location user_id=241273 params={"lat"=\\u003e10.8392, "long"=\\u003e106.8390, "gps_accuracy"=\\u003e22.17, "gps_age"=\\u003e0.071, "gps_context"=\\u003e"location_update", "device_battery"=\\u003e0.5, "device_battery_state"=\\u003e"charging", "device_low_power"=\\u003etrue}"}`,
].join("\n");

describe("parseLog — Explore format", () => {
  it("parses user ID and entry count", () => {
    const result = parseLog(exploreLog);
    expect(result.userId).toBe("241273");
    expect(result.entries).toHaveLength(2);
  });

  it("sorts entries chronologically (input is descending)", () => {
    const result = parseLog(exploreLog);
    expect(result.entries[0].timestamp.getTime()).toBeLessThan(
      result.entries[1].timestamp.getTime(),
    );
  });

  it("extracts coordinates and GPS fields", () => {
    const result = parseLog(exploreLog);
    const first = result.entries[0]; // second input line, but earliest timestamp
    expect(first.lat).toBeCloseTo(10.8392);
    expect(first.lng).toBeCloseTo(106.8390);
    expect(first.gpsAccuracy).toBeCloseTo(22.17);
    expect(first.gpsAge).toBeCloseTo(0.071);
    expect(first.gpsContext).toBe("location_update");
  });

  it("extracts device fields", () => {
    const first = parseLog(exploreLog).entries[0];
    expect(first.deviceBattery).toBeCloseTo(0.5);
    expect(first.deviceBatteryState).toBe("charging");
    expect(first.deviceLowPower).toBe(true);
  });

  it("uses json.time for millisecond-precision timestamps", () => {
    const result = parseLog(exploreLog);
    // 2026-05-04T08:25:53.911+00:00 → first chronological entry
    expect(result.entries[0].timestamp.toISOString()).toBe("2026-05-04T08:25:53.911Z");
  });

  it("rejects an Explore-format file with no matching entries", () => {
    expect(() => parseLog("2026-05-04T15:26:05+07:00\t{}")).toThrow(ParseLogError);
  });

  it("rejects an Explore-format file with multiple distinct user_ids", () => {
    const multi = [
      `2026-05-04T15:26:05+07:00\t{"time":"2026-05-04T08:26:05.000+00:00","type":"INFO","message":"[a] GgtController#location user_id=111 params={"lat"=\\u003e1.0, "long"=\\u003e2.0, "gps_accuracy"=\\u003e1, "gps_age"=\\u003e0, "gps_context"=\\u003e"x", "device_battery"=\\u003e1, "device_battery_state"=\\u003e"y", "device_low_power"=\\u003efalse}"}`,
      `2026-05-04T15:25:00+07:00\t{"time":"2026-05-04T08:25:00.000+00:00","type":"INFO","message":"[b] GgtController#location user_id=222 params={"lat"=\\u003e1.0, "long"=\\u003e2.0, "gps_accuracy"=\\u003e1, "gps_age"=\\u003e0, "gps_context"=\\u003e"x", "device_battery"=\\u003e1, "device_battery_state"=\\u003e"y", "device_low_power"=\\u003efalse}"}`,
    ].join("\n");
    expect(() => parseLog(multi)).toThrow(ParseLogError);
  });

  it("silently skips a line where time or message regex does not match", () => {
    // Truncated / malformed blob — no "time" or "message" fields
    const withGarbage = `2026-05-04T15:26:05+07:00\t{"broken":true}\n` + exploreLog;
    const result = parseLog(withGarbage);
    expect(result.entries).toHaveLength(2); // garbage line skipped
  });

  it("silently skips an explore line whose message lacks GgtController#location", () => {
    const withIrrelevant = [
      `2026-05-04T15:26:05+07:00\t{"time":"2026-05-04T08:26:05.000+00:00","type":"INFO","message":"[x] SomeOtherController#action user_id=241273"}`,
      ...exploreLog.split("\n"),
    ].join("\n");
    const result = parseLog(withIrrelevant);
    expect(result.entries).toHaveLength(2); // irrelevant line skipped
  });
});

const jsonArrayLog = JSON.stringify([
  {
    line: "raw-stdout-blob-ignored",
    timestamp: "1778738057565436942",
    date: "2026-05-14T05:54:17.565Z",
    fields: {
      time: "2026-05-14T05:54:17.565+00:00",
      type: "INFO",
      message:
        '[bbb] GgtController#location user_id=241273 params={"lat"=>10.8398, "long"=>106.8396, "gps_accuracy"=>6.27, "gps_age"=>0.04, "gps_context"=>"location_update", "device_battery"=>0.85, "device_battery_state"=>"unplugged", "device_low_power"=>false}',
    },
  },
  {
    line: "raw-stdout-blob-ignored",
    timestamp: "1778738056761158876",
    date: "2026-05-14T05:54:16.761Z",
    fields: {
      time: "2026-05-14T05:54:16.760+00:00",
      type: "INFO",
      message:
        '[ccc] GgtController#location user_id=241273 params={"lat"=>10.8399, "long"=>106.8397, "gps_accuracy"=>3.9, "gps_age"=>0.04, "gps_context"=>"location_update", "device_battery"=>0.85, "device_battery_state"=>"unplugged", "device_low_power"=>false}',
    },
  },
]);

describe("parseLog — JSON array format (Loki export)", () => {
  it("parses user ID and entry count", () => {
    const result = parseLog(jsonArrayLog);
    expect(result.userId).toBe("241273");
    expect(result.entries).toHaveLength(2);
  });

  it("sorts entries chronologically (input is descending)", () => {
    const result = parseLog(jsonArrayLog);
    expect(result.entries[0].timestamp.getTime()).toBeLessThan(
      result.entries[1].timestamp.getTime(),
    );
  });

  it("uses fields.time for millisecond-precision timestamps", () => {
    const result = parseLog(jsonArrayLog);
    expect(result.entries[1].timestamp.toISOString()).toBe(
      "2026-05-14T05:54:17.565Z",
    );
  });

  it("extracts coordinates and device fields", () => {
    const e = parseLog(jsonArrayLog).entries[1];
    expect(e.lat).toBeCloseTo(10.8398);
    expect(e.lng).toBeCloseTo(106.8396);
    expect(e.gpsContext).toBe("location_update");
    expect(e.deviceBatteryState).toBe("unplugged");
    expect(e.deviceLowPower).toBe(false);
  });

  it("rejects a JSON array with no GgtController#location entries", () => {
    const empty = JSON.stringify([
      { fields: { time: "2026-05-14T05:54:17.565+00:00", message: "[x] Other#thing user_id=1" } },
    ]);
    expect(() => parseLog(empty)).toThrow(ParseLogError);
  });

  it("rejects a JSON array containing multiple distinct user_ids", () => {
    const multi = JSON.stringify([
      {
        fields: {
          time: "2026-05-14T05:54:17.565+00:00",
          message:
            '[a] GgtController#location user_id=111 params={"lat"=>1.0, "long"=>2.0, "gps_accuracy"=>1, "gps_age"=>0, "gps_context"=>"x", "device_battery"=>1, "device_battery_state"=>"y", "device_low_power"=>false}',
        },
      },
      {
        fields: {
          time: "2026-05-14T05:54:18.000+00:00",
          message:
            '[b] GgtController#location user_id=222 params={"lat"=>1.0, "long"=>2.0, "gps_accuracy"=>1, "gps_age"=>0, "gps_context"=>"x", "device_battery"=>1, "device_battery_state"=>"y", "device_low_power"=>false}',
        },
      },
    ]);
    expect(() => parseLog(multi)).toThrow(ParseLogError);
  });

  it("silently skips entries missing fields.message or fields.time", () => {
    const mixed = JSON.stringify([
      { fields: { time: "2026-05-14T05:54:17.565+00:00" } }, // no message
      { fields: { message: "no time here" } }, // no time
      {
        fields: {
          time: "2026-05-14T05:54:17.565+00:00",
          message:
            '[a] GgtController#location user_id=241273 params={"lat"=>1.0, "long"=>2.0, "gps_accuracy"=>1, "gps_age"=>0, "gps_context"=>"x", "device_battery"=>1, "device_battery_state"=>"y", "device_low_power"=>false}',
        },
      },
    ]);
    const result = parseLog(mixed);
    expect(result.entries).toHaveLength(1);
  });
});

const lokiTextLog = [
  `: "298 lines displayed"`,
  `Total bytes processed: "2.27  GB"`,
  `Common labels: {"app":"argo-ggx-kr-da-api"}`,
  ``,
  `1779097253417\t2026-05-18T09:40:53.417Z\tI, [2026-05-18T09:40:53.416752 #53]  INFO -- : [9b6b8b90] GgtController#location user_id=405695 params={"lat"=>37.49484796218378, "long"=>127.14348396247122, "gps_accuracy"=>12.55, "gps_age"=>0.05, "gps_context"=>"location_update", "gps_low_accuracy"=>false, "gps_source"=>"continuous", "gps_stale"=>false, "device_battery"=>0.7, "device_battery_state"=>"unplugged", "device_low_power"=>false}`,
  `1779097252941\t2026-05-18T09:40:52.941Z\tI, [2026-05-18T09:40:52.941458 #70]  INFO -- request: POST http://example/api/order/notification?action=COMPLETE&driverId=405695&id=2708987`,
  `1779097250000\t2026-05-18T09:40:50.000Z\tI, [2026-05-18T09:40:50.000000 #53]  INFO -- : [abc] GgtController#location user_id=405695 params={"lat"=>37.5, "long"=>127.1, "gps_accuracy"=>5, "gps_age"=>0.1, "gps_context"=>"location_update", "device_battery"=>0.6, "device_battery_state"=>"unplugged", "device_low_power"=>false}`,
].join("\n");

describe("parseLog — Loki text export format", () => {
  it("ignores the header preamble and parses GgtController#location lines", () => {
    const result = parseLog(lokiTextLog);
    expect(result.userId).toBe("405695");
    expect(result.entries).toHaveLength(2);
  });

  it("uses the line's ISO timestamp at millisecond precision", () => {
    const result = parseLog(lokiTextLog);
    // Sorted ascending: 09:40:50 first, then 09:40:53.417
    expect(result.entries[0].timestamp.toISOString()).toBe("2026-05-18T09:40:50.000Z");
    expect(result.entries[1].timestamp.toISOString()).toBe("2026-05-18T09:40:53.417Z");
  });

  it("skips non-GgtController lines (e.g. request logs)", () => {
    const result = parseLog(lokiTextLog);
    // Three data rows exist but only two are GgtController#location
    expect(result.entries).toHaveLength(2);
  });

  it("extracts coordinates and GPS fields from the Ruby hash", () => {
    const e = parseLog(lokiTextLog).entries[1];
    expect(e.lat).toBeCloseTo(37.49484796218378);
    expect(e.lng).toBeCloseTo(127.14348396247122);
    expect(e.gpsAccuracy).toBeCloseTo(12.55);
    expect(e.gpsAge).toBeCloseTo(0.05);
    expect(e.gpsContext).toBe("location_update");
  });
});

const driverLocationHistoryJson = JSON.stringify({
  success: true,
  data: {
    locations: [
      {
        driverUserId: 405695,
        lat: 37.49484,
        lon: 127.14348,
        createdTime: "2026-05-18 18:40:53",
        updatedTime: "2026-05-18 18:40:53",
      },
      {
        driverUserId: 405695,
        lat: 37.50257,
        lon: 127.09736,
        createdTime: "2026-05-18 18:04:15",
        updatedTime: "2026-05-18 18:04:15",
      },
    ],
  },
});

describe("parseLog — driver location history JSON", () => {
  it("parses user ID from driverUserId and entry count", () => {
    const result = parseLog(driverLocationHistoryJson);
    expect(result.userId).toBe("405695");
    expect(result.entries).toHaveLength(2);
  });

  it("treats createdTime as KST (UTC+9)", () => {
    const result = parseLog(driverLocationHistoryJson);
    // 2026-05-18 18:04:15 KST = 2026-05-18T09:04:15Z (earlier, so index 0)
    expect(result.entries[0].timestamp.toISOString()).toBe("2026-05-18T09:04:15.000Z");
    expect(result.entries[1].timestamp.toISOString()).toBe("2026-05-18T09:40:53.000Z");
  });

  it("maps lon → lng and preserves coordinates", () => {
    const e = parseLog(driverLocationHistoryJson).entries[1];
    expect(e.lat).toBeCloseTo(37.49484);
    expect(e.lng).toBeCloseTo(127.14348);
  });

  it("uses safe defaults for missing GPS/device fields", () => {
    const e = parseLog(driverLocationHistoryJson).entries[0];
    expect(e.gpsAccuracy).toBe(0);
    expect(e.gpsAge).toBe(0);
    expect(e.deviceLowPower).toBe(false);
  });

  it("rejects an empty locations array", () => {
    const empty = JSON.stringify({ success: true, data: { locations: [] } });
    expect(() => parseLog(empty)).toThrow(ParseLogError);
  });

  it("rejects multiple distinct driverUserIds", () => {
    const multi = JSON.stringify({
      success: true,
      data: {
        locations: [
          { driverUserId: 111, lat: 1, lon: 2, createdTime: "2026-05-18 18:00:00", updatedTime: "2026-05-18 18:00:00" },
          { driverUserId: 222, lat: 1, lon: 2, createdTime: "2026-05-18 18:00:01", updatedTime: "2026-05-18 18:00:01" },
        ],
      },
    });
    expect(() => parseLog(multi)).toThrow(ParseLogError);
  });
});

describe("parseLog — mixed format (Explore + Ruby-logger, same user)", () => {
  it("produces a unified sorted result", () => {
    // One Ruby-logger entry: 2026-04-23 16:39:10 KST = 2026-04-23T07:39:10.000Z
    const rubyLine = [
      "2026-04-23 16:39:10",
      `I, [2026-04-23T07:39:10.597750 #1]  INFO -- : [old] GgtController#location user_id=241273 params={"lat"=>1.0, "long"=>2.0, "gps_accuracy"=>5, "gps_age"=>0.1, "gps_context"=>"location_update", "device_battery"=>0.9, "device_battery_state"=>"unplugged", "device_low_power"=>false}`,
    ].join("\n");

    // One Explore entry: 2026-05-04T08:26:05.615Z (newer)
    const exploreLine = `2026-05-04T15:26:05+07:00\t{"time":"2026-05-04T08:26:05.615+00:00","type":"INFO","message":"[new] GgtController#location user_id=241273 params={"lat"=\\u003e10.8398, "long"=\\u003e106.8396, "gps_accuracy"=\\u003e15.47, "gps_age"=\\u003e0.016, "gps_context"=\\u003e"location_update", "device_battery"=\\u003e1, "device_battery_state"=\\u003e"unplugged", "device_low_power"=\\u003efalse}"}`;

    const result = parseLog(`${rubyLine}\n${exploreLine}`);
    expect(result.userId).toBe("241273");
    expect(result.entries).toHaveLength(2);
    // Ruby entry (older) must come first after sort
    expect(result.entries[0].timestamp.toISOString()).toBe("2026-04-23T07:39:10.000Z");
    expect(result.entries[1].timestamp.toISOString()).toBe("2026-05-04T08:26:05.615Z");
  });
});
