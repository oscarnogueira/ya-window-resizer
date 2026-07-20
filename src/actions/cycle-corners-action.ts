import {
  action,
  SingletonAction,
  type KeyDownEvent,
  type WillAppearEvent,
  type KeyAction,
  type DialAction,
} from "@elgato/streamdeck";
import { windowApi } from "../native/window";
import { pickScreen } from "../geometry/pick-screen";
import { computeFrame } from "../geometry/compute-frame";
import { resolveGaps, accent, type CycleSettings } from "../settings";
import { cycleCornersIcon, svgToDataUri } from "../icons/position-icon";
import type { Position } from "../geometry/types";

/** Corners in clockwise order. Excludes "center" so it fits computeFrame. */
const CORNERS: Exclude<Position, "center">[] = ["top-left", "top-right", "bottom-right", "bottom-left"];

@action({ UUID: "fyi.oz.yet-another-window-resizer.cycle-corners" })
export class CycleCornersAction extends SingletonAction<CycleSettings> {
  override async onKeyDown(ev: KeyDownEvent<CycleSettings>): Promise<void> {
    if (!windowApi.isTrusted()) {
      await ev.action.showAlert();
      return;
    }
    const win = windowApi.getFrontmostWindow();
    if (!win) {
      await ev.action.showAlert();
      return;
    }
    const screen = pickScreen(win, windowApi.getScreens());
    const gaps = resolveGaps(ev.payload.settings);
    const index = ev.payload.settings.index ?? 0;
    const position = CORNERS[index % CORNERS.length];

    const target = computeFrame(position, screen, gaps);
    const ok = windowApi.setWindowFrame(win.pid, target.x, target.y, target.w, target.h);
    if (!ok) {
      await ev.action.showAlert();
      return;
    }
    // Advance the cycle; persisted per button so it remembers across presses.
    await ev.action.setSettings({ ...ev.payload.settings, index: (index + 1) % CORNERS.length });
  }

  private renderKey(
    action: KeyAction<CycleSettings> | DialAction<CycleSettings>,
  ): Promise<void> {
    return action.setImage(svgToDataUri(cycleCornersIcon(accent.color)));
  }

  override onWillAppear(ev: WillAppearEvent<CycleSettings>): Promise<void> {
    return this.renderKey(ev.action);
  }

  async refreshAll(): Promise<void> {
    for (const a of this.actions) {
      await this.renderKey(a);
    }
  }
}
