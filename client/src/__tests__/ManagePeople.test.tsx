// Tests Covered
// Non-admin access redirect to dashboard
// Admin user list loading and rendering
// Add user flow with trimmed inputs and success message
// Role update flow
// Remove user flow
// Redirect behavior on 403 from fetch
// Error message rendering when add fails
// Fallback to localStorage role when user JSON is malformed
// Empty users payload handling when API omits users
// Add-user flow when response has no user object (reload path)
// Fallback error text when add fails without backend message
// Fallback error text when role update fails without backend message
// Fallback error text when remove fails without backend message
// Redirect to dashboard when role update returns 403

/// <reference types="@testing-library/jest-dom" />

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ManagePeople from "../pages/ManagePeople";
import * as companyUsersApi from "../api/companyUsersApi";

jest.mock("../api/companyUsersApi");

const mockFetchCompanyUsers =
  companyUsersApi.fetchCompanyUsers as jest.MockedFunction<typeof companyUsersApi.fetchCompanyUsers>;
const mockAddCompanyUser =
  companyUsersApi.addCompanyUser as jest.MockedFunction<typeof companyUsersApi.addCompanyUser>;
const mockUpdateCompanyUserRole =
  companyUsersApi.updateCompanyUserRole as jest.MockedFunction<typeof companyUsersApi.updateCompanyUserRole>;
const mockRemoveCompanyUser =
  companyUsersApi.removeCompanyUser as jest.MockedFunction<typeof companyUsersApi.removeCompanyUser>;

