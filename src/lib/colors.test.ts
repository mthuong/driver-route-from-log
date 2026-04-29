import { describe, expect, it } from "vitest";
import { colorForUserId, PALETTE } from "./colors";

describe("colorForUserId", () => {
  it("returns a value from the palette", () => {
    const c = colorForUserId("404909");
    expect(PALETTE).toContain(c);
  });

  it("is deterministic for the same user id", () => {
    expect(colorForUserId("404909")).toBe(colorForUserId("404909"));
  });

  it("tends to assign different colors to different user ids", () => {
    const ids = ["404909", "404801", "225714"];
    const colors = ids.map(colorForUserId);
    // With 3 ids and 8-color palette, expect at least 2 distinct.
    expect(new Set(colors).size).toBeGreaterThanOrEqual(2);
  });
});
