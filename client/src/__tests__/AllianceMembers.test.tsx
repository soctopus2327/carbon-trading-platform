// Tests Covered
// Render main title
// Render create/join inputs and buttons
// Fetch alliances and polls on mount
// Display join requests
// Approve join request flow
// Display polls
// Vote in poll
// Prevent duplicate voting
// Create alliance
// Join alliance via code
// Create poll with options
// Validate poll creation inputs

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import AllianceMembers from '../pages/AllianceMembers';

jest.mock('axios');
jest.mock('sweetalert2', () => ({
  fire: jest.fn(),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AllianceMembers Component', () => {
  const mockToken = 'fake-token-123';
  const mockCompanyId = 'comp456';

  const baseAlliance = {
    _id: 'all1',
    name: 'Green Alliance',
    code: 'GREEN2025',
    members: [{ _id: 'comp999', name: 'SolarTech' }],
    joinRequests: [
      {
        company: {
          _id: 'comp888',
          name: 'Eco Builders',
          companyType: 'Construction',
        },
      },
    ],
  };

  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    localStorage.setItem('token', mockToken);
    localStorage.setItem('companyId', mockCompanyId);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    localStorage.clear();
  });

  const setupDefaultMocks = () => {
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/alliance/members')) {
        return Promise.resolve({
          data: [
            {
              ...baseAlliance,
              polls: [
                {
                  _id: 'poll1',
                  question: 'Should we buy more credits?',
                  options: [
                    { text: 'Yes', votes: 3 },
                    { text: 'No', votes: 1 },
                  ],
                  status: 'ACTIVE',
                  voters: [],
                },
              ],
            },
          ],
        });
      }

      if (url.includes('/alliance/polls')) {
        return Promise.resolve({
          data: [
            {
              _id: 'poll1',
              question: 'Should we buy more credits?',
              options: [
                { text: 'Yes', votes: 3 },
                { text: 'No', votes: 1 },
              ],
              status: 'ACTIVE',
              voters: [],
            },
          ],
        });
      }

      return Promise.reject(new Error('Unexpected GET'));
    });

    mockedAxios.post.mockResolvedValue({ data: {} });
  };

  it('renders the main title', async () => {
    setupDefaultMocks();
    render(<AllianceMembers />);
    expect(await screen.findByText('Alliance Network')).toBeInTheDocument();
  });

  it('renders create alliance and join inputs/buttons', async () => {
    setupDefaultMocks();
    render(<AllianceMembers />);

    expect(await screen.findByPlaceholderText('New Alliance')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Alliance Code')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Join/i })).toBeInTheDocument();
  });

  it('fetches alliances and polls on mount', async () => {
    setupDefaultMocks();
    render(<AllianceMembers />);

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });

  it('shows join requests when they exist', async () => {
    setupDefaultMocks();
    render(<AllianceMembers />);

    expect(await screen.findByText('Eco Builders')).toBeInTheDocument();
  });

  it('handles approve join request', async () => {
    setupDefaultMocks();
    render(<AllianceMembers />);

    await screen.findByText('Eco Builders');

    fireEvent.click(screen.getByRole('button', { name: /Approve/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalled();
    });

    expect(Swal.fire).toHaveBeenCalledWith(
      'Success',
      expect.stringMatching(/approved/i),
      'success'
    );
  });

  it('shows recent polls', async () => {
    setupDefaultMocks();
    render(<AllianceMembers />);

    expect(await screen.findByText('Should we buy more credits?')).toBeInTheDocument();
  });

  it('allows voting in a poll (first time)', async () => {
    setupDefaultMocks();
    render(<AllianceMembers />);

    const btn = await screen.findByText('Yes (3)');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalled();
    });
  });


  it('prevents voting if already voted', async () => {
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/alliance/members')) {
        return Promise.resolve({
          data: [
            {
              ...baseAlliance,
              polls: [
                {
                  _id: 'poll1',
                  question: 'Should we buy more credits?',
                  options: [
                    { text: 'Yes', votes: 3 },
                    { text: 'No', votes: 1 },
                  ],
                  status: 'ACTIVE',
                  voters: [{ company: mockCompanyId }], // ✅ correct
                },
              ],
            },
          ],
        });
      }

      if (url.includes('/alliance/polls')) {
        return Promise.resolve({
          data: [
            {
              _id: 'poll1',
              question: 'Should we buy more credits?',
              options: [
                { text: 'Yes', votes: 3 },
                { text: 'No', votes: 1 },
              ],
              status: 'ACTIVE',
              voters: [{ company: mockCompanyId }],
            },
          ],
        });
      }

      return Promise.reject(new Error('Unexpected GET'));
    });

    mockedAxios.post.mockResolvedValue({ data: {} });

    render(<AllianceMembers />);

    const btn = await screen.findByText('Yes (3)');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalled();
    });

    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('creates a new alliance', async () => {
    setupDefaultMocks();
    render(<AllianceMembers />);

    const input = await screen.findByPlaceholderText('New Alliance');
    fireEvent.change(input, { target: { value: 'New Eco Group' } });

    fireEvent.click(screen.getAllByRole('button', { name: /Create/i })[0]);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalled();
    });
  });

  it('sends join request with code', async () => {
    setupDefaultMocks();
    render(<AllianceMembers />);

    const input = await screen.findByPlaceholderText('Alliance Code');
    fireEvent.change(input, { target: { value: 'BLUE2025' } });

    fireEvent.click(screen.getByRole('button', { name: /Join/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalled();
    });
  });

  it('creates a poll with question and options', async () => {
    setupDefaultMocks();
    render(<AllianceMembers />);

    await screen.findByText('Green Alliance');

    fireEvent.change(screen.getByPlaceholderText('Poll question'), {
      target: { value: 'Next meeting?' },
    });

    const options = screen.getAllByPlaceholderText(/Option/);
    fireEvent.change(options[0], { target: { value: 'A' } });
    fireEvent.change(options[1], { target: { value: 'B' } });

    fireEvent.click(screen.getByRole('button', { name: /Create Poll/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalled();
    });
  });

  it('shows warning when poll has less than 2 valid options', async () => {
    setupDefaultMocks();
    render(<AllianceMembers />);

    await screen.findByText('Green Alliance');

    fireEvent.click(screen.getByRole('button', { name: /Create Poll/i }));

    expect(Swal.fire).toHaveBeenCalled();
  });
});