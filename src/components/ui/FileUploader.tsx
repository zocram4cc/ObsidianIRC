import Uppy from "@uppy/core";
import Tus from "@uppy/tus";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import DashboardModal from "../../../node_modules/@uppy/react/lib/DashboardModal.js";
import "../../../node_modules/@uppy/core/dist/style.min.css";
import "../../../node_modules/@uppy/dashboard/dist/style.min.css";
import ircClient from "../../lib/ircClient";
import useStore from "../../store";

interface FileUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  channelId: string;
  channelName: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  isOpen,
  onClose,
  serverId,
  channelId,
  channelName,
}) => {
  const [uppy] = useState(
    () =>
      new Uppy({
        id: "obsidian-uploader",
        autoProceed: false,
        restrictions: {
          maxFileSize: 100 * 1024 * 1024, // 100MB
        },
      }),
  );

  const servers = useStore((state) => state.servers);
  const server = servers.find((s) => s.id === serverId);

  const handleSuccess = useCallback(
    (_file: unknown, response: { uploadURL?: string }) => {
      console.log("📬 FileUploader: Received success event", { response });

      if (response.uploadURL) {
        // The final URL is base + /files/ + ID
        const fileId = response.uploadURL.split("/").pop();
        const finalUrl = `${server?.filehost}/files/${fileId}`;

        console.log("🚀 FileUploader: Posting URL to chat:", {
          channelName,
          finalUrl,
        });

        // Post the URL directly via sendRaw to be certain it goes through
        if (serverId && channelName) {
          ircClient.sendRaw(serverId, `PRIVMSG ${channelName} :${finalUrl}`);
        }
      } else {
        console.warn("⚠️ FileUploader: Success but no uploadURL in response");
      }
    },
    [server?.filehost, serverId, channelName],
  );

  useEffect(() => {
    if (!server?.filehost) return;

    // Configure Tus with the server's filehost URL
    if (!uppy.getPlugin("Tus")) {
      uppy.use(Tus, {
        endpoint: `${server.filehost}/files/`,
        limit: 5,
        retryDelays: [0, 1000, 3000, 5000],
        removeFingerprintOnSuccess: true,
      });
    }

    // Handle token acquisition before upload
    uppy.addPreProcessor(async (fileIDs) => {
      console.log("🔄 FileUploader: Acquiring JWT token before upload...");

      return new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          ircClient.deleteHook("EXTJWT", tokenHandler);
          reject(new Error("Token acquisition timed out"));
        }, 10000);

        const tokenHandler = (data: {
          serverId: string;
          serviceName: string;
          jwtToken: string;
        }) => {
          if (data.serverId === serverId && data.serviceName === "uploader") {
            clearTimeout(timeoutId);
            ircClient.deleteHook("EXTJWT", tokenHandler);

            console.log("✅ FileUploader: JWT token acquired");

            // Set the token for all files in this upload batch
            fileIDs.forEach((id: string) => {
              uppy.setFileMeta(id, { extjwt: data.jwtToken });
            });

            resolve();
          }
        };

        ircClient.on("EXTJWT", tokenHandler);
        ircClient.requestExtJwt(serverId, channelName, "uploader");
      });
    });

    uppy.on("upload-success", handleSuccess);

    // Handle modal closure: clear files
    if (!isOpen) {
      const currentFiles = uppy.getFiles();
      for (const f of currentFiles) {
        uppy.removeFile(f.id);
      }
    }

    return () => {
      uppy.off("upload-success", handleSuccess);
    };
  }, [server?.filehost, serverId, channelName, uppy, isOpen, handleSuccess]);

  if (!isOpen) return null;

  // Use Portal to ensure the modal is outside the ChatArea's CSS scope
  return createPortal(
    <DashboardModal
      uppy={uppy}
      open={isOpen}
      onRequestClose={onClose}
      closeModalOnClickOutside
      proudlyDisplayPoweredByUppy={false}
      theme="dark"
    />,
    document.body,
  );
};

export default FileUploader;
