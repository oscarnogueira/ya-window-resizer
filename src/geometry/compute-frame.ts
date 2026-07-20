import type { CustomFrame, Gaps, Position, Rect, Screen } from "./types";

type EdgeKind = "screen" | "split";

interface Edges { left: EdgeKind; right: EdgeKind; top: EdgeKind; bottom: EdgeKind; }

interface Cell { fx: number; fy: number; fw: number; fh: number; edges: Edges; }

const ALL_SCREEN: Edges = { left: "screen", right: "screen", top: "screen", bottom: "screen" };

const CELLS: Record<Exclude<Position, "maximize" | "center">, Cell> = {
  "left-half":       { fx: 0,    fy: 0, fw: 1 / 2, fh: 1, edges: { ...ALL_SCREEN, right: "split" } },
  "right-half":      { fx: 1 / 2, fy: 0, fw: 1 / 2, fh: 1, edges: { ...ALL_SCREEN, left: "split" } },
  "top-half":        { fx: 0, fy: 0,    fw: 1, fh: 1 / 2, edges: { ...ALL_SCREEN, bottom: "split" } },
  "bottom-half":     { fx: 0, fy: 1 / 2, fw: 1, fh: 1 / 2, edges: { ...ALL_SCREEN, top: "split" } },
  "left-third":      { fx: 0,    fy: 0, fw: 1 / 3, fh: 1, edges: { ...ALL_SCREEN, right: "split" } },
  "center-third":    { fx: 1 / 3, fy: 0, fw: 1 / 3, fh: 1, edges: { ...ALL_SCREEN, left: "split", right: "split" } },
  "right-third":     { fx: 2 / 3, fy: 0, fw: 1 / 3, fh: 1, edges: { ...ALL_SCREEN, left: "split" } },
  "left-two-thirds": { fx: 0,    fy: 0, fw: 2 / 3, fh: 1, edges: { ...ALL_SCREEN, right: "split" } },
  "right-two-thirds":{ fx: 1 / 3, fy: 0, fw: 2 / 3, fh: 1, edges: { ...ALL_SCREEN, left: "split" } },
  "top-left":        { fx: 0,    fy: 0,    fw: 1 / 2, fh: 1 / 2, edges: { ...ALL_SCREEN, right: "split", bottom: "split" } },
  "top-right":       { fx: 1 / 2, fy: 0,    fw: 1 / 2, fh: 1 / 2, edges: { ...ALL_SCREEN, left: "split", bottom: "split" } },
  "bottom-left":     { fx: 0,    fy: 1 / 2, fw: 1 / 2, fh: 1 / 2, edges: { ...ALL_SCREEN, right: "split", top: "split" } },
  "bottom-right":    { fx: 1 / 2, fy: 1 / 2, fw: 1 / 2, fh: 1 / 2, edges: { ...ALL_SCREEN, left: "split", top: "split" } },
};

function inset(kind: EdgeKind, gaps: Gaps): number {
  return kind === "screen" ? gaps.screenGap : gaps.windowGap / 2;
}

function fromCell(cell: Cell, area: Rect, gaps: Gaps): Rect {
  const left = area.x + cell.fx * area.w + inset(cell.edges.left, gaps);
  const top = area.y + cell.fy * area.h + inset(cell.edges.top, gaps);
  const right = area.x + (cell.fx + cell.fw) * area.w - inset(cell.edges.right, gaps);
  const bottom = area.y + (cell.fy + cell.fh) * area.h - inset(cell.edges.bottom, gaps);
  return { x: left, y: top, w: Math.max(0, right - left), h: Math.max(0, bottom - top) };
}

export function computeFrame(position: Exclude<Position, "center">, screen: Screen, gaps: Gaps): Rect {
  const area = screen.visibleFrame;
  if (position === "maximize") {
    return fromCell({ fx: 0, fy: 0, fw: 1, fh: 1, edges: ALL_SCREEN }, area, gaps);
  }
  return fromCell(CELLS[position], area, gaps);
}

function clampRect(r: Rect, area: Rect): Rect {
  const w = Math.max(0, Math.min(r.w, area.w));
  const h = Math.max(0, Math.min(r.h, area.h));
  const x = Math.min(Math.max(r.x, area.x), area.x + area.w - w);
  const y = Math.min(Math.max(r.y, area.y), area.y + area.h - h);
  return { x, y, w, h };
}

/**
 * Center: the window fills the central 3x3 block of a 5x5 grid over the usable
 * area (i.e. the middle 60% on each axis, from 1/5 to 4/5), inset by screenGap
 * on all four sides. Unlike the old behaviour it resizes rather than keeping the
 * window's current size.
 */
export function computeCenter(screen: Screen, gaps: Gaps): Rect {
  const area = screen.visibleFrame;
  const g = gaps.screenGap;
  const x = area.x + area.w / 5 + g;
  const y = area.y + area.h / 5 + g;
  const w = (area.w * 3) / 5 - 2 * g;
  const h = (area.h * 3) / 5 - 2 * g;
  return { x, y, w: Math.max(0, w), h: Math.max(0, h) };
}

export function computeCustom(custom: CustomFrame, screen: Screen): Rect {
  const area = screen.visibleFrame;
  const raw: Rect =
    custom.unit === "percent"
      ? {
          x: area.x + (custom.x / 100) * area.w,
          y: area.y + (custom.y / 100) * area.h,
          w: (custom.w / 100) * area.w,
          h: (custom.h / 100) * area.h,
        }
      : {
          x: area.x + custom.x,
          y: area.y + custom.y,
          w: custom.w,
          h: custom.h,
        };
  return clampRect(raw, area);
}
