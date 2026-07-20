import type { Rect } from "./types";

/**
 * Convert a Cocoa (bottom-left origin, +y up) rect to a top-left origin
 * (+y down) rect. `globalHeight` is the total height of the desktop coordinate
 * space (max over screens of origin.y + height in Cocoa space).
 */
export function cocoaRectToTopLeft(rect: Rect, globalHeight: number): Rect {
  return {
    x: rect.x,
    y: globalHeight - (rect.y + rect.h),
    w: rect.w,
    h: rect.h,
  };
}
