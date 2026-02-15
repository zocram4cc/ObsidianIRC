#!/bin/bash
set -e

# Environment tweaks for AppImage
export NO_STRIP=true
export TAURI_LINUX_APPIMAGE_NO_STRIP=true

# Configuration
export VITE_DEFAULT_IRC_SERVER=${VITE_DEFAULT_IRC_SERVER:-"wss://www.ilex-forest.com/webirc"}
export VITE_DEFAULT_IRC_SERVER_NAME=${VITE_DEFAULT_IRC_SERVER_NAME:-"Ilex Forest"}
export VITE_DEFAULT_IRC_CHANNELS=${VITE_DEFAULT_IRC_CHANNELS:-"#ilex-forest"}
export VITE_HIDE_SERVER_LIST=${VITE_HIDE_SERVER_LIST:-"true"}

echo "Building ObsidianIRC AppImage..."
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/../.."

npm install
npm run tauri build -- --bundles appimage

echo "AppImage build complete."
find src-tauri/target/release/bundle/appimage/ -name "*.AppImage"
