import type { Gaps, Position, Unit } from "./geometry/types";

export interface GlobalSettings {
  screenGap?: number;
  windowGap?: number;
  accentColor?: string;
}

// NB: these are `type` aliases, not `interface`s, so they satisfy the SDK's
// `SingletonAction<T extends JsonObject>` constraint. Object-literal type
// aliases get an implicit index signature; interfaces do not.
export type PositionSettings = {
  position?: Position;
  useCustomOffset?: boolean;
  screenGap?: number;
  windowGap?: number;
};

export type CustomSettings = {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  unit?: Unit;
};

export function resolveGaps(
  global: GlobalSettings,
  action: { useCustomOffset?: boolean; screenGap?: number; windowGap?: number },
): Gaps {
  if (action.useCustomOffset) {
    return { screenGap: action.screenGap ?? 0, windowGap: action.windowGap ?? 0 };
  }
  return { screenGap: global.screenGap ?? 0, windowGap: global.windowGap ?? 0 };
}

export const DEFAULT_ACCENT = "#3B99FC";
/** Mutable cache of the accent color; updated only by the global-settings
 * subscription in plugin.ts, read by the action renderers. Avoids re-fetching
 * settings inside event handlers (which would loop). */
export const accent = { color: DEFAULT_ACCENT };
