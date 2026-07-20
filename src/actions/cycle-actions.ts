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
import {
  cycleCornersIcon,
  cycleSidesIcon,
  cycleTopBottomIcon,
  svgToDataUri,
} from "../icons/position-icon";
import type { Position } from "../geometry/types";

/**
 * Base for actions that step a window through a fixed sequence of positions,
 * one per press. The index is persisted per button so each remembers where it
 * is. Gaps default to 4px like the other actions.
 */
abstract class CycleAction extends SingletonAction<CycleSettings> {
  /** Positions to cycle through, in order. */
  protected abstract readonly positions: readonly Exclude<Position, "center">[];
  /** Icon renderer for this cycle, driven by the accent color. */
  protected abstract renderIcon(color: string): string;

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
    const position = this.positions[index % this.positions.length];

    const target = computeFrame(position, screen, gaps);
    const ok = windowApi.setWindowFrame(win.pid, target.x, target.y, target.w, target.h);
    if (!ok) {
      await ev.action.showAlert();
      return;
    }
    await ev.action.setSettings({
      ...ev.payload.settings,
      index: (index + 1) % this.positions.length,
    });
  }

  private paint(action: KeyAction<CycleSettings> | DialAction<CycleSettings>): Promise<void> {
    return action.setImage(svgToDataUri(this.renderIcon(accent.color)));
  }

  override onWillAppear(ev: WillAppearEvent<CycleSettings>): Promise<void> {
    return this.paint(ev.action);
  }

  async refreshAll(): Promise<void> {
    for (const a of this.actions) {
      await this.paint(a);
    }
  }
}

@action({ UUID: "fyi.oz.yet-another-window-resizer.cycle-corners" })
export class CycleCornersAction extends CycleAction {
  protected readonly positions = ["top-left", "top-right", "bottom-right", "bottom-left"] as const;
  protected renderIcon(color: string): string {
    return cycleCornersIcon(color);
  }
}

@action({ UUID: "fyi.oz.yet-another-window-resizer.cycle-sides" })
export class CycleSidesAction extends CycleAction {
  protected readonly positions = ["left-half", "right-half"] as const;
  protected renderIcon(color: string): string {
    return cycleSidesIcon(color);
  }
}

@action({ UUID: "fyi.oz.yet-another-window-resizer.cycle-top-bottom" })
export class CycleTopBottomAction extends CycleAction {
  protected readonly positions = ["top-half", "bottom-half"] as const;
  protected renderIcon(color: string): string {
    return cycleTopBottomIcon(color);
  }
}
