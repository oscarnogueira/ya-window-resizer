import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

// Solid opaque RGBA PNG of size x size, given [r,g,b].
function makePng(size, [r, g, b]) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const rowLen = 1 + size * 4;
  const raw = Buffer.alloc(rowLen * size);
  for (let y = 0; y < size; y++) {
    const off = y * rowLen;
    raw[off] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const p = off + 1 + x * 4;
      raw[p] = r;
      raw[p + 1] = g;
      raw[p + 2] = b;
      raw[p + 3] = 255;
    }
  }
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const base = new URL("../fyi.oz.yet-another-window-resizer.sdPlugin/imgs/", import.meta.url).pathname;

// [relative path (no ext), rgb]
const targets = [
  ["pluginIcon", [90, 120, 200]],
  ["categoryIcon", [90, 120, 200]],
  ["actions/position/icon", [80, 170, 120]],
  ["actions/position/key", [80, 170, 120]],
  ["actions/custom/icon", [200, 140, 70]],
  ["actions/custom/key", [200, 140, 70]],
  ["actions/cycle/icon", [130, 110, 220]],
  ["actions/cycle/key", [130, 110, 220]],
  ["actions/cycle-sides/icon", [110, 150, 220]],
  ["actions/cycle-sides/key", [110, 150, 220]],
  ["actions/cycle-top-bottom/icon", [150, 130, 210]],
  ["actions/cycle-top-bottom/key", [150, 130, 210]],
];

for (const [rel, rgb] of targets) {
  const p1 = base + rel + ".png";
  const p2 = base + rel + "@2x.png";
  mkdirSync(dirname(p1), { recursive: true });
  writeFileSync(p1, makePng(72, rgb));
  writeFileSync(p2, makePng(144, rgb));
  console.log("wrote", rel + ".png", "and @2x");
}
