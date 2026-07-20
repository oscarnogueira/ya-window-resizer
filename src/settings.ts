import type { Gaps, Position, Unit } from "./geometry/types";

export interface GlobalSettings {
  screenGap?: number;
  windowGap?: number;
}

export interface PositionSettings {
  position?: Position;
  useCustomOffset?: boolean;
  screenGap?: number;
  windowGap?: number;
}

export interface CustomSettings {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  unit?: Unit;
}

export function resolveGaps(
  global: GlobalSettings,
  action: { useCustomOffset?: boolean; screenGap?: number; windowGap?: number },
): Gaps {
  if (action.useCustomOffset) {
    return { screenGap: action.screenGap ?? 0, windowGap: action.windowGap ?? 0 };
  }
  return { screenGap: global.screenGap ?? 0, windowGap: global.windowGap ?? 0 };
}
