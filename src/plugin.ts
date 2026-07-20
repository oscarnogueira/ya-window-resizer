import streamDeck from "@elgato/streamdeck";
import { PositionAction } from "./actions/position-action";
import { CustomAction } from "./actions/custom-action";
import { CycleCornersAction } from "./actions/cycle-corners-action";
import { accent, DEFAULT_ACCENT, type GlobalSettings } from "./settings";

streamDeck.logger.setLevel("info");

const position = new PositionAction();
const custom = new CustomAction();
const cycle = new CycleCornersAction();

streamDeck.actions.registerAction(position);
streamDeck.actions.registerAction(custom);
streamDeck.actions.registerAction(cycle);

// Update the cached accent color and repaint when global settings change.
// This is the ONLY place that reads global settings — event handlers must not
// re-fetch (getGlobalSettings/getSettings emit events → infinite loop).
streamDeck.settings.onDidReceiveGlobalSettings((ev) => {
  const g = ev.settings as GlobalSettings;
  accent.color = g.accentColor || DEFAULT_ACCENT;
  void position.refreshAll();
  void custom.refreshAll();
  void cycle.refreshAll();
});

streamDeck.connect().then(() => {
  // Prime the accent cache once; the subscription above paints on arrival.
  void streamDeck.settings.getGlobalSettings();
});
