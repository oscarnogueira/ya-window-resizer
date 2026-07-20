import { describe, it, expect } from "vitest";
import { computeFrame, computeCenter, computeCustom } from "../../src/geometry/compute-frame";
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

describe("computeCenter", () => {
  const screen: Screen = {
    frame: { x: 0, y: 0, w: 1920, h: 1080 },
    visibleFrame: { x: 0, y: 0, w: 1920, h: 1080 },
  };
  const gaps = { screenGap: 10, windowGap: 0 };
  it("centers the window keeping its size", () => {
    const win = { x: 0, y: 0, w: 800, h: 600 };
    expect(computeCenter(win, screen, gaps)).toEqual({ x: 560, y: 240, w: 800, h: 600 });
  });
  it("clamps an oversized window to usable area minus screenGap", () => {
    const win = { x: 0, y: 0, w: 5000, h: 5000 };
    expect(computeCenter(win, screen, gaps)).toEqual({ x: 10, y: 10, w: 1900, h: 1060 });
  });
});

describe("computeCustom", () => {
  const screen: Screen = {
    frame: { x: 0, y: 0, w: 1000, h: 1000 },
    visibleFrame: { x: 0, y: 100, w: 1000, h: 900 },
  };
  it("percent is measured from the usable-area origin", () => {
    const r = computeCustom({ x: 10, y: 0, w: 50, h: 50, unit: "percent" }, screen);
    expect(r).toEqual({ x: 100, y: 100, w: 500, h: 450 });
  });
  it("pixels are literal offsets into the usable area, clamped", () => {
    const r = computeCustom({ x: 950, y: 0, w: 400, h: 100, unit: "pixels" }, screen);
    expect(r).toEqual({ x: 600, y: 100, w: 400, h: 100 });
  });
});

describe("computeFrame / computeCenter — never returns negative dimensions", () => {
  const small: Screen = {
    frame: { x: 0, y: 0, w: 900, h: 600 },
    visibleFrame: { x: 0, y: 0, w: 900, h: 600 },
  };
  it("center-third with huge windowGap clamps width to 0, not negative", () => {
    const r = computeFrame("center-third", small, { screenGap: 0, windowGap: 400 });
    expect(r.w).toBe(0);
    expect(r.h).toBeGreaterThanOrEqual(0);
  });
  it("maximize with screenGap larger than half the screen clamps to 0", () => {
    const r = computeFrame("maximize", small, { screenGap: 500, windowGap: 0 });
    expect(r.w).toBe(0);
    expect(r.h).toBe(0);
  });
  it("computeCenter with oversized screenGap clamps to 0, not negative", () => {
    const r = computeCenter({ x: 0, y: 0, w: 800, h: 600 }, small, { screenGap: 500, windowGap: 0 });
    expect(r.w).toBe(0);
    expect(r.h).toBe(0);
  });
});
