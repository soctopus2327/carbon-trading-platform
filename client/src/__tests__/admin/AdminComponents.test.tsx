import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReasonModal from "../../components/admin/ReasonModal";
import ConfirmModal from "../../components/admin/ConfirmModal";
import PlatformAdminSidebar from "../../components/admin/PlatformAdminSidebar";

// ─────────────────────────────────────────────────
// ReasonModal Tests
// ─────────────────────────────────────────────────
describe("ReasonModal", () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders modal with the correct title", () => {
    render(
      <ReasonModal
        title="Reject Company"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText("Reject Company")).toBeInTheDocument();
  });

  it("renders default placeholder in textarea", () => {
    render(
      <ReasonModal
        title="Block Company"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByPlaceholderText("Enter reason…")).toBeInTheDocument();
  });

  it("renders custom placeholder when provided", () => {
    render(
      <ReasonModal
        title="Block Company"
        placeholder="Provide reason..."
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByPlaceholderText("Provide reason...")).toBeInTheDocument();
  });

  it("renders Cancel and Confirm buttons", () => {
    render(
      <ReasonModal
        title="Test Modal"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
  });

  it("calls onCancel when Cancel button is clicked", () => {
    render(
      <ReasonModal
        title="Test Modal"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirm with empty string when no reason entered", () => {
    render(
      <ReasonModal
        title="Test Modal"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));
    expect(mockOnConfirm).toHaveBeenCalledWith("");
  });

  it("calls onConfirm with typed reason", async () => {
    render(
      <ReasonModal
        title="Test Modal"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const textarea = screen.getByPlaceholderText("Enter reason…");
    await userEvent.type(textarea, "Violation of platform terms");
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    expect(mockOnConfirm).toHaveBeenCalledWith("Violation of platform terms");
  });

  it("updates textarea value as user types", async () => {
    render(
      <ReasonModal
        title="Test Modal"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const textarea = screen.getByPlaceholderText("Enter reason…");
    await userEvent.type(textarea, "Some reason");

    expect(textarea).toHaveValue("Some reason");
  });

  it("renders the helper text about storing the reason", () => {
    render(
      <ReasonModal
        title="Test Modal"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(
      screen.getByText(/optionally provide a reason/i)
    ).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────
// ConfirmModal Tests
// ─────────────────────────────────────────────────
describe("ConfirmModal", () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders modal title and message", () => {
    render(
      <ConfirmModal
        title="Delete Company"
        message="This action cannot be undone."
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText("Delete Company")).toBeInTheDocument();
    expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
  });

  it("renders default confirmLabel 'Confirm'", () => {
    render(
      <ConfirmModal
        title="Test"
        message="Are you sure?"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
  });

  it("renders custom confirmLabel when provided", () => {
    render(
      <ConfirmModal
        title="Delete Company"
        message="This will delete the company."
        confirmLabel="Delete"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("calls onCancel when Cancel button is clicked", () => {
    render(
      <ConfirmModal
        title="Test"
        message="Are you sure?"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirm when Confirm button is clicked", () => {
    render(
      <ConfirmModal
        title="Test"
        message="Are you sure?"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it("applies danger (red) styling when danger=true", () => {
    render(
      <ConfirmModal
        title="Delete"
        message="Irreversible action."
        confirmLabel="Delete"
        danger={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const confirmBtn = screen.getByRole("button", { name: /delete/i });
    expect(confirmBtn).toHaveClass("bg-red-600");
  });

  it("applies non-danger (indigo) styling when danger=false", () => {
    render(
      <ConfirmModal
        title="Confirm Action"
        message="Are you sure?"
        danger={false}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const confirmBtn = screen.getByRole("button", { name: /confirm/i });
    expect(confirmBtn).toHaveClass("bg-indigo-600");
  });

  it("renders the modal overlay backdrop", () => {
    render(
      <ConfirmModal
        title="Test"
        message="Test message"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const overlay = document.querySelector(".fixed.inset-0");
    expect(overlay).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────
// PlatformAdminSidebar Tests
// ─────────────────────────────────────────────────
describe("PlatformAdminSidebar", () => {
  const mockSetPage = jest.fn();
  const mockOnLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("renders the Platform Admin brand header", () => {
    render(
      <PlatformAdminSidebar page="dashboard" setPage={mockSetPage} onLogout={mockOnLogout} />
    );

    expect(screen.getByText("Platform Admin")).toBeInTheDocument();
  });

  it("renders all navigation items", () => {
    render(
      <PlatformAdminSidebar page="dashboard" setPage={mockSetPage} onLogout={mockOnLogout} />
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Companies")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Transactions")).toBeInTheDocument();
    expect(screen.getByText("Messaging")).toBeInTheDocument();
  });

  it("highlights the active navigation item", () => {
    render(
      <PlatformAdminSidebar page="companies" setPage={mockSetPage} onLogout={mockOnLogout} />
    );

    const companiesBtn = screen.getByRole("button", { name: /companies/i });
    expect(companiesBtn).toHaveClass("bg-emerald-600");
  });

  it("calls setPage with correct key when nav item is clicked", () => {
    render(
      <PlatformAdminSidebar page="dashboard" setPage={mockSetPage} onLogout={mockOnLogout} />
    );

    fireEvent.click(screen.getByText("Companies"));
    expect(mockSetPage).toHaveBeenCalledWith("companies");

    fireEvent.click(screen.getByText("Users"));
    expect(mockSetPage).toHaveBeenCalledWith("users");

    fireEvent.click(screen.getByText("Transactions"));
    expect(mockSetPage).toHaveBeenCalledWith("transactions");

    fireEvent.click(screen.getByText("Messaging"));
    expect(mockSetPage).toHaveBeenCalledWith("messaging");
  });

  it("renders admin user name from localStorage", () => {
    localStorage.setItem(
      "platformAdminUser",
      JSON.stringify({ name: "Super Admin", email: "super@desis.com" })
    );

    render(
      <PlatformAdminSidebar page="dashboard" setPage={mockSetPage} onLogout={mockOnLogout} />
    );

    expect(screen.getByText("Super Admin")).toBeInTheDocument();
    expect(screen.getByText("super@desis.com")).toBeInTheDocument();
  });

  it("renders 'Administrator' as fallback when no user in localStorage", () => {
    render(
      <PlatformAdminSidebar page="dashboard" setPage={mockSetPage} onLogout={mockOnLogout} />
    );

    expect(screen.getByText("Administrator")).toBeInTheDocument();
  });

  it("calls onLogout when Sign Out is clicked", () => {
    render(
      <PlatformAdminSidebar page="dashboard" setPage={mockSetPage} onLogout={mockOnLogout} />
    );

    fireEvent.click(screen.getByRole("button", { name: /sign out system/i }));
    expect(mockOnLogout).toHaveBeenCalledTimes(1);
  });

  it("renders 'Authenticated As' label", () => {
    render(
      <PlatformAdminSidebar page="dashboard" setPage={mockSetPage} onLogout={mockOnLogout} />
    );

    expect(screen.getByText(/authenticated as/i)).toBeInTheDocument();
  });

  it("renders Desis 2026 branding", () => {
    render(
      <PlatformAdminSidebar page="dashboard" setPage={mockSetPage} onLogout={mockOnLogout} />
    );

    expect(screen.getByText(/desis 2026/i)).toBeInTheDocument();
  });

  it("each nav item calls setPage exactly once per click", () => {
    render(
      <PlatformAdminSidebar page="dashboard" setPage={mockSetPage} onLogout={mockOnLogout} />
    );

    fireEvent.click(screen.getByText("Dashboard"));
    expect(mockSetPage).toHaveBeenCalledTimes(1);
  });
});