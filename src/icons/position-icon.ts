import type { Position } from "../geometry/types";

/** A fractional (0..1) tile within the screen; `active` = the target region. */
interface Tile {
  fx: number;
  fy: number;
  fw: number;
  fh: number;
  active: boolean;
}

const t = (fx: number, fy: number, fw: number, fh: number, active: boolean): Tile => ({
  fx, fy, fw, fh, active,
});

// Each position is drawn as the full grid it implies: the active tile filled,
// the remaining tiles dimmed. Every tile is inset, so a transparent offset
// shows around the region and between tiles — mirroring the real gap feature.
const TILES: Record<Position, Tile[]> = {
  "left-half":        [t(0, 0, 1 / 2, 1, true),  t(1 / 2, 0, 1 / 2, 1, false)],
  "right-half":       [t(1 / 2, 0, 1 / 2, 1, true), t(0, 0, 1 / 2, 1, false)],
  "top-half":         [t(0, 0, 1, 1 / 2, true),  t(0, 1 / 2, 1, 1 / 2, false)],
  "bottom-half":      [t(0, 1 / 2, 1, 1 / 2, true), t(0, 0, 1, 1 / 2, false)],
  "left-third":       [t(0, 0, 1 / 3, 1, true),  t(1 / 3, 0, 1 / 3, 1, false), t(2 / 3, 0, 1 / 3, 1, false)],
  "center-third":     [t(1 / 3, 0, 1 / 3, 1, true), t(0, 0, 1 / 3, 1, false), t(2 / 3, 0, 1 / 3, 1, false)],
  "right-third":      [t(2 / 3, 0, 1 / 3, 1, true), t(0, 0, 1 / 3, 1, false), t(1 / 3, 0, 1 / 3, 1, false)],
  "left-two-thirds":  [t(0, 0, 2 / 3, 1, true),  t(2 / 3, 0, 1 / 3, 1, false)],
  "right-two-thirds": [t(1 / 3, 0, 2 / 3, 1, true), t(0, 0, 1 / 3, 1, false)],
  "top-left":         [t(0, 0, 1 / 2, 1 / 2, true),  t(1 / 2, 0, 1 / 2, 1 / 2, false), t(0, 1 / 2, 1 / 2, 1 / 2, false), t(1 / 2, 1 / 2, 1 / 2, 1 / 2, false)],
  "top-right":        [t(1 / 2, 0, 1 / 2, 1 / 2, true), t(0, 0, 1 / 2, 1 / 2, false), t(0, 1 / 2, 1 / 2, 1 / 2, false), t(1 / 2, 1 / 2, 1 / 2, 1 / 2, false)],
  "bottom-left":      [t(0, 1 / 2, 1 / 2, 1 / 2, true), t(0, 0, 1 / 2, 1 / 2, false), t(1 / 2, 0, 1 / 2, 1 / 2, false), t(1 / 2, 1 / 2, 1 / 2, 1 / 2, false)],
  "bottom-right":     [t(1 / 2, 1 / 2, 1 / 2, 1 / 2, true), t(0, 0, 1 / 2, 1 / 2, false), t(1 / 2, 0, 1 / 2, 1 / 2, false), t(0, 1 / 2, 1 / 2, 1 / 2, false)],
  "maximize":         [t(0, 0, 1, 1, true)],
  "center":           [t(0, 0, 1, 1, false), t(0.2, 0.2, 0.6, 0.6, true)],
};

// Screen frame within the 144x144 canvas, and the transparent inset per tile.
const OX = 16, OY = 32, OW = 112, OH = 80, INSET = 4;

/** Round to at most 1 decimal and render without a trailing ".0". */
function n(v: number): string {
  return (Math.round(v * 10) / 10).toString();
}

/** SVG diagram (144x144) of a target region highlighted in `color`, with a
 *  transparent offset around it and its neighbours dimmed. */
