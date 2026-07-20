# Stream Deck Window Resizer — Design

**Date:** 2026-07-20
**Status:** Approved (design phase)

## Summary

A Stream Deck plugin for macOS that positions and resizes the frontmost window
via buttons. The distinguishing feature is a **configurable border offset**:
a gap between the window and the screen edge (`screenGap`) and a gap between
adjacent windows (`windowGap`). Built from scratch on the official free
`@elgato/streamdeck` SDK, with a native Objective-C++ N-API addon driving the
macOS Accessibility API. It does not reuse or modify Elgato's closed-source
Window Mover plugin.

## Goals

- Buttons for common window positions and free-form custom placement.
- Configurable screen-edge gap and inter-window gap, global with per-button override.
- Full source control (no closed-source native engine, no encrypted manifest).

## Non-goals (v1)

- Cycling actions (one button alternating positions per press).
- Multi-window layouts (moving several windows in one press).
- Windows/Linux support.
- Distribution/notarization beyond the author's own machine (kept optional).

## Architecture

```
stream-deck-window-resizer.sdPlugin/
├── manifest.json              # actions, uuid, metadata
├── bin/plugin.js              # Node backend (TypeScript, bundled)
├── ui/                        # Property Inspector, one HTML per action
└── native/
    ├── window.node            # N-API addon, universal binary (x86_64 + arm64)
    └── src/window.mm          # Objective-C++ over AXUIElement
```

**Frontend / SDK.** Official `@elgato/streamdeck` (TypeScript). Each action type
is registered with the SDK; the plugin runs as a Node process the Stream Deck
app launches.

**Backend (`bin/plugin.js`).** On a key press it: (1) reads the action's
settings (position, unit, offset override) plus global settings; (2) queries the
native addon for the active window and its screen; (3) computes the target frame
with `computeFrame(...)`; (4) calls the addon to apply the frame.

**Native (`native/src/window.mm`).** Objective-C++ addon exposing:
- `isTrusted(): boolean` — `AXIsProcessTrusted()`.
- `getFrontmostWindow(): { x, y, w, h, pid }` — frontmost app's focused window
  via `AXUIElementCopyAttributeValue` (`kAXFocusedWindowAttribute`,
  `kAXPositionAttribute`, `kAXSizeAttribute`).
- `setWindowFrame(x, y, w, h): boolean` — sets `kAXPositionAttribute` and
  `kAXSizeAttribute` on that window.
- `getScreens(): Array<{ visibleFrame, frame }>` — from `NSScreen.screens`.

## Actions (v1)

Two action types in the manifest (not one per position — keeps the action list
small):

1. **Position.** A dropdown in the Property Inspector selects one of:
   - Halves: left, right, top, bottom
   - Thirds: left, center, right
   - Two-thirds: left, right
   - Corners (quarters): top-left, top-right, bottom-left, bottom-right
   - Maximize (with offset applied)
   - Center (canonical: does not resize; re-centers the window in the usable
     area and applies `screenGap` only as a clamp — see Offset section)

2. **Custom.** Fields for x / y / width / height. A unit toggle selects
   **percent** (of the screen's usable area) or **pixels**; default is percent.
   In percent mode, x/y are measured from the usable-area origin (top-left,
   post-`visibleFrame`). Custom coordinates are applied **literally** against the
   usable area: gap/offset logic does **not** apply to Custom (the whole point of
   Custom is precise placement), so the Custom action has no "use custom offset"
   checkbox. Values are still clamped to the usable area.

**Target window:** the frontmost window of the active application.

## Offset (the core feature)

Two values:

- `screenGap` — space between a window edge and the screen edge.
- `windowGap` — space between two adjacent windows.

**Configuration.** Stored in global settings (`setGlobalSettings`). Each button
has a "use custom offset" checkbox in its Property Inspector that overrides the
global values for that button.

**Semantics.** For each of the four edges of the target frame:
- If the edge lies on the screen boundary, inset it by `screenGap`.
- If the edge is an internal split (e.g. the right edge of a left-half, the
  boundaries between thirds), inset it by `windowGap / 2`. Two windows meeting at
  that split then sum to a full `windowGap` between them.

Center action applies `screenGap` only as a clamp (window stays within the
usable area minus `screenGap`); it does not resize.

**Worked example.** Left-half, screen usable area 1920×1080, `screenGap=10`,
`windowGap=20`:
- left edge = screen boundary → `x = 10`
- top edge = screen boundary → `y = 10`
- bottom edge = screen boundary → height reaches `1080 − 10`
- right edge = internal split at x=960 → inset `windowGap/2 = 10`
- Result: `x=10, y=10, w=940, h=1060`.

## Multi-monitor / usable area

- The plugin operates on the **screen that contains the active window** (chosen
  by largest overlap of the window rect with each screen's frame).
- Geometry is computed against that screen's `visibleFrame`, which already
  excludes the menu bar, the notch region, and the Dock. The offset is applied
  **on top of** `visibleFrame`.
- Coordinates are converted from Cocoa's bottom-left origin (`NSScreen`) to the
  top-left origin the Accessibility position/size attributes use.

## Permissions

The user grants **Accessibility** to the Stream Deck app
(System Settings → Privacy & Security → Accessibility). On key press, the plugin
checks `isTrusted()`; if false it shows a toast (via `showAlert` / a PI message)
explaining how to grant it, and performs no window operation.

## Error handling

- No focused window / addon returns null → toast "No active window", no-op.
- Accessibility not granted → toast with instructions, no-op.
- Target app rejects the resize (some apps clamp min sizes) → apply best effort;
  no crash. The addon returns the boolean result; the backend logs mismatches.
- Custom values out of range (negative, >100% in percent mode) → clamped to the
  usable area before applying.

## Testing

- **Geometry logic (TDD, pure TS).** `computeFrame(position, screen, gaps, unit)`
  and screen-selection are pure functions with no OS calls. This is where the
  feature lives, so it gets full unit coverage: every position, both units,
  offset math (including the `windowGap/2` split), clamping, and the Cocoa↔top-left
  conversion.
- **Native addon.** Manual verification plus a Node smoke script that moves a
  known app (e.g. Finder) to each position and logs the resulting frame read back
  from the addon.

## Build / distribution

- `node-gyp` compiles `native/src/window.mm` into a universal `.node`
  (x86_64 + arm64).
- Backend bundled with esbuild into `bin/plugin.js`.
- Packaged with the official CLI: `streamdeck pack` → `.streamDeckPlugin`.
- Notarization is only needed to distribute beyond the author's machine; optional
  for v1.

## Open questions / future

- Cycling actions (v2).
- Multi-window layout snapshots (v2).
- Remembering per-app preferred positions (v2).
