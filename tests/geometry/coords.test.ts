import { describe, it, expect } from "vitest";
import { cocoaRectToTopLeft } from "../../src/geometry/coords";

describe("cocoaRectToTopLeft", () => {
  const globalHeight = 1080;
  it("primary screen (bottom-left 0,0) maps to top-left 0,0", () => {
    expect(cocoaRectToTopLeft({ x: 0, y: 0, w: 1920, h: 1080 }, globalHeight))
      .toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
  });
  it("a visibleFrame with a 25px Dock at bottom shifts top-left y", () => {
    expect(cocoaRectToTopLeft({ x: 0, y: 25, w: 1920, h: 1055 }, globalHeight))
      .toEqual({ x: 0, y: 0, w: 1920, h: 1055 });
  });
  it("a secondary screen above the primary gets top-left y 0", () => {
    expect(cocoaRectToTopLeft({ x: 0, y: 1080, w: 1920, h: 1080 }, 2160))
      .toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
  });
});
