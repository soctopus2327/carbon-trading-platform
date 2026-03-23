/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import axios from 'axios';
import Marketplace from '../pages/Marketplace'; // adjust path as needed

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;


// ────────────────────────────────────────────────
// Tests Covered (same as before)
// ────────────────────────────────────────────────
// shows loading state while trades request is pending
// renders listings and summary metrics after fetch
// prevents buying from own listing and shows disabled message
// creates a trade from sell tab and refreshes data
// edits an existing listing and saves changes
// deletes an existing listing
// validates purchase quantity before API call
// shows and calculates discount correctly in purchase modal UI
// executes normal purchase, updates local user coins, and closes modal
// hides discount option when user has fewer than 100 coins
// validates pay later date requirements (future date only)
// executes pay-later purchase with correct ISO date payload
// shows backend purchase error message on transaction failure
// shows empty listings block when trade fetch fails or returns empty
// shows API error message when creating a trade fails
// shows API error message when updating a trade fails
// shows API error message when deleting a trade fails
// resets pay-later mode when purchase modal is cancelled



beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

const mockTrades = [
  {
    _id: 'trade-1',
    pricePerCredit: 100,
    quantity: 10,
    remainingQuantity: 6,
    status: 'ACTIVE',
    sellerCompany: { _id: 'seller-a', name: 'GreenFuture Ltd' },
  },
  {
    _id: 'trade-2',
    pricePerCredit: 85,
    quantity: 8,
    remainingQuantity: 8,
    status: 'ACTIVE',
    sellerCompany: { _id: 'my-company-id', name: 'My Company' },
  },
];

function setupUserSession(points = 150, companyId = 'my-company-id') {
  localStorage.setItem('token', 'fake-jwt-token');
  localStorage.setItem(
    'user',
    JSON.stringify({
      company: companyId,
      points,
      coins: points,
    })
  );
}

async function waitForListings() {
  await screen.findByText('Available Listings', {}, { timeout: 2000 });
}

async function switchToSellTab() {
  fireEvent.click(screen.getByRole('button', { name: /sell credits/i }));
  await screen.findByText('Create New Listing');
}

async function openBuyModalForSeller(sellerName: string) {
  await waitForListings();
  const card = screen.getByText(sellerName).closest('article');
  if (!card) throw new Error(`No listing card found for ${sellerName}`);
  const buyButton = within(card as HTMLElement).getByRole('button', { name: /buy credits/i });
  fireEvent.click(buyButton);
  await screen.findByText('Purchase Credits');
}

