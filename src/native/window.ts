import { createRequire } from "node:module";
import type { Rect, Screen } from "../geometry/types";

const require = createRequire(import.meta.url);
// Bundled plugin.js sits in bin/; window.node sits one level up in the plugin root.
const native = require("../window.node") as NativeWindow;

interface FrontWindow extends Rect {
  pid: number;
}

interface NativeWindow {
  isTrusted(): boolean;
  getFrontmostWindow(): FrontWindow | null;
  getScreens(): Screen[];
  setWindowFrame(pid: number, x: number, y: number, w: number, h: number): boolean;
}

/**
 * Public API. This is the single rounding boundary: the geometry core returns
 * raw floats (fractional thirds, etc.), and we round here — once — before the
 * values cross into the macOS Accessibility API, which expects integer pixels.
 */
export const windowApi = {
  isTrusted: () => native.isTrusted(),
  getFrontmostWindow: () => native.getFrontmostWindow(),
  getScreens: () => native.getScreens(),
  setWindowFrame: (pid: number, x: number, y: number, w: number, h: number) =>
    native.setWindowFrame(pid, Math.round(x), Math.round(y), Math.round(w), Math.round(h)),
};
export type { FrontWindow };
