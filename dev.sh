#!/usr/bin/env bash
# Build the plugin and, only if the build succeeds, restart it in Stream Deck.
set -euo pipefail

PLUGIN_UUID="fyi.oz.yet-another-window-resizer"
PLUGIN_DIR="${PLUGIN_UUID}.sdPlugin"
PLUGINS_HOME="$HOME/Library/Application Support/com.elgato.StreamDeck/Plugins"

cd "$(dirname "$0")"

echo "==> Building..."
npm run build

# First run: link the plugin into Stream Deck if it isn't there yet.
if [[ ! -e "${PLUGINS_HOME}/${PLUGIN_DIR}" ]]; then
  echo "==> Linking ${PLUGIN_DIR} into Stream Deck..."
  ln -sf "$(pwd)/${PLUGIN_DIR}" "${PLUGINS_HOME}/${PLUGIN_DIR}"
fi

echo "==> Restarting ${PLUGIN_UUID}..."
streamdeck restart "${PLUGIN_UUID}"

echo "==> Done."
