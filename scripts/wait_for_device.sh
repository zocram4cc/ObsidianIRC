#!/bin/bash
set -e

echo "Waiting for Android device..."
for i in $(seq 1 20); do
    if $HOME/Android/Sdk/platform-tools/adb devices | grep -q 'device$'; then
        echo "Device ready"
        exit 0
    fi
    echo "Waiting... ($i/20)"
    sleep 3
done

echo "Timed out waiting for device" >&2
exit 1
