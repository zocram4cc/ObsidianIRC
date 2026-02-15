import EmojiPicker, { type EmojiClickData, Theme } from "emoji-picker-react";
import type React from "react";
import { createPortal } from "react-dom";

interface ReactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  customEmojis?: Array<{ name: string; url: string }>;
}

const ReactionModal: React.FC<ReactionModalProps> = ({
  isOpen,
  onClose,
  onSelectEmoji,
  customEmojis,
}) => {
  if (!isOpen) return null;

  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    // Custom emojis have their provided 'id' in the 'unified' property.
    const emojiId = emojiData.unified || emojiData.names?.[0];

    const customEmoji = emojiId
      ? customEmojis?.find(
          (e) => e.name.toLowerCase() === emojiId.toLowerCase(),
        )
      : null;

    let emojiToAdd: string;
    if (customEmoji) {
      // Use the original casing from our store
      emojiToAdd = `:${customEmoji.name}:`;
    } else {
      // Standard Unicode emoji
      emojiToAdd = emojiData.emoji;
    }

    onSelectEmoji(emojiToAdd);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-container"
      onClick={handleBackdropClick}
    >
      <div className="bg-discord-dark-400 rounded-lg shadow-lg border border-discord-dark-300 max-w-sm w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-2">
          <EmojiPicker
            onEmojiClick={handleEmojiSelect}
            theme={Theme.DARK}
            width="100%"
            height={400}
            searchPlaceholder="Search emojis..."
            previewConfig={{
              showPreview: false,
            }}
            skinTonesDisabled={false}
            lazyLoadEmojis={true}
            customEmojis={customEmojis?.map((e) => ({
              id: e.name,
              names: [e.name],
              imgUrl: e.url,
            }))}
          />
        </div>
        <div className="p-2 border-t border-discord-dark-300">
          <button
            onClick={onClose}
            className="text-sm text-discord-text-muted hover:text-white w-full text-center py-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ReactionModal;
