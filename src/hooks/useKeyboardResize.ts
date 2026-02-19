import { platform } from "@tauri-apps/plugin-os";
import { useEffect } from "react";

// Hook to handle keyboard visibility and viewport resizing on mobile platforms
export const useKeyboardResize = () => {
  useEffect(() => {
    // Check if we're on a mobile device
    const isMobile =
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) || window.innerWidth <= 768;

    // Only apply this for mobile platforms, but be more permissive than just Tauri
    if (!isMobile) {
      return;
    }

    // If we're in Tauri, check the platform
    if ("__TAURI__" in window) {
      try {
        const currentPlatform = platform();
        if (!["android", "ios"].includes(currentPlatform)) {
          return;
        }
      } catch (error) {
        // If platform() fails, continue anyway on mobile devices
      }
    }

    // With Android 13+ (API 33+), we use WindowInsets API in native code
    // which should handle keyboard visibility automatically.
    // For older Android versions, keep using visualViewport approach.

    let isKeyboardVisible = false;
    let initialHeight: number;

    if (window.visualViewport) {
      initialHeight = window.visualViewport.height;
    } else {
      initialHeight = window.innerHeight;
    }

    const handleVisualViewport = () => {
      if (!window.visualViewport) {
        return;
      }

      const heightDifference = initialHeight - window.visualViewport.height;

      // Keyboard is considered visible if height decreases by more than 20%
      const keyboardWasVisible = isKeyboardVisible;
      isKeyboardVisible = heightDifference > initialHeight * 0.2;

      if (keyboardWasVisible !== isKeyboardVisible) {
        updateKeyboardState(isKeyboardVisible, heightDifference);
      }
    };

    const updateKeyboardState = (visible: boolean, heightDiff: number) => {
      if (import.meta.env.DEV) {
        console.log(
          "[useKeyboardResize] Keyboard state change - visible:",
          visible,
          "height diff:",
          heightDiff,
        );
      }

      // Update CSS custom property for keyboard height
      document.documentElement.style.setProperty(
        "--keyboard-height",
        visible ? `${heightDiff}px` : "0px",
      );

      // Trigger a resize event to force layout recalculation
      window.dispatchEvent(new Event("resize"));

      // Small delay to ensure DOM updates are processed
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 50);

      // Scroll the input field into view when keyboard appears
      if (visible) {
        scrollInputIntoView();
      }
    };

    const scrollInputIntoView = () => {
      // Find the textarea input element
      const inputElement = document.querySelector(
        'textarea[placeholder*="Message"]',
      ) as HTMLTextAreaElement | null;

      if (inputElement) {
        if (import.meta.env.DEV) {
          console.log("[useKeyboardResize] Scrolling input into view");
        }
        // Use setTimeout to ensure the keyboard animation has started
        setTimeout(() => {
          inputElement.scrollIntoView({
            behavior: "auto",
            block: "end",
            inline: "nearest",
          });
        }, 50);
      } else {
        if (import.meta.env.DEV) {
          console.log("[useKeyboardResize] Input element not found");
        }
      }
    };

    const scrollToBottom = () => {
      const messagesContainer = document.querySelector(
        ".flex-grow.overflow-y-auto",
      ) as HTMLElement | null;

      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    };

    const handleAndroidKeyboardShow = () => {
      if (import.meta.env.DEV) {
        console.log("[useKeyboardResize] keyboardDidShow event fired");
      }
      if (!isKeyboardVisible) {
        isKeyboardVisible = true;
        updateKeyboardState(true, 300); // Fallback height
      }
    };

    const handleAndroidKeyboardHide = () => {
      if (import.meta.env.DEV) {
        console.log("[useKeyboardResize] keyboardDidHide event fired");
      }
      if (isKeyboardVisible) {
        isKeyboardVisible = false;
        updateKeyboardState(false, 0);
      }
    };

    const handleWindowResize = () => {
      if (!isKeyboardVisible) {
        initialHeight = window.visualViewport?.height || window.innerHeight;
      }
    };

    // Prefer visualViewport API for reliable keyboard height detection
    // This is stable across devices and doesn't rely on native height measurement
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleVisualViewport);
      window.visualViewport.addEventListener("scroll", handleVisualViewport);
    }

    window.addEventListener("resize", handleWindowResize);

    // Listen for native Android keyboard events (for backward compatibility)
    window.addEventListener("keyboardDidShow", handleAndroidKeyboardShow);
    window.addEventListener("keyboardDidHide", handleAndroidKeyboardHide);

    // Cleanup
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener(
          "resize",
          handleVisualViewport,
        );
        window.visualViewport.removeEventListener(
          "scroll",
          handleVisualViewport,
        );
      }
      window.removeEventListener("resize", handleWindowResize);
      window.removeEventListener("keyboardDidShow", handleAndroidKeyboardShow);
      window.removeEventListener("keyboardDidHide", handleAndroidKeyboardHide);

      // Reset CSS property
      document.documentElement.style.removeProperty("--keyboard-height");
    };
  }, []);
};
