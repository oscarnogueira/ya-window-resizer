import streamDeck from "@elgato/streamdeck";
import { createRequire } from "node:module";
import type { Rect, Screen } from "../geometry/types";

const require = createRequire(import.meta.url);
// Bundled plugin.js sits in bin/; window.node sits one level up in the plugin root.
const native = require("../window.node") as NativeWindow;

interface FrontWindow extends Rect {
  pid: number;
  /** Localized name of the app resolved via the live AX system-wide query. */
  app: string;
  /** Localized name from NSWorkspace.frontmostApplication (diagnostic only). */
  wsApp: string;
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
  getFrontmostWindow: () => {
    const w = native.getFrontmostWindow();
    // Diagnostic: compare the live AX focused app against NSWorkspace's value.
    streamDeck.logger.info(
      `[frontmost] AX="${w?.app ?? "-"}" (pid ${w?.pid ?? "-"}) | NSWorkspace="${w?.wsApp ?? "-"}"`,
    );
    return w;
  },
  getScreens: () => native.getScreens(),
  setWindowFrame: (pid: number, x: number, y: number, w: number, h: number) =>
    native.setWindowFrame(pid, Math.round(x), Math.round(y), Math.round(w), Math.round(h)),
};
export type { FrontWindow };
