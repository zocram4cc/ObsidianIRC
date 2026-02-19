import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";
import type React from "react";
import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import { ServerNoticesPopup } from "./components/message/ServerNoticesPopup";
import PrivacyPolicy from "./components/PrivacyPolicy";
import AddServerModal from "./components/ui/AddServerModal";
import ChannelListModal from "./components/ui/ChannelListModal";
import ChannelRenameModal from "./components/ui/ChannelRenameModal";
import { EditServerModal } from "./components/ui/EditServerModal";
import LightboxModal from "./components/ui/LightboxModal";
import LinkSecurityWarningModal from "./components/ui/LinkSecurityWarningModal";
import LoadingOverlay from "./components/ui/LoadingOverlay";
import QuickActions from "./components/ui/QuickActions";
import UserProfileModal from "./components/ui/UserProfileModal";
import UserSettings from "./components/ui/UserSettings";
import { useKeyboardResize } from "./hooks/useKeyboardResize";
import { useUpdateCheck } from "./hooks/useUpdateCheck";
import ircClient from "./lib/ircClient";
import { parseIrcUrl } from "./lib/ircUrlParser";
import useStore, { loadSavedServers } from "./store";
import type { ConnectionDetails } from "./store/types";

const askPermissions = async () => {
  // Do you have permission to send a notification?
  let permissionGranted = await isPermissionGranted();

  // If not we need to request it
  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === "granted";
  }
};

