import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CompanyManagement from "../../pages/admin/CompanyManagement";
import * as platformAdminApi from "../../api/platformAdminApi";

jest.mock("../../api/platformAdminApi");
jest.mock("../../components/admin/CompanyDetailModal", () => ({
  __esModule: true,
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="company-detail-modal">
      <button onClick={onClose}>Close Modal</button>
    </div>
  ),
}));
jest.mock("../../components/admin/ReasonModal", () => ({
  __esModule: true,
  default: ({
    title,
    onConfirm,
    onCancel,
  }: {
    title: string;
    onConfirm: (r: string) => void;
    onCancel: () => void;
  }) => (
    <div data-testid="reason-modal">
      <span>{title}</span>
      <button onClick={() => onConfirm("Test reason")}>Confirm Reason</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));
jest.mock("../../components/admin/ConfirmModal", () => ({
  __esModule: true,
  default: ({
    title,
    onConfirm,
    onCancel,
  }: {
    title: string;
    onConfirm: () => void;
    onCancel: () => void;
  }) => (
    <div data-testid="confirm-modal">
      <span>{title}</span>
      <button onClick={onConfirm}>Confirm Delete</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

const mockFetchCompanies = platformAdminApi.fetchCompanies as jest.MockedFunction<typeof platformAdminApi.fetchCompanies>;
const mockApproveCompany = platformAdminApi.approveCompany as jest.MockedFunction<typeof platformAdminApi.approveCompany>;
const mockRejectCompany = platformAdminApi.rejectCompany as jest.MockedFunction<typeof platformAdminApi.rejectCompany>;
const mockBlockCompany = platformAdminApi.blockCompany as jest.MockedFunction<typeof platformAdminApi.blockCompany>;
const mockUnblockCompany = platformAdminApi.unblockCompany as jest.MockedFunction<typeof platformAdminApi.unblockCompany>;
const mockDeleteCompany = platformAdminApi.deleteCompany as jest.MockedFunction<typeof platformAdminApi.deleteCompany>;

const pendingCompany = {
  _id: "company-1",
  name: "EcoVentures",
  companyType: "COMPANY",
  status: "PENDING",
  carbonCredits: 5000,
  createdAt: "2024-01-15T10:00:00Z",
};

const activeCompany = {
  _id: "company-2",
  name: "GreenTech Ltd",
  companyType: "INDIVIDUAL",
  status: "ACTIVE",
  carbonCredits: 12000,
  createdAt: "2024-02-20T10:00:00Z",
};

const blockedCompany = {
  _id: "company-3",
  name: "BlockedCorp",
  companyType: "ALLIANCE",
  status: "BLOCKED",
  carbonCredits: 0,
  createdAt: "2023-11-05T10:00:00Z",
};

const defaultResponse = {
  companies: [pendingCompany, activeCompany, blockedCompany],
  total: 3,
  totalPages: 1,
};

describe("CompanyManagement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchCompanies.mockResolvedValue(defaultResponse);
    mockApproveCompany.mockResolvedValue({});
    mockRejectCompany.mockResolvedValue({});
    mockBlockCompany.mockResolvedValue({});
    mockUnblockCompany.mockResolvedValue({});
    mockDeleteCompany.mockResolvedValue({});
  });

  it("renders the Company Management heading", async () => {
    render(<CompanyManagement />);

    await waitFor(() => {
      expect(screen.getByText("Company Management")).toBeInTheDocument();
    });
  });

  it("renders loading spinner while fetching", () => {
    mockFetchCompanies.mockImplementation(() => new Promise(() => {}));

    render(<CompanyManagement />);

    // Loader2 spinner is present as SVG — check via animate-spin class
    const spinners = document.querySelectorAll(".animate-spin");
    expect(spinners.length).toBeGreaterThan(0);
  });

  it("renders company names after successful fetch", async () => {
    render(<CompanyManagement />);

    await waitFor(() => {
      expect(screen.getByText("EcoVentures")).toBeInTheDocument();
      expect(screen.getByText("GreenTech Ltd")).toBeInTheDocument();
      expect(screen.getByText("BlockedCorp")).toBeInTheDocument();
    });
  });

  it("shows 'No companies found' when list is empty", async () => {
    mockFetchCompanies.mockResolvedValue({ companies: [], total: 0, totalPages: 1 });

    render(<CompanyManagement />);

    await waitFor(() => {
      expect(screen.getByText("No companies found")).toBeInTheDocument();
    });
  });

  it("renders total company count in header", async () => {
    render(<CompanyManagement />);

    await waitFor(() => {
      expect(screen.getByText("3 registered entities")).toBeInTheDocument();
    });
  });

  it("renders status badges correctly", async () => {
    render(<CompanyManagement />);

    await waitFor(() => {
      expect(screen.getByText("PENDING")).toBeInTheDocument();
      expect(screen.getByText("ACTIVE")).toBeInTheDocument();
      expect(screen.getByText("BLOCKED")).toBeInTheDocument();
    });
  });

  it("renders Approve and Reject buttons for PENDING company", async () => {
    render(<CompanyManagement />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /reject/i })).toBeInTheDocument();
    });
  });

  it("renders Block button for ACTIVE company", async () => {
    render(<CompanyManagement />);

    await waitFor(() => {
      const allButtons = screen.getAllByRole("button");
      const blockBtn = allButtons.find(btn => btn.textContent?.trim() === "Block");
      expect(blockBtn).toBeInTheDocument();
    });
  });

  it("renders Unblock button for BLOCKED company", async () => {
    render(<CompanyManagement />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /unblock/i })).toBeInTheDocument();
    });
  });

  it("calls approveCompany and reloads on Approve click", async () => {
    render(<CompanyManagement />);

    await waitFor(() => screen.getByRole("button", { name: /approve/i }));
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));

    await waitFor(() => {
      expect(mockApproveCompany).toHaveBeenCalledWith("company-1");
      expect(mockFetchCompanies).toHaveBeenCalledTimes(2);
    });
  });

  it("opens ReasonModal with 'reject' action when Reject is clicked", async () => {
    render(<CompanyManagement />);

    await waitFor(() => screen.getByRole("button", { name: /reject/i }));
    fireEvent.click(screen.getByRole("button", { name: /reject/i }));

    expect(screen.getByTestId("reason-modal")).toBeInTheDocument();
    expect(screen.getByText("Reject Company")).toBeInTheDocument();
  });

  it("calls rejectCompany with reason and reloads when ReasonModal confirms reject", async () => {
    render(<CompanyManagement />);

    await waitFor(() => screen.getByRole("button", { name: /reject/i }));
    fireEvent.click(screen.getByRole("button", { name: /reject/i }));
    fireEvent.click(screen.getByText("Confirm Reason"));

    await waitFor(() => {
      expect(mockRejectCompany).toHaveBeenCalledWith("company-1", "Test reason");
      expect(mockFetchCompanies).toHaveBeenCalledTimes(2);
    });
  });

  it("opens ReasonModal with 'block' action when Block is clicked", async () => {
    render(<CompanyManagement />);

    await waitFor(() => screen.getByRole("button", { name: /^block$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^block$/i }));

    expect(screen.getByTestId("reason-modal")).toBeInTheDocument();
    expect(screen.getByText("Block Company")).toBeInTheDocument();
  });

  it("calls blockCompany with reason and reloads when ReasonModal confirms block", async () => {
    render(<CompanyManagement />);

    await waitFor(() => screen.getByRole("button", { name: /^block$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^block$/i }));
    fireEvent.click(screen.getByText("Confirm Reason"));

    await waitFor(() => {
      expect(mockBlockCompany).toHaveBeenCalledWith("company-2", "Test reason");
    });
  });

  it("calls unblockCompany and reloads on Unblock click", async () => {
    render(<CompanyManagement />);

    await waitFor(() => screen.getByRole("button", { name: /unblock/i }));
    fireEvent.click(screen.getByRole("button", { name: /unblock/i }));

    await waitFor(() => {
      expect(mockUnblockCompany).toHaveBeenCalledWith("company-3");
    });
  });

  it("opens CompanyDetailModal on company name click", async () => {
    render(<CompanyManagement />);

    await waitFor(() => screen.getByText("EcoVentures"));
    fireEvent.click(screen.getByText("EcoVentures"));

    expect(screen.getByTestId("company-detail-modal")).toBeInTheDocument();
  });

  it("closes CompanyDetailModal on close", async () => {
    render(<CompanyManagement />);

    await waitFor(() => screen.getByText("EcoVentures"));
    fireEvent.click(screen.getByText("EcoVentures"));
    fireEvent.click(screen.getByText("Close Modal"));

    await waitFor(() => {
      expect(screen.queryByTestId("company-detail-modal")).not.toBeInTheDocument();
    });
  });

  it("opens ConfirmModal on delete icon click", async () => {
    render(<CompanyManagement />);

    await waitFor(() => screen.getByText("EcoVentures"));
    // There are multiple delete buttons; click the first
    const deleteButtons = document.querySelectorAll("button svg.lucide-trash-2");
    // Use aria or closest parent approach
    const trashButtons = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector("svg")?.classList.contains("lucide-trash-2") ||
               btn.innerHTML.includes("Trash")
    );
    // Fallback: get buttons by title or test via the ConfirmModal trigger
    // The trash buttons have no accessible name, so query by SVG parent
    const allButtons = screen.getAllByRole("button");
    const trashBtn = allButtons.find((btn) => btn.innerHTML.toLowerCase().includes("trash"));
    if (trashBtn) fireEvent.click(trashBtn);

    expect(screen.getByTestId("confirm-modal")).toBeInTheDocument();
  });

  it("calls deleteCompany and reloads when ConfirmModal confirms", async () => {
    render(<CompanyManagement />);

    await waitFor(() => screen.getByText("EcoVentures"));
    const allButtons = screen.getAllByRole("button");
    const trashBtn = allButtons.find((btn) => btn.innerHTML.toLowerCase().includes("trash"));
    if (trashBtn) fireEvent.click(trashBtn);

    fireEvent.click(screen.getByText("Confirm Delete"));

    await waitFor(() => {
      expect(mockDeleteCompany).toHaveBeenCalled();
    });
  });

  it("filters companies by search input", async () => {
    render(<CompanyManagement />);

    await waitFor(() => screen.getByPlaceholderText("Search company..."));

    const searchInput = screen.getByPlaceholderText("Search company...");
    await userEvent.type(searchInput, "eco");

    await waitFor(() => {
      expect(mockFetchCompanies).toHaveBeenCalledWith(
        expect.objectContaining({ search: "eco" })
      );
    });
  });

  it("filters companies by status dropdown", async () => {
    render(<CompanyManagement />);

    await waitFor(() => screen.getByDisplayValue("All Statuses"));

    fireEvent.change(screen.getByDisplayValue("All Statuses"), {
      target: { value: "PENDING" },
    });

    await waitFor(() => {
      expect(mockFetchCompanies).toHaveBeenCalledWith(
        expect.objectContaining({ status: "PENDING" })
      );
    });
  });

  it("filters companies by type dropdown", async () => {
    render(<CompanyManagement />);

    await waitFor(() => screen.getByDisplayValue("All Types"));

    fireEvent.change(screen.getByDisplayValue("All Types"), {
      target: { value: "COMPANY" },
    });

    await waitFor(() => {
      expect(mockFetchCompanies).toHaveBeenCalledWith(
        expect.objectContaining({ type: "COMPANY" })
      );
    });
  });

  it("resets filters when Clear Filters is clicked", async () => {
    render(<CompanyManagement />);

    await waitFor(() => screen.getByText("Clear Filters"));

    // Set a filter first
    fireEvent.change(screen.getByDisplayValue("All Statuses"), {
      target: { value: "ACTIVE" },
    });

    // Now reset
    fireEvent.click(screen.getByText("Clear Filters"));

    await waitFor(() => {
      expect(screen.getByDisplayValue("All Statuses")).toBeInTheDocument();
    });
  });

  it("does not show pagination when totalPages is 1", async () => {
    render(<CompanyManagement />);

    await waitFor(() => screen.getByText("EcoVentures"));

    // Pagination arrows should not be present
    expect(screen.queryByRole("button", { name: /chevron-left/i })).not.toBeInTheDocument();
  });

  it("shows pagination when totalPages > 1", async () => {
    mockFetchCompanies.mockResolvedValue({
      companies: [pendingCompany],
      total: 30,
      totalPages: 3,
    });

    render(<CompanyManagement />);

    await waitFor(() => screen.getByText("EcoVentures"));

    // Both prev/next pagination buttons should be present (chevron buttons)
    const paginationButtons = document.querySelectorAll(".border.rounded-lg.bg-white");
    expect(paginationButtons.length).toBeGreaterThanOrEqual(2);
  });

  it("calls Refresh button to reload companies", async () => {
    render(<CompanyManagement />);

    await waitFor(() => screen.getByText("Refresh"));
    fireEvent.click(screen.getByText("Refresh"));

    await waitFor(() => {
      expect(mockFetchCompanies).toHaveBeenCalledTimes(2);
    });
  });

  it("closes ReasonModal when Cancel is clicked", async () => {
    render(<CompanyManagement />);

    await waitFor(() => screen.getByRole("button", { name: /reject/i }));
    fireEvent.click(screen.getByRole("button", { name: /reject/i }));

    expect(screen.getByTestId("reason-modal")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cancel"));

    expect(screen.queryByTestId("reason-modal")).not.toBeInTheDocument();
  });
});