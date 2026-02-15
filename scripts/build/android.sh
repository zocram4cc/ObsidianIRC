#!/bin/bash
set -e

# Android environment
export ANDROID_HOME=${ANDROID_HOME:-"$HOME/Android/Sdk"}
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

# Configuration
export VITE_DEFAULT_IRC_SERVER=${VITE_DEFAULT_IRC_SERVER:-"wss://www.ilex-forest.com/webirc"}
export VITE_DEFAULT_IRC_SERVER_NAME=${VITE_DEFAULT_IRC_SERVER_NAME:-"Ilex Forest"}
export VITE_DEFAULT_IRC_CHANNELS=${VITE_DEFAULT_IRC_CHANNELS:-"#ilex-forest"}
export VITE_HIDE_SERVER_LIST=${VITE_HIDE_SERVER_LIST:-"true"}

if [ ! -d "$ANDROID_HOME" ]; then
    echo "Error: ANDROID_HOME ($ANDROID_HOME) not found."
    echo "Please set ANDROID_HOME or install the SDK via Android Studio."
    exit 1
fi

echo "Building ObsidianIRC Android APK..."
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/../.."

npm install
npm run tauri android build -- --apk true

echo "Android build complete."
find src-tauri/gen/android/app/build/outputs/apk/release/ -name "*.apk"
