import streamDeck, { action, SingletonAction, type KeyDownEvent } from "@elgato/streamdeck";
import { windowApi } from "../native/window";
import { pickScreen } from "../geometry/pick-screen";
import { computeFrame, computeCenter } from "../geometry/compute-frame";
import { resolveGaps, accent, type PositionSettings } from "../settings";
import type { Position } from "../geometry/types";
import { positionIcon, svgToDataUri } from "../icons/position-icon";
import type { WillAppearEvent, DidReceiveSettingsEvent, KeyAction, DialAction } from "@elgato/streamdeck";

@action({ UUID: "fyi.oz.yet-another-window-resizer.position" })
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
    const gaps = resolveGaps(ev.payload.settings);
    const position: Position = ev.payload.settings.position ?? "maximize";

    const target =
      position === "center"
        ? computeCenter(win, screen, gaps)
        : computeFrame(position, screen, gaps);

    const ok = windowApi.setWindowFrame(win.pid, target.x, target.y, target.w, target.h);
    if (!ok) await ev.action.showAlert();
  }

  private renderKey(
    action: KeyAction<PositionSettings> | DialAction<PositionSettings>,
    settings: PositionSettings,
  ): Promise<void> {
    const position = settings.position ?? "maximize";
    return action.setImage(svgToDataUri(positionIcon(position, accent.color)));
  }

  override onWillAppear(ev: WillAppearEvent<PositionSettings>): Promise<void> {
    return this.renderKey(ev.action, ev.payload.settings);
  }

  override onDidReceiveSettings(ev: DidReceiveSettingsEvent<PositionSettings>): Promise<void> {
    return this.renderKey(ev.action, ev.payload.settings);
  }

  async refreshAll(): Promise<void> {
    for (const a of this.actions) {
      const s = await a.getSettings<PositionSettings>();
      await this.renderKey(a, s);
    }
  }
}
