// Tests Covered
// Loading spinner state while request is pending.
// Successful fetch and article rendering from API.
// Official source VERIFIED badge logic.
// Description fallback to content parsing when description is missing.
// Unknown Source fallback when source is missing.
// Empty-state UI for non-array API payloads.
// Empty-state UI when API call fails.
// Auto-refresh behavior every 30 minutes.
// Interval cleanup on unmount.
// Image error handler hides broken images.

/// <reference types="@testing-library/jest-dom" />

import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";

import News from "../pages/News";

jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;

const sampleArticles = [
	{
		title: "Indian Carbon Market Gets New Liquidity Push",
		description: "BEE proposes mechanism to improve market stability.",
		url: "https://example.com/article-1",
		urlToImage: "https://example.com/article-1.jpg",
		publishedAt: "2026-03-16T09:30:00.000Z",
		source: { name: "The Economic Times" },
	},
	{
		title: "Regional Exchange Updates Credit Settlement Rules",
		content: "Settlement reform details for compliance entities [read more]",
		url: "https://example.com/article-2",
		publishedAt: "2026-03-16T10:00:00.000Z",
		source: { name: "Independent Wire" },
	},
];

describe("News page", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		localStorage.clear();
		mockedAxios.get.mockResolvedValue({ data: sampleArticles });
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("shows loading state while request is in flight", () => {
		mockedAxios.get.mockImplementation(() => new Promise(() => {}));

		render(<News />);

		expect(
			screen.getByText("Scanning Indian Carbon Market Intelligence...")
		).toBeInTheDocument();
	});

	it("fetches and renders news cards from API", async () => {
		render(<News />);

		await waitFor(() => {
			expect(mockedAxios.get).toHaveBeenCalledWith("http://localhost:5000/news/market");
		});

		expect(
			await screen.findByText("Indian Carbon Market Gets New Liquidity Push")
		).toBeInTheDocument();
		expect(
			screen.getByText("BEE proposes mechanism to improve market stability.")
		).toBeInTheDocument();
		expect(screen.getByText("The Economic Times")).toBeInTheDocument();

		const links = screen.getAllByRole("link");
		expect(links[0]).toHaveAttribute("href", "https://example.com/article-1");
		expect(links[0]).toHaveAttribute("target", "_blank");
		expect(links[0]).toHaveAttribute("rel", "noopener noreferrer");
	});

	it("marks official sources as verified", async () => {
		render(<News />);

		await screen.findByText("Indian Carbon Market Gets New Liquidity Push");

		expect(screen.getByText("VERIFIED")).toBeInTheDocument();
	});

	it("uses content fallback when description is missing", async () => {
		render(<News />);

		await screen.findByText("Regional Exchange Updates Credit Settlement Rules");

		expect(
			screen.getByText(/Settlement reform details for compliance entities/)
		).toBeInTheDocument();
	});

	it("renders unknown source label when source is missing", async () => {
		mockedAxios.get.mockResolvedValueOnce({
			data: [
				{
					title: "Policy Bulletin",
					description: "Fresh compliance bulletin",
					url: "https://example.com/policy",
					publishedAt: "2026-03-16T11:00:00.000Z",
					source: undefined,
				},
			],
		});

		render(<News />);

		await screen.findByText("Policy Bulletin");

		expect(screen.getByText("Unknown Source")).toBeInTheDocument();
	});

	it("shows empty state when API returns non-array payload", async () => {
		mockedAxios.get.mockResolvedValueOnce({ data: { items: sampleArticles } });

		render(<News />);

		expect(
			await screen.findByText("No live news matching Indian Carbon Market parameters.")
		).toBeInTheDocument();
	});

	it("shows empty state when API request fails", async () => {
		mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));

		render(<News />);

		expect(
			await screen.findByText("No live news matching Indian Carbon Market parameters.")
		).toBeInTheDocument();
	});

	it("auto-refreshes every 30 minutes", async () => {
		jest.useFakeTimers();

		render(<News />);

		await waitFor(() => {
			expect(mockedAxios.get).toHaveBeenCalledTimes(1);
		});

		act(() => {
			jest.advanceTimersByTime(30 * 60 * 1000);
		});

		await waitFor(() => {
			expect(mockedAxios.get).toHaveBeenCalledTimes(2);
		});
	});

	it("clears refresh interval on unmount", async () => {
		jest.useFakeTimers();
		const clearIntervalSpy = jest.spyOn(global, "clearInterval");

		const { unmount } = render(<News />);

		await waitFor(() => {
			expect(mockedAxios.get).toHaveBeenCalledTimes(1);
		});

		unmount();

		expect(clearIntervalSpy).toHaveBeenCalledWith(expect.anything());

		clearIntervalSpy.mockRestore();
	});

	it("hides article image when image load fails", async () => {
		render(<News />);

		const image = (await screen.findByAltText("Market Intel")) as HTMLImageElement;
		expect(image).toBeVisible();

		fireEvent.error(image);

		expect(image.style.display).toBe("none");
	});
});
