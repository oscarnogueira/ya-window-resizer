# Stream Deck Window Resizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A macOS Stream Deck plugin that positions/resizes the frontmost window from buttons, with a configurable screen-edge gap and inter-window gap (global, per-button override).

**Architecture:** Official `@elgato/streamdeck` TypeScript SDK runs a Node backend. Pure TypeScript geometry functions compute a target window frame from a position + screen + gaps (fully unit-tested via TDD). A native Objective-C++ N-API addon reads the frontmost window and its screen via the macOS Accessibility API and applies the frame.

**Tech Stack:** Node 20, TypeScript, `@elgato/streamdeck` SDK v2, Vitest (unit tests), `node-addon-api` + `node-gyp` (native addon, Objective-C++), esbuild (bundle), Elgato `streamdeck` CLI (pack).

**Spec:** `docs/superpowers/specs/2026-07-20-window-resizer-plugin-design.md`

---

## File Structure

```
stream-deck-window-resizer/
├── package.json                       # deps, scripts
├── tsconfig.json
├── vitest.config.ts
├── binding.gyp                        # node-gyp config for the native addon
├── src/
│   ├── geometry/
│   │   ├── types.ts                   # Rect, Screen, Gaps, Position, Unit
│   │   ├── pick-screen.ts             # choose screen containing the window
│   │   ├── compute-frame.ts           # THE core: position+screen+gaps -> Rect
│   │   └── coords.ts                  # Cocoa bottom-left <-> top-left conversion
│   ├── native/
│   │   └── window.ts                  # typed wrapper around window.node
│   ├── actions/
│   │   ├── position-action.ts         # "Position" SingletonAction
│   │   └── custom-action.ts           # "Custom" SingletonAction
│   ├── settings.ts                    # global/action settings types + resolve gaps
│   └── plugin.ts                      # entry: register actions, connect
├── native/
│   └── src/window.mm                  # Objective-C++ AXUIElement addon
├── tests/
│   └── geometry/
│       ├── pick-screen.test.ts
│       ├── compute-frame.test.ts
│       └── coords.test.ts
├── scripts/
│   └── smoke-native.mjs               # manual: move Finder to each position
└── com.oz.window-resizer.sdPlugin/    # packaged plugin dir (build output target)
    ├── manifest.json
    ├── bin/plugin.js                  # esbuild bundle (generated)
    ├── window.node                    # native build (copied)
    ├── imgs/                          # icons
    └── ui/                            # Property Inspector HTML
        ├── position.html
        └── custom.html
```

**Coordinate convention (used everywhere except where noted):** top-left origin, y grows downward, pixels. This matches the Accessibility position/size attributes. `NSScreen` values are bottom-left origin and get converted in `coords.ts` at the native boundary only.

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.nvmrc`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "stream-deck-window-resizer",
  "version": "0.1.0",
  "type": "module",
  "description": "Position and resize the frontmost macOS window from a Stream Deck, with configurable gaps.",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "build:native": "node-gyp rebuild && mkdir -p com.oz.window-resizer.sdPlugin && cp build/Release/window.node com.oz.window-resizer.sdPlugin/window.node",
    "build:js": "esbuild src/plugin.ts --bundle --platform=node --format=esm --outfile=com.oz.window-resizer.sdPlugin/bin/plugin.js --external:*.node",
    "build": "npm run build:native && npm run build:js",
    "smoke": "node scripts/smoke-native.mjs",
    "pack": "streamdeck pack com.oz.window-resizer.sdPlugin"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "esbuild": "^0.20.0",
    "typescript": "^5.4.0",
    "vitest": "^1.4.0",
    "node-gyp": "^10.0.0"
  },
  "dependencies": {
    "@elgato/streamdeck": "^1.0.0",
    "node-addon-api": "^8.0.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node"],
    "outDir": "dist"
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Create `.nvmrc`** with contents `20`.

- [ ] **Step 5: Install deps**

Run: `npm install`
Expected: installs without error. (If `@elgato/streamdeck` resolves to a different major, pin the version shown by `npm view @elgato/streamdeck version` and update the API calls in Task 8 accordingly — the API used here is the v1/v2 `SingletonAction` + decorator style.)

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts .nvmrc package-lock.json
git commit -m "chore: project scaffold (ts, vitest, native/build scripts)"
```

---

## Task 2: Geometry types

**Files:**
- Create: `src/geometry/types.ts`

- [ ] **Step 1: Create `src/geometry/types.ts`**

```ts
/** Top-left origin, pixels. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A screen's usable area (visibleFrame), already excluding menu bar/notch/Dock.
 *  Given in top-left origin (converted from NSScreen at the native boundary). */
export interface Screen {
  /** Full frame, used only for choosing which screen a window is on. */
  frame: Rect;
  /** Usable area; all placement math is relative to this. */
  visibleFrame: Rect;
}

export interface Gaps {
  /** Space between a window edge and the screen edge. */
  screenGap: number;
  /** Space between two adjacent windows. Applied as windowGap/2 per internal edge. */
  windowGap: number;
}

export type Position =
  | "left-half" | "right-half" | "top-half" | "bottom-half"
  | "left-third" | "center-third" | "right-third"
  | "left-two-thirds" | "right-two-thirds"
  | "top-left" | "top-right" | "bottom-left" | "bottom-right"
  | "maximize" | "center";

export type Unit = "percent" | "pixels";

export interface CustomFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  unit: Unit;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/geometry/types.ts
git commit -m "feat(geometry): add core types"
```

---

