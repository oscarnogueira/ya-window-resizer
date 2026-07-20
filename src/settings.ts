import type { Gaps, Position, Unit } from "./geometry/types";

export interface GlobalSettings {
  accentColor?: string;
}

/** Default gap (px) applied when a button has no explicit value set. */
export const DEFAULT_GAP = 4;

// NB: these are `type` aliases, not `interface`s, so they satisfy the SDK's
// `SingletonAction<T extends JsonObject>` constraint. Object-literal type
// aliases get an implicit index signature; interfaces do not.
export type PositionSettings = {
  position?: Position;
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

/** Per-button gaps, defaulting to DEFAULT_GAP when unset. */
export function resolveGaps(settings: { screenGap?: number; windowGap?: number }): Gaps {
  return {
    screenGap: settings.screenGap ?? DEFAULT_GAP,
    windowGap: settings.windowGap ?? DEFAULT_GAP,
  };
}

export const DEFAULT_ACCENT = "#3B99FC";
/** Mutable cache of the accent color; updated only by the global-settings
 * subscription in plugin.ts, read by the action renderers. Avoids re-fetching
 * settings inside event handlers (which would loop). */
export const accent = { color: DEFAULT_ACCENT };
