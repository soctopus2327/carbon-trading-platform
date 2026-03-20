/// <reference types="@testing-library/jest-dom" />
import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import Home from "../pages/Home"; // adjust import path if needed

// ────────────────────────────────────────────────
// Mocks
// ────────────────────────────────────────────────

const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, "localStorage", { value: mockLocalStorage });

(globalThis.fetch as jest.Mock) = jest.fn();

const mockSetPage = jest.fn();

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────

const mockLoggedIn = () => {
  mockLocalStorage.getItem.mockImplementation((key: string) => {
    if (key === "token") return "fake-token-xyz999";
    if (key === "user") return JSON.stringify({ id: "u001", name: "Test User" });
    if (key === "role") return "user";
    return null;
  });
};

// ────────────────────────────────────────────────
// Setup / Teardown
// ────────────────────────────────────────────────

describe("Home Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers(); // Required for setTimeout in goToLeaderboard

    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  // ────────────────────────────────────────────────
  // Tests
  // ────────────────────────────────────────────────

  it("renders hero section with title, description and CTA", () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    render(<Home setPage={mockSetPage} />);

    expect(
      screen.getByRole("heading", { level: 1, name: /Carbon Trading.*Platform/i })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Trade verified carbon credits.*sustainability goals/i)
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /Start Trading/i })).toBeInTheDocument();
  });

  it("shows Login / Signup button when not logged in", () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    render(<Home setPage={mockSetPage} />);

    expect(screen.getByRole("button", { name: /Login \/ Signup/i })).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Logout")).not.toBeInTheDocument();
  });

  it("shows authenticated navigation when logged in", async () => {
    mockLoggedIn();

    await act(async () => {
      render(<Home setPage={mockSetPage} />);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Dashboard" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Leaderboard" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Forum" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Logout" })).toBeInTheDocument();
    });
  });

  it("Start Trading navigates to dashboard when logged in", async () => {
    mockLoggedIn();

    await act(async () => {
      render(<Home setPage={mockSetPage} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Start Trading/i }));
    });

    expect(mockSetPage).toHaveBeenCalledWith("dashboard");
  });

  it("Start Trading navigates to register when not logged in", async () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    await act(async () => {
      render(<Home setPage={mockSetPage} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Start Trading/i }));
    });

    expect(mockSetPage).toHaveBeenCalledWith("register");
  });

  it("fetches and renders leaderboard data", async () => {
    mockLoggedIn();

    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { name: "Green Future Ltd", points: 4200 },
        { name: "Eco Warriors", points: 3100 },
      ],
    });

    await act(async () => {
      render(<Home setPage={mockSetPage} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Green Future Ltd")).toBeInTheDocument();
      expect(screen.getByText("4200")).toBeInTheDocument();
      expect(screen.getByText("#1")).toBeInTheDocument();
    });
  });

  it("clicking Leaderboard scrolls to leaderboard section", async () => {
    mockLoggedIn();

    const mockScrollIntoView = jest.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      value: mockScrollIntoView,
      writable: true,
    });

    await act(async () => {
      render(<Home setPage={mockSetPage} />);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Leaderboard" })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Leaderboard" }));
    });

    // Execute the setTimeout(100)
    await act(async () => {
      jest.advanceTimersByTime(200);
      jest.runOnlyPendingTimers();
    });

    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
  });

  it("logout clears storage and navigates to home", async () => {
    mockLoggedIn();

    await act(async () => {
      render(<Home setPage={mockSetPage} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    });

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("token");
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("user");
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("role");
    expect(mockSetPage).toHaveBeenCalledWith("home");
  });

  it("renders featured climate projects section", () => {
    render(<Home setPage={mockSetPage} />);

    expect(screen.getByText("Featured Climate Projects")).toBeInTheDocument();
    expect(screen.getByText("Rainforest Protection")).toBeInTheDocument();
    expect(screen.getByText("Solar Energy Farms")).toBeInTheDocument();
    expect(screen.getByText("Wind Energy Initiative")).toBeInTheDocument();
  });

  it("renders footer with correct content", () => {
    render(<Home setPage={mockSetPage} />);

    expect(screen.getByText("DESIS 2025")).toBeInTheDocument();
    expect(screen.getByText(/Transparent carbon credit marketplace/i)).toBeInTheDocument();
    expect(screen.getByText("© 2026 DESIS Carbon Trading Platform")).toBeInTheDocument();
    expect(screen.getByText("support@desis2025.com")).toBeInTheDocument();
  });
});