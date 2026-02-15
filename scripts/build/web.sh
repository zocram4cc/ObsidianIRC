#!/bin/bash
set -e

# Configuration
export VITE_DEFAULT_IRC_SERVER=${VITE_DEFAULT_IRC_SERVER:-"wss://www.ilex-forest.com/webirc"}
export VITE_DEFAULT_IRC_SERVER_NAME=${VITE_DEFAULT_IRC_SERVER_NAME:-"Ilex Forest"}
export VITE_DEFAULT_IRC_CHANNELS=${VITE_DEFAULT_IRC_CHANNELS:-"#ilex-forest"}
export VITE_HIDE_SERVER_LIST=${VITE_HIDE_SERVER_LIST:-"true"}

echo "Building ObsidianIRC for Web..."
# Assuming script is run from project root or handles its own directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/../.."

npm install
npm run build

echo "Web build complete. Output in dist/"
