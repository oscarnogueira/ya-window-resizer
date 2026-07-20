import { describe, it, expect } from "vitest";
import { cocoaRectToTopLeft } from "../../src/geometry/coords";

describe("cocoaRectToTopLeft", () => {
  const primaryHeight = 1080;
  it("primary screen (bottom-left 0,0) maps to top-left 0,0", () => {
    expect(cocoaRectToTopLeft({ x: 0, y: 0, w: 1920, h: 1080 }, primaryHeight))
      .toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
  });
  it("a visibleFrame with a 25px Dock at bottom shifts top-left y", () => {
    expect(cocoaRectToTopLeft({ x: 0, y: 25, w: 1920, h: 1055 }, primaryHeight))
      .toEqual({ x: 0, y: 0, w: 1920, h: 1055 });
  });
  it("a secondary screen stacked above the primary gets negative top-left y", () => {
    // primary is 1080 tall; secondary at Cocoa origin (0,1080) sits above it.
    // Quartz top-left y = 1080 - (1080 + 1080) = -1080.
    expect(cocoaRectToTopLeft({ x: 0, y: 1080, w: 1920, h: 1080 }, 1080))
      .toEqual({ x: 0, y: -1080, w: 1920, h: 1080 });
  });
});
