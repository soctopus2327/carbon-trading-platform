import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PlatformAdminLogin from "../../pages/admin/PlatformAdminLogin";
import * as platformAdminApi from "../../api/platformAdminApi";

jest.mock("../../api/platformAdminApi");

const mockPlatformAdminLogin = platformAdminApi.platformAdminLogin as jest.MockedFunction<
  typeof platformAdminApi.platformAdminLogin
>;

describe("PlatformAdminLogin", () => {
  const mockOnLoginSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("renders the login form with all required fields", () => {
    render(<PlatformAdminLogin onLoginSuccess={mockOnLoginSuccess} />);

    expect(screen.getByText("Platform Admin")).toBeInTheDocument();
    expect(screen.getByText("Secure Terminal Access")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("name@desis.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /authorize session/i })).toBeInTheDocument();
  });

  it("renders email and password input fields", () => {
    render(<PlatformAdminLogin onLoginSuccess={mockOnLoginSuccess} />);

    const emailInput = screen.getByPlaceholderText("name@desis.com");
    const passwordInput = screen.getByPlaceholderText("••••••••");

    expect(emailInput).toHaveAttribute("type", "email");
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("updates email field on user input", async () => {
    render(<PlatformAdminLogin onLoginSuccess={mockOnLoginSuccess} />);

    const emailInput = screen.getByPlaceholderText("name@desis.com");
    await userEvent.type(emailInput, "admin@desis.com");

    expect(emailInput).toHaveValue("admin@desis.com");
  });

  it("updates password field on user input", async () => {
    render(<PlatformAdminLogin onLoginSuccess={mockOnLoginSuccess} />);

    const passwordInput = screen.getByPlaceholderText("••••••••");
    await userEvent.type(passwordInput, "securepassword");

    expect(passwordInput).toHaveValue("securepassword");
  });

  it("calls platformAdminLogin with correct credentials on submit", async () => {
    mockPlatformAdminLogin.mockResolvedValue({
      token: "mock-token",
      user: { name: "Admin", email: "admin@desis.com" },
    });

    render(<PlatformAdminLogin onLoginSuccess={mockOnLoginSuccess} />);

    await userEvent.type(screen.getByPlaceholderText("name@desis.com"), "admin@desis.com");
    await userEvent.type(screen.getByPlaceholderText("••••••••"), "password123");
    fireEvent.click(screen.getByRole("button", { name: /authorize session/i }));

    await waitFor(() => {
      expect(mockPlatformAdminLogin).toHaveBeenCalledWith("admin@desis.com", "password123");
    });
  });

  it("stores token and user in localStorage on successful login", async () => {
    const mockUser = { name: "Admin", email: "admin@desis.com" };
    mockPlatformAdminLogin.mockResolvedValue({
      token: "mock-token-123",
      user: mockUser,
    });

    render(<PlatformAdminLogin onLoginSuccess={mockOnLoginSuccess} />);

    await userEvent.type(screen.getByPlaceholderText("name@desis.com"), "admin@desis.com");
    await userEvent.type(screen.getByPlaceholderText("••••••••"), "password123");
    fireEvent.click(screen.getByRole("button", { name: /authorize session/i }));

    await waitFor(() => {
      expect(localStorage.getItem("platformAdminToken")).toBe("mock-token-123");
      expect(JSON.parse(localStorage.getItem("platformAdminUser") || "{}")).toEqual(mockUser);
    });
  });

  it("calls onLoginSuccess after successful login", async () => {
    mockPlatformAdminLogin.mockResolvedValue({
      token: "token",
      user: { name: "Admin", email: "admin@desis.com" },
    });

    render(<PlatformAdminLogin onLoginSuccess={mockOnLoginSuccess} />);

    await userEvent.type(screen.getByPlaceholderText("name@desis.com"), "admin@desis.com");
    await userEvent.type(screen.getByPlaceholderText("••••••••"), "password123");
    fireEvent.click(screen.getByRole("button", { name: /authorize session/i }));

    await waitFor(() => {
      expect(mockOnLoginSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("shows error message on failed login", async () => {
    mockPlatformAdminLogin.mockRejectedValue({
      response: { data: { message: "Invalid credentials or unauthorized access." } },
    });

    render(<PlatformAdminLogin onLoginSuccess={mockOnLoginSuccess} />);

    await userEvent.type(screen.getByPlaceholderText("name@desis.com"), "wrong@email.com");
    await userEvent.type(screen.getByPlaceholderText("••••••••"), "wrongpassword");
    fireEvent.click(screen.getByRole("button", { name: /authorize session/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Invalid credentials or unauthorized access.")
      ).toBeInTheDocument();
    });
  });

  it("shows fallback error message when no server error message", async () => {
    mockPlatformAdminLogin.mockRejectedValue(new Error("Network Error"));

    render(<PlatformAdminLogin onLoginSuccess={mockOnLoginSuccess} />);

    await userEvent.type(screen.getByPlaceholderText("name@desis.com"), "admin@desis.com");
    await userEvent.type(screen.getByPlaceholderText("••••••••"), "password");
    fireEvent.click(screen.getByRole("button", { name: /authorize session/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Invalid credentials or unauthorized access.")
      ).toBeInTheDocument();
    });
  });

  it("disables the submit button while loading", async () => {
    mockPlatformAdminLogin.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 500))
    );

    render(<PlatformAdminLogin onLoginSuccess={mockOnLoginSuccess} />);

    await userEvent.type(screen.getByPlaceholderText("name@desis.com"), "admin@desis.com");
    await userEvent.type(screen.getByPlaceholderText("••••••••"), "password");
    fireEvent.click(screen.getByRole("button", { name: /authorize session/i }));

    expect(screen.getByRole("button", { name: /establishing link/i })).toBeDisabled();
  });

  it("shows loading text while submitting", async () => {
    mockPlatformAdminLogin.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 500))
    );

    render(<PlatformAdminLogin onLoginSuccess={mockOnLoginSuccess} />);

    await userEvent.type(screen.getByPlaceholderText("name@desis.com"), "admin@desis.com");
    await userEvent.type(screen.getByPlaceholderText("••••••••"), "password");
    fireEvent.click(screen.getByRole("button", { name: /authorize session/i }));

    expect(screen.getByText(/establishing link/i)).toBeInTheDocument();
  });

  it("does not call onLoginSuccess on failed login", async () => {
    mockPlatformAdminLogin.mockRejectedValue({ response: { data: { message: "Unauthorized" } } });

    render(<PlatformAdminLogin onLoginSuccess={mockOnLoginSuccess} />);

    await userEvent.type(screen.getByPlaceholderText("name@desis.com"), "admin@desis.com");
    await userEvent.type(screen.getByPlaceholderText("••••••••"), "wrongpass");
    fireEvent.click(screen.getByRole("button", { name: /authorize session/i }));

    await waitFor(() => {
      expect(mockOnLoginSuccess).not.toHaveBeenCalled();
    });
  });
});