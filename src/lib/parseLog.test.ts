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
