/**
 * Tests Covered
 * - shows loading state while data requests are pending
 * - renders portfolio summary metrics correctly (credits, invested, gained, coins)
 * - calculates and displays correct invested amount (discounts applied)
 * - renders buy history table with correct rows, credits (+), amounts, and discount notation
 * - renders sell history table with correct rows, credits (-), and received amounts
 * - shows empty state messages when no buy transactions exist
 * - shows empty state messages when no sell transactions exist
 * - mounts transaction graph container with correct height when transactions are present
 * - handles missing user data gracefully (coins fall back to 0)
 * - uses scoped queries (within) to avoid duplicate text match errors (e.g. ₹ amounts in summary + table)
 */

/// <reference types="@testing-library/jest-dom" />

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import axios from "axios";

import Holdings from "../pages/Holdings"; // adjust path if needed

jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;

// Prevent vis-network canvas crash in JSDOM
jest.mock("vis-network/standalone", () => ({
  Network: jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
    fit: jest.fn(),
  })),
  DataSet: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
  })),
}));



const sampleTransactions = [
  {
    _id: "tx-buy-1",
    credits: 50,
    totalAmount: 5000,
    discountApplied: 1000,
    createdAt: "2025-11-10T10:00:00Z",
    buyerCompany: { _id: "my-company", name: "My Corp" },
    sellerCompany: { _id: "seller-a", name: "Green Ltd" },
  },
  {
    _id: "tx-sell-1",
    credits: 20,
    totalAmount: 2400,
    createdAt: "2025-12-05T14:30:00Z",
    buyerCompany: { _id: "buyer-b", name: "Eco Trade" },
    sellerCompany: { _id: "my-company", name: "My Corp" },
  },
  {
    _id: "tx-buy-2",
    credits: 30,
    totalAmount: 2700,
    discountApplied: 0,
    createdAt: "2026-02-18T09:15:00Z",
    buyerCompany: { _id: "my-company", name: "My Corp" },
    sellerCompany: { _id: "seller-c", name: "Carbon Co" },
  },
];

function setUserSession(coins = 220) {
  localStorage.setItem("token", "fake-token-abc123");
  localStorage.setItem(
    "user",
    JSON.stringify({
      company: "my-company",
      companyName: "My Corp",
      points: coins,
      coins: coins,
    })
  );
}

describe("Holdings page", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    setUserSession();

    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/transactions/my-transactions")) {
        return Promise.resolve({ data: sampleTransactions });
      }
      if (url.includes("/company/my-company/credits")) {
        return Promise.resolve({ data: { carbonCredits: 60 } });
      }
      return Promise.reject(new Error(`Unexpected axios GET: ${url}`));
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("shows loading state while data is fetching", () => {
    mockedAxios.get.mockImplementation(() => new Promise(() => {}));

    render(<Holdings />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders portfolio summary with correct calculated values", async () => {
    render(<Holdings />);

    await screen.findByText("Available Credits");

    expect(screen.getByText("60")).toBeInTheDocument();
    expect(screen.getByText("₹6700.00")).toBeInTheDocument();

    // Scope to summary card to avoid duplicate ₹2400.00 in table
    const gainedCard = screen.getByText("Money Gained (Selling)").closest("div")!;
    expect(within(gainedCard).getByText("₹2400.00")).toBeInTheDocument();

    expect(screen.getByText("220")).toBeInTheDocument();
  });

  it("renders buy history table with correct rows and formatting", async () => {
    render(<Holdings />);

    await screen.findByText("Buy History");

    expect(screen.getByText("Green Ltd")).toBeInTheDocument();
    expect(screen.getByText("Carbon Co")).toBeInTheDocument();

    expect(screen.getByText("+50")).toBeInTheDocument();
    expect(screen.getByText("+30")).toBeInTheDocument();

    expect(screen.getByText("₹4000.00 + 100 coins")).toBeInTheDocument();
    expect(screen.getByText("₹2700.00")).toBeInTheDocument();
  });

  it("renders sell history table correctly", async () => {
    render(<Holdings />);

    await screen.findByText("Sell History");

    expect(screen.getByText("Eco Trade")).toBeInTheDocument();
    expect(screen.getByText("-20")).toBeInTheDocument();

    // Scope to sell history section to avoid duplicate ₹2400.00 in summary
    const sellSection = screen.getByText("Sell History").closest("div")!;
    expect(within(sellSection).getByText("₹2400.00")).toBeInTheDocument();
  });

  it("shows empty message when there are no buy transactions", async () => {
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes("/transactions/my-transactions")) {
        return Promise.resolve({ data: [sampleTransactions[1]] });
      }
      if (url.includes("/company")) {
        return Promise.resolve({ data: { carbonCredits: 0 } });
      }
      return Promise.reject(new Error("mock error"));
    });

    render(<Holdings />);

    await screen.findByText("No buy transactions yet.");
    expect(screen.queryByText("Green Ltd")).not.toBeInTheDocument();
  });

  it("shows empty message when there are no sell transactions", async () => {
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes("/transactions/my-transactions")) {
        return Promise.resolve({ data: [sampleTransactions[0], sampleTransactions[2]] });
      }
      if (url.includes("/company")) {
        return Promise.resolve({ data: { carbonCredits: 80 } });
      }
      return Promise.reject(new Error("mock error"));
    });

    render(<Holdings />);

    await screen.findByText("No sell transactions yet.");
  });

  it("renders graph container when there are transactions", async () => {
    render(<Holdings />);

    await waitFor(() => {
      const graph = document.getElementById("transaction-graph");
      expect(graph).toBeInTheDocument();
      expect(graph).toHaveStyle({ height: "500px" });
    });
  });

  it("handles missing user data gracefully (coins fallback to 0)", async () => {
    localStorage.removeItem("user");

    render(<Holdings />);

    await screen.findByText("Portfolio Overview");

    const coinsElement = screen.getByText("0", { selector: ".text-yellow-600" });
    expect(coinsElement).toBeInTheDocument();
  });
});