import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const w = require("../com.oz.window-resizer.sdPlugin/window.node");

console.log("trusted:", w.isTrusted());
console.log("screens:", JSON.stringify(w.getScreens(), null, 2));
const win = w.getFrontmostWindow();
console.log("frontmost:", win);
if (win) {
  const s = w.getScreens()[0].visibleFrame;
  const ok = w.setWindowFrame(win.pid, s.x + 20, s.y + 20, s.w / 2 - 30, s.h - 40);
  console.log("moved to left-half-ish:", ok, w.getFrontmostWindow());
}
