import { describe, it, expect } from "vitest";
import { resolveGaps, DEFAULT_GAP } from "../src/settings";

describe("resolveGaps", () => {
  it("uses the button's gaps when set", () => {
    expect(resolveGaps({ screenGap: 8, windowGap: 16 })).toEqual({ screenGap: 8, windowGap: 16 });
  });
  it("allows an explicit zero gap", () => {
    expect(resolveGaps({ screenGap: 0, windowGap: 0 })).toEqual({ screenGap: 0, windowGap: 0 });
  });
  it("defaults missing gaps to DEFAULT_GAP", () => {
    expect(resolveGaps({})).toEqual({ screenGap: DEFAULT_GAP, windowGap: DEFAULT_GAP });
  });
  it("defaults each gap independently", () => {
    expect(resolveGaps({ screenGap: 12 })).toEqual({ screenGap: 12, windowGap: DEFAULT_GAP });
  });
});
