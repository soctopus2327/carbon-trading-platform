// Tests Covered
// shows loading state while trades request is pending
// renders listings and summary metrics after fetch
// creates a trade from sell tab and refreshes data
// edits an existing listing and saves changes
// deletes an existing listing
// validates purchase quantity before API call
// validates pay later date requirements
// executes purchase, updates local user coins, and closes modal
// hides discount option when user has fewer than 100 coins
// shows empty listings block when trade fetch fails
// shows API error message when creating a trade fails
// shows API error message when updating a trade fails
// shows API error message when deleting a trade fails
// executes pay-later purchase with ISO date payload
// shows backend purchase error message on transaction failure
// resets pay-later mode when purchase modal is cancelled

/// <reference types="@testing-library/jest-dom" />

import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import axios from "axios";

import Marketplace from "../pages/Marketplace";

jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;

const tradesFixture = [
	{
		_id: "trade-1",
		pricePerCredit: 100,
		quantity: 10,
		remainingQuantity: 6,
		status: "ACTIVE",
		sellerCompany: {
			_id: "seller-company",
			name: "Seller One",
		},
	},
	{
		_id: "trade-2",
		pricePerCredit: 80,
		quantity: 5,
		remainingQuantity: 5,
		status: "ACTIVE",
		sellerCompany: {
			_id: "my-company",
			name: "My Company",
		},
	},
];

function setSession(points = 150) {
	localStorage.setItem("token", "token-1");
	localStorage.setItem(
		"user",
		JSON.stringify({ company: "my-company", points, coins: points })
	);
}

async function openPurchaseModalForSeller(sellerName: string) {
	await screen.findByText("Available Listings");
	const sellerCard = screen.getByText(sellerName).closest("article") as HTMLElement;
	fireEvent.click(within(sellerCard).getByRole("button", { name: "Buy Credits" }));
	await screen.findByText("Purchase Credits");
}