## Task 3: pickScreen (choose the window's screen)

**Files:**
- Create: `src/geometry/pick-screen.ts`
- Test: `tests/geometry/pick-screen.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { pickScreen } from "../../src/geometry/pick-screen";
import type { Screen, Rect } from "../../src/geometry/types";

const screen = (x: number, w: number): Screen => ({
  frame: { x, y: 0, w, h: 1080 },
  visibleFrame: { x, y: 25, w, h: 1055 },
});

describe("pickScreen", () => {
  const left = screen(0, 1920);
  const right = screen(1920, 1920);

  it("picks the screen with the largest overlap", () => {
    const win: Rect = { x: 2000, y: 100, w: 400, h: 300 }; // mostly on right
    expect(pickScreen(win, [left, right])).toBe(right);
  });

  it("picks by majority when a window straddles two screens", () => {
    const win: Rect = { x: 1800, y: 100, w: 400, h: 300 }; // 120 on left, 280 on right
    expect(pickScreen(win, [left, right])).toBe(right);
  });

  it("falls back to the first screen when there is no overlap", () => {
    const win: Rect = { x: -500, y: 100, w: 100, h: 100 };
    expect(pickScreen(win, [left, right])).toBe(left);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/geometry/pick-screen.test.ts`
Expected: FAIL — `pickScreen` not exported.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Rect, Screen } from "./types";

function overlapArea(a: Rect, b: Rect): number {
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return x * y;
}

