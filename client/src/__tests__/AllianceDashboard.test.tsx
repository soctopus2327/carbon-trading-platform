/// src/__tests__/AllianceDashboard.test.tsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import "@testing-library/jest-dom";

import AllianceDashboard from "../pages/AllianceDashboard";

jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("AllianceDashboard", () => {
  const mockToken = "fake-jwt-token-123";

  const mockDashboardData = [
    {
      allianceId: "all1",
      allianceName: "Green Alliance",
      allianceCode: "GRN2025",
      totalTrades: 45,
      totalCredits: 1200,
    },
    {
      allianceId: "all2",
      allianceName: "Eco Partners",
      allianceCode: "ECO001",
      totalTrades: 18,
      totalCredits: 680,
    },
  ];

  const mockMembersData = [
    {
      _id: "all1",
      name: "Green Alliance",
      code: "GRN2025",
      members: [
        { _id: "c1", name: "SolarTech Ltd", companyType: "Renewable", carbonCredits: 450 },
        { _id: "c2", name: "ForestGuard Inc", carbonCredits: 750 },
      ],
    },
    {
      _id: "all2",
      name: "Eco Partners",
      code: "ECO001",
      members: [{ _id: "c3", name: "WindPower Co", companyType: "Energy" }],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem("token", mockToken);

    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/alliance/dashboard")) {
        return Promise.resolve({ data: mockDashboardData });
      }
      if (url.includes("/alliance/members")) {
        return Promise.resolve({ data: mockMembersData });
      }
      return Promise.reject(new Error("Unexpected URL"));
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  // --------------------------------------------------
  // Title
  // --------------------------------------------------
  it("renders title 'Alliance Dashboard'", async () => {
    render(<AllianceDashboard />);
    expect(await screen.findByText("Alliance Dashboard")).toBeInTheDocument();
  });

  // --------------------------------------------------
  // Total alliances count
  // --------------------------------------------------
  it("displays correct total alliances count", async () => {
    render(<AllianceDashboard />);
    expect(await screen.findByText("Total Alliances Joined")).toBeInTheDocument();
    expect(await screen.findByText("2")).toBeInTheDocument();
  });

  // --------------------------------------------------
  // Alliance cards
  // --------------------------------------------------
  it("renders alliance cards with correct header info", async () => {
    render(<AllianceDashboard />);
    expect(await screen.findByText("Green Alliance")).toBeInTheDocument();
    expect(await screen.findByText("Eco Partners")).toBeInTheDocument();
    expect(await screen.findByText("Code: GRN2025")).toBeInTheDocument();
    expect(await screen.findByText("Code: ECO001")).toBeInTheDocument();
    expect(await screen.findByText("Members: 2")).toBeInTheDocument();
    expect(await screen.findByText("Members: 1")).toBeInTheDocument();
  });

  // --------------------------------------------------
  // Member details
  // --------------------------------------------------
  it("shows member details including companyType and carbonCredits", async () => {
    render(<AllianceDashboard />);
    expect(await screen.findByText("SolarTech Ltd")).toBeInTheDocument();
    expect(await screen.findByText("Renewable")).toBeInTheDocument();
    expect(await screen.findByText("Credits: 450")).toBeInTheDocument();
    expect(await screen.findByText("ForestGuard Inc")).toBeInTheDocument();
    expect(await screen.findByText("Credits: 750")).toBeInTheDocument();
    expect(await screen.findByText("WindPower Co")).toBeInTheDocument();
    expect(await screen.findByText("Energy")).toBeInTheDocument();
  });

  // --------------------------------------------------
  // Trades + credits
  // --------------------------------------------------
  it("displays total trades and total credits per alliance", async () => {
    render(<AllianceDashboard />);
    expect(await screen.findByText("Total Trades: 45")).toBeInTheDocument();
    expect(await screen.findByText("Total Credits: 1200")).toBeInTheDocument();
    expect(await screen.findByText("Total Trades: 18")).toBeInTheDocument();
    expect(await screen.findByText("Total Credits: 680")).toBeInTheDocument();
  });

  // --------------------------------------------------
  // Empty state
  // --------------------------------------------------
  it("shows empty state when no alliances exist", async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/alliance/dashboard")) return Promise.resolve({ data: [] });
      if (url.includes("/alliance/members")) return Promise.resolve({ data: [] });
      return Promise.reject(new Error("mock error"));
    });

    render(<AllianceDashboard />);
    expect(await screen.findByText("0")).toBeInTheDocument();
    expect(screen.queryByText("Green Alliance")).not.toBeInTheDocument();
    expect(screen.queryByText("Eco Partners")).not.toBeInTheDocument();
  });

  // --------------------------------------------------
  // Alliance with no members
  // --------------------------------------------------
  it("handles alliance with no members", async () => {
    const dashboardWithEmpty = [
      {
        allianceId: "all3",
        allianceName: "Empty Alliance",
        allianceCode: "EMP001",
        totalTrades: 0,
        totalCredits: 0,
      },
    ];

    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/alliance/dashboard")) {
        return Promise.resolve({ data: dashboardWithEmpty });
      }
      if (url.includes("/alliance/members")) {
        return Promise.resolve({ data: [{ _id: "all3", members: [] }] });
      }
      return Promise.reject(new Error("mock error"));
    });

    render(<AllianceDashboard />);
    expect(await screen.findByText("Empty Alliance")).toBeInTheDocument();
    expect(await screen.findByText("Members: 0")).toBeInTheDocument();
    expect(await screen.findByText("Total Trades: 0")).toBeInTheDocument();
    expect(await screen.findByText("Total Credits: 0")).toBeInTheDocument();
  });

  // --------------------------------------------------
  // API failure
  // --------------------------------------------------
  it("handles API failure gracefully", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));

    render(<AllianceDashboard />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Dashboard load error", expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  // --------------------------------------------------
  // Missing token  ← NOW SILENCED
  // --------------------------------------------------
  it("does not crash when token is missing", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    localStorage.removeItem("token");
    mockedAxios.get.mockRejectedValue(new Error("No token"));

    render(<AllianceDashboard />);

    expect(await screen.findByText("0")).toBeInTheDocument();
    expect(screen.queryByText("Green Alliance")).not.toBeInTheDocument();
    expect(screen.queryByText("Eco Partners")).not.toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});