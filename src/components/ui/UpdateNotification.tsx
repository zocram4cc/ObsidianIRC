import { FaDownload, FaExternalLinkAlt, FaSync, FaTimes } from "react-icons/fa";
import { useUpdateCheck } from "../../hooks/useUpdateCheck";

/**
 * Update notification banner that appears when a new version is available
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
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 shadow-lg">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        {/* Update info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0">
            <FaDownload className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm">
              Update Available: {updateInfo.version}
            </p>
            <p className="text-xs text-blue-100 truncate">
              A new version of ObsidianIRC is ready to download
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* View release notes */}
          <a
            href={updateInfo.releaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-100 hover:text-white hover:bg-blue-500/50 rounded transition-colors"
            title="View release notes on GitHub"
          >
            <FaExternalLinkAlt className="w-3 h-3" />
            <span className="hidden sm:inline">Release Notes</span>
          </a>

          {/* Download button */}
          <button
            onClick={downloadUpdate}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-blue-600 hover:bg-blue-50 rounded font-medium text-sm transition-colors shadow-sm"
          >
            <FaDownload className="w-3.5 h-3.5" />
            Download
          </button>

          {/* Dismiss button */}
          <button
            onClick={dismissUpdate}
            className="p-1.5 text-blue-100 hover:text-white hover:bg-blue-500/50 rounded transition-colors"
            title="Dismiss (will show again on next startup)"
          >
            <FaTimes className="w-4 h-4" />
          </button>
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
