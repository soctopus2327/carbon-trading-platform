import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import AdminDashboard from "../../pages/admin/AdminDashboard";
import * as platformAdminApi from "../../api/platformAdminApi";

jest.mock("../../api/platformAdminApi");

const mockFetchDashboardStats = platformAdminApi.fetchDashboardStats as jest.MockedFunction<
  typeof platformAdminApi.fetchDashboardStats
>;

const mockStats = {
  totalCompanies: 120,
  pendingCompanies: 15,
  activeCompanies: 90,
  rejectedCompanies: 10,
  blockedCompanies: 5,
  totalUsers: 340,
  totalTrades: 78,
  totalTransactions: 250,
  totalCarbonCredits: 1500000,
};

describe("AdminDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state initially", () => {
    mockFetchDashboardStats.mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    render(<AdminDashboard />);
    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
  });

  it("renders all stats after successful data fetch", async () => {
    mockFetchDashboardStats.mockResolvedValue(mockStats);

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Platform Overview")).toBeInTheDocument();
    });

    expect(screen.getByText("Total Companies")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();

    expect(screen.getByText("Pending Approval")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();

    expect(screen.getByText("Active Companies")).toBeInTheDocument();
    expect(screen.getByText("90")).toBeInTheDocument();

    expect(screen.getByText("Rejected Companies")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();

    expect(screen.getByText("Blocked Companies")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders platform activity stats", async () => {
    mockFetchDashboardStats.mockResolvedValue(mockStats);

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Total Users")).toBeInTheDocument();
    });

    expect(screen.getByText("340")).toBeInTheDocument();
    expect(screen.getByText("Trade Listings")).toBeInTheDocument();
    expect(screen.getByText("78")).toBeInTheDocument();
    expect(screen.getByText("Transactions")).toBeInTheDocument();
    expect(screen.getByText("250")).toBeInTheDocument();
  });

  it("formats total carbon credits with toLocaleString", async () => {
    mockFetchDashboardStats.mockResolvedValue(mockStats);

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Carbon Credits")).toBeInTheDocument();
    });

    // 1500000 formatted as locale string
    expect(screen.getByText((1500000).toLocaleString())).toBeInTheDocument();
  });

  it("renders error message when fetch fails", async () => {
    mockFetchDashboardStats.mockRejectedValue(new Error("Server error"));

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load stats")).toBeInTheDocument();
    });
  });

  it("renders section headings for Companies and Platform Activity", async () => {
    mockFetchDashboardStats.mockResolvedValue(mockStats);

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Companies")).toBeInTheDocument();
      expect(screen.getByText("Platform Activity")).toBeInTheDocument();
    });
  });

  it("does not render dashboard content while loading", () => {
    mockFetchDashboardStats.mockImplementation(() => new Promise(() => {}));

    render(<AdminDashboard />);

    expect(screen.queryByText("Platform Overview")).not.toBeInTheDocument();
  });

  it("renders null when stats is null after loading finishes without error", async () => {
    // Simulate an edge case where catch is not triggered but stats is null
    mockFetchDashboardStats.mockResolvedValue(null as any);

    render(<AdminDashboard />);

    await waitFor(() => {
      // Loading should have stopped; no error and no content
      expect(screen.queryByText(/loading dashboard/i)).not.toBeInTheDocument();
      expect(screen.queryByText("Platform Overview")).not.toBeInTheDocument();
    });
  });

  it("renders 5 company stat cards", async () => {
    mockFetchDashboardStats.mockResolvedValue(mockStats);

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Total Companies")).toBeInTheDocument();
    });

    const companyLabels = [
      "Total Companies",
      "Pending Approval",
      "Active Companies",
      "Rejected Companies",
      "Blocked Companies",
    ];
    companyLabels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it("renders 4 platform activity stat cards", async () => {
    mockFetchDashboardStats.mockResolvedValue(mockStats);

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Total Users")).toBeInTheDocument();
    });

    const activityLabels = ["Total Users", "Trade Listings", "Transactions", "Carbon Credits"];
    activityLabels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it("calls fetchDashboardStats exactly once on mount", async () => {
    mockFetchDashboardStats.mockResolvedValue(mockStats);

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(mockFetchDashboardStats).toHaveBeenCalledTimes(1);
    });
  });
});