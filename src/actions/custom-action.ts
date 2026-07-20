import { action, SingletonAction, type KeyDownEvent } from "@elgato/streamdeck";
import { windowApi } from "../native/window";
import { pickScreen } from "../geometry/pick-screen";
import { computeCustom } from "../geometry/compute-frame";
import type { CustomSettings } from "../settings";

@action({ UUID: "com.oz.window-resizer.custom" })
export class CustomAction extends SingletonAction<CustomSettings> {
  override async onKeyDown(ev: KeyDownEvent<CustomSettings>): Promise<void> {
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
    const s = ev.payload.settings;
    const target = computeCustom(
      {
        x: Number(s.x ?? 0),
        y: Number(s.y ?? 0),
        w: Number(s.w ?? 100),
        h: Number(s.h ?? 100),
        unit: s.unit ?? "percent",
      },
      screen,
    );
    const ok = windowApi.setWindowFrame(win.pid, target.x, target.y, target.w, target.h);
    if (!ok) await ev.action.showAlert();
  }
}
