import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UpdateInfo } from "../../src/store/types";

// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Create mock state
const mockState = {
  updateState: {
    isChecking: false,
    updateAvailable: false,
    updateInfo: null as UpdateInfo | null,
    lastChecked: null as string | null,
    error: null as string | null,
  },
  globalSettings: {
    autoCheckUpdates: true,
  },
};

// Mock setState function
const mockSetState = vi.fn();

// Mock the store module with both default export and setState
vi.mock("../../src/store", () => {
  const state = mockState;
  const storeMock = vi.fn((selector) => selector(state));
  (storeMock as unknown as Record<string, unknown>).setState = mockSetState;
  return {
    default: storeMock,
  };
});

// Import after mocks are set up
const { useUpdateCheck, resetUpdateCheckSession } = await import(
  "../../src/hooks/useUpdateCheck"
);

describe("useUpdateCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.updateState = {
      isChecking: false,
      updateAvailable: false,
      updateInfo: null,
      lastChecked: null,
      error: null,
    };
    mockState.globalSettings.autoCheckUpdates = true;
    // Reset the session flag between tests
    resetUpdateCheckSession?.();
  });

  it("should not check for updates when autoCheckUpdates is false", async () => {
    mockState.globalSettings.autoCheckUpdates = false;

    const { result } = renderHook(() => useUpdateCheck());

    await act(async () => {
      await result.current.checkForUpdates();
    });

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("should not check for updates when already checking", async () => {
    mockState.updateState.isChecking = true;

    const { result } = renderHook(() => useUpdateCheck());

    await act(async () => {
      await result.current.checkForUpdates();
    });

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("should call invoke when checkForUpdates is called", async () => {
    mockInvoke.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useUpdateCheck());

    await act(async () => {
      await result.current.checkForUpdates();
    });

    expect(mockInvoke).toHaveBeenCalledWith("check_for_updates");
    expect(mockSetState).toHaveBeenCalled();
  });

  it("should skip check if recently checked", async () => {
    // Set lastChecked to 30 minutes ago
    const thirtyMinutesAgo = new Date(
      Date.now() - 30 * 60 * 1000,
    ).toISOString();
    mockState.updateState.lastChecked = thirtyMinutesAgo;

    const { result } = renderHook(() => useUpdateCheck());

    await act(async () => {
      await result.current.checkForUpdates();
    });

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("should allow check if checked more than an hour ago", async () => {
    // Set lastChecked to 2 hours ago
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    mockState.updateState.lastChecked = twoHoursAgo;
    mockInvoke.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useUpdateCheck());

    await act(async () => {
      await result.current.checkForUpdates();
    });

    expect(mockInvoke).toHaveBeenCalledWith("check_for_updates");
    expect(mockSetState).toHaveBeenCalled();
  });
});
