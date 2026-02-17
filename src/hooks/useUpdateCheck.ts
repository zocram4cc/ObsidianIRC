import { invoke } from "@tauri-apps/api/core";
import { useCallback } from "react";
import useStore from "../store";
import type { UpdateInfo } from "../store/types";

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
 * Hook for checking and handling app updates
 */
export function useUpdateCheck() {
  const updateState = useStore((state) => state.updateState);
  const autoCheckUpdates = useStore(
    (state) => state.globalSettings.autoCheckUpdates,
  );
  const setState = useStore.setState;

  const checkForUpdates = useCallback(async () => {
    // Skip if already checking
    if (updateState.isChecking) {
      return;
    }

    // Skip if auto-check is disabled
    if (!autoCheckUpdates) {
      return;
    }

    setState((state) => ({
      updateState: {
        ...state.updateState,
        isChecking: true,
        error: null,
      },
    }));

    try {
      const result = await invoke<UpdateInfo | null>("check_for_updates");

      setState((state) => ({
        updateState: {
          ...state.updateState,
          isChecking: false,
          updateAvailable: result !== null,
          updateInfo: result,
          lastChecked: new Date().toISOString(),
        },
      }));
    } catch (error) {
      console.error("Failed to check for updates:", error);
      setState((state) => ({
        updateState: {
          ...state.updateState,
          isChecking: false,
          error: String(error),
        },
      }));
    }
  }, [updateState.isChecking, autoCheckUpdates]);

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
    setState((state) => ({
      updateState: {
        ...state.updateState,
        updateAvailable: false,
      },
    }));
  }, []);

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
