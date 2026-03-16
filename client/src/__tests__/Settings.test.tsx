// Tests Covered
// Loading state while requests are pending.
// Empty company state when token or company context is missing.
// Register Company button navigation via setPage.
// Company profile rendering from dashboard payload.
// Active users count from users endpoint.
// Fallback active users count from dashboard payload when users endpoint fails.
// Dataset company selection persistence to localStorage.
// Dataset upload success flow:
// parse, save, option refresh behavior, selected company update, success message.
// Dataset upload error flow with alert rendering.

/// <reference types="@testing-library/jest-dom" />

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";

import Settings from "../pages/Settings";
import * as dashboardMock from "../data/dashboard.mock";

jest.mock("axios");
jest.mock("../data/dashboard.mock", () => ({
	DASHBOARD_COMPANY_STORAGE_KEY: "dashboardSelectedCompany",
	getDashboardCompanyOptions: jest.fn(() => ["Alpha Corp", "Beta Corp"]),
	getDashboardDataset: jest.fn((company?: string | null) => ({
		company: company || "Alpha Corp",
		stats: [],
		emissionsTrend: [],
		portfolioDistribution: [],
	})),
	parseDashboardUploadPayload: jest.fn(),
	saveUploadedDashboardData: jest.fn(),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockGetDashboardCompanyOptions =
	dashboardMock.getDashboardCompanyOptions as jest.MockedFunction<typeof dashboardMock.getDashboardCompanyOptions>;
const mockGetDashboardDataset =
	dashboardMock.getDashboardDataset as jest.MockedFunction<typeof dashboardMock.getDashboardDataset>;
const mockParseDashboardUploadPayload =
	dashboardMock.parseDashboardUploadPayload as jest.MockedFunction<typeof dashboardMock.parseDashboardUploadPayload>;
const mockSaveUploadedDashboardData =
	dashboardMock.saveUploadedDashboardData as jest.MockedFunction<typeof dashboardMock.saveUploadedDashboardData>;

describe("Settings page", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		localStorage.clear();

		mockGetDashboardCompanyOptions.mockReturnValue(["Alpha Corp", "Beta Corp"]);
		mockGetDashboardDataset.mockImplementation((company?: string | null) => ({
			company: company || "Alpha Corp",
			stats: [],
			emissionsTrend: [],
			portfolioDistribution: [],
		}));

		mockedAxios.get.mockImplementation((url) => {
			if (url === "http://localhost:5000/company/dashboard") {
				return Promise.resolve({
					data: {
						name: "Acme Carbon Pvt Ltd",
						companyType: "COMPANY",
						carbonCredits: 450,
						status: "ACTIVE",
					},
				});
			}

			if (url === "http://localhost:5000/company/users") {
				return Promise.resolve({ data: { users: [{}, {}, {}] } });
			}

			return Promise.reject(new Error("Unexpected URL"));
		});
	});

	it("shows loading UI while data is being fetched", () => {
		localStorage.setItem("token", "token-1");
		localStorage.setItem("user", JSON.stringify({ company: "company-1" }));

		mockedAxios.get.mockImplementation(() => new Promise(() => {}));

		render(<Settings />);

		expect(screen.getByText("Loading settings...")).toBeInTheDocument();
	});

	it("shows empty company state and allows register navigation", async () => {
		const setPage = jest.fn();

		render(<Settings setPage={setPage} />);

		expect(await screen.findByText("No Company Registered")).toBeInTheDocument();
		expect(mockedAxios.get).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole("button", { name: "Register Company" }));
		expect(setPage).toHaveBeenCalledWith("register");
	});

	it("renders company profile details and active users count", async () => {
		localStorage.setItem("token", "token-1");
		localStorage.setItem("user", JSON.stringify({ company: "company-1" }));

		render(<Settings />);

		expect(await screen.findByDisplayValue("Acme Carbon Pvt Ltd")).toBeInTheDocument();
		expect(screen.getByDisplayValue("COMPANY")).toBeInTheDocument();
		expect(screen.getByText("450 tons")).toBeInTheDocument();

		await waitFor(() => {
			expect(screen.getByText("3 users")).toBeInTheDocument();
		});

		expect(screen.getByText("ACTIVE")).toBeInTheDocument();
		expect(mockGetDashboardDataset).toHaveBeenCalledWith("Alpha Corp");
	});

	it("falls back to dashboard users count when users endpoint fails", async () => {
		localStorage.setItem("token", "token-1");
		localStorage.setItem("user", JSON.stringify({ company: "company-1" }));

		mockedAxios.get.mockImplementation((url) => {
			if (url === "http://localhost:5000/company/dashboard") {
				return Promise.resolve({
					data: {
						name: "Acme Carbon Pvt Ltd",
						companyType: "COMPANY",
						carbonCredits: 450,
						status: "ACTIVE",
						users: [{}, {}],
					},
				});
			}
			if (url === "http://localhost:5000/company/users") {
				return Promise.reject(new Error("Forbidden"));
			}
			return Promise.reject(new Error("Unexpected URL"));
		});

		render(<Settings />);

		expect(await screen.findByDisplayValue("Acme Carbon Pvt Ltd")).toBeInTheDocument();

		await waitFor(() => {
			expect(screen.getByText("2 users")).toBeInTheDocument();
		});
	});

	it("updates selected dashboard company and persists it", async () => {
		localStorage.setItem("token", "token-1");
		localStorage.setItem("user", JSON.stringify({ company: "company-1" }));

		render(<Settings />);

		await screen.findByDisplayValue("Acme Carbon Pvt Ltd");

		const select = screen.getByLabelText("Company Dataset") as HTMLSelectElement;
		expect(select.value).toBe("Alpha Corp");

		fireEvent.change(select, { target: { value: "Beta Corp" } });

		expect(localStorage.getItem(dashboardMock.DASHBOARD_COMPANY_STORAGE_KEY)).toBe("Beta Corp");
		await waitFor(() => {
			expect(mockGetDashboardDataset).toHaveBeenLastCalledWith("Beta Corp");
		});
	});

	it("uploads dataset JSON successfully and shows success feedback", async () => {
		localStorage.setItem("token", "token-1");
		localStorage.setItem("user", JSON.stringify({ company: "company-1" }));

		const uploadedDataset = {
			"Uploaded Co": {
				company: "Uploaded Co",
				stats: [],
				emissionsTrend: [],
				portfolioDistribution: [],
			},
		};

		mockGetDashboardCompanyOptions.mockReturnValue([
			"Alpha Corp",
			"Beta Corp",
			"Uploaded Co",
		]);

		mockParseDashboardUploadPayload.mockReturnValue(uploadedDataset as any);

		render(<Settings />);

		await screen.findByDisplayValue("Acme Carbon Pvt Ltd");

		const fileInput = screen.getByLabelText("Upload JSON Dataset") as HTMLInputElement;
		const file = new File([JSON.stringify({ company: "Uploaded Co" })], "dashboard-upload.json", {
			type: "application/json",
		});
		Object.defineProperty(file, "text", {
			value: jest.fn().mockResolvedValue(JSON.stringify({ company: "Uploaded Co" })),
		});

		fireEvent.change(fileInput, { target: { files: [file] } });

		await waitFor(() => {
			expect(mockParseDashboardUploadPayload).toHaveBeenCalledWith({ company: "Uploaded Co" });
		});

		expect(mockSaveUploadedDashboardData).toHaveBeenCalledWith(uploadedDataset);
		expect(
			await screen.findByText("Uploaded 1 company dataset(s) from dashboard-upload.json.")
		).toBeInTheDocument();

		const select = screen.getByLabelText("Company Dataset") as HTMLSelectElement;
		expect(select.value).toBe("Uploaded Co");
		expect(localStorage.getItem(dashboardMock.DASHBOARD_COMPANY_STORAGE_KEY)).toBe("Uploaded Co");
	});

	it("shows upload error feedback when parser fails", async () => {
		localStorage.setItem("token", "token-1");
		localStorage.setItem("user", JSON.stringify({ company: "company-1" }));

		mockParseDashboardUploadPayload.mockImplementation(() => {
			throw new Error("Invalid dataset payload.");
		});

		render(<Settings />);

		await screen.findByDisplayValue("Acme Carbon Pvt Ltd");

		const fileInput = screen.getByLabelText("Upload JSON Dataset") as HTMLInputElement;
		const file = new File([JSON.stringify({ bad: true })], "invalid.json", {
			type: "application/json",
		});
		Object.defineProperty(file, "text", {
			value: jest.fn().mockResolvedValue(JSON.stringify({ bad: true })),
		});

		fireEvent.change(fileInput, { target: { files: [file] } });

		const error = await screen.findByRole("alert");
		expect(error).toHaveTextContent("Invalid dataset payload.");
		expect(mockSaveUploadedDashboardData).not.toHaveBeenCalled();
	});
});
