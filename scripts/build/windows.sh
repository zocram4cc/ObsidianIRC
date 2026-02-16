#!/bin/bash
set -e

# Target
TARGET="x86_64-pc-windows-gnu"

# Configuration
export VITE_DEFAULT_IRC_SERVER=${VITE_DEFAULT_IRC_SERVER:-"wss://www.ilex-forest.com/webirc"}
export VITE_DEFAULT_IRC_SERVER_NAME=${VITE_DEFAULT_IRC_SERVER_NAME:-"Ilex Forest"}
export VITE_DEFAULT_IRC_CHANNELS=${VITE_DEFAULT_IRC_CHANNELS:-"#ilex-forest"}
export VITE_HIDE_SERVER_LIST=${VITE_HIDE_SERVER_LIST:-"false"}
export VITE_GIPHY_API_KEY=${VITE_GIPHY_API_KEY:-"REDACTED"}


echo "Building ObsidianIRC for Windows ($TARGET)..."
echo "Note: This requires the $TARGET rust target and mingw-w64-gcc."

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/../.."

npm install

# Attempt build
npm run tauri build -- --target $TARGET

echo "Windows build complete."
find src-tauri/target/$TARGET/release/ -name "*.exe"
