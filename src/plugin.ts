import streamDeck from "@elgato/streamdeck";
import { PositionAction } from "./actions/position-action";
import { CustomAction } from "./actions/custom-action";

streamDeck.logger.setLevel("info");

streamDeck.actions.registerAction(new PositionAction());
streamDeck.actions.registerAction(new CustomAction());

streamDeck.connect();
