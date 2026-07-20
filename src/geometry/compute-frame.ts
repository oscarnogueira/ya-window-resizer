import type { Gaps, Position, Rect, Screen } from "./types";

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
  return { x: left, y: top, w: right - left, h: bottom - top };
}

export function computeFrame(position: Position, screen: Screen, gaps: Gaps): Rect {
  const area = screen.visibleFrame;
  if (position === "maximize") {
    return fromCell({ fx: 0, fy: 0, fw: 1, fh: 1, edges: ALL_SCREEN }, area, gaps);
  }
  if (position === "center") {
    throw new Error("center handled by computeCenter");
  }
  return fromCell(CELLS[position], area, gaps);
}