/** Returns the screen with the greatest overlap with `win`; first screen if none. */
export function pickScreen(win: Rect, screens: Screen[]): Screen {
  let best = screens[0];
  let bestArea = -1;
  for (const s of screens) {
    const area = overlapArea(win, s.frame);
    if (area > bestArea) {
      bestArea = area;
      best = s;
    }
  }
  return best;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/geometry/pick-screen.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/geometry/pick-screen.ts tests/geometry/pick-screen.test.ts
git commit -m "feat(geometry): pickScreen selects window's screen by overlap"
```

---

## Task 4: computeFrame — halves (offset math foundation)

This task establishes the edge-inset model that all preset positions reuse: each of the four edges is either a **screen boundary** (inset by `screenGap`) or an **internal split** (inset by `windowGap/2`).

**Files:**
- Create: `src/geometry/compute-frame.ts`
- Test: `tests/geometry/compute-frame.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { computeFrame } from "../../src/geometry/compute-frame";
import type { Screen } from "../../src/geometry/types";

// Usable area 1920x1080 at origin, no menu-bar offset for simple math.
const screen: Screen = {
  frame: { x: 0, y: 0, w: 1920, h: 1080 },
  visibleFrame: { x: 0, y: 0, w: 1920, h: 1080 },
};
const gaps = { screenGap: 10, windowGap: 20 };

describe("computeFrame — halves", () => {
  it("left-half insets screen edges by screenGap and the split by windowGap/2", () => {
    expect(computeFrame("left-half", screen, gaps)).toEqual({
      x: 10, y: 10, w: 940, h: 1060,
    });
  });

  it("right-half mirrors left-half", () => {
    expect(computeFrame("right-half", screen, gaps)).toEqual({
      x: 970, y: 10, w: 940, h: 1060,
    });
  });

  it("two left+right halves leave exactly windowGap between them", () => {
    const l = computeFrame("left-half", screen, gaps);
    const r = computeFrame("right-half", screen, gaps);
    expect(r.x - (l.x + l.w)).toBe(gaps.windowGap); // 970 - 950 = 20
  });

  it("top-half and bottom-half split vertically", () => {
    expect(computeFrame("top-half", screen, gaps)).toEqual({
      x: 10, y: 10, w: 1900, h: 520,
    });
    expect(computeFrame("bottom-half", screen, gaps)).toEqual({
      x: 10, y: 550, w: 1900, h: 520,
    });
  });

  it("respects a non-zero visibleFrame origin (menu bar)", () => {
    const s: Screen = {
      frame: { x: 0, y: 0, w: 1920, h: 1080 },
      visibleFrame: { x: 0, y: 25, w: 1920, h: 1055 },
    };
    // left-half: x=0+10, y=25+10, w=960-10-10, h=1055-10-10
    expect(computeFrame("left-half", s, gaps)).toEqual({
      x: 10, y: 35, w: 940, h: 1035,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/geometry/compute-frame.test.ts`
Expected: FAIL — `computeFrame` not exported.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Gaps, Position, Rect, Screen } from "./types";

/** Which gap applies to an edge: the screen boundary, or an internal split. */
type EdgeKind = "screen" | "split";

interface Edges {
  left: EdgeKind;
  right: EdgeKind;
  top: EdgeKind;
  bottom: EdgeKind;
}

/** Fractional cell (0..1) of the usable area, before gaps are applied. */
interface Cell {
  fx: number; // fraction from left
  fy: number; // fraction from top
  fw: number; // fraction width
  fh: number; // fraction height
  edges: Edges;
}

const ALL_SCREEN: Edges = { left: "screen", right: "screen", top: "screen", bottom: "screen" };

// For a horizontal 2-column split, the shared vertical edge is a split.
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
    // Handled in Task 6 (needs current window size). Placeholder throws for now.
    throw new Error("center handled by computeCenter");
  }
  return fromCell(CELLS[position], area, gaps);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/geometry/compute-frame.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/geometry/compute-frame.ts tests/geometry/compute-frame.test.ts
git commit -m "feat(geometry): computeFrame for halves with edge-inset offset model"
```

---

## Task 5: computeFrame — thirds, two-thirds, corners, maximize

The implementation from Task 4 already covers these via the `CELLS` table. This task adds tests to lock in the behavior.

**Files:**
- Modify: `tests/geometry/compute-frame.test.ts`

- [ ] **Step 1: Add failing/covering tests**

```ts
describe("computeFrame — thirds, corners, maximize", () => {
  const screen: Screen = {
    frame: { x: 0, y: 0, w: 1800, h: 1080 },
    visibleFrame: { x: 0, y: 0, w: 1800, h: 1080 },
  };
  const gaps = { screenGap: 0, windowGap: 0 }; // zero gaps -> exact fractions

  it("thirds partition the width exactly with zero gaps", () => {
    expect(computeFrame("left-third", screen, gaps)).toEqual({ x: 0, y: 0, w: 600, h: 1080 });
    expect(computeFrame("center-third", screen, gaps)).toEqual({ x: 600, y: 0, w: 600, h: 1080 });
    expect(computeFrame("right-third", screen, gaps)).toEqual({ x: 1200, y: 0, w: 600, h: 1080 });
  });

  it("two-thirds spans two columns", () => {
    expect(computeFrame("left-two-thirds", screen, gaps)).toEqual({ x: 0, y: 0, w: 1200, h: 1080 });
    expect(computeFrame("right-two-thirds", screen, gaps)).toEqual({ x: 600, y: 0, w: 1200, h: 1080 });
  });

  it("corners are quarter cells", () => {
    expect(computeFrame("top-left", screen, gaps)).toEqual({ x: 0, y: 0, w: 900, h: 540 });
    expect(computeFrame("bottom-right", screen, gaps)).toEqual({ x: 900, y: 540, w: 900, h: 540 });
  });

  it("maximize fills the usable area minus screenGap on all sides", () => {
    expect(computeFrame("maximize", screen, { screenGap: 15, windowGap: 99 })).toEqual({
      x: 15, y: 15, w: 1770, h: 1050,
    });
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run tests/geometry/compute-frame.test.ts`
Expected: PASS (Task 4 implementation already satisfies these).

- [ ] **Step 3: Commit**

```bash
git add tests/geometry/compute-frame.test.ts
git commit -m "test(geometry): cover thirds, two-thirds, corners, maximize"
```

---

## Task 6: computeCenter and computeCustom

**Files:**
- Modify: `src/geometry/compute-frame.ts`
- Test: `tests/geometry/compute-frame.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { computeCenter, computeCustom } from "../../src/geometry/compute-frame";

describe("computeCenter", () => {
  const screen: Screen = {
    frame: { x: 0, y: 0, w: 1920, h: 1080 },
    visibleFrame: { x: 0, y: 0, w: 1920, h: 1080 },
  };
  const gaps = { screenGap: 10, windowGap: 0 };

  it("centers the window keeping its size", () => {
    const win = { x: 0, y: 0, w: 800, h: 600 };
    expect(computeCenter(win, screen, gaps)).toEqual({ x: 560, y: 240, w: 800, h: 600 });
  });

  it("clamps an oversized window to usable area minus screenGap", () => {
    const win = { x: 0, y: 0, w: 5000, h: 5000 };
    expect(computeCenter(win, screen, gaps)).toEqual({ x: 10, y: 10, w: 1900, h: 1060 });
  });
});

describe("computeCustom", () => {
  const screen: Screen = {
    frame: { x: 0, y: 0, w: 1000, h: 1000 },
    visibleFrame: { x: 0, y: 100, w: 1000, h: 900 }, // menu bar offset
  };

  it("percent is measured from the usable-area origin", () => {
    const r = computeCustom({ x: 10, y: 0, w: 50, h: 50, unit: "percent" }, screen);
    // x = 0 + 10% of 1000 = 100; y = 100 + 0 = 100; w = 500; h = 450
    expect(r).toEqual({ x: 100, y: 100, w: 500, h: 450 });
  });

  it("pixels are literal offsets into the usable area, clamped", () => {
    const r = computeCustom({ x: 950, y: 0, w: 400, h: 100, unit: "pixels" }, screen);
    // x clamped so x+w <= 1000 -> x=600,w=400; y=100
    expect(r).toEqual({ x: 600, y: 100, w: 400, h: 100 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/geometry/compute-frame.test.ts`
Expected: FAIL — `computeCenter` / `computeCustom` not exported.

- [ ] **Step 3: Implement**

Add to `src/geometry/compute-frame.ts`:

```ts
import type { CustomFrame } from "./types";

function clampRect(r: Rect, area: Rect): Rect {
  const w = Math.min(r.w, area.w);
  const h = Math.min(r.h, area.h);
  const x = Math.min(Math.max(r.x, area.x), area.x + area.w - w);
  const y = Math.min(Math.max(r.y, area.y), area.y + area.h - h);
  return { x, y, w, h };
}

export function computeCenter(win: Rect, screen: Screen, gaps: Gaps): Rect {
  const area = screen.visibleFrame;
  // Available area shrinks by screenGap on each side (clamp only, no resize intent).
  const bounded: Rect = {
    x: area.x + gaps.screenGap,
    y: area.y + gaps.screenGap,
    w: area.w - 2 * gaps.screenGap,
    h: area.h - 2 * gaps.screenGap,
  };
  const w = Math.min(win.w, bounded.w);
  const h = Math.min(win.h, bounded.h);
  return {
    x: Math.round(bounded.x + (bounded.w - w) / 2),
    y: Math.round(bounded.y + (bounded.h - h) / 2),
    w,
    h,
  };
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/geometry/compute-frame.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/geometry/compute-frame.ts tests/geometry/compute-frame.test.ts
git commit -m "feat(geometry): computeCenter and computeCustom with clamping"
```

---

## Task 7: Coordinate conversion (Cocoa <-> top-left)

`NSScreen` reports geometry in a bottom-left origin where +y is up and the primary screen's origin is (0,0). The Accessibility position/size attributes use a top-left origin where +y is down. `getScreens()` in the addon (Task 10) must return top-left rects. This task provides and tests the pure conversion so the native code can call it too (or mirror it).

**Files:**
- Create: `src/geometry/coords.ts`
- Test: `tests/geometry/coords.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { cocoaRectToTopLeft } from "../../src/geometry/coords";

describe("cocoaRectToTopLeft", () => {
  // Global desktop height = tallest stack of screens; here primary is 1080 tall.
  const globalHeight = 1080;

  it("primary screen (bottom-left 0,0) maps to top-left 0,0", () => {
    // Cocoa rect: origin (0,0), size 1920x1080 -> top-left y = 1080 - (0 + 1080) = 0
    expect(cocoaRectToTopLeft({ x: 0, y: 0, w: 1920, h: 1080 }, globalHeight))
      .toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
  });

  it("a visibleFrame with a 25px Dock at bottom shifts top-left y", () => {
    // Cocoa visibleFrame: origin (0,25), size 1920x1055 -> top-left y = 1080 - (25 + 1055) = 0
    expect(cocoaRectToTopLeft({ x: 0, y: 25, w: 1920, h: 1055 }, globalHeight))
      .toEqual({ x: 0, y: 0, w: 1920, h: 1055 });
  });

  it("a secondary screen above the primary gets negative top-left y", () => {
    // Cocoa origin (0, 1080), size 1920x1080. globalHeight now 2160.
    expect(cocoaRectToTopLeft({ x: 0, y: 1080, w: 1920, h: 1080 }, 2160))
      .toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/geometry/coords.test.ts`
Expected: FAIL — `cocoaRectToTopLeft` not exported.

- [ ] **Step 3: Implement**

```ts
import type { Rect } from "./types";

/**
 * Convert a Cocoa (bottom-left origin, +y up) rect to a top-left origin
 * (+y down) rect. `globalHeight` is the total height of the desktop coordinate
 * space (max over screens of origin.y + height in Cocoa space).
 */
export function cocoaRectToTopLeft(rect: Rect, globalHeight: number): Rect {
  return {
    x: rect.x,
    y: globalHeight - (rect.y + rect.h),
    w: rect.w,
    h: rect.h,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/geometry/coords.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: all geometry tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/geometry/coords.ts tests/geometry/coords.test.ts
git commit -m "feat(geometry): Cocoa to top-left coordinate conversion"
```

---

## Task 8: Native addon — binding.gyp + skeleton that builds

Build a native addon that compiles and loads before wiring the real Accessibility calls. This isolates toolchain problems from logic problems.

**Files:**
- Create: `binding.gyp`, `native/src/window.mm`

- [ ] **Step 1: Create `binding.gyp`**

```python
{
  "targets": [
    {
      "target_name": "window",
      "sources": [ "native/src/window.mm" ],
      "include_dirs": [ "<!@(node -p \"require('node-addon-api').include\")" ],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "xcode_settings": {
        "OTHER_CFLAGS": [ "-ObjC++" ],
        "MACOSX_DEPLOYMENT_TARGET": "11.0",
        "ARCHS": [ "x86_64", "arm64" ],
        "ONLY_ACTIVE_ARCH": "NO"
      },
      "link_settings": {
        "libraries": [
          "-framework AppKit",
          "-framework ApplicationServices"
        ]
      }
    }
  ]
}
```

- [ ] **Step 2: Create a minimal `native/src/window.mm`**

```objcpp
#include <napi.h>

// Placeholder: proves the toolchain builds and the module loads.
Napi::Boolean IsTrusted(const Napi::CallbackInfo& info) {
  return Napi::Boolean::New(info.Env(), false);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("isTrusted", Napi::Function::New(env, IsTrusted));
  return exports;
}

NODE_API_MODULE(window, Init)
```

- [ ] **Step 3: Build the native module**

Run: `npm run build:native`
Expected: `build/Release/window.node` produced and copied into `com.oz.window-resizer.sdPlugin/window.node`. If node-gyp fails, ensure Xcode command-line tools are installed (`xcode-select --install`).

- [ ] **Step 4: Verify it loads**

Run:
```bash
node -e "const w = require('./com.oz.window-resizer.sdPlugin/window.node'); console.log('isTrusted:', w.isTrusted());"
```
Expected: prints `isTrusted: false` (placeholder), no load error.

- [ ] **Step 5: Commit**

```bash
git add binding.gyp native/src/window.mm
git commit -m "feat(native): buildable N-API addon skeleton (isTrusted stub)"
```

---

## Task 9: Native addon — Accessibility permission + frontmost window read

**Files:**
- Modify: `native/src/window.mm`

- [ ] **Step 1: Implement `isTrusted` and `getFrontmostWindow`**

Replace `native/src/window.mm` with:

```objcpp
#include <napi.h>
#import <AppKit/AppKit.h>
#import <ApplicationServices/ApplicationServices.h>

static bool AXTrusted() {
  return AXIsProcessTrusted();
}

Napi::Boolean IsTrusted(const Napi::CallbackInfo& info) {
  return Napi::Boolean::New(info.Env(), AXTrusted());
}

// Returns { x, y, w, h, pid } for the focused window of the frontmost app,
// or null if unavailable. Coordinates are top-left origin (AX native).
Napi::Value GetFrontmostWindow(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!AXTrusted()) return env.Null();

  NSRunningApplication* app = [[NSWorkspace sharedWorkspace] frontmostApplication];
  if (app == nil) return env.Null();
  pid_t pid = app.processIdentifier;

  AXUIElementRef appEl = AXUIElementCreateApplication(pid);
  if (appEl == NULL) return env.Null();

  AXUIElementRef window = NULL;
  AXError err = AXUIElementCopyAttributeValue(
      appEl, kAXFocusedWindowAttribute, (CFTypeRef*)&window);
  if (err != kAXErrorSuccess || window == NULL) {
    CFRelease(appEl);
    return env.Null();
  }

  CFTypeRef posVal = NULL;
  CFTypeRef sizeVal = NULL;
  AXUIElementCopyAttributeValue(window, kAXPositionAttribute, &posVal);
  AXUIElementCopyAttributeValue(window, kAXSizeAttribute, &sizeVal);

  CGPoint pos = CGPointZero;
  CGSize size = CGSizeZero;
  if (posVal) { AXValueGetValue((AXValueRef)posVal, kAXValueCGPointType, &pos); CFRelease(posVal); }
  if (sizeVal) { AXValueGetValue((AXValueRef)sizeVal, kAXValueCGSizeType, &size); CFRelease(sizeVal); }

  CFRelease(window);
  CFRelease(appEl);

  Napi::Object out = Napi::Object::New(env);
  out.Set("x", Napi::Number::New(env, pos.x));
  out.Set("y", Napi::Number::New(env, pos.y));
  out.Set("w", Napi::Number::New(env, size.width));
  out.Set("h", Napi::Number::New(env, size.height));
  out.Set("pid", Napi::Number::New(env, pid));
  return out;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("isTrusted", Napi::Function::New(env, IsTrusted));
  exports.Set("getFrontmostWindow", Napi::Function::New(env, GetFrontmostWindow));
  return exports;
}

NODE_API_MODULE(window, Init)
```

- [ ] **Step 2: Rebuild**

Run: `npm run build:native`
Expected: builds clean.

- [ ] **Step 3: Manually verify (requires granting Accessibility to your terminal once)**

Run:
```bash
node -e "const w=require('./com.oz.window-resizer.sdPlugin/window.node'); console.log(w.isTrusted(), w.getFrontmostWindow());"
```
Expected: if Accessibility granted to the terminal, prints `true { x, y, w, h, pid }` for the frontmost window; otherwise `false null`. Grant via System Settings → Privacy & Security → Accessibility.

- [ ] **Step 4: Commit**

```bash
git add native/src/window.mm
git commit -m "feat(native): read frontmost focused window via Accessibility"
```

---

## Task 10: Native addon — getScreens + setWindowFrame

**Files:**
- Modify: `native/src/window.mm`

- [ ] **Step 1: Add `getScreens` and `setWindowFrame`**

Add these functions and register them in `Init` (keep existing ones):

```objcpp
// Returns [{ frame:{x,y,w,h}, visibleFrame:{x,y,w,h} }] in TOP-LEFT origin.
Napi::Value GetScreens(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  NSArray<NSScreen*>* screens = [NSScreen screens];

  // Global height = max over screens of (origin.y + height) in Cocoa space.
  CGFloat globalHeight = 0;
  for (NSScreen* s in screens) {
    CGFloat top = s.frame.origin.y + s.frame.size.height;
    if (top > globalHeight) globalHeight = top;
  }

  auto toTopLeft = [&](NSRect r) {
    Napi::Object o = Napi::Object::New(env);
    o.Set("x", Napi::Number::New(env, r.origin.x));
    o.Set("y", Napi::Number::New(env, globalHeight - (r.origin.y + r.size.height)));
    o.Set("w", Napi::Number::New(env, r.size.width));
    o.Set("h", Napi::Number::New(env, r.size.height));
    return o;
  };

  Napi::Array arr = Napi::Array::New(env, screens.count);
  for (NSUInteger i = 0; i < screens.count; i++) {
    NSScreen* s = screens[i];
    Napi::Object o = Napi::Object::New(env);
    o.Set("frame", toTopLeft(s.frame));
    o.Set("visibleFrame", toTopLeft(s.visibleFrame));
    arr.Set(i, o);
  }
  return arr;
}

// setWindowFrame(pid, x, y, w, h) -> bool. Applies to the focused window of pid.
Napi::Boolean SetWindowFrame(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!AXTrusted() || info.Length() < 5) return Napi::Boolean::New(env, false);

  pid_t pid = (pid_t)info[0].As<Napi::Number>().Int32Value();
  CGPoint pos = CGPointMake(info[1].As<Napi::Number>().DoubleValue(),
                            info[2].As<Napi::Number>().DoubleValue());
  CGSize size = CGSizeMake(info[3].As<Napi::Number>().DoubleValue(),
                           info[4].As<Napi::Number>().DoubleValue());

  AXUIElementRef appEl = AXUIElementCreateApplication(pid);
  if (appEl == NULL) return Napi::Boolean::New(env, false);

  AXUIElementRef window = NULL;
  if (AXUIElementCopyAttributeValue(appEl, kAXFocusedWindowAttribute,
                                    (CFTypeRef*)&window) != kAXErrorSuccess || window == NULL) {
    CFRelease(appEl);
    return Napi::Boolean::New(env, false);
  }

  // Set size first, then position, then size again: some apps clamp during move.
  AXValueRef sizeVal = AXValueCreate(kAXValueCGSizeType, &size);
  AXValueRef posVal = AXValueCreate(kAXValueCGPointType, &pos);
  AXUIElementSetAttributeValue(window, kAXSizeAttribute, sizeVal);
  AXUIElementSetAttributeValue(window, kAXPositionAttribute, posVal);
  AXUIElementSetAttributeValue(window, kAXSizeAttribute, sizeVal);
  CFRelease(sizeVal);
  CFRelease(posVal);
  CFRelease(window);
  CFRelease(appEl);
  return Napi::Boolean::New(env, true);
}
```

Update `Init`:

```objcpp
exports.Set("getScreens", Napi::Function::New(env, GetScreens));
exports.Set("setWindowFrame", Napi::Function::New(env, SetWindowFrame));
```

- [ ] **Step 2: Rebuild**

Run: `npm run build:native`
Expected: builds clean.

- [ ] **Step 3: Create `scripts/smoke-native.mjs`**

```js
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
```

- [ ] **Step 4: Run the smoke test**

Run: `npm run smoke`
Expected (Accessibility granted): prints screens, moves the frontmost window to roughly the left half, prints the new frame. Verify visually.

- [ ] **Step 5: Commit**

```bash
git add native/src/window.mm scripts/smoke-native.mjs
git commit -m "feat(native): getScreens (top-left) and setWindowFrame + smoke script"
```

---

## Task 11: Typed native wrapper

**Files:**
- Create: `src/native/window.ts`

- [ ] **Step 1: Create the wrapper**

```ts
import { createRequire } from "node:module";
import type { Rect, Screen } from "../geometry/types";

const require = createRequire(import.meta.url);
// Bundled plugin.js sits in bin/; window.node sits one level up in the plugin root.
const native = require("../window.node") as NativeWindow;

interface FrontWindow extends Rect {
  pid: number;
}

interface NativeWindow {
  isTrusted(): boolean;
  getFrontmostWindow(): FrontWindow | null;
  getScreens(): Screen[];
  setWindowFrame(pid: number, x: number, y: number, w: number, h: number): boolean;
}

export const windowApi: NativeWindow = native;
export type { FrontWindow };
```

Note: the `require("../window.node")` path is relative to the **bundled** `bin/plugin.js`, not this source file. esbuild keeps `./window.node` external (see Task 1 build script); confirm the path resolves after Task 14's build. If it does not, adjust to an absolute path resolved from `import.meta.url`.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/native/window.ts
git commit -m "feat(native): typed wrapper around window.node"
```

---

## Task 12: Settings model + gap resolution

**Files:**
- Create: `src/settings.ts`
- Test: `tests/settings.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { resolveGaps } from "../src/settings";

describe("resolveGaps", () => {
  const global = { screenGap: 8, windowGap: 16 };

  it("uses global gaps when the action does not override", () => {
    expect(resolveGaps(global, { useCustomOffset: false })).toEqual({ screenGap: 8, windowGap: 16 });
  });

  it("uses the action's gaps when it overrides", () => {
    expect(resolveGaps(global, { useCustomOffset: true, screenGap: 0, windowGap: 40 }))
      .toEqual({ screenGap: 0, windowGap: 40 });
  });

  it("defaults missing global gaps to zero", () => {
    expect(resolveGaps({}, { useCustomOffset: false })).toEqual({ screenGap: 0, windowGap: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/settings.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/settings.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/settings.ts tests/settings.test.ts
git commit -m "feat(settings): settings types and global/override gap resolution"
```

---

## Task 13: Actions + plugin entry

**Files:**
- Create: `src/actions/position-action.ts`, `src/actions/custom-action.ts`, `src/plugin.ts`

- [ ] **Step 1: Create `src/actions/position-action.ts`**

```ts
import streamDeck, { action, SingletonAction, type KeyDownEvent } from "@elgato/streamdeck";
import { windowApi } from "../native/window";
import { pickScreen } from "../geometry/pick-screen";
import { computeFrame, computeCenter } from "../geometry/compute-frame";
import { resolveGaps, type PositionSettings, type GlobalSettings } from "../settings";

@action({ UUID: "com.oz.window-resizer.position" })
export class PositionAction extends SingletonAction<PositionSettings> {
  override async onKeyDown(ev: KeyDownEvent<PositionSettings>): Promise<void> {
    if (!windowApi.isTrusted()) {
      await ev.action.showAlert();
      streamDeck.logger.warn("Accessibility not granted; window operation skipped.");
      return;
    }
    const win = windowApi.getFrontmostWindow();
    if (!win) {
      await ev.action.showAlert();
      return;
    }
    const screens = windowApi.getScreens();
    const screen = pickScreen(win, screens);
    const global = (await streamDeck.settings.getGlobalSettings()) as GlobalSettings;
    const gaps = resolveGaps(global, ev.payload.settings);
    const position = ev.payload.settings.position ?? "maximize";

    const target =
      position === "center"
        ? computeCenter(win, screen, gaps)
        : computeFrame(position, screen, gaps);

    const ok = windowApi.setWindowFrame(win.pid, target.x, target.y, target.w, target.h);
    if (!ok) await ev.action.showAlert();
  }
}
```

- [ ] **Step 2: Create `src/actions/custom-action.ts`**

```ts
import streamDeck, { action, SingletonAction, type KeyDownEvent } from "@elgato/streamdeck";
import { windowApi } from "../native/window";
import { pickScreen } from "../geometry/pick-screen";
import { computeCustom } from "../geometry/compute-frame";
import type { CustomSettings } from "../settings";

@action({ UUID: "com.oz.window-resizer.custom" })
export class CustomAction extends SingletonAction<CustomSettings> {
  override async onKeyDown(ev: KeyDownEvent<CustomSettings>): Promise<void> {
    if (!windowApi.isTrusted()) {
      await ev.action.showAlert();
      return;
    }
    const win = windowApi.getFrontmostWindow();
    if (!win) {
      await ev.action.showAlert();
      return;
    }
    const screen = pickScreen(win, windowApi.getScreens());
    const s = ev.payload.settings;
    const target = computeCustom(
      { x: s.x ?? 0, y: s.y ?? 0, w: s.w ?? 100, h: s.h ?? 100, unit: s.unit ?? "percent" },
      screen,
    );
    const ok = windowApi.setWindowFrame(win.pid, target.x, target.y, target.w, target.h);
    if (!ok) await ev.action.showAlert();
  }
}
```

- [ ] **Step 3: Create `src/plugin.ts`**

```ts
import streamDeck, { LogLevel } from "@elgato/streamdeck";
import { PositionAction } from "./actions/position-action";
import { CustomAction } from "./actions/custom-action";

streamDeck.logger.setLevel(LogLevel.INFO);

streamDeck.actions.registerAction(new PositionAction());
streamDeck.actions.registerAction(new CustomAction());

streamDeck.connect();
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (If the SDK's exported names differ from `action`/`SingletonAction`/`KeyDownEvent`, correct to the names in `node_modules/@elgato/streamdeck` — check its `dist/index.d.ts`.)

- [ ] **Step 5: Commit**

```bash
git add src/actions/position-action.ts src/actions/custom-action.ts src/plugin.ts
git commit -m "feat(plugin): Position and Custom actions wired to native + geometry"
```

---

## Task 14: Manifest + Property Inspectors + bundle

**Files:**
- Create: `com.oz.window-resizer.sdPlugin/manifest.json`
- Create: `com.oz.window-resizer.sdPlugin/ui/position.html`, `.../ui/custom.html`
- Create: placeholder icons under `com.oz.window-resizer.sdPlugin/imgs/`

- [ ] **Step 1: Create `manifest.json`**

```json
{
  "Name": "Window Resizer",
  "Version": "0.1.0.0",
  "Author": "oz",
  "Actions": [
    {
      "Name": "Position",
      "UUID": "com.oz.window-resizer.position",
      "Icon": "imgs/actions/position/icon",
      "Tooltip": "Move/resize the frontmost window to a preset position.",
      "PropertyInspectorPath": "ui/position.html",
      "Controllers": ["Keypad"],
      "States": [{ "Image": "imgs/actions/position/key" }]
    },
    {
      "Name": "Custom",
      "UUID": "com.oz.window-resizer.custom",
      "Icon": "imgs/actions/custom/icon",
      "Tooltip": "Move/resize the frontmost window to custom coordinates.",
      "PropertyInspectorPath": "ui/custom.html",
      "Controllers": ["Keypad"],
      "States": [{ "Image": "imgs/actions/custom/key" }]
    }
  ],
  "Category": "Window Resizer",
  "CategoryIcon": "imgs/categoryIcon",
  "Icon": "imgs/pluginIcon",
  "SDKVersion": 2,
  "Software": { "MinimumVersion": "6.5" },
  "OS": [{ "Platform": "mac", "MinimumVersion": "11" }],
  "Nodejs": { "Version": "20", "Debug": "enabled" },
  "CodePath": "bin/plugin.js",
  "UUID": "com.oz.window-resizer"
}
```

- [ ] **Step 2: Create `ui/position.html`**

Uses Elgato `sdpi-components` (loaded from the SDK-provided CDN path the CLI wires up; if offline, vendor the file). Global gaps are edited here too and saved to global settings.

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <script src="https://sdpi-components.dev/releases/v4/sdpi-components.js"></script>
  </head>
  <body>
    <sdpi-item label="Position">
      <sdpi-select setting="position" default="maximize">
        <option value="left-half">Left half</option>
        <option value="right-half">Right half</option>
        <option value="top-half">Top half</option>
        <option value="bottom-half">Bottom half</option>
        <option value="left-third">Left third</option>
        <option value="center-third">Center third</option>
        <option value="right-third">Right third</option>
        <option value="left-two-thirds">Left two-thirds</option>
        <option value="right-two-thirds">Right two-thirds</option>
        <option value="top-left">Top-left</option>
        <option value="top-right">Top-right</option>
        <option value="bottom-left">Bottom-left</option>
        <option value="bottom-right">Bottom-right</option>
        <option value="maximize">Maximize</option>
        <option value="center">Center</option>
      </sdpi-select>
    </sdpi-item>

    <sdpi-item label="Screen gap (px)">
      <sdpi-range global setting="screenGap" min="0" max="100" default="0" step="1" showlabels></sdpi-range>
    </sdpi-item>
    <sdpi-item label="Window gap (px)">
      <sdpi-range global setting="windowGap" min="0" max="100" default="0" step="1" showlabels></sdpi-range>
    </sdpi-item>

    <sdpi-item label="Override offset">
      <sdpi-checkbox setting="useCustomOffset"></sdpi-checkbox>
    </sdpi-item>
    <sdpi-item label="This button screen gap">
      <sdpi-range setting="screenGap" min="0" max="100" default="0" step="1" showlabels></sdpi-range>
    </sdpi-item>
    <sdpi-item label="This button window gap">
      <sdpi-range setting="windowGap" min="0" max="100" default="0" step="1" showlabels></sdpi-range>
    </sdpi-item>
  </body>
</html>
```

Note: the two global `sdpi-range` controls carry the `global` attribute so they write to global settings; the override pair writes to action settings. Confirm `sdpi-components` supports the `global` attribute in the version used; if not, wire global settings via a small inline script using the PI SDK.

- [ ] **Step 3: Create `ui/custom.html`**

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <script src="https://sdpi-components.dev/releases/v4/sdpi-components.js"></script>
  </head>
  <body>
    <sdpi-item label="Unit">
      <sdpi-select setting="unit" default="percent">
        <option value="percent">Percent</option>
        <option value="pixels">Pixels</option>
      </sdpi-select>
    </sdpi-item>
    <sdpi-item label="X"><sdpi-textfield setting="x" default="0"></sdpi-textfield></sdpi-item>
    <sdpi-item label="Y"><sdpi-textfield setting="y" default="0"></sdpi-textfield></sdpi-item>
    <sdpi-item label="Width"><sdpi-textfield setting="w" default="100"></sdpi-textfield></sdpi-item>
    <sdpi-item label="Height"><sdpi-textfield setting="h" default="100"></sdpi-textfield></sdpi-item>
  </body>
</html>
```

- [ ] **Step 4: Add placeholder icons**

Create simple 72×72 and 144×144 PNGs (or copy from a template) at the paths referenced in the manifest: `imgs/pluginIcon.png`, `imgs/categoryIcon.png`, `imgs/actions/position/icon.png` (+`@2x`), `imgs/actions/position/key.png` (+`@2x`), and the `custom` equivalents. Placeholder art is fine for v1.

- [ ] **Step 5: Build the JS bundle**

Run: `npm run build:js`
Expected: `com.oz.window-resizer.sdPlugin/bin/plugin.js` produced. Confirm `window.node` stays external (not inlined).

- [ ] **Step 6: Verify the require path resolves**

Run:
```bash
node --input-type=module -e "import('./com.oz.window-resizer.sdPlugin/bin/plugin.js').then(()=>console.log('loaded')).catch(e=>{console.error(e);process.exit(1)})"
```
Expected: either connects (times out waiting for Stream Deck — acceptable) or loads without a module-resolution error for `window.node`. If it errors on `../window.node`, fix the path in `src/native/window.ts` (Task 11) and rebuild.

- [ ] **Step 7: Commit**

```bash
git add com.oz.window-resizer.sdPlugin/manifest.json com.oz.window-resizer.sdPlugin/ui com.oz.window-resizer.sdPlugin/imgs
git commit -m "feat(plugin): manifest, Property Inspectors, placeholder icons, bundle"
```

---

## Task 15: Install, end-to-end verification, package

**Files:** none (verification + packaging)

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: native + JS build succeed; `com.oz.window-resizer.sdPlugin/` contains `manifest.json`, `bin/plugin.js`, `window.node`, `ui/`, `imgs/`.

- [ ] **Step 2: Link the plugin into Stream Deck for testing**

Run:
```bash
ln -sf "$(pwd)/com.oz.window-resizer.sdPlugin" \
  "$HOME/Library/Application Support/com.elgato.StreamDeck/Plugins/com.oz.window-resizer.sdPlugin"
```
Then restart the Stream Deck app. If the plugin does not appear after restart,
some Stream Deck versions reject a symlink — fall back to `streamdeck link
com.oz.window-resizer.sdPlugin` or copy the directory in place of the symlink.

- [ ] **Step 3: Manual end-to-end test (use @superpowers:verification-before-completion)**

Grant Accessibility to the Stream Deck app (System Settings → Privacy & Security → Accessibility). Add a Position button set to "Left half", focus a window (e.g. Safari), press the button. Verify:
- Window snaps to the left half with the configured screen gap on the outer edges.
- Set Screen gap = 20, Window gap = 40; press again; verify visible gap grows.
- Place a second button "Right half"; press; verify the two windows leave a 40px gap between them.
- Test a Custom button (50% x 100%) and Center.
- Test on a second monitor: focus a window there, press; verify it stays on that monitor.

Record the outcome. If a step fails, debug with @superpowers:systematic-debugging before proceeding.

- [ ] **Step 4: Package**

Run: `npm run pack`
Expected: produces `com.oz.window-resizer.streamDeckPlugin`. (Requires the Elgato `streamdeck` CLI: `npm i -g @elgato/cli` if absent.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: end-to-end verified build; packaging via streamdeck CLI"
```

---

## Notes for the implementer

- **TDD discipline:** For every geometry/settings task, watch the test fail before implementing (@superpowers:test-driven-development). The native and SDK-wiring tasks are verified by smoke script and manual E2E instead of unit tests, because they cross the OS/SDK boundary.
- **SDK API drift:** `@elgato/streamdeck` and `sdpi-components` versions may expose slightly different names/attributes than shown. When a symbol doesn't resolve, check the installed package's `.d.ts` / docs and adjust — the geometry core (the feature) is independent of these and stays stable.
- **The feature lives in `src/geometry/`.** If anything about gaps looks wrong in practice, the fix is almost always in `compute-frame.ts` and its tests — change the test first.
- **Permissions:** nothing works until the Stream Deck app has Accessibility. Make the "not trusted" toast unmistakable.
```
