import type React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  FaExternalLinkAlt,
  FaSearchMinus,
  FaSearchPlus,
  FaTimes,
} from "react-icons/fa";
import useStore from "../../store";
import { MessageAvatar } from "../message/MessageAvatar";

export const LightboxModal: React.FC = () => {
  const {
    ui: { lightbox },
    closeLightbox,
  } = useStore();
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeLightbox();
      }
    };

    if (lightbox?.isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [lightbox?.isOpen, closeLightbox]);

  // Reset zoom when opening a new image
  useEffect(() => {
    if (lightbox?.isOpen) {
      setIsZoomed(false);
    }
  }, [lightbox?.isOpen]);

  if (!lightbox?.isOpen) return null;

  const { url, author, timestamp } = lightbox;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/90 z-[9999] flex flex-col animate-in fade-in duration-200"
      onClick={closeLightbox}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent h-20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left side: Author and Timestamp */}
        <div className="flex items-center gap-3">
          {author && (
            <>
              <MessageAvatar
                userId={author}
                theme="discord"
                showHeader={true}
                isClickable={false}
              />
              <div className="flex flex-col">
                <span className="font-bold text-white text-base leading-tight">
                  {author.split(":")[0]}
                </span>
                {timestamp && (
                  <span className="text-sm text-discord-text-muted">
                    {new Date(timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right side: Actions */}
        <div className="flex items-center gap-2 md:gap-4 text-discord-text-normal">
          <button
            className="hover:text-white transition-colors p-2 bg-black/20 rounded-full"
            onClick={() => setIsZoomed(!isZoomed)}
            title={isZoomed ? "Zoom Out" : "Zoom In"}
          >
            {isZoomed ? (
              <FaSearchMinus size={22} />
            ) : (
              <FaSearchPlus size={22} />
            )}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors p-2 bg-black/20 rounded-full flex items-center justify-center"
            title="Open in Browser"
            onClick={(e) => e.stopPropagation()}
          >
            <FaExternalLinkAlt size={20} />
          </a>
          <button
            className="hover:text-white transition-colors p-2 bg-black/20 rounded-full"
            onClick={closeLightbox}
            title="Close"
          >
            <FaTimes size={26} />
          </button>
        </div>
      </div>

      {/* Image Container */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-2 md:p-12 relative">
        <img
          src={url}
          alt="Full screen view"
          className={`transition-all duration-300 ease-out cursor-default shadow-2xl ${
            isZoomed
              ? "max-w-none w-auto h-auto"
              : "max-w-full max-h-full object-contain select-none"
          }`}
          onClick={(e) => e.stopPropagation()}
          style={{
            transform: isZoomed ? "scale(1.5)" : "scale(1)",
            transformOrigin: "center center",
          }}
        />
      </div>
    </div>,
    document.body,
  );
};

export default LightboxModal;
