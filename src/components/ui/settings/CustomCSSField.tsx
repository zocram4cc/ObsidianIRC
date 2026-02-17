import type React from "react";
import type { SettingComponentProps } from "../../../lib/settings/types";

/**
 * Custom component for managing custom CSS
 */
export const CustomCSSField: React.FC<SettingComponentProps> = ({
  value,
  onChange,
  disabled,
}) => {
  const cssValue = (value as string) || "";

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="space-y-2">
      <textarea
        value={cssValue}
        onChange={handleChange}
        disabled={disabled}
        placeholder="/* Enter your custom CSS here */&#10;.message {&#10;  background-color: #2a2a2a;&#10;}"
        rows={10}
        className="w-full rounded border border-discord-button-secondary-default bg-[#202225] px-3 py-2 font-mono text-sm text-white placeholder-discord-text-muted focus:border-discord-text-link focus:outline-none disabled:opacity-50 resize-y"
      />
      <p className="text-xs text-discord-text-muted">
        Enter custom CSS to apply to the application. Use standard CSS selectors
        to target elements.
      </p>
    </div>
  );
};

export default CustomCSSField;
