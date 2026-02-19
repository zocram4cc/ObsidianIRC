#!/bin/bash
set -e

# Get the PID of the ObsidianIRC app
PID=$($HOME/Android/Sdk/platform-tools/adb shell "ps -A" | grep com.obsidianirc.dev | grep -v grep | awk '{print $2}')

if [ -z "$PID" ]; then
    echo "Error: ObsidianIRC app is not running" >&2
    echo "Please start the app first with 'Android: Start App and Attach'" >&2
    exit 1
fi

echo "Found ObsidianIRC with PID: $PID"

# Remove any existing forward
$HOME/Android/Sdk/platform-tools/adb forward --remove tcp:9222 2>/dev/null || true

# Forward to the WebView's DevTools socket
# The socket name pattern is webview_devtools_remote_<pid>
$HOME/Android/Sdk/platform-tools/adb forward tcp:9222 localabstract:webview_devtools_remote_$PID

echo "Forwarded localhost:9222 -> webview_devtools_remote_$PID"
echo "You can now attach with 'React Frontend Debug (Mobile)'"
