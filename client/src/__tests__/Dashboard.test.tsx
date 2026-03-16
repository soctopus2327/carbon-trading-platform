//Tests Covered
// Unregistered user with no uploaded datasets sees empty state and upload prompt.
// Successful JSON upload parses payload, saves uploaded data, updates selected company in localStorage, and shows success feedback.
// Upload parse failure shows error feedback and does not save data.
// Registered company path renders dashboard title, stat cards, emissions chart, and portfolio chart.
// Selected company in localStorage takes precedence over user company name for dataset selection.
// Unregistered user with uploaded datasets bypasses empty state and renders dashboard using first uploaded company.

/// <reference types="@testing-library/jest-dom" />

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import Dashboard from "../pages/Dashboard";
import * as dashboardMock from "../data/dashboard.mock";

jest.mock("../components/layout/PageLayout", () => ({
	__esModule: true,
	default: ({
		title,
		description,
		children,
	}: {
		title: string;
		description?: string;
		children: React.ReactNode;
	}) => (
		<div>
			<h1>{title}</h1>
			{description ? <p>{description}</p> : null}
			<div>{children}</div>
		</div>
	),
}));

jest.mock("../components/dashboard/StatCard", () => ({
	__esModule: true,
	default: ({ title, value }: { title: string; value: string }) => (
		<div data-testid="stat-card">
			{title}:{value}
		</div>
	),
}));

jest.mock("../components/dashboard/EmissionsChart", () => ({
	__esModule: true,
	default: ({ data }: { data: unknown }) => (
		<div data-testid="emissions-chart">{JSON.stringify(data)}</div>
	),
}));

jest.mock("../components/dashboard/PortfolioDistribution", () => ({
	__esModule: true,
	default: ({ projects }: { projects: unknown }) => (
		<div data-testid="portfolio-distribution">{JSON.stringify(projects)}</div>
	),
}));

jest.mock("../data/dashboard.mock", () => ({
	DASHBOARD_COMPANY_STORAGE_KEY: "dashboardSelectedCompany",
	getDashboardDataset: jest.fn(),
	getUploadedDashboardData: jest.fn(),
	parseDashboardUploadPayload: jest.fn(),
	saveUploadedDashboardData: jest.fn(),
}));

const mockGetDashboardDataset =
	dashboardMock.getDashboardDataset as jest.MockedFunction<typeof dashboardMock.getDashboardDataset>;
const mockGetUploadedDashboardData =
	dashboardMock.getUploadedDashboardData as jest.MockedFunction<typeof dashboardMock.getUploadedDashboardData>;
const mockParseDashboardUploadPayload =
	dashboardMock.parseDashboardUploadPayload as jest.MockedFunction<typeof dashboardMock.parseDashboardUploadPayload>;
const mockSaveUploadedDashboardData =
	dashboardMock.saveUploadedDashboardData as jest.MockedFunction<typeof dashboardMock.saveUploadedDashboardData>;

const defaultDataset = {
	company: "Default Co",
	stats: [
		{
			title: "Total Holdings",
			value: "100 t",
			delta: "2%",
			positive: true,
			subtitle: "Test",
		},
		{
			title: "Offset Ratio",
			value: "40%",
			delta: "1%",
			positive: true,
			subtitle: "Test",
		},
	],
	emissionsTrend: [{ month: "Jan", emissions: 10, offsets: 4 }],
	portfolioDistribution: [{ name: "Forestry", value: 100 }],
};

