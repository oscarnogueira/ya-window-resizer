import { describe, it, expect } from "vitest";
import { pickScreen } from "../../src/geometry/pick-screen";
import type { Screen, Rect } from "../../src/geometry/types";

const screen = (x: number, w: number): Screen => ({
  frame: { x, y: 0, w, h: 1080 },
  visibleFrame: { x, y: 25, w, h: 1055 },
});

describe("pickScreen", () => {
  const left = screen(0, 1920);
  const right = screen(1920, 1920);

  it("picks the screen with the largest overlap", () => {
    const win: Rect = { x: 2000, y: 100, w: 400, h: 300 };
    expect(pickScreen(win, [left, right])).toBe(right);
  });

  it("picks by majority when a window straddles two screens", () => {
    const win: Rect = { x: 1800, y: 100, w: 400, h: 300 };
    expect(pickScreen(win, [left, right])).toBe(right);
  });

  it("falls back to the first screen when there is no overlap", () => {
    const win: Rect = { x: -500, y: 100, w: 100, h: 100 };
    expect(pickScreen(win, [left, right])).toBe(left);
  });
});
