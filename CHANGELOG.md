# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows
[Semantic Versioning](https://semver.org/). While the version is `0.x`, minor
releases may include breaking changes.

Each released version is tagged `vX.Y.Z` and published as a GitHub Release with
the built `.streamDeckPlugin` attached. The Stream Deck manifest carries the same
version as a four-part `MAJOR.MINOR.PATCH.BUILD` string (`BUILD` is only bumped
when re-packaging without a version change).

## [Unreleased]

## [0.1.0] - 2026-07-21

First release.

### Added

- **Position** action — halves, thirds (incl. two-thirds), quarters/corners,
  maximize, and center (the middle 3×3 of a 5×5 grid).
- **Custom** action — free `x / y / width / height` placement in percent or
  pixels.
- **Cycle Corners**, **Cycle Sides**, **Cycle Top/Bottom** actions — step a
  window through a sequence on each press, with the index remembered per button.
- **Configurable offset** — per-button `screenGap` (window ↔ screen edge) and
  `windowGap` (between adjacent windows, applied as `windowGap/2` per internal
  edge), defaulting to 4px.
- **Accent color** — a global setting driving procedurally generated key icons
  that reflect the selected position live via `setImage`.
- Native Objective-C++ addon over the macOS Accessibility API; multi-monitor
  aware (operates on the window's current screen).
- `dev.sh` helper (build → link → restart) and a `smoke` script for the addon.

[Unreleased]: https://github.com/oscarnogueira/ya-window-resizer/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/oscarnogueira/ya-window-resizer/releases/tag/v0.1.0