describe('Marketplace page', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    setupUserSession(150, 'my-company-id');

    alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    mockedAxios.get.mockResolvedValue({ data: mockTrades });
    mockedAxios.post.mockResolvedValue({ data: { coinsEarned: 30 } });
    mockedAxios.put.mockResolvedValue({ data: {} });
    mockedAxios.delete.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('shows loading state while trades request is pending', () => {
    mockedAxios.get.mockImplementationOnce(() => new Promise(() => {}));
    render(<Marketplace />);
    expect(screen.getByText('Loading marketplace...')).toBeInTheDocument();
  });

  it('renders listings and summary metrics after fetch', async () => {
    render(<Marketplace />);
    await waitForListings();

    expect(screen.getByText('GreenFuture Ltd')).toBeInTheDocument();
    expect(screen.getByText('6 credits available')).toBeInTheDocument();

    expect(screen.getByText('2')).toBeInTheDocument(); // Open Listings
    expect(screen.getByText('1')).toBeInTheDocument(); // My Listings
    expect(screen.getByText('8')).toBeInTheDocument(); // Credits Listed
    expect(screen.getByText('150')).toBeInTheDocument(); // My Coins
  });

  it('prevents buying from own listing and shows disabled message', async () => {
    render(<Marketplace />);
    await waitForListings();

    const ownCard = screen.getByText('My Company').closest('article')!;
    expect(within(ownCard).getByText('(Your Listing)')).toBeInTheDocument();

    const disabledBtn = within(ownCard).getByRole('button', { name: /can't trade with self/i });
    expect(disabledBtn).toBeDisabled();

    expect(within(ownCard).queryByRole('button', { name: /buy credits/i })).not.toBeInTheDocument();
  });

  it('creates a trade from sell tab and refreshes data', async () => {
    render(<Marketplace />);
    await waitForListings();
    await switchToSellTab();

    const priceInput = screen.getByPlaceholderText('Enter price');
    const qtyInput   = screen.getByPlaceholderText('Enter quantity');

    fireEvent.change(priceInput, { target: { value: '120' } });
    fireEvent.change(qtyInput,   { target: { value: '15' } });

    fireEvent.click(screen.getByRole('button', { name: /Create Trade Listing/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:5000/trade',
        { pricePerCredit: 120, quantity: 15 },
        expect.objectContaining({ headers: expect.any(Object) })
      );
      expect(alertSpy).toHaveBeenCalledWith('Trade added successfully!');
    });
  });

  it('edits an existing listing and saves changes', async () => {
    render(<Marketplace />);
    await waitForListings();
    await switchToSellTab();

    await screen.findByText('My Active Listings');

    const myListingCard = screen.getByText('INR 85/credit').closest('div.rounded-xl') as HTMLElement;
    const editButton = within(myListingCard).getByRole('button', { name: /edit/i });

    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue('85')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByDisplayValue('85'), { target: { value: '95' } });
    fireEvent.change(screen.getByDisplayValue('8'),  { target: { value: '5' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith(
        'http://localhost:5000/trade/trade-2',
        { pricePerCredit: 95, quantity: 5 },
        expect.any(Object)
      );
      expect(alertSpy).toHaveBeenCalledWith('Trade updated successfully!');
    });
  });

  it('deletes an existing listing', async () => {
    render(<Marketplace />);
    await waitForListings();
    await switchToSellTab();

    const myListingCard = screen.getByText('INR 85/credit').closest('div.rounded-xl') as HTMLElement;
    const deleteButton = within(myListingCard).getByRole('button', { name: /delete/i });

    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        'http://localhost:5000/trade/trade-2',
        expect.any(Object)
      );
      expect(alertSpy).toHaveBeenCalledWith('Trade deleted successfully!');
    });
  });

  it('validates purchase quantity before API call', async () => {
    render(<Marketplace />);
    await openBuyModalForSeller('GreenFuture Ltd');

    fireEvent.click(screen.getByRole('button', { name: /Confirm Purchase/i }));
    expect(alertSpy).toHaveBeenCalledWith('Enter a valid quantity');
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('shows and calculates discount correctly in purchase modal UI', async () => {
    render(<Marketplace />);
    await openBuyModalForSeller('GreenFuture Ltd');

    const qtyInput = screen.getByPlaceholderText(/Enter quantity/i);
    fireEvent.change(qtyInput, { target: { value: '4' } });

    await waitFor(() => {
      expect(screen.getByText(/Total: INR 400/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('checkbox'));

    await waitFor(() => {
      expect(screen.getByText(/Total: INR 0/)).toBeInTheDocument(); // clamped
    });
  });

  it('executes normal purchase, updates local user coins, and closes modal', async () => {
    render(<Marketplace />);
    await openBuyModalForSeller('GreenFuture Ltd');

    fireEvent.change(screen.getByPlaceholderText(/Enter quantity/i), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: /Confirm Purchase/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:5000/transactions/execute',
        expect.objectContaining({
          tradeId: 'trade-1',
          quantity: 3,
          useDiscount: true,
          payLater: false,
          payLaterDate: null,
        }),
        expect.any(Object)
      );
      expect(alertSpy).toHaveBeenCalledWith('Purchase successful!');
    });

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    expect(user.points).toBe(150 - 100 + 30); // 80
    expect(screen.queryByText('Purchase Credits')).not.toBeInTheDocument();
  });

  it('hides discount option when user has fewer than 100 coins', async () => {
    setupUserSession(80);
    render(<Marketplace />);
    await openBuyModalForSeller('GreenFuture Ltd');

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('validates pay later date requirements', async () => {
    render(<Marketplace />);
    await openBuyModalForSeller('GreenFuture Ltd');

    fireEvent.change(screen.getByPlaceholderText(/Enter quantity/i), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /Pay Later/i }));

    // Try submit without date
    fireEvent.click(screen.getByRole('button', { name: /Purchase & Pay Later/i }));
    expect(alertSpy).toHaveBeenCalledWith('Please select a pay later date');

    // Set past date
    const dateInput = screen.getByDisplayValue(''); // the empty date input
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    fireEvent.change(dateInput, { target: { value: yesterday } });

    fireEvent.click(screen.getByRole('button', { name: /Purchase & Pay Later/i }));
    expect(alertSpy).toHaveBeenCalledWith('Please select a valid future date for Pay Later');
  });

  it('executes pay-later purchase with ISO date payload', async () => {
    render(<Marketplace />);
    await openBuyModalForSeller('GreenFuture Ltd');

    fireEvent.change(screen.getByPlaceholderText(/Enter quantity/i), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /Pay Later/i }));

    const tomorrow = new Date(Date.now() + 86400000);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const dateInput = screen.getByDisplayValue(''); // date input starts empty
    fireEvent.change(dateInput, { target: { value: dateStr } });

    fireEvent.click(screen.getByRole('button', { name: /Purchase & Pay Later/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          payLater: true,
          payLaterDate: expect.stringMatching(/T00:00:00\.000Z$/),
        }),
        expect.any(Object)
      );
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Payment reminder will be sent on'));
    });
  });

  it('shows backend purchase error message on transaction failure', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: { data: { message: 'Insufficient balance or credits' } },
    });

    render(<Marketplace />);
    await openBuyModalForSeller('GreenFuture Ltd');

    fireEvent.change(screen.getByPlaceholderText(/Enter quantity/i), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm Purchase/i }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Insufficient balance or credits');
    });
  });

  it('resets pay-later mode when purchase modal is cancelled', async () => {
    render(<Marketplace />);
    await openBuyModalForSeller('GreenFuture Ltd');

    fireEvent.click(screen.getByRole('button', { name: /Pay Later/i }));
    expect(screen.getByRole('button', { name: /Purchase & Pay Later/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    await waitFor(() => {
      expect(screen.queryByText('Purchase Credits')).not.toBeInTheDocument();
    });

    // Re-open → should be normal mode again
    await openBuyModalForSeller('GreenFuture Ltd');
    expect(screen.getByRole('button', { name: /Pay Later/i })).toBeInTheDocument();
    expect(screen.queryByText(/Schedule Payment For/i)).not.toBeInTheDocument();
  });

  it('shows empty listings block when no trades are available', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: [] });
    render(<Marketplace />);
    await waitFor(() => {
      expect(screen.getByText('No trades available yet.')).toBeInTheDocument();
    });
  });
});