import { describe, it, expect } from "vitest";
import { resolveGaps } from "../src/settings";

describe("resolveGaps", () => {
  const global = { screenGap: 8, windowGap: 16 };
  it("uses global gaps when the action does not override", () => {
    expect(resolveGaps(global, { useCustomOffset: false })).toEqual({ screenGap: 8, windowGap: 16 });
  });
  it("uses the action's gaps when it overrides", () => {
    expect(resolveGaps(global, { useCustomOffset: true, screenGap: 0, windowGap: 40 }))
      .toEqual({ screenGap: 0, windowGap: 40 });
  });
  it("defaults missing global gaps to zero", () => {
    expect(resolveGaps({}, { useCustomOffset: false })).toEqual({ screenGap: 0, windowGap: 0 });
  });
});
