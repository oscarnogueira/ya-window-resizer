import type { Rect, Screen } from "./types";

function overlapArea(a: Rect, b: Rect): number {
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return x * y;
}

/** Returns the screen with the greatest overlap with `win`; first screen if none. */
export function pickScreen(win: Rect, screens: Screen[]): Screen {
  let best = screens[0];
  let bestArea = -1;
  for (const s of screens) {
    const area = overlapArea(win, s.frame);
    if (area > bestArea) {
      bestArea = area;
      best = s;
    }
  }
  return best;
}
