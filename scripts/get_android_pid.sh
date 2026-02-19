#!/bin/bash
set -e

# Get PID of ObsidianIRC app on the first available Android device/emulator
DEVICE=$($HOME/Android/Sdk/platform-tools/adb devices | grep -E "^(emulator-|device)" | head -1 | awk '{print $1}')

if [ -z "$DEVICE" ]; then
    echo "No Android device/emulator found" >&2
    exit 1
fi

PID=$($HOME/Android/Sdk/platform-tools/adb -s "$DEVICE" shell ps -A | grep com.obsidianirc.dev | awk '{print $2}')

if [ -z "$PID" ]; then
    echo "App not running on $DEVICE" >&2
    exit 1
else
    echo "$PID"
fi
