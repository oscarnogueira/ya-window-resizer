import { action, SingletonAction, type KeyDownEvent } from "@elgato/streamdeck";
import { windowApi } from "../native/window";
import { pickScreen } from "../geometry/pick-screen";
import { computeCustom } from "../geometry/compute-frame";
import type { CustomSettings } from "../settings";
import { customIcon, svgToDataUri } from "../icons/position-icon";
import { accent } from "../settings";
import type { WillAppearEvent, KeyAction, DialAction } from "@elgato/streamdeck";

function num(v: unknown, fallback: number): number {
  const n = Number(v ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

@action({ UUID: "fyi.oz.yet-another-window-resizer.custom" })
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
      { x: num(s.x, 0), y: num(s.y, 0), w: num(s.w, 100), h: num(s.h, 100), unit: s.unit ?? "percent" },
      screen,
    );
    const ok = windowApi.setWindowFrame(win.pid, target.x, target.y, target.w, target.h);
    if (!ok) await ev.action.showAlert();
  }

  private renderKey(
    action: KeyAction<CustomSettings> | DialAction<CustomSettings>,
  ): Promise<void> {
    return action.setImage(svgToDataUri(customIcon(accent.color)));
  }

  override onWillAppear(ev: WillAppearEvent<CustomSettings>): Promise<void> {
    return this.renderKey(ev.action);
  }

  async refreshAll(): Promise<void> {
    for (const a of this.actions) {
      await this.renderKey(a);
    }
  }
}
