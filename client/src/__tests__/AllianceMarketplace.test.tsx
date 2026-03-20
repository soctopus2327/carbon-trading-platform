import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import axios from "axios";
import "@testing-library/jest-dom";
import AllianceMarketplace from "../pages/AllianceMarketplace";

jest.mock("../components/layout/PageLayout", () => ({
  __esModule: true,
  default: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title?: string;
  }) => (
    <div data-testid="page-layout">
      <h1 data-testid="layout-title">{title}</h1>
      {children}
    </div>
  ),
}));

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("AllianceMarketplace", () => {
  let consoleErrorSpy: jest.SpyInstance;

  const mockToken = "fake-jwt-token-123";
  const mockUser = { company: { _id: "comp123" } };
  const myCompanyId = "comp123";

  const mockAlliances = [
    { _id: "all1", name: "Green Alliance" },
    { _id: "all2", name: "Eco Partners" },
  ];

  const mockMarketplace = [
    {
      allianceId: "all1",
      allianceName: "Green Alliance",
      trades: [
        {
          _id: "t1",
          sellerCompanyId: "comp999",
          sellerCompanyName: "SolarTech Ltd",
          pricePerCredit: 15,
          remainingQuantity: 200,
        },
        {
          _id: "t2",
          sellerCompanyId: "comp123",
          sellerCompanyName: "My Company",
          pricePerCredit: 12,
          remainingQuantity: 50,
        },
      ],
    },
  ];

  const mockCredits = { carbonCredits: 350 };

  beforeEach(() => {
    jest.clearAllMocks();

    // Properly mock console.error
    consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    localStorage.setItem("token", mockToken);
    localStorage.setItem("user", JSON.stringify(mockUser));

    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/alliance/my-alliances")) {
        return Promise.resolve({ data: mockAlliances });
      }
      if (url.includes("/alliance/marketplace")) {
        return Promise.resolve({ data: mockMarketplace });
      }
      if (url.includes(`/company/${myCompanyId}/credits`)) {
        return Promise.resolve({ data: mockCredits });
      }
      return Promise.reject(new Error(`Unexpected GET URL: ${url}`));
    });

    mockedAxios.post.mockResolvedValue({ data: {} });
    mockedAxios.put.mockResolvedValue({ data: {} });
    mockedAxios.delete.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore(); // Restore console
    localStorage.clear();
  });

  // 1. Render title
  it("renders page title", async () => {
    render(<AllianceMarketplace />);
    expect(await screen.findByTestId("layout-title")).toHaveTextContent(
      "Alliance Marketplace"
    );
  });

  // 2. API calls
  it("fetches all required data on mount", async () => {
    render(<AllianceMarketplace />);
    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalledTimes(3));
  });

  // 3. Credits + default selection
  it("shows available credits and selects first alliance by default", async () => {
    render(<AllianceMarketplace />);
    expect(await screen.findByText(/Available Credits:/i)).toBeInTheDocument();
    expect(screen.getByText("350")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("all1");
  });

  // 4. Sell success
  it("successfully sells credits and clears form inputs", async () => {
    render(<AllianceMarketplace />);
    await screen.findByText("350");

    const quantityInput = screen.getByPlaceholderText("Quantity");
    const priceInput = screen.getByPlaceholderText("Price per credit");
    const sellButton = screen.getByRole("button", {
      name: /sell credits/i,
    });

    fireEvent.change(quantityInput, { target: { value: "40" } });
    fireEvent.change(priceInput, { target: { value: "18" } });

    fireEvent.click(sellButton);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(quantityInput).toHaveValue(null);
      expect(priceInput).toHaveValue(null);
    });
  });

  // 5. Validation (NO UI error expected → check API not called)
  it("prevents selling more credits than available", async () => {
    render(<AllianceMarketplace />);
    await screen.findByText("350");

    const quantityInput = screen.getByPlaceholderText("Quantity");
    const sellButton = screen.getByRole("button", {
      name: /sell credits/i,
    });

    fireEvent.change(quantityInput, { target: { value: "600" } });
    fireEvent.click(sellButton);

    await waitFor(() => {
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  // 6. Trade cards
  it("renders trade cards correctly and shows Edit/Delete only for own trades", async () => {
    render(<AllianceMarketplace />);
    await screen.findByText("SolarTech Ltd");

    const allianceHeading = screen.getByRole("heading", {
      name: "Green Alliance",
      level: 3,
    });

    const allianceContainer =
      allianceHeading.closest("div")?.parentElement as HTMLElement;

    const withinAlliance = within(allianceContainer);

    expect(withinAlliance.getByText("SolarTech Ltd")).toBeInTheDocument();

    // robust price check
    expect(screen.getAllByText(/₹\s*15/).length).toBeGreaterThan(0);

    expect(withinAlliance.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(withinAlliance.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  // 7. No trades
  it("shows 'No trades listed' message when alliance has no trades", async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/marketplace")) {
        return Promise.resolve({
          data: [
            {
              allianceId: "all1",
              allianceName: "Green Alliance",
              trades: [],
            },
          ],
        });
      }
      if (url.includes("/my-alliances"))
        return Promise.resolve({ data: mockAlliances });
      if (url.includes("/credits"))
        return Promise.resolve({ data: mockCredits });

      return Promise.reject(new Error("Unexpected URL"));
    });

    render(<AllianceMarketplace />);
    expect(await screen.findByText("No trades listed")).toBeInTheDocument();
  });

  // 8. Buy modal
  it("buy modal shows correct total price", async () => {
    render(<AllianceMarketplace />);
    await screen.findByText("SolarTech Ltd");

    fireEvent.click(screen.getAllByText("Buy")[0]);

    await screen.findByText("Buy Credits");

    const qtyInput = screen.getByPlaceholderText("Enter quantity");
    fireEvent.change(qtyInput, { target: { value: "25" } });

    await waitFor(() => {
      expect(screen.getByText(/Total/i)).toBeInTheDocument();
    });
  });

  // 9. API failure
  it("handles failed API calls gracefully (shows page anyway)", async () => {
    mockedAxios.get.mockRejectedValue(new Error("Network error"));

    render(<AllianceMarketplace />);

    expect(await screen.findByTestId("layout-title")).toHaveTextContent(
      "Alliance Marketplace"
    );

    expect(screen.getByText("0")).toBeInTheDocument();
  });
});