import type { Position } from "../geometry/types";

const CELL: Record<Position, { fx: number; fy: number; fw: number; fh: number }> = {
  "left-half":        { fx: 0,   fy: 0,   fw: 1 / 2, fh: 1 },
  "right-half":       { fx: 1 / 2, fy: 0,  fw: 1 / 2, fh: 1 },
  "top-half":         { fx: 0,   fy: 0,   fw: 1,     fh: 1 / 2 },
  "bottom-half":      { fx: 0,   fy: 1 / 2, fw: 1,   fh: 1 / 2 },
  "left-third":       { fx: 0,   fy: 0,   fw: 1 / 3, fh: 1 },
  "center-third":     { fx: 1 / 3, fy: 0,  fw: 1 / 3, fh: 1 },
  "right-third":      { fx: 2 / 3, fy: 0,  fw: 1 / 3, fh: 1 },
  "left-two-thirds":  { fx: 0,   fy: 0,   fw: 2 / 3, fh: 1 },
  "right-two-thirds": { fx: 1 / 3, fy: 0,  fw: 2 / 3, fh: 1 },
  "top-left":         { fx: 0,   fy: 0,   fw: 1 / 2, fh: 1 / 2 },
  "top-right":        { fx: 1 / 2, fy: 0,  fw: 1 / 2, fh: 1 / 2 },
  "bottom-left":      { fx: 0,   fy: 1 / 2, fw: 1 / 2, fh: 1 / 2 },
  "bottom-right":     { fx: 1 / 2, fy: 1 / 2, fw: 1 / 2, fh: 1 / 2 },
  "maximize":         { fx: 0,   fy: 0,   fw: 1,     fh: 1 },
  "center":           { fx: 0.2, fy: 0.2, fw: 0.6,   fh: 0.6 },
};

// Screen frame within the 144x144 canvas.
const OX = 16, OY = 32, OW = 112, OH = 80, INSET = 3;

/** Round to at most 1 decimal and render without a trailing ".0". */
function n(v: number): string {
  return (Math.round(v * 10) / 10).toString();
}

/** SVG diagram (144x144) of a target region highlighted in `color`. */
export function positionIcon(position: Position, color: string): string {
  const c = CELL[position];
  const x = OX + c.fx * OW + INSET;
  const y = OY + c.fy * OH + INSET;
  const w = c.fw * OW - 2 * INSET;
  const h = c.fh * OH - 2 * INSET;
  return (
    `<svg width="144" height="144" viewBox="0 0 144 144" xmlns="http://www.w3.org/2000/svg">` +
    `<rect x="${OX}" y="${OY}" width="${OW}" height="${OH}" rx="12" fill="${color}" fill-opacity="0.22"/>` +
    `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="6" fill="${color}"/>` +
    `</svg>`
  );
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
