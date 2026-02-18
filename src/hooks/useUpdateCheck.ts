import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef } from "react";
import useStore from "../store";
import type { UpdateInfo } from "../store/types";

// LocalStorage key for persisting update info
const UPDATE_STORAGE_KEY = "obsidianirc-update-info";

/**
 * Load persisted update info from localStorage
 */
function loadPersistedUpdateInfo(): {
  updateInfo: UpdateInfo;
  checkedAt: string;
} | null {
  try {
    const stored = localStorage.getItem(UPDATE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Only return if checked within the last 24 hours
      const checkedAt = new Date(parsed.checkedAt).getTime();
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (checkedAt > oneDayAgo) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("[UpdateCheck] Failed to load persisted update info:", e);
  }
  return null;
}

/**
 * Persist update info to localStorage
 */
function persistUpdateInfo(updateInfo: UpdateInfo | null): void {
  try {
    if (updateInfo) {
      localStorage.setItem(
        UPDATE_STORAGE_KEY,
        JSON.stringify({
          updateInfo,
          checkedAt: new Date().toISOString(),
        }),
      );
    } else {
      localStorage.removeItem(UPDATE_STORAGE_KEY);
    }
  } catch (e) {
    console.error("[UpdateCheck] Failed to persist update info:", e);
  }
}

/**
 * Open a URL in the system browser
 */
async function openUrl(url: string): Promise<void> {
  if (window.__TAURI__) {
    const { openUrl: tauriOpenUrl } = await import("@tauri-apps/plugin-opener");
    await tauriOpenUrl(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/**
 * Reset the session check flag (for testing)
 */
let hasCheckedThisSession = false;
export function resetUpdateCheckSession(): void {
  hasCheckedThisSession = false;
}

/**
 * Hook for checking and handling app updates
 */
export function useUpdateCheck() {
  const updateState = useStore((state) => state.updateState);
  const servers = useStore((state) => state.servers);
  const autoCheckUpdates = useStore(
    (state) => state.globalSettings.autoCheckUpdates,
  );
  const setState = useStore.setState;
  const isCheckingRef = useRef(false);

  // Use a ref to track if we've initiated a check this mount
  const hasInitiatedCheckRef = useRef(false);

  const checkForUpdates = useCallback(async () => {
    console.log("[UpdateCheck] checkForUpdates called");

    // Skip if already checking (use ref for immediate check)
    if (isCheckingRef.current || updateState.isChecking) {
      console.log("[UpdateCheck] Skipping - already checking");
      return;
    }

    // Skip if already initiated a check this mount (prevents React StrictMode double invoke)
    if (hasInitiatedCheckRef.current) {
      console.log("[UpdateCheck] Skipping - already initiated this mount");
      return;
    }

    // Skip if auto-check is disabled
    if (!autoCheckUpdates) {
      console.log("[UpdateCheck] Skipping - auto-check disabled");
      return;
    }

    // Skip if checked in the last hour (prevent spam)
    if (updateState.lastChecked) {
      const lastCheckedTime = new Date(updateState.lastChecked).getTime();
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      if (lastCheckedTime > oneHourAgo) {
        console.log("[UpdateCheck] Skipping - checked recently");
        return;
      }
    }

    console.log("[UpdateCheck] Starting update check...");

    // Mark as checking immediately
    isCheckingRef.current = true;
    hasInitiatedCheckRef.current = true;

    setState({
      updateState: {
        ...updateState,
        isChecking: true,
        error: null,
      },
    });

    try {
      console.log("[UpdateCheck] Invoking Tauri command...");
      const result = await invoke<UpdateInfo | null>("check_for_updates");
      console.log("[UpdateCheck] Result:", result);

      const newUpdateState = {
        isChecking: false,
        updateAvailable: result !== null,
        updateInfo: result,
        lastChecked: new Date().toISOString(),
        error: null,
      };

      setState({
        updateState: newUpdateState,
      });

      // Persist update info to localStorage
      persistUpdateInfo(result);

      // Only mark as checked after successful completion
      hasCheckedThisSession = true;
    } catch (error) {
      console.error("[UpdateCheck] Failed to check for updates:", error);
      setState({
        updateState: {
          ...updateState,
          isChecking: false,
          error: String(error),
        },
      });
      // Still mark as checked to prevent retry loops on error
      hasCheckedThisSession = true;
    } finally {
      isCheckingRef.current = false;
    }
  }, [updateState, autoCheckUpdates]);

  // Auto-check when a server is connected (delayed)
  useEffect(() => {
    // Only run in Tauri
    if (typeof window === "undefined" || !window.__TAURI__) {
      console.log("[UpdateCheck] Skipping - not in Tauri");
      return;
    }

    // Skip if we already have an update available (from persisted state)
    if (updateState.updateAvailable) {
      console.log("[UpdateCheck] Skipping - update already available");
      return;
    }

    // Check if we have a connected server
    const hasConnectedServer = servers.some((s) => s.isConnected);
    if (!hasConnectedServer) {
      console.log("[UpdateCheck] No connected server yet");
      return;
    }

    // Skip if already checked this session
    if (hasCheckedThisSession || hasInitiatedCheckRef.current) {
      console.log("[UpdateCheck] Already checked this session");
      return;
    }

    console.log("[UpdateCheck] Scheduling update check in 5 seconds...");

    // Delay the check by 5 seconds after connection to let the UI settle
    const timer = setTimeout(() => {
      console.log("[UpdateCheck] Triggering update check now");
      checkForUpdates();
    }, 5000);

    return () => clearTimeout(timer);
  }, [servers, checkForUpdates, updateState.updateAvailable]);

  const downloadUpdate = useCallback(async () => {
    if (!updateState.updateInfo) {
      return;
    }

    try {
      // Open the download URL in the system browser
      await openUrl(updateState.updateInfo.downloadUrl || "");
    } catch (error) {
      console.error("Failed to open download URL:", error);
      // Fallback: try opening release page
      if (updateState.updateInfo.releaseUrl) {
        await openUrl(updateState.updateInfo.releaseUrl);
      }
    }
  }, [updateState.updateInfo]);

  const dismissUpdate = useCallback(() => {
    console.log(
      "[UpdateCheck] dismissUpdate called - clearing update notification",
    );
    setState({
      updateState: {
        ...updateState,
        updateAvailable: false,
      },
    });
    // Clear persisted update info
    persistUpdateInfo(null);
  }, [updateState]);

  const clearError = useCallback(() => {
    setState((state) => ({
      updateState: {
        ...state.updateState,
        error: null,
      },
    }));
  }, []);

  return {
    ...updateState,
    checkForUpdates,
    downloadUpdate,
    dismissUpdate,
    clearError,
  };
}
