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

/** SVG diagram (144x144) for the Custom action: a free-floating box. */
export function customIcon(color: string): string {
  return (
    `<svg width="144" height="144" viewBox="0 0 144 144" xmlns="http://www.w3.org/2000/svg">` +
    `<rect x="16" y="32" width="112" height="80" rx="12" fill="${color}" fill-opacity="0.22"/>` +
    `<rect x="52" y="50" width="60" height="44" rx="6" fill="${color}"/>` +
    `</svg>`
  );
}

/** Encode an SVG string as a data URI suitable for KeyAction.setImage. */
export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
