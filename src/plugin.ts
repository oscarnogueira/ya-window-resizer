import streamDeck from "@elgato/streamdeck";
import { PositionAction } from "./actions/position-action";
import { CustomAction } from "./actions/custom-action";
import {
  CycleCornersAction,
  CycleSidesAction,
  CycleTopBottomAction,
} from "./actions/cycle-actions";
import { accent, DEFAULT_ACCENT, type GlobalSettings } from "./settings";

streamDeck.logger.setLevel("info");

const position = new PositionAction();
const custom = new CustomAction();
const cycleCorners = new CycleCornersAction();
const cycleSides = new CycleSidesAction();
const cycleTopBottom = new CycleTopBottomAction();

streamDeck.actions.registerAction(position);
streamDeck.actions.registerAction(custom);
streamDeck.actions.registerAction(cycleCorners);
streamDeck.actions.registerAction(cycleSides);
streamDeck.actions.registerAction(cycleTopBottom);

// Update the cached accent color and repaint when global settings change.
// This is the ONLY place that reads global settings — event handlers must not
// re-fetch (getGlobalSettings/getSettings emit events → infinite loop).
streamDeck.settings.onDidReceiveGlobalSettings((ev) => {
  const g = ev.settings as GlobalSettings;
  accent.color = g.accentColor || DEFAULT_ACCENT;
  void position.refreshAll();
  void custom.refreshAll();
  void cycleCorners.refreshAll();
  void cycleSides.refreshAll();
  void cycleTopBottom.refreshAll();
});

streamDeck.connect().then(() => {
  // Prime the accent cache once; the subscription above paints on arrival.
  void streamDeck.settings.getGlobalSettings();
});
