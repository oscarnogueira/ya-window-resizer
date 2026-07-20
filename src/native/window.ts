import streamDeck from "@elgato/streamdeck";
import { createRequire } from "node:module";
import type { Rect, Screen } from "../geometry/types";

const require = createRequire(import.meta.url);
// Bundled plugin.js sits in bin/; window.node sits one level up in the plugin root.
const native = require("../window.node") as NativeWindow;

interface FrontWindow extends Rect {
  pid: number;
  /** Localized name of the chosen target app. */
  app: string;
}

/** Raw native result: window fields plus multi-source diagnostics. */
interface NativeFront extends Partial<Rect> {
  ok: boolean;
  pid?: number;
  app?: string;
  cgApp?: string;
  cgPid?: number;
  wsApp?: string;
  wsPid?: number;
  axPid?: number;
  axAppErr?: number;
  winErr?: number;
}

interface NativeWindow {
  isTrusted(): boolean;
  getFrontmostWindow(): NativeFront;
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
  getFrontmostWindow: (): FrontWindow | null => {
    const r = native.getFrontmostWindow();
    // Diagnostic: which live source names the active app, and any AX errors.
    streamDeck.logger.info(
      `[frontmost] ok=${r.ok} chosen="${r.app ?? "-"}" (pid ${r.pid ?? "-"}) | ` +
        `CG="${r.cgApp ?? "-"}" (${r.cgPid ?? "-"}) | NSWorkspace="${r.wsApp ?? "-"}" (${r.wsPid ?? "-"}) | ` +
        `axPid=${r.axPid ?? "-"} axAppErr=${r.axAppErr ?? "-"} winErr=${r.winErr ?? "-"}`,
    );
    if (!r.ok) return null;
    return { x: r.x!, y: r.y!, w: r.w!, h: r.h!, pid: r.pid!, app: r.app ?? "" };
  },
  getScreens: () => native.getScreens(),
  setWindowFrame: (pid: number, x: number, y: number, w: number, h: number) =>
    native.setWindowFrame(pid, Math.round(x), Math.round(y), Math.round(w), Math.round(h)),
};
export type { FrontWindow };
