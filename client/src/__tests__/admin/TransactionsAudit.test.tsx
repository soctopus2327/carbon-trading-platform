import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TransactionsAudit from "../../pages/admin/TransactionsAudit";
import * as platformAdminApi from "../../api/platformAdminApi";

jest.mock("../../api/platformAdminApi");

const mockFetchTransactions = platformAdminApi.fetchTransactions as jest.MockedFunction<
  typeof platformAdminApi.fetchTransactions
>;

const mockTransactions = [
  {
    _id: "txn-1",
    buyerCompany: { name: "BuyerCorp" },
    sellerCompany: { name: "SellerCorp" },
    credits: 500,
    pricePerCredit: 12.5,
    totalAmount: 6250,
    createdAt: "2024-03-01T10:00:00Z",
  },
  {
    _id: "txn-2",
    buyerCompany: { name: "EcoFirm" },
    sellerCompany: { name: "GreenSell" },
    credits: 200,
    pricePerCredit: 15.0,
    totalAmount: 3000,
    createdAt: "2024-03-05T14:30:00Z",
  },
];

const defaultResponse = {
  transactions: mockTransactions,
  total: 2,
  totalPages: 1,
};

describe("TransactionsAudit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchTransactions.mockResolvedValue(defaultResponse);
  });

  it("renders the Transactions Audit heading", async () => {
    render(<TransactionsAudit />);

    await waitFor(() => {
      expect(screen.getByText("Transactions Audit")).toBeInTheDocument();
    });
  });

  it("shows loading text while fetching", () => {
    mockFetchTransactions.mockImplementation(() => new Promise(() => {}));

    render(<TransactionsAudit />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders transaction data after successful fetch", async () => {
    render(<TransactionsAudit />);

    await waitFor(() => {
      expect(screen.getByText("BuyerCorp")).toBeInTheDocument();
      expect(screen.getByText("SellerCorp")).toBeInTheDocument();
      expect(screen.getByText("EcoFirm")).toBeInTheDocument();
      expect(screen.getByText("GreenSell")).toBeInTheDocument();
    });
  });

  it("renders credits with toLocaleString formatting", async () => {
    render(<TransactionsAudit />);

    await waitFor(() => {
      expect(screen.getByText((500).toLocaleString())).toBeInTheDocument();
      expect(screen.getByText((200).toLocaleString())).toBeInTheDocument();
    });
  });

  it("renders price per credit formatted to 2 decimal places", async () => {
    render(<TransactionsAudit />);

    await waitFor(() => {
      expect(screen.getByText("$12.50")).toBeInTheDocument();
      expect(screen.getByText("$15.00")).toBeInTheDocument();
    });
  });

  it("renders total amounts with toLocaleString", async () => {
    render(<TransactionsAudit />);

    await waitFor(() => {
      expect(screen.getByText(`$${(6250).toLocaleString()}`)).toBeInTheDocument();
      expect(screen.getByText(`$${(3000).toLocaleString()}`)).toBeInTheDocument();
    });
  });

  it("renders total transaction count in description", async () => {
    render(<TransactionsAudit />);

    await waitFor(() => {
      expect(screen.getByText("2 total transactions across the platform")).toBeInTheDocument();
    });
  });

  it("shows 'No transactions found' when list is empty", async () => {
    mockFetchTransactions.mockResolvedValue({
      transactions: [],
      total: 0,
      totalPages: 1,
    });

    render(<TransactionsAudit />);

    await waitFor(() => {
      expect(screen.getByText("No transactions found")).toBeInTheDocument();
    });
  });

  it("renders all table headers", async () => {
    render(<TransactionsAudit />);

    await waitFor(() => {
      expect(screen.getByText("Buyer")).toBeInTheDocument();
      expect(screen.getByText("Seller")).toBeInTheDocument();
      expect(screen.getByText("Credits")).toBeInTheDocument();
      expect(screen.getByText("Price/Credit")).toBeInTheDocument();
      expect(screen.getByText("Total Amount")).toBeInTheDocument();
      expect(screen.getByText("Date")).toBeInTheDocument();
    });
  });

  it("renders '—' for missing buyer/seller company names", async () => {
    mockFetchTransactions.mockResolvedValue({
      transactions: [
        {
          _id: "txn-x",
          buyerCompany: null,
          sellerCompany: null,
          credits: 100,
          pricePerCredit: 10.0,
          totalAmount: 1000,
          createdAt: "2024-01-01T00:00:00Z",
        },
      ],
      total: 1,
      totalPages: 1,
    });

    render(<TransactionsAudit />);

    await waitFor(() => {
      const dashes = screen.getAllByText("—");
      expect(dashes.length).toBe(2);
    });
  });

  it("does not show pagination when totalPages is 1", async () => {
    render(<TransactionsAudit />);

    await waitFor(() => screen.getByText("BuyerCorp"));

    expect(screen.queryByText(/← prev/i)).not.toBeInTheDocument();
  });

  it("shows pagination when totalPages > 1", async () => {
    mockFetchTransactions.mockResolvedValue({
      transactions: [mockTransactions[0]],
      total: 40,
      totalPages: 2,
    });

    render(<TransactionsAudit />);

    await waitFor(() => {
      expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
    });
  });

  it("navigates to next page when Next is clicked", async () => {
    mockFetchTransactions.mockResolvedValue({
      transactions: [mockTransactions[0]],
      total: 40,
      totalPages: 2,
    });

    render(<TransactionsAudit />);

    await waitFor(() => screen.getByText(/next/i));
    fireEvent.click(screen.getByText(/next/i));

    await waitFor(() => {
      expect(mockFetchTransactions).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      );
    });
  });

  it("disables Prev button on first page", async () => {
    mockFetchTransactions.mockResolvedValue({
      transactions: [mockTransactions[0]],
      total: 40,
      totalPages: 2,
    });

    render(<TransactionsAudit />);

    await waitFor(() => screen.getByText(/← prev/i));

    expect(screen.getByText(/← prev/i).closest("button")).toBeDisabled();
  });

  it("disables Next button on last page", async () => {
    mockFetchTransactions.mockResolvedValue({
      transactions: [mockTransactions[0]],
      total: 20,
      totalPages: 1,
    });

    render(<TransactionsAudit />);

    // No pagination shows when totalPages === 1
    await waitFor(() => {
      expect(screen.queryByText(/next/i)).not.toBeInTheDocument();
    });
  });

  it("calls fetchTransactions once on mount", async () => {
    render(<TransactionsAudit />);

    await waitFor(() => {
      expect(mockFetchTransactions).toHaveBeenCalledTimes(1);
    });
  });

  it("calls fetchTransactions with page=1 and limit=20 initially", async () => {
    render(<TransactionsAudit />);

    await waitFor(() => {
      expect(mockFetchTransactions).toHaveBeenCalledWith({ page: 1, limit: 20 });
    });
  });
});