describe("Dashboard page", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		localStorage.clear();

		mockGetUploadedDashboardData.mockReturnValue({});
		mockGetDashboardDataset.mockReturnValue(defaultDataset as any);
		mockParseDashboardUploadPayload.mockReturnValue({
			"Uploaded Co": {
				...defaultDataset,
				company: "Uploaded Co",
			},
		} as any);
	});

	it("shows empty state for unregistered users without uploaded datasets", () => {
		localStorage.setItem("user", JSON.stringify({}));

		render(<Dashboard />);

		expect(screen.getByText("No Company Registered")).toBeInTheDocument();
		expect(
			screen.getByText("Your dashboard is empty. Upload a JSON dataset file to populate dashboard cards and charts.")
		).toBeInTheDocument();
		expect(screen.getByLabelText("Upload Dashboard Dataset (JSON)")).toBeInTheDocument();
		expect(mockGetDashboardDataset).toHaveBeenCalledWith("");
	});

	it("uploads dataset successfully from empty state", async () => {
		localStorage.setItem("user", JSON.stringify({}));

		render(<Dashboard />);

		const fileInput = screen.getByLabelText("Upload Dashboard Dataset (JSON)") as HTMLInputElement;
		const file = new File([JSON.stringify({ company: "Uploaded Co" })], "dashboard.json", {
			type: "application/json",
		});
		Object.defineProperty(file, "text", {
			value: jest.fn().mockResolvedValue(JSON.stringify({ company: "Uploaded Co" })),
		});

		fireEvent.change(fileInput, { target: { files: [file] } });

		await waitFor(() => {
			expect(mockParseDashboardUploadPayload).toHaveBeenCalledWith({ company: "Uploaded Co" });
		});

		expect(mockSaveUploadedDashboardData).toHaveBeenCalled();
		expect(localStorage.getItem(dashboardMock.DASHBOARD_COMPANY_STORAGE_KEY)).toBe("Uploaded Co");
		expect(
			await screen.findByText("Uploaded 1 company dataset(s) from dashboard.json.")
		).toBeInTheDocument();
	});

	it("shows upload error feedback when parsing fails", async () => {
		localStorage.setItem("user", JSON.stringify({}));
		mockParseDashboardUploadPayload.mockImplementation(() => {
			throw new Error("Invalid dashboard JSON");
		});

		render(<Dashboard />);

		const fileInput = screen.getByLabelText("Upload Dashboard Dataset (JSON)") as HTMLInputElement;
		const file = new File([JSON.stringify({ bad: true })], "invalid.json", {
			type: "application/json",
		});
		Object.defineProperty(file, "text", {
			value: jest.fn().mockResolvedValue(JSON.stringify({ bad: true })),
		});

		fireEvent.change(fileInput, { target: { files: [file] } });

		expect(await screen.findByText("Invalid dashboard JSON")).toBeInTheDocument();
		expect(mockSaveUploadedDashboardData).not.toHaveBeenCalled();
	});

	it("renders stats and charts for registered company users", () => {
		localStorage.setItem(
			"user",
			JSON.stringify({
				companyName: "Acme Carbon",
				company: { name: "Acme Carbon" },
			})
		);

		render(<Dashboard />);

		expect(screen.queryByText("No Company Registered")).not.toBeInTheDocument();
		expect(screen.getByText("Dashboard - Acme Carbon")).toBeInTheDocument();
		expect(screen.getAllByTestId("stat-card")).toHaveLength(2);
		expect(screen.getByTestId("emissions-chart")).toHaveTextContent("Jan");
		expect(screen.getByTestId("portfolio-distribution")).toHaveTextContent("Forestry");
		expect(mockGetDashboardDataset).toHaveBeenCalledWith("Acme Carbon");
	});

	it("prefers selected dashboard company over company name", () => {
		localStorage.setItem(
			"user",
			JSON.stringify({
				companyName: "Primary Company",
			})
		);
		localStorage.setItem(dashboardMock.DASHBOARD_COMPANY_STORAGE_KEY, "Selected Company");

		render(<Dashboard />);

		expect(mockGetDashboardDataset).toHaveBeenCalledWith("Selected Company");
	});

	it("uses uploaded company when user is unregistered but uploaded data exists", () => {
		localStorage.setItem("user", JSON.stringify({}));
		mockGetUploadedDashboardData.mockReturnValue({
			"Uploaded One": { ...defaultDataset, company: "Uploaded One" },
			"Uploaded Two": { ...defaultDataset, company: "Uploaded Two" },
		} as any);

		render(<Dashboard />);

		expect(screen.queryByText("No Company Registered")).not.toBeInTheDocument();
		expect(mockGetDashboardDataset).toHaveBeenCalledWith("Uploaded One");
		expect(screen.getAllByTestId("stat-card")).toHaveLength(2);
	});
});
