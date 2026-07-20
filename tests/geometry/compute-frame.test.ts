import { describe, it, expect } from "vitest";
import { computeFrame } from "../../src/geometry/compute-frame";
import type { Screen } from "../../src/geometry/types";

const screen: Screen = {
  frame: { x: 0, y: 0, w: 1920, h: 1080 },
  visibleFrame: { x: 0, y: 0, w: 1920, h: 1080 },
};
const gaps = { screenGap: 10, windowGap: 20 };

describe("computeFrame — halves", () => {
  it("left-half insets screen edges by screenGap and the split by windowGap/2", () => {
    expect(computeFrame("left-half", screen, gaps)).toEqual({ x: 10, y: 10, w: 940, h: 1060 });
  });
  it("right-half mirrors left-half", () => {
    expect(computeFrame("right-half", screen, gaps)).toEqual({ x: 970, y: 10, w: 940, h: 1060 });
  });
  it("two left+right halves leave exactly windowGap between them", () => {
    const l = computeFrame("left-half", screen, gaps);
    const r = computeFrame("right-half", screen, gaps);
    expect(r.x - (l.x + l.w)).toBe(gaps.windowGap);
  });
  it("top-half and bottom-half split vertically", () => {
    expect(computeFrame("top-half", screen, gaps)).toEqual({ x: 10, y: 10, w: 1900, h: 520 });
    expect(computeFrame("bottom-half", screen, gaps)).toEqual({ x: 10, y: 550, w: 1900, h: 520 });
  });
  it("respects a non-zero visibleFrame origin (menu bar)", () => {
    const s: Screen = {
      frame: { x: 0, y: 0, w: 1920, h: 1080 },
      visibleFrame: { x: 0, y: 25, w: 1920, h: 1055 },
    };
    expect(computeFrame("left-half", s, gaps)).toEqual({ x: 10, y: 35, w: 940, h: 1035 });
  });
});

describe("computeFrame — thirds, corners, maximize", () => {
  const screen: Screen = {
    frame: { x: 0, y: 0, w: 1800, h: 1080 },
    visibleFrame: { x: 0, y: 0, w: 1800, h: 1080 },
  };
  const gaps = { screenGap: 0, windowGap: 0 };

  it("thirds partition the width exactly with zero gaps", () => {
    expect(computeFrame("left-third", screen, gaps)).toEqual({ x: 0, y: 0, w: 600, h: 1080 });
    expect(computeFrame("center-third", screen, gaps)).toEqual({ x: 600, y: 0, w: 600, h: 1080 });
    expect(computeFrame("right-third", screen, gaps)).toEqual({ x: 1200, y: 0, w: 600, h: 1080 });
  });
  it("two-thirds spans two columns", () => {
    expect(computeFrame("left-two-thirds", screen, gaps)).toEqual({ x: 0, y: 0, w: 1200, h: 1080 });
    expect(computeFrame("right-two-thirds", screen, gaps)).toEqual({ x: 600, y: 0, w: 1200, h: 1080 });
  });
  it("corners are quarter cells", () => {
    expect(computeFrame("top-left", screen, gaps)).toEqual({ x: 0, y: 0, w: 900, h: 540 });
    expect(computeFrame("bottom-right", screen, gaps)).toEqual({ x: 900, y: 540, w: 900, h: 540 });
  });
  it("maximize fills the usable area minus screenGap on all sides", () => {
    expect(computeFrame("maximize", screen, { screenGap: 15, windowGap: 99 })).toEqual({ x: 15, y: 15, w: 1770, h: 1050 });
  });
});