export function positionIcon(position: Position, color: string): string {
  const rects = TILES[position]
    .map((tile) => {
      const x = OX + tile.fx * OW + INSET;
      const y = OY + tile.fy * OH + INSET;
      const w = tile.fw * OW - 2 * INSET;
      const h = tile.fh * OH - 2 * INSET;
      const opacity = tile.active ? "1" : "0.22";
      return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="6" fill="${color}" fill-opacity="${opacity}"/>`;
    })
    .join("");
  return `<svg width="144" height="144" viewBox="0 0 144 144" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
}

/** Clockwise circular arrow (refresh glyph) centered on the canvas. */
function circularArrow(color: string): string {
  const cx = 72, cy = 72, R = 30, startDeg = 135, sweepDeg = 290, steps = 48, sw = 8;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i++) {
    const th = ((startDeg + (sweepDeg * i) / steps) * Math.PI) / 180;
    pts.push([cx + R * Math.cos(th), cy + R * Math.sin(th)]);
  }
  const d = "M " + pts.map((p) => `${n(p[0])} ${n(p[1])}`).join(" L ");
  const endTh = ((startDeg + sweepDeg) * Math.PI) / 180;
  const dx = -Math.sin(endTh), dy = Math.cos(endTh); // clockwise tangent at the tip
  const px = -dy, py = dx; // perpendicular
  const p = pts[pts.length - 1];
  const ah = 15;
  const tip: [number, number] = [p[0] + dx * ah * 0.5, p[1] + dy * ah * 0.5];
  const b1: [number, number] = [tip[0] - dx * ah + px * ah * 0.55, tip[1] - dy * ah + py * ah * 0.55];
  const b2: [number, number] = [tip[0] - dx * ah - px * ah * 0.55, tip[1] - dy * ah - py * ah * 0.55];
  return (
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>` +
    `<path d="M ${n(tip[0])} ${n(tip[1])} L ${n(b1[0])} ${n(b1[1])} L ${n(b2[0])} ${n(b2[1])} Z" fill="${color}"/>`
  );
}

/** Double-headed arrow through the canvas center: horizontal (↔) or vertical (↕). */
function doubleArrow(color: string, horizontal: boolean): string {
  const c = 72, ah = 16, sw = 8, half = 30, across = 0.55 * ah;
  const lo = c - half, hi = c + half;
  const pt = (along: number, cross: number): [number, number] =>
    horizontal ? [along, cross] : [cross, along];
  const tri = (t: [number, number], a: [number, number], b: [number, number]): string =>
    `<path d="M ${n(t[0])} ${n(t[1])} L ${n(a[0])} ${n(a[1])} L ${n(b[0])} ${n(b[1])} Z" fill="${color}"/>`;
  const s1 = pt(lo + ah, c);
  const s2 = pt(hi - ah, c);
  return (
    `<path d="M ${n(s1[0])} ${n(s1[1])} L ${n(s2[0])} ${n(s2[1])}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>` +
    tri(pt(lo, c), pt(lo + ah, c - across), pt(lo + ah, c + across)) +
    tri(pt(hi, c), pt(hi - ah, c - across), pt(hi - ah, c + across))
  );
}

/** SVG diagram (144x144) for a cycling action: the cells of the cycle set drawn
 *  dimmed, with a glyph in `color` over them. */
function cycleIcon(color: string, cells: Array<[number, number, number, number]>, glyph: string): string {
  const tiles = cells
    .map(([fx, fy, fw, fh]) => {
      const x = OX + fx * OW + INSET;
      const y = OY + fy * OH + INSET;
      const w = fw * OW - 2 * INSET;
      const h = fh * OH - 2 * INSET;
      return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="6" fill="${color}" fill-opacity="0.22"/>`;
    })
    .join("");
  return `<svg width="144" height="144" viewBox="0 0 144 144" xmlns="http://www.w3.org/2000/svg">${tiles}${glyph}</svg>`;
}

/** Cycle Corners: four dimmed quarter cells + clockwise circular arrow. */
export function cycleCornersIcon(color: string): string {
  return cycleIcon(
    color,
    [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]],
    circularArrow(color),
  );
}

/** Cycle Sides: left & right halves dimmed + a horizontal double arrow. */
export function cycleSidesIcon(color: string): string {
  return cycleIcon(color, [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]], doubleArrow(color, true));
}

/** Cycle Top/Bottom: top & bottom halves dimmed + a vertical double arrow. */
export function cycleTopBottomIcon(color: string): string {
  return cycleIcon(color, [[0, 0, 1, 0.5], [0, 0.5, 1, 0.5]], doubleArrow(color, false));
}

/** SVG diagram (144x144) for the Custom action: a free-floating box. */
export function customIcon(color: string): string {
  return (
    `<svg width="144" height="144" viewBox="0 0 144 144" xmlns="http://www.w3.org/2000/svg">` +
    `<rect x="16" y="32" width="112" height="80" rx="12" fill="${color}" fill-opacity="0.22"/>` +
    `<rect x="52" y="50" width="60" height="44" rx="6" fill="${color}"/>` +
    `</svg>`
  );
}

/** Position list glyph: a 3x3 grid with the top-left cell highlighted. */
export function positionListIcon(color: string): string {
  const gx = OW / 3, gy = OH / 3;
  let cells = "";
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const on = i === 0 && j === 0;
      cells +=
        `<rect x="${n(OX + i * gx + 4)}" y="${n(OY + j * gy + 4)}" ` +
        `width="${n(gx - 8)}" height="${n(gy - 8)}" rx="5" fill="${color}" fill-opacity="${on ? "1" : "0.22"}"/>`;
    }
  }
  return `<svg width="144" height="144" viewBox="0 0 144 144" xmlns="http://www.w3.org/2000/svg">${cells}</svg>`;
}

/** App mark: a screen outline with an inner offset window (line style). */
export function appIcon(color: string): string {
  return (
    `<svg width="144" height="144" viewBox="0 0 144 144" xmlns="http://www.w3.org/2000/svg">` +
    `<rect x="20" y="30" width="104" height="84" rx="16" fill="none" stroke="${color}" stroke-width="8"/>` +
    `<rect x="46" y="52" width="52" height="40" rx="8" fill="${color}"/>` +
    `</svg>`
  );
}

/**
 * Bento layout mark (transparent, monochrome): one large pane on the left, two
 * stacked on the right with the top lit and the bottom dimmed. Same layout as
 * the app badge, for the sidebar/category in a single color.
 */
export function bentoIcon(color: string): string {
  return (
    `<svg width="144" height="144" viewBox="0 0 144 144" xmlns="http://www.w3.org/2000/svg">` +
    `<rect x="26" y="30" width="46" height="84" rx="12" fill="${color}"/>` +
    `<rect x="80" y="30" width="38" height="38" rx="10" fill="${color}"/>` +
    `<rect x="80" y="76" width="38" height="38" rx="10" fill="${color}" fill-opacity="0.3"/>` +
    `</svg>`
  );
}

/**
 * Standalone application badge: a bento layout on a dark rounded square — one
 * large accent pane on the left, two white panes stacked on the right with the
 * top one lit and the bottom one dimmed.
 */
export function appBadge(): string {
  return (
    `<svg width="144" height="144" viewBox="0 0 144 144" xmlns="http://www.w3.org/2000/svg">` +
    `<rect x="8" y="8" width="128" height="128" rx="28" fill="#23262d"/>` +
    `<rect x="26" y="30" width="46" height="84" rx="12" fill="#3B99FC"/>` +
    `<rect x="80" y="30" width="38" height="38" rx="10" fill="#ffffff"/>` +
    `<rect x="80" y="76" width="38" height="38" rx="10" fill="#ffffff" fill-opacity="0.3"/>` +
    `</svg>`
  );
}

/** Encode an SVG string as a data URI suitable for KeyAction.setImage. */
export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
