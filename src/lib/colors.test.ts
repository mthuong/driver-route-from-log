import { describe, expect, it } from "vitest";
import { pickColor, PALETTE } from "./colors";

describe("pickColor", () => {
  it("returns the first palette color when nothing is used", () => {
    expect(pickColor([])).toBe(PALETTE[0]);
  });

  it("returns a color not in the used list", () => {
    const used = [PALETTE[0], PALETTE[1]];
    const next = pickColor(used);
    expect(used).not.toContain(next);
    expect(PALETTE).toContain(next);
  });

  it("cycles through the palette once all colors are taken", () => {
    const next = pickColor([...PALETTE]);
    expect(PALETTE).toContain(next);
  });

  it("never returns the same color back-to-back as files accumulate", () => {
    const used: string[] = [];
    for (let i = 0; i < PALETTE.length; i++) {
      const c = pickColor(used);
      expect(used).not.toContain(c);
      used.push(c);
    }
    expect(new Set(used).size).toBe(PALETTE.length);
  });
});
