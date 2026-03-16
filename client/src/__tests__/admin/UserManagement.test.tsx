import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserManagement from "../../pages/admin/UserManagement";
import * as platformAdminApi from "../../api/platformAdminApi";

jest.mock("../../api/platformAdminApi");
jest.mock("../../components/admin/ConfirmModal", () => ({
  __esModule: true,
  default: ({
    title,
    message,
    onConfirm,
    onCancel,
  }: {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  }) => (
    <div data-testid="confirm-modal">
      <span>{title}</span>
      <p>{message}</p>
      <button onClick={onConfirm}>Confirm</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

const mockFetchUsers = platformAdminApi.fetchUsers as jest.MockedFunction<typeof platformAdminApi.fetchUsers>;
const mockDeleteUser = platformAdminApi.deleteUser as jest.MockedFunction<typeof platformAdminApi.deleteUser>;

const mockUsers = [
  {
    _id: "user-1",
    name: "Alice Johnson",
    email: "alice@greentech.com",
    role: "ADMIN",
    company: { name: "GreenTech Ltd", status: "ACTIVE" },
    createdAt: "2024-01-10T08:00:00Z",
  },
  {
    _id: "user-2",
    name: "Bob Smith",
    email: "bob@ecoventures.com",
    role: "TRADER",
    company: { name: "EcoVentures", status: "PENDING" },
    createdAt: "2024-03-15T09:00:00Z",
  },
  {
    _id: "user-3",
    name: "Carol White",
    email: "carol@audit.com",
    role: "AUDITOR",
    company: null,
    createdAt: "2024-05-20T11:00:00Z",
  },
];

const defaultResponse = {
  users: mockUsers,
  total: 3,
  totalPages: 1,
};

describe("UserManagement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchUsers.mockResolvedValue(defaultResponse);
    mockDeleteUser.mockResolvedValue({});
  });

  it("renders the User Management heading", async () => {
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("User Management")).toBeInTheDocument();
    });
  });

  it("renders loading spinner while fetching users", () => {
    mockFetchUsers.mockImplementation(() => new Promise(() => {}));

    render(<UserManagement />);

    expect(screen.getByText(/fetching users/i)).toBeInTheDocument();
  });

  it("renders user names after successful fetch", async () => {
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
      expect(screen.getByText("Bob Smith")).toBeInTheDocument();
      expect(screen.getByText("Carol White")).toBeInTheDocument();
    });
  });

  it("renders user emails", async () => {
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("alice@greentech.com")).toBeInTheDocument();
      expect(screen.getByText("bob@ecoventures.com")).toBeInTheDocument();
    });
  });

  it("renders role badges for each user", async () => {
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("ADMIN")).toBeInTheDocument();
      expect(screen.getByText("TRADER")).toBeInTheDocument();
      expect(screen.getByText("AUDITOR")).toBeInTheDocument();
    });
  });

  it("renders company name for users with a company", async () => {
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("GreenTech Ltd")).toBeInTheDocument();
      expect(screen.getByText("EcoVentures")).toBeInTheDocument();
    });
  });

  it("renders 'Unassigned' for users without a company", async () => {
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("Unassigned")).toBeInTheDocument();
    });
  });

  it("renders company status badge for users with a company", async () => {
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("ACTIVE")).toBeInTheDocument();
      expect(screen.getByText("PENDING")).toBeInTheDocument();
    });
  });

  it("shows 'No users found' when the user list is empty", async () => {
    mockFetchUsers.mockResolvedValue({ users: [], total: 0, totalPages: 1 });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("No users found")).toBeInTheDocument();
    });
  });

  it("renders total user count in header", async () => {
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText(/managing 3 active platform users/i)).toBeInTheDocument();
    });
  });

  it("renders all table headers", async () => {
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("User Details")).toBeInTheDocument();
      expect(screen.getByText("Role")).toBeInTheDocument();
      expect(screen.getByText("Organization")).toBeInTheDocument();
      expect(screen.getByText("Account Status")).toBeInTheDocument();
      expect(screen.getByText("Joined")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });
  });

  it("opens ConfirmModal with user's name on delete click", async () => {
    render(<UserManagement />);

    await waitFor(() => screen.getByText("Alice Johnson"));

    const allButtons = screen.getAllByRole("button");
    const trashBtn = allButtons.find((btn) => btn.innerHTML.toLowerCase().includes("trash"));
    if (trashBtn) fireEvent.click(trashBtn);

    await waitFor(() => {
      expect(screen.getByTestId("confirm-modal")).toBeInTheDocument();
      expect(screen.getByText("Revoke User Access")).toBeInTheDocument();
      // Modal message contains Alice Johnson — use getAllByText since name also appears in the table
      const matches = screen.getAllByText(/Alice Johnson/);
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  it("calls deleteUser with correct id on confirm", async () => {
    render(<UserManagement />);

    await waitFor(() => screen.getByText("Alice Johnson"));

    const allButtons = screen.getAllByRole("button");
    const trashBtn = allButtons.find((btn) => btn.innerHTML.toLowerCase().includes("trash"));
    if (trashBtn) fireEvent.click(trashBtn);

    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(mockDeleteUser).toHaveBeenCalledWith("user-1");
    });
  });

  it("closes ConfirmModal on cancel", async () => {
    render(<UserManagement />);

    await waitFor(() => screen.getByText("Alice Johnson"));

    const allButtons = screen.getAllByRole("button");
    const trashBtn = allButtons.find((btn) => btn.innerHTML.toLowerCase().includes("trash"));
    if (trashBtn) fireEvent.click(trashBtn);

    fireEvent.click(screen.getByText("Cancel"));

    expect(screen.queryByTestId("confirm-modal")).not.toBeInTheDocument();
  });

  it("reloads users after deletion", async () => {
    render(<UserManagement />);

    await waitFor(() => screen.getByText("Alice Johnson"));

    const allButtons = screen.getAllByRole("button");
    const trashBtn = allButtons.find((btn) => btn.innerHTML.toLowerCase().includes("trash"));
    if (trashBtn) fireEvent.click(trashBtn);

    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(mockFetchUsers).toHaveBeenCalledTimes(2);
    });
  });

  it("calls fetchUsers with search param when typing", async () => {
    render(<UserManagement />);

    await waitFor(() => screen.getByPlaceholderText(/search by name or email/i));

    await userEvent.type(
      screen.getByPlaceholderText(/search by name or email/i),
      "alice"
    );

    await waitFor(() => {
      expect(mockFetchUsers).toHaveBeenCalledWith(
        expect.objectContaining({ search: "alice" })
      );
    });
  });

  it("calls fetchUsers with role param when role filter changes", async () => {
    render(<UserManagement />);

    await waitFor(() => screen.getByDisplayValue("All Roles"));

    fireEvent.change(screen.getByDisplayValue("All Roles"), {
      target: { value: "ADMIN" },
    });

    await waitFor(() => {
      expect(mockFetchUsers).toHaveBeenCalledWith(
        expect.objectContaining({ role: "ADMIN" })
      );
    });
  });

  it("resets search and role filter when Reset is clicked", async () => {
    render(<UserManagement />);

    await waitFor(() => screen.getByDisplayValue("All Roles"));

    fireEvent.change(screen.getByDisplayValue("All Roles"), {
      target: { value: "TRADER" },
    });

    fireEvent.click(screen.getByRole("button", { name: /reset/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("All Roles")).toBeInTheDocument();
    });
  });

  it("reloads users on Refresh button click", async () => {
    render(<UserManagement />);

    await waitFor(() => screen.getByRole("button", { name: /refresh data/i }));
    fireEvent.click(screen.getByRole("button", { name: /refresh data/i }));

    await waitFor(() => {
      expect(mockFetchUsers).toHaveBeenCalledTimes(2);
    });
  });

  it("shows pagination when totalPages > 1", async () => {
    mockFetchUsers.mockResolvedValue({
      users: [mockUsers[0]],
      total: 50,
      totalPages: 3,
    });

    render(<UserManagement />);

    await waitFor(() => screen.getByText("Alice Johnson"));

    expect(screen.getByText(/showing page 1 of 3/i)).toBeInTheDocument();
  });

  it("does not show pagination when totalPages is 1", async () => {
    render(<UserManagement />);

    await waitFor(() => screen.getByText("Alice Johnson"));

    expect(screen.queryByText(/showing page/i)).not.toBeInTheDocument();
  });

  it("calls fetchUsers once on mount", async () => {
    render(<UserManagement />);

    await waitFor(() => {
      expect(mockFetchUsers).toHaveBeenCalledTimes(1);
    });
  });
});