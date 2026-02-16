import type React from "react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FaCheck,
  FaCloudUploadAlt,
  FaExclamationTriangle,
  FaFile,
  FaSpinner,
  FaTimes,
} from "react-icons/fa";
import ircClient from "../../lib/ircClient";
import useStore from "../../store";

interface FileUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  channelId: string;
  channelName: string;
}

interface FileStatus {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
  url?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  isOpen,
  onClose,
  serverId,
  channelId,
  channelName,
}) => {
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [isGlobalUploading, setIsGlobalUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { servers } = useStore();
  const server = servers.find((s) => s.id === serverId);

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((file) => ({
        file,
        status: "pending" as const,
        progress: 0,
      }));
      setFiles((prev) => [...prev, ...newFiles]);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (fileIndex: number, fileStatus: FileStatus) => {
    if (!server?.filehost) return;

    try {
      setFiles((prev) =>
        prev.map((f, i) =>
          i === fileIndex ? { ...f, status: "uploading", progress: 10 } : f,
        ),
      );

      // 1. Get Token (re-use existing if valid, or request new)
      // For bulk uploads, we might want to request one token and reuse it,
      // but simpler to request fresh or check store.
      // We'll follow the pattern of requesting a fresh one to be safe.

      // Request token
      ircClient.requestExtJwt(serverId, channelName || "*", "uploader");

      // Wait for token (simple polling or promise wrapper could work, reusing the logic from other components would be ideal but for now we inline a simple waiter)
      // Actually, we can just wait a second for the store to update if we triggered it.
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const freshServer = useStore
        .getState()
        .servers.find((s) => s.id === serverId);
      const token = freshServer?.jwtToken;

      if (!token) throw new Error("Failed to acquire access token");

      setFiles((prev) =>
        prev.map((f, i) => (i === fileIndex ? { ...f, progress: 30 } : f)),
      );

      // 2. Upload
      const formData = new FormData();
      formData.append("file", fileStatus.file); // Use 'file' for generic uploads

      const response = await fetch(`${server.filehost}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();

      setFiles((prev) =>
        prev.map((f, i) =>
          i === fileIndex
            ? { ...f, status: "success", progress: 100, url: data.saved_url }
            : f,
        ),
      );

      // 3. Post to Chat
      if (data.saved_url && channelName) {
        const fullUrl = data.saved_url.startsWith("http")
          ? data.saved_url
          : `${server.filehost}${data.saved_url.startsWith("/") ? "" : "/"}${data.saved_url}`;

        ircClient.sendRaw(serverId, `PRIVMSG ${channelName} :${fullUrl}`);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setFiles((prev) =>
        prev.map((f, i) =>
          i === fileIndex
            ? {
                ...f,
                status: "error",
                error: err instanceof Error ? err.message : "Unknown error",
              }
            : f,
        ),
      );
    }
  };

  const handleUploadAll = async () => {
    if (isGlobalUploading) return;
    setIsGlobalUploading(true);

    const pendingIndices = files
      .map((f, i) => (f.status === "pending" || f.status === "error" ? i : -1))
      .filter((i) => i !== -1);

    // Upload sequentially to avoid flooding
    for (const index of pendingIndices) {
      await uploadFile(index, files[index]);
    }

    setIsGlobalUploading(false);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[500px] bg-discord-dark-100 rounded-lg shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-discord-dark-300 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FaCloudUploadAlt /> Upload Files
          </h2>
          <button
            onClick={onClose}
            className="text-discord-text-muted hover:text-white"
          >
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto">
          {files.length === 0 ? (
            <div
              className="border-2 border-dashed border-discord-dark-300 rounded-xl p-8 flex flex-col items-center justify-center text-discord-text-muted hover:bg-discord-dark-200 cursor-pointer transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <FaCloudUploadAlt size={48} className="mb-4" />
              <p className="text-lg font-medium">Click to select files</p>
              <p className="text-sm">Max size: 100MB</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={`${file.file.name}-${index}`}
                  className="bg-discord-dark-300 p-3 rounded flex items-center gap-3"
                >
                  <div className="p-2 bg-discord-dark-400 rounded">
                    <FaFile />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-medium truncate">
                        {file.file.name}
                      </p>
                      <span className="text-xs text-discord-text-muted">
                        {(file.file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-1.5 bg-discord-dark-400 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          file.status === "error"
                            ? "bg-red-500"
                            : file.status === "success"
                              ? "bg-green-500"
                              : "bg-discord-primary"
                        }`}
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                    {file.error && (
                      <p className="text-xs text-red-400 mt-1">{file.error}</p>
                    )}
                  </div>
                  <div className="w-8 flex justify-center">
                    {file.status === "uploading" && (
                      <FaSpinner className="animate-spin text-discord-primary" />
                    )}
                    {file.status === "success" && (
                      <FaCheck className="text-green-500" />
                    )}
                    {file.status === "error" && (
                      <FaExclamationTriangle className="text-red-500" />
                    )}
                    {file.status === "pending" && (
                      <button
                        onClick={() => removeFile(index)}
                        className="text-discord-text-muted hover:text-red-400"
                      >
                        <FaTimes />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 border border-dashed border-discord-dark-300 text-discord-text-muted rounded hover:bg-discord-dark-300 transition-colors text-sm"
              >
                + Add more files
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-discord-dark-200 rounded-b-lg flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-sm hover:underline"
            disabled={isGlobalUploading}
          >
            Cancel
          </button>
          <button
            onClick={handleUploadAll}
            disabled={
              files.length === 0 ||
              isGlobalUploading ||
              files.every((f) => f.status === "success")
            }
            className="px-4 py-2 bg-discord-primary hover:bg-discord-primary-hover text-white rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGlobalUploading ? <FaSpinner className="animate-spin" /> : null}
            {isGlobalUploading ? "Uploading..." : "Upload All"}
          </button>
        </div>

        <input
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleFilesSelect}
          className="hidden"
        />
      </div>
    </div>,
    document.body,
  );
};

export default FileUploader;