const initializeEnvSettings = (
  toggleAddServerModal: (
    isOpen?: boolean,
    prefillDetails?: ConnectionDetails | null,
  ) => void,
  joinChannel: (serverId: string, channelName: string) => void,
) => {
  if (loadSavedServers().length > 0) return;

  // Use defensive checks for global variables injected by Vite
  const defaultServer =
    typeof __DEFAULT_IRC_SERVER__ !== "undefined"
      ? __DEFAULT_IRC_SERVER__
      : undefined;
  const defaultServerName =
    typeof __DEFAULT_IRC_SERVER_NAME__ !== "undefined"
      ? __DEFAULT_IRC_SERVER_NAME__
      : undefined;
  const defaultChannels =
    typeof __DEFAULT_IRC_CHANNELS__ !== "undefined"
      ? __DEFAULT_IRC_CHANNELS__
      : [];

  if (!defaultServer) return;

  let host = "";
  let port = "443";

  try {
    const url = new URL(defaultServer);
    host = url.hostname;
    if (url.port) {
      port = url.port;
    } else if (url.protocol === "wss:" || url.protocol === "https:") {
      port = "443";
    } else if (url.protocol === "ws:" || url.protocol === "http:") {
      port = "80";
    }
    // If it's a websocket URL with a path (like /webirc), include it in the host
    if (url.pathname && url.pathname !== "/") {
      host = `${url.host}${url.pathname}`;
    }
  } catch (e) {
    // Fallback for non-standard URLs
    const parts = defaultServer.split(":");
    if (parts.length >= 2) {
      host = parts[1].replace(/^\/\//, "");
      port = parts[2] || (defaultServer.startsWith("wss") ? "443" : "80");
    }
  }

  if (!host) {
    return;
  }

  toggleAddServerModal(true, {
    name: defaultServerName || "Obsidian IRC",
    host,
    port,
    nickname: "",
    ui: {
      hideServerInfo: true,
      hideClose: true,
      title: `Welcome to ${defaultServerName || "Obsidian IRC"}!`,
    },
  });

  ircClient.on("ready", ({ serverId, serverName, nickname }) => {
    // Automatically join default channels
    for (const channel of defaultChannels) {
      joinChannel(serverId, channel);
    }
  });
};

const App: React.FC = () => {
  const {
    toggleAddServerModal,
    toggleEditServerModal,
    toggleQuickActions,
    ui: {
      isAddServerModalOpen,
      isUserProfileModalOpen,
      isChannelListModalOpen,
      isChannelRenameModalOpen,
      isServerNoticesPopupOpen,
      isEditServerModalOpen,
      isSettingsModalOpen,
      isQuickActionsOpen,
      editServerId,
      linkSecurityWarnings,
      profileViewRequest,
    },
    joinChannel,
    connectToSavedServers,
    toggleServerNoticesPopup,
    clearProfileViewRequest,
    messages,
    isConnecting,
    globalSettings,
  } = useStore();

  // Local state for User Profile modal
  const [userProfileModalState, setUserProfileModalState] = useState<{
    isOpen: boolean;
    serverId: string;
    username: string;
  } | null>(null);

  // Watch for profile view requests
  useEffect(() => {
    if (profileViewRequest) {
      setUserProfileModalState({
        isOpen: true,
        serverId: profileViewRequest.serverId,
        username: profileViewRequest.username,
      });
      clearProfileViewRequest();
    }
  }, [profileViewRequest, clearProfileViewRequest]);

  // Collect all server notices from all channels
  const serverNotices = Object.values(messages)
    .flat()
    .filter((message) => message.type === "notice" && message.jsonLogData)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

  // Handlers for popup interactions
  const handleUsernameContextMenu = (
    e: React.MouseEvent,
    username: string,
    serverId: string,
    channelId: string,
    avatarElement?: Element | null,
  ) => {
    // For now, just prevent default. Could be extended to show user context menu
    e.preventDefault();
  };

  const handleIrcLinkClick = (url: string) => {
    // For now, just log. Could be extended to handle IRC links
    console.log("IRC link clicked:", url);
  };

  // Initialize keyboard resize handling for mobile platforms
  useKeyboardResize();

  // Initialize update check hook (auto-checks when server connects)
  useUpdateCheck();

  // Restore server selection after servers are loaded
  const ui = useStore((state) => state.ui);
  const selectServer = useStore((state) => state.selectServer);
  const servers = useStore((state) => state.servers);
  const hasConnectedToSavedServers = useStore(
    (state) => state.hasConnectedToSavedServers,
  );

  // Restore server selection after servers are loaded
  useEffect(() => {
    if (
      hasConnectedToSavedServers &&
      servers.length > 0 &&
      ui.selectedServerId
    ) {
      // Check if the saved server still exists
      const serverExists = servers.some((s) => s.id === ui.selectedServerId);
      if (serverExists) {
        const savedServer = servers.find((s) => s.id === ui.selectedServerId);
        const savedSelection = ui.perServerSelections[ui.selectedServerId];

        // Only restore if not already selected to avoid unnecessary re-renders
        const currentSelectedId = useStore.getState().ui.selectedServerId;
        if (currentSelectedId !== ui.selectedServerId) {
          selectServer(ui.selectedServerId);
        } else {
          // Even if server is already selected, we might need to restore the channel
          const currentSelection =
            useStore.getState().ui.perServerSelections[ui.selectedServerId];

          // Restore channel selection if we have a saved channel and it exists
          if (savedSelection?.selectedChannelId && savedServer) {
            // First try to find by ID directly
            let channel = savedServer.channels.find(
              (c) => c.id === savedSelection.selectedChannelId,
            );

            // If not found, try to extract channel name from the saved ID (format: serverId-channelName)
            if (!channel && savedSelection.selectedChannelId.includes("-")) {
              // Extract channel name - could be "serverId-#channel" or just the channel name part
              const possibleChannelName =
                savedSelection.selectedChannelId.startsWith(
                  `${ui.selectedServerId}-`,
                )
                  ? savedSelection.selectedChannelId.substring(
                      ui.selectedServerId.length + 1,
                    )
                  : savedSelection.selectedChannelId;

              // Find channel by name
              channel = savedServer.channels.find(
                (c) => c.name === possibleChannelName,
              );
            }

            if (channel && currentSelection?.selectedChannelId !== channel.id) {
              useStore.getState().selectChannel(channel.id);
            }
          }
        }
      }
    }
  }, [
    hasConnectedToSavedServers,
    servers,
    ui.selectedServerId,
    selectServer,
    ui.perServerSelections[ui.selectedServerId],
  ]);

  // askPermissions();
  useEffect(() => {
    initializeEnvSettings(toggleAddServerModal, joinChannel);
    // Auto-reconnect to saved servers on app startup
    connectToSavedServers();
  }, [
    toggleAddServerModal,
    joinChannel, // Auto-reconnect to saved servers on app startup
    connectToSavedServers,
  ]); // Removed connectToSavedServers from dependencies

  // Handle deeplinks
  useEffect(() => {
    const setupDeepLinkHandler = async () => {
      if (typeof window === "undefined" || !window.__TAURI__) {
        return;
      }

      try {
        // Register handler for when app is already running
        await onOpenUrl((urls) => {
          console.log("Deep link received:", urls);

          for (const url of urls) {
            if (url.startsWith("irc://") || url.startsWith("ircs://")) {
              try {
                // Parse the IRC URL
                const parsed = parseIrcUrl(url);

                // Open the connect modal with pre-filled details
                toggleAddServerModal(true, {
                  name: parsed.host || "IRC Server",
                  host: parsed.host,
                  port: parsed.port.toString(),
                  nickname: parsed.nick || "user",
                  useIrcProtocol: true,
                });
              } catch (error) {
                console.error("Failed to parse IRC URL:", error);
              }
            }
          }
        });
      } catch (error) {
        console.error("Failed to setup deep link handler:", error);
      }
    };

    setupDeepLinkHandler();
  }, [toggleAddServerModal]);

  // Global keyboard shortcut for Quick Actions (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        toggleQuickActions();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleQuickActions]);

  // Apply UI scaling
  const uiScaling = useStore((state) => state.globalSettings.uiScaling);
  const scale = uiScaling && uiScaling > 0 ? uiScaling : 100;

  // Use useEffect only to ensure html/body stay at 100% and dark
  useEffect(() => {
    if (typeof document !== "undefined") {
      const html = document.documentElement;
      const body = document.body;
      // Use dvh (dynamic viewport height) for mobile browsers to properly handle keyboard
      // Fall back to 100% for desktop browsers that don't support dvh
      // Using @supports in style tag would be ideal, but inline styles prioritize dvh
      html.style.minHeight = "100dvh";
      html.style.height = "100dvh";
      html.style.width = "100%";
      html.style.overflow = "hidden";
      body.style.minHeight = "100dvh";
      body.style.height = "100dvh";
      body.style.width = "100%";
      body.style.margin = "0";
      body.style.overflow = "hidden";
      body.style.backgroundColor = "#313338"; // discord-dark-300

      // Add fallback using CSS custom property for browsers without dvh support
      const style = document.createElement("style");
      style.textContent =
        "@supports (height: 100dvh) { :root { --viewport-height: 100dvh; } } @supports not (height: 100dvh) { :root { --viewport-height: 100vh; } }";
      document.head.appendChild(style);

      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  // Apply custom CSS
  useEffect(() => {
    const customCSS = globalSettings?.customCSS;
    if (!customCSS) {
      return;
    }

    // Create or update the custom CSS style element
    let styleElement = document.getElementById("custom-css-styles");
    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = "custom-css-styles";
      document.head.appendChild(styleElement);
    }
    styleElement.textContent = customCSS;

    return () => {
      // Clean up on unmount
      if (styleElement) {
        styleElement.textContent = "";
      }
    };
  }, [globalSettings?.customCSS]);

  return (
    <div
      className="h-full w-full overflow-hidden"
      style={{ zoom: `${scale}%` } as React.CSSProperties}
    >
      <Routes>
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route
          path="/*"
          element={
            <>
              <AppLayout />
              {isAddServerModalOpen && <AddServerModal />}
              {isEditServerModalOpen && editServerId && (
                <EditServerModal
                  serverId={editServerId}
                  onClose={() => toggleEditServerModal(false)}
                />
              )}
              {isSettingsModalOpen && <UserSettings />}
              {isQuickActionsOpen && <QuickActions />}
              {isChannelListModalOpen && <ChannelListModal />}
              {isChannelRenameModalOpen && <ChannelRenameModal />}
              <LinkSecurityWarningModal />
              <LightboxModal />
              {userProfileModalState?.isOpen && (
                <UserProfileModal
                  isOpen={userProfileModalState.isOpen}
                  onClose={() => setUserProfileModalState(null)}
                  serverId={userProfileModalState.serverId}
                  username={userProfileModalState.username}
                />
              )}
              {isServerNoticesPopupOpen && (
                <ServerNoticesPopup
                  messages={serverNotices}
                  onClose={() => toggleServerNoticesPopup(false)}
                  onUsernameContextMenu={handleUsernameContextMenu}
                  onIrcLinkClick={handleIrcLinkClick}
                  joinChannel={joinChannel}
                />
              )}
              {isConnecting && <LoadingOverlay />}
            </>
          }
        />
      </Routes>
    </div>
  );
};

export default App;
