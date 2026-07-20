/** Top-left origin, pixels. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A screen's usable area (visibleFrame), already excluding menu bar/notch/Dock.
 *  Given in top-left origin (converted from NSScreen at the native boundary). */
export interface Screen {
  /** Full frame, used only for choosing which screen a window is on. */
  frame: Rect;
  /** Usable area; all placement math is relative to this. */
  visibleFrame: Rect;
}

export interface Gaps {
  /** Space between a window edge and the screen edge. */
  screenGap: number;
  /** Space between two adjacent windows. Applied as windowGap/2 per internal edge. */
  windowGap: number;
}

export type Position =
  | "left-half" | "right-half" | "top-half" | "bottom-half"
  | "left-third" | "center-third" | "right-third"
  | "left-two-thirds" | "right-two-thirds"
  | "top-left" | "top-right" | "bottom-left" | "bottom-right"
  | "maximize" | "center";

export type Unit = "percent" | "pixels";

export interface CustomFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  unit: Unit;
}
