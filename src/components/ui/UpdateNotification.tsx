import { FaExternalLinkAlt, FaSync, FaTimes } from "react-icons/fa";
import { useUpdateCheck } from "../../hooks/useUpdateCheck";

/**
 * Update notification toast that appears when a new version is available
 * This is a small, non-intrusive popup at the top of the screen
 */
export const UpdateNotification: React.FC = () => {
  const {
    updateAvailable,
    updateInfo,
    isChecking,
    checkForUpdates,
    downloadUpdate,
    dismissUpdate,
  } = useUpdateCheck();

  // Don't render if no update is available
  if (!updateAvailable || !updateInfo) {
    return null;
  }

  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 z-50 mt-2 max-w-sm w-full px-4">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          {/* Update info */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex-shrink-0">
              <span className="text-xs font-medium bg-blue-500 px-1.5 py-0.5 rounded">
                NEW
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                v{updateInfo.version} available
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* View release page */}
            <a
              href={updateInfo.releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-100 hover:text-white hover:bg-blue-500/50 rounded transition-colors"
              title="View release on GitHub"
            >
              <FaExternalLinkAlt className="w-3 h-3" />
              <span>View</span>
            </a>

            {/* Dismiss button */}
            <button
              onClick={dismissUpdate}
              className="p-1 text-blue-100 hover:text-white hover:bg-blue-500/50 rounded transition-colors"
              title="Dismiss (will show again on next startup)"
            >
              <FaTimes className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Compact update check button for settings or menu
 */
export const UpdateCheckButton: React.FC = () => {
  const { isChecking, lastChecked, checkForUpdates, error } = useUpdateCheck();

  const formatLastChecked = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-2">
      <button
        onClick={checkForUpdates}
        disabled={isChecking}
        className="flex items-center gap-2 px-3 py-2 bg-discord-dark-300 hover:bg-discord-dark-400 rounded text-sm text-discord-text-normal disabled:opacity-50 transition-colors"
      >
        <FaSync className={`w-4 h-4 ${isChecking ? "animate-spin" : ""}`} />
        {isChecking ? "Checking..." : "Check for Updates"}
      </button>

      {lastChecked && (
        <p className="text-xs text-discord-text-muted">
          Last checked: {formatLastChecked(lastChecked)}
        </p>
      )}

      {error && <p className="text-xs text-red-400">Error: {error}</p>}
    </div>
  );
};
