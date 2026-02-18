import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  UpdateCheckButton,
  UpdateNotification,
} from "../../src/components/ui/UpdateNotification";
import type { UpdateInfo } from "../../src/store/types";

// Mock the useUpdateCheck hook
const mockUpdateCheck = {
  updateAvailable: false,
  updateInfo: null as UpdateInfo | null,
  isChecking: false,
  lastChecked: null as string | null,
  error: null as string | null,
  checkForUpdates: vi.fn(),
  downloadUpdate: vi.fn(),
  dismissUpdate: vi.fn(),
  clearError: vi.fn(),
};

vi.mock("../../src/hooks/useUpdateCheck", () => ({
  useUpdateCheck: () => mockUpdateCheck,
}));

describe("UpdateNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateCheck.updateAvailable = false;
    mockUpdateCheck.updateInfo = null;
  });

  it("should not render when no update is available", () => {
    mockUpdateCheck.updateAvailable = false;
    mockUpdateCheck.updateInfo = null;

    const { container } = render(<UpdateNotification />);
    expect(container.firstChild).toBeNull();
  });

  it("should render when update is available", () => {
    mockUpdateCheck.updateAvailable = true;
    mockUpdateCheck.updateInfo = {
      version: "0.2.5",
      releaseUrl: "https://github.com/test/release",
      downloadUrl: "https://github.com/test/download",
      releaseNotes: "New features",
      publishedAt: "2026-02-17T00:00:00Z",
    };

    render(<UpdateNotification />);
    expect(screen.getByText(/Update Available: 0.2.5/i)).toBeInTheDocument();
  });

  it("should show download button when update is available", () => {
    mockUpdateCheck.updateAvailable = true;
    mockUpdateCheck.updateInfo = {
      version: "0.2.5",
      releaseUrl: "https://github.com/test/release",
      downloadUrl: "https://github.com/test/download",
      releaseNotes: "New features",
      publishedAt: "2026-02-17T00:00:00Z",
    };

    render(<UpdateNotification />);
    expect(
      screen.getByRole("button", { name: /Download/i }),
    ).toBeInTheDocument();
  });

  it("should show release notes link when update is available", () => {
    mockUpdateCheck.updateAvailable = true;
    mockUpdateCheck.updateInfo = {
      version: "0.2.5",
      releaseUrl: "https://github.com/test/release",
      downloadUrl: "https://github.com/test/download",
      releaseNotes: "New features",
      publishedAt: "2026-02-17T00:00:00Z",
    };

    render(<UpdateNotification />);
    const releaseNotesLink = screen.getByRole("link", {
      name: /Release Notes/i,
    });
    expect(releaseNotesLink).toBeInTheDocument();
    expect(releaseNotesLink).toHaveAttribute(
      "href",
      "https://github.com/test/release",
    );
  });

  it("should call dismissUpdate when dismiss button is clicked", async () => {
    const user = userEvent.setup();
    mockUpdateCheck.updateAvailable = true;
    mockUpdateCheck.updateInfo = {
      version: "0.2.5",
      releaseUrl: "https://github.com/test/release",
      downloadUrl: "https://github.com/test/download",
      releaseNotes: "New features",
      publishedAt: "2026-02-17T00:00:00Z",
    };

    render(<UpdateNotification />);
    const dismissButton = screen.getByTitle(/Dismiss/i);

    await user.click(dismissButton);
    expect(mockUpdateCheck.dismissUpdate).toHaveBeenCalled();
  });
});

describe("UpdateCheckButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateCheck.isChecking = false;
    mockUpdateCheck.lastChecked = null;
    mockUpdateCheck.error = null;
  });

  it("should render check for updates button", () => {
    render(<UpdateCheckButton />);
    expect(
      screen.getByRole("button", { name: /Check for Updates/i }),
    ).toBeInTheDocument();
  });

  it("should show checking state when checking", () => {
    mockUpdateCheck.isChecking = true;

    render(<UpdateCheckButton />);
    expect(
      screen.getByRole("button", { name: /Checking/i }),
    ).toBeInTheDocument();
  });

  it("should show last checked time", () => {
    mockUpdateCheck.lastChecked = "2026-02-17T10:00:00Z";

    render(<UpdateCheckButton />);
    expect(screen.getByText(/Last checked:/i)).toBeInTheDocument();
  });

  it("should show error message", () => {
    mockUpdateCheck.error = "Network error";

    render(<UpdateCheckButton />);
    expect(screen.getByText(/Error: Network error/i)).toBeInTheDocument();
  });

  it("should call checkForUpdates when button is clicked", async () => {
    const user = userEvent.setup();
    render(<UpdateCheckButton />);
    const button = screen.getByRole("button", { name: /Check for Updates/i });

    await user.click(button);
    expect(mockUpdateCheck.checkForUpdates).toHaveBeenCalled();
  });
});
