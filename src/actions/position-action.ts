import streamDeck, { action, SingletonAction, type KeyDownEvent } from "@elgato/streamdeck";
import { windowApi } from "../native/window";
import { pickScreen } from "../geometry/pick-screen";
import { computeFrame, computeCenter } from "../geometry/compute-frame";
import { resolveGaps, type PositionSettings, type GlobalSettings } from "../settings";
import type { Position } from "../geometry/types";

@action({ UUID: "com.oz.window-resizer.position" })
export class PositionAction extends SingletonAction<PositionSettings> {
  override async onKeyDown(ev: KeyDownEvent<PositionSettings>): Promise<void> {
    if (!windowApi.isTrusted()) {
      await ev.action.showAlert();
      streamDeck.logger.warn("Accessibility not granted; window operation skipped.");
      return;
    }
    const win = windowApi.getFrontmostWindow();
    if (!win) {
      await ev.action.showAlert();
      return;
    }
    const screens = windowApi.getScreens();
    const screen = pickScreen(win, screens);
    const global = (await streamDeck.settings.getGlobalSettings()) as GlobalSettings;
    const gaps = resolveGaps(global, ev.payload.settings);
    const position: Position = ev.payload.settings.position ?? "maximize";

    const target =
      position === "center"
        ? computeCenter(win, screen, gaps)
        : computeFrame(position, screen, gaps);

    const ok = windowApi.setWindowFrame(win.pid, target.x, target.y, target.w, target.h);
    if (!ok) await ev.action.showAlert();
  }
}
