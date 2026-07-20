import type { Rect } from "./types";

/**
 * Convert a Cocoa (bottom-left origin, +y up) rect to a Quartz/AX top-left
 * origin (+y down) rect. `primaryHeight` is the height of the PRIMARY display
 * (NSScreen.screens[0]); the top-left space is anchored to the primary's
 * top-left, so screens positioned above the primary yield a negative y.
 */
export function cocoaRectToTopLeft(rect: Rect, primaryHeight: number): Rect {
  return {
    x: rect.x,
    y: primaryHeight - (rect.y + rect.h),
    w: rect.w,
    h: rect.h,
  };
}