describe("Marketplace page", () => {
	let alertSpy: jest.SpyInstance;
	let consoleErrorSpy: jest.SpyInstance;

	beforeEach(() => {
		jest.clearAllMocks();
		localStorage.clear();
		setSession();

		alertSpy = jest.spyOn(window, "alert").mockImplementation(() => undefined);
		consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

		mockedAxios.get.mockResolvedValue({ data: tradesFixture });
		mockedAxios.post.mockResolvedValue({ data: { ok: true, coinsEarned: 25 } });
		mockedAxios.put.mockResolvedValue({ data: { ok: true } });
		mockedAxios.delete.mockResolvedValue({ data: { ok: true } });
	});

	afterEach(() => {
		alertSpy.mockRestore();
		consoleErrorSpy.mockRestore();
	});

	it("shows loading state while trades request is pending", () => {
		mockedAxios.get.mockImplementation(() => new Promise(() => {}));

		render(<Marketplace />);

		expect(screen.getByText("Loading marketplace...")).toBeInTheDocument();
	});

	it("renders listings and summary metrics after fetch", async () => {
		render(<Marketplace />);

		await waitFor(() => {
			expect(mockedAxios.get).toHaveBeenCalledWith("http://localhost:5000/trade", {
				headers: { Authorization: "Bearer token-1" },
			});
		});

		expect(await screen.findByText("Available Listings")).toBeInTheDocument();
		expect(screen.getByText("Seller One")).toBeInTheDocument();
		expect(screen.getByText("Open Listings")).toBeInTheDocument();
		expect(screen.getByText("My Listings")).toBeInTheDocument();
		expect(screen.getByText("Credits Listed")).toBeInTheDocument();
		expect(screen.getByText("My Coins")).toBeInTheDocument();
		expect(screen.getByText("150")).toBeInTheDocument();
	});

	it("creates a trade from sell tab and refreshes data", async () => {
		render(<Marketplace />);

		await screen.findByText("Available Listings");
		fireEvent.click(screen.getByRole("button", { name: "Sell Credits" }));

		fireEvent.change(screen.getByPlaceholderText("Enter price"), {
			target: { value: "120" },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter quantity"), {
			target: { value: "9" },
		});

		fireEvent.click(screen.getByRole("button", { name: "Create Trade" }));

		await waitFor(() => {
			expect(mockedAxios.post).toHaveBeenCalledWith(
				"http://localhost:5000/trade",
				{ pricePerCredit: 120, quantity: 9 },
				{ headers: { Authorization: "Bearer token-1" } }
			);
		});

		expect(alertSpy).toHaveBeenCalledWith("Trade added successfully!");
		expect(mockedAxios.get).toHaveBeenCalledTimes(2);
	});

	it("edits an existing listing and saves changes", async () => {
		render(<Marketplace />);

		await screen.findByText("Available Listings");
		fireEvent.click(screen.getByRole("button", { name: "Sell Credits" }));

		await screen.findByText("My Active Listings");
		fireEvent.click(screen.getByRole("button", { name: "Edit" }));

		fireEvent.change(screen.getByDisplayValue("80"), { target: { value: "95" } });
		fireEvent.change(screen.getByDisplayValue("5"), { target: { value: "7" } });
		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(mockedAxios.put).toHaveBeenCalledWith(
				"http://localhost:5000/trade/trade-2",
				{ pricePerCredit: 95, quantity: 7 },
				{ headers: { Authorization: "Bearer token-1" } }
			);
		});

		expect(alertSpy).toHaveBeenCalledWith("Trade updated successfully!");
	});

	it("deletes an existing listing", async () => {
		render(<Marketplace />);

		await screen.findByText("Available Listings");
		fireEvent.click(screen.getByRole("button", { name: "Sell Credits" }));

		await screen.findByText("My Active Listings");
		fireEvent.click(screen.getByRole("button", { name: "Delete" }));

		await waitFor(() => {
			expect(mockedAxios.delete).toHaveBeenCalledWith("http://localhost:5000/trade/trade-2", {
				headers: { Authorization: "Bearer token-1" },
			});
		});

		expect(alertSpy).toHaveBeenCalledWith("Trade deleted successfully!");
	});

	it("validates purchase quantity before API call", async () => {
		render(<Marketplace />);

		await openPurchaseModalForSeller("Seller One");

		fireEvent.click(screen.getByRole("button", { name: "Confirm Purchase" }));

		expect(alertSpy).toHaveBeenCalledWith("Enter a valid quantity");
		expect(mockedAxios.post).not.toHaveBeenCalled();
	});

	it("validates pay later date requirements", async () => {
		render(<Marketplace />);

		await openPurchaseModalForSeller("Seller One");

		fireEvent.change(screen.getByPlaceholderText("Enter quantity"), {
			target: { value: "2" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Pay Later" }));

		fireEvent.click(screen.getByRole("button", { name: "Purchase & Pay Later" }));
		expect(alertSpy).toHaveBeenCalledWith("Please select a pay later date");

		const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
			.toISOString()
			.split("T")[0];
		const dateInput = document.querySelector("input[type='date']") as HTMLInputElement;
		fireEvent.change(dateInput, { target: { value: yesterday } });

		fireEvent.click(screen.getByRole("button", { name: "Purchase & Pay Later" }));
		expect(alertSpy).toHaveBeenCalledWith("Please select a valid future date for Pay Later");
	});

	it("executes purchase, updates local user coins, and closes modal", async () => {
		mockedAxios.post.mockResolvedValueOnce({ data: { coinsEarned: 40 } });

		render(<Marketplace />);

		await openPurchaseModalForSeller("Seller One");

		fireEvent.change(screen.getByPlaceholderText("Enter quantity"), {
			target: { value: "2" },
		});

		const discountToggle = screen.getByRole("checkbox");
		fireEvent.click(discountToggle);

		fireEvent.click(screen.getByRole("button", { name: "Confirm Purchase" }));

		await waitFor(() => {
			expect(mockedAxios.post).toHaveBeenCalledWith(
				"http://localhost:5000/transactions/execute",
				{
					tradeId: "trade-1",
					quantity: 2,
					useDiscount: true,
					payLater: false,
					payLaterDate: null,
				},
				{ headers: { Authorization: "Bearer token-1" } }
			);
		});

		expect(alertSpy).toHaveBeenCalledWith("Purchase successful!");

		const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
		expect(storedUser.points).toBe(90);
		expect(storedUser.coins).toBe(90);

		await waitFor(() => {
			expect(screen.queryByText("Purchase Credits")).not.toBeInTheDocument();
		});
	});

	it("hides discount option when user has fewer than 100 coins", async () => {
		localStorage.clear();
		setSession(50);

		render(<Marketplace />);

		await openPurchaseModalForSeller("Seller One");

		expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
	});

		it("shows empty listings block when trade fetch fails", async () => {
			mockedAxios.get.mockRejectedValueOnce(new Error("fetch failed"));

			render(<Marketplace />);

			expect(await screen.findByText("No trades available yet.")).toBeInTheDocument();
			expect(consoleErrorSpy).toHaveBeenCalled();
		});

		it("shows API error message when creating a trade fails", async () => {
			mockedAxios.post.mockRejectedValueOnce({
				response: { data: { error: "Create trade failed" } },
			});

			render(<Marketplace />);

			await screen.findByText("Available Listings");
			fireEvent.click(screen.getByRole("button", { name: "Sell Credits" }));

			fireEvent.change(screen.getByPlaceholderText("Enter price"), {
				target: { value: "120" },
			});
			fireEvent.change(screen.getByPlaceholderText("Enter quantity"), {
				target: { value: "9" },
			});
			fireEvent.click(screen.getByRole("button", { name: "Create Trade" }));

			await waitFor(() => {
				expect(alertSpy).toHaveBeenCalledWith("Create trade failed");
			});
		});

		it("shows API error message when updating a trade fails", async () => {
			mockedAxios.put.mockRejectedValueOnce({
				response: { data: { error: "Update trade failed" } },
			});

			render(<Marketplace />);

			await screen.findByText("Available Listings");
			fireEvent.click(screen.getByRole("button", { name: "Sell Credits" }));
			fireEvent.click(screen.getByRole("button", { name: "Edit" }));
			fireEvent.click(screen.getByRole("button", { name: "Save" }));

			await waitFor(() => {
				expect(alertSpy).toHaveBeenCalledWith("Update trade failed");
			});
		});

		it("shows API error message when deleting a trade fails", async () => {
			mockedAxios.delete.mockRejectedValueOnce({
				response: { data: { error: "Delete trade failed" } },
			});

			render(<Marketplace />);

			await screen.findByText("Available Listings");
			fireEvent.click(screen.getByRole("button", { name: "Sell Credits" }));
			fireEvent.click(screen.getByRole("button", { name: "Delete" }));

			await waitFor(() => {
				expect(alertSpy).toHaveBeenCalledWith("Delete trade failed");
			});
		});

		it("executes pay-later purchase with ISO date payload", async () => {
			mockedAxios.post.mockResolvedValueOnce({ data: { coinsEarned: 30 } });

			render(<Marketplace />);

			await openPurchaseModalForSeller("Seller One");

			fireEvent.change(screen.getByPlaceholderText("Enter quantity"), {
				target: { value: "2" },
			});
			fireEvent.click(screen.getByRole("button", { name: "Pay Later" }));

			const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
				.toISOString()
				.split("T")[0];
			const expectedIsoDate = new Date(tomorrow).toISOString();
			const dateInput = document.querySelector("input[type='date']") as HTMLInputElement;
			fireEvent.change(dateInput, { target: { value: tomorrow } });

			fireEvent.click(screen.getByRole("button", { name: "Purchase & Pay Later" }));

			await waitFor(() => {
				expect(mockedAxios.post).toHaveBeenCalledWith(
					"http://localhost:5000/transactions/execute",
					{
						tradeId: "trade-1",
						quantity: 2,
						useDiscount: false,
						payLater: true,
						payLaterDate: expectedIsoDate,
					},
					{ headers: { Authorization: "Bearer token-1" } }
				);
			});

			expect(alertSpy).toHaveBeenCalledWith(
				expect.stringContaining("Credits received! Payment reminder will be sent on")
			);

			const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
			expect(storedUser.points).toBe(180);
			expect(storedUser.coins).toBe(180);
		});

		it("shows backend purchase error message on transaction failure", async () => {
			mockedAxios.post.mockRejectedValueOnce({
				response: { data: { message: "Quota exceeded" } },
			});

			render(<Marketplace />);

			await openPurchaseModalForSeller("Seller One");
			fireEvent.change(screen.getByPlaceholderText("Enter quantity"), {
				target: { value: "2" },
			});
			fireEvent.click(screen.getByRole("button", { name: "Confirm Purchase" }));

			await waitFor(() => {
				expect(alertSpy).toHaveBeenCalledWith("Quota exceeded");
			});
		});

		it("resets pay-later mode when purchase modal is cancelled", async () => {
			render(<Marketplace />);

			await openPurchaseModalForSeller("Seller One");
			fireEvent.click(screen.getByRole("button", { name: "Pay Later" }));
			expect(screen.getByRole("button", { name: "Purchase & Pay Later" })).toBeInTheDocument();

			fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
			await waitFor(() => {
				expect(screen.queryByText("Purchase Credits")).not.toBeInTheDocument();
			});

			await openPurchaseModalForSeller("Seller One");
			expect(screen.getByRole("button", { name: "Confirm Purchase" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Pay Later" })).toBeInTheDocument();
		});
	});