const adminUser = {
  _id: "admin-1",
  name: "Admin User",
  email: "admin@company.com",
  role: "ADMIN",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const teammateUser = {
  _id: "user-2",
  name: "Teammate",
  email: "teammate@company.com",
  role: "TRADER",
  createdAt: "2026-01-02T00:00:00.000Z",
};

function setAdminSession() {
  localStorage.setItem(
    "user",
    JSON.stringify({
      _id: "admin-1",
      role: "ADMIN",
    })
  );
}

describe("ManagePeople page", () => {
  let replaceStateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    replaceStateSpy = jest
      .spyOn(window.history, "replaceState")
      .mockImplementation(() => undefined);

    mockFetchCompanyUsers.mockResolvedValue({
      users: [adminUser, teammateUser],
    });

    mockAddCompanyUser.mockResolvedValue({
      message: "User added successfully",
      user: {
        _id: "user-3",
        name: "New Trader",
        email: "new.user@company.com",
        role: "AUDITOR",
        createdAt: "2026-01-03T00:00:00.000Z",
      },
      tempPassword: "Temp@1234",
    });

    mockUpdateCompanyUserRole.mockResolvedValue({
      message: "User role updated successfully",
      user: {
        ...teammateUser,
        role: "AUDITOR",
      },
    });

    mockRemoveCompanyUser.mockResolvedValue({
      message: "User removed successfully",
    });
  });

  afterEach(() => {
    replaceStateSpy.mockRestore();
  });

  it("redirects non-admin users to dashboard", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({
        _id: "viewer-1",
        role: "VIEWER",
      })
    );

    const setPage = jest.fn();

    render(<ManagePeople setPage={setPage} />);

    await waitFor(() => {
      expect(setPage).toHaveBeenCalledWith("dashboard");
    });

    expect(replaceStateSpy).toHaveBeenCalledWith({}, "", "/dashboard");
    expect(
      screen.getByText("Access denied. Only company admin can manage users.")
    ).toBeInTheDocument();
  });

  it("loads and displays company users for admin", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({
        _id: "admin-1",
        role: "ADMIN",
      })
    );

    const setPage = jest.fn();

    render(<ManagePeople setPage={setPage} />);

    await waitFor(() => {
      expect(screen.getByText("Admin User")).toBeInTheDocument();
    });

    expect(mockFetchCompanyUsers).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Admin User")).toBeInTheDocument();
    expect(screen.getByText("teammate@company.com")).toBeInTheDocument();
    expect(screen.getByText("ADMIN (self)")).toBeInTheDocument();
    expect(screen.getByText("Cannot remove self")).toBeInTheDocument();
  });

  it("adds a user and shows success message with temporary password", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({
        _id: "admin-1",
        role: "ADMIN",
      })
    );

    const setPage = jest.fn();

    render(<ManagePeople setPage={setPage} />);

    await waitFor(() => {
      expect(screen.getByText("Teammate")).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText("Name (optional)");
    const emailInput = screen.getByPlaceholderText("Email");
    const roleSelect = screen.getAllByRole("combobox")[0];

    await userEvent.type(nameInput, "  New Trader  ");
    await userEvent.type(emailInput, "  new.user@company.com  ");
    fireEvent.change(roleSelect, { target: { value: "AUDITOR" } });
    fireEvent.click(screen.getByRole("button", { name: "Add User" }));

    await waitFor(() => {
      expect(mockAddCompanyUser).toHaveBeenCalledWith({
        name: "New Trader",
        email: "new.user@company.com",
        role: "AUDITOR",
      });
    });

    expect(
      screen.getByText("User added successfully. Temporary password: Temp@1234")
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("VIEWER")).toBeInTheDocument();
    expect(nameInput).toHaveValue("");
    expect(emailInput).toHaveValue("");
    expect(screen.getByText("new.user@company.com")).toBeInTheDocument();
  });

  it("updates another user role and shows success feedback", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({
        _id: "admin-1",
        role: "ADMIN",
      })
    );

    const setPage = jest.fn();

    render(<ManagePeople setPage={setPage} />);

    await waitFor(() => {
      expect(screen.getByText("Teammate")).toBeInTheDocument();
    });

    const roleSelects = screen.getAllByRole("combobox");
    const teammateRoleSelect = roleSelects[1];

    fireEvent.change(teammateRoleSelect, { target: { value: "AUDITOR" } });

    await waitFor(() => {
      expect(mockUpdateCompanyUserRole).toHaveBeenCalledWith("user-2", "AUDITOR");
    });

    await waitFor(() => {
      expect(
        screen.getByText("User role updated successfully.")
      ).toBeInTheDocument();
    });
  });

  it("removes another user from the table", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({
        _id: "admin-1",
        role: "ADMIN",
      })
    );

    const setPage = jest.fn();

    render(<ManagePeople setPage={setPage} />);

    await waitFor(() => {
      expect(screen.getByText("teammate@company.com")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove User" }));

    await waitFor(() => {
      expect(mockRemoveCompanyUser).toHaveBeenCalledWith("user-2");
    });

    await waitFor(() => {
      expect(screen.queryByText("teammate@company.com")).not.toBeInTheDocument();
    });

    expect(screen.getByText("User removed successfully.")).toBeInTheDocument();
  });

  it("redirects admin to dashboard when user fetch returns 403", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({
        _id: "admin-1",
        role: "ADMIN",
      })
    );

    mockFetchCompanyUsers.mockRejectedValueOnce({
      response: { status: 403 },
    });

    const setPage = jest.fn();

    render(<ManagePeople setPage={setPage} />);

    await waitFor(() => {
      expect(setPage).toHaveBeenCalledWith("dashboard");
    });

    expect(replaceStateSpy).toHaveBeenCalledWith({}, "", "/dashboard");
  });

  it("shows API error message when add user fails", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({
        _id: "admin-1",
        role: "ADMIN",
      })
    );

    mockAddCompanyUser.mockRejectedValueOnce({
      response: {
        status: 400,
        data: { message: "Email already exists" },
      },
    });

    const setPage = jest.fn();

    render(<ManagePeople setPage={setPage} />);

    await waitFor(() => {
      expect(screen.getByText("Teammate")).toBeInTheDocument();
    });

    await userEvent.type(screen.getByPlaceholderText("Email"), "test@company.com");
    fireEvent.click(screen.getByRole("button", { name: "Add User" }));

    await waitFor(() => {
      expect(screen.getByText("Email already exists")).toBeInTheDocument();
    });
  });

  it("uses localStorage role fallback when user JSON is invalid", async () => {
    localStorage.setItem("user", "{invalid-json");
    localStorage.setItem("role", "ADMIN");

    const setPage = jest.fn();

    render(<ManagePeople setPage={setPage} />);

    await waitFor(() => {
      expect(mockFetchCompanyUsers).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText("Teammate")).toBeInTheDocument();
    });

    expect(setPage).not.toHaveBeenCalledWith("dashboard");
  });

  it("shows empty state when API returns no users field", async () => {
    setAdminSession();
    mockFetchCompanyUsers.mockResolvedValueOnce({} as any);

    const setPage = jest.fn();

    render(<ManagePeople setPage={setPage} />);

    await waitFor(() => {
      expect(screen.getByText("No users found in your company.")).toBeInTheDocument();
    });
  });

  it("reloads users when add response has no user object", async () => {
    setAdminSession();
    mockAddCompanyUser.mockResolvedValueOnce({
      message: "Invitation created",
    } as any);

    const setPage = jest.fn();

    render(<ManagePeople setPage={setPage} />);

    await waitFor(() => {
      expect(screen.getByText("Teammate")).toBeInTheDocument();
    });

    await userEvent.type(screen.getByPlaceholderText("Email"), "edge@company.com");
    fireEvent.click(screen.getByRole("button", { name: "Add User" }));

    await waitFor(() => {
      expect(mockAddCompanyUser).toHaveBeenCalledWith({
        email: "edge@company.com",
        name: undefined,
        role: "VIEWER",
      });
    });

    await waitFor(() => {
      expect(mockFetchCompanyUsers).toHaveBeenCalledTimes(2);
    });

    expect(screen.getByText("Invitation created.")).toBeInTheDocument();
  });

  it("shows fallback error when add fails without backend message", async () => {
    setAdminSession();
    mockAddCompanyUser.mockRejectedValueOnce(new Error("Network error"));

    const setPage = jest.fn();

    render(<ManagePeople setPage={setPage} />);

    await waitFor(() => {
      expect(screen.getByText("Teammate")).toBeInTheDocument();
    });

    await userEvent.type(screen.getByPlaceholderText("Email"), "fallback@company.com");
    fireEvent.click(screen.getByRole("button", { name: "Add User" }));

    await waitFor(() => {
      expect(screen.getByText("Failed to add user")).toBeInTheDocument();
    });
  });

  it("shows fallback error when update role fails without backend message", async () => {
    setAdminSession();
    mockUpdateCompanyUserRole.mockRejectedValueOnce(new Error("Network error"));

    const setPage = jest.fn();

    render(<ManagePeople setPage={setPage} />);

    await waitFor(() => {
      expect(screen.getByText("Teammate")).toBeInTheDocument();
    });

    const roleSelects = screen.getAllByRole("combobox");
    fireEvent.change(roleSelects[1], { target: { value: "AUDITOR" } });

    await waitFor(() => {
      expect(screen.getByText("Failed to update role")).toBeInTheDocument();
    });
  });

  it("shows fallback error when remove fails without backend message", async () => {
    setAdminSession();
    mockRemoveCompanyUser.mockRejectedValueOnce(new Error("Network error"));

    const setPage = jest.fn();

    render(<ManagePeople setPage={setPage} />);

    await waitFor(() => {
      expect(screen.getByText("Teammate")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove User" }));

    await waitFor(() => {
      expect(screen.getByText("Failed to remove user")).toBeInTheDocument();
    });
  });

  it("redirects to dashboard when role update returns 403", async () => {
    setAdminSession();
    mockUpdateCompanyUserRole.mockRejectedValueOnce({
      response: { status: 403 },
    });

    const setPage = jest.fn();

    render(<ManagePeople setPage={setPage} />);

    await waitFor(() => {
      expect(screen.getByText("Teammate")).toBeInTheDocument();
    });

    const roleSelects = screen.getAllByRole("combobox");
    fireEvent.change(roleSelects[1], { target: { value: "AUDITOR" } });

    await waitFor(() => {
      expect(setPage).toHaveBeenCalledWith("dashboard");
    });

    expect(replaceStateSpy).toHaveBeenCalledWith({}, "", "/dashboard");
  });
});
