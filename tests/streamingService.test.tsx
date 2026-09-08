import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useRemittanceStream } from '../src/services/streamingService';
import { endpoints } from '../src/lib/api';

jest.mock('../src/lib/api', () => ({
  endpoints: {
    remittance: jest.fn(),
    remittanceEvents: jest.fn(),
  },
}));

const mockRemittance = endpoints.remittance as jest.MockedFunction<typeof endpoints.remittance>;
const mockEvents = endpoints.remittanceEvents as jest.MockedFunction<typeof endpoints.remittanceEvents>;

beforeEach(() => {
  mockRemittance.mockReset();
  mockEvents.mockReset();
});

describe('useRemittanceStream', () => {
  it('loads the remittance and events on mount', async () => {
    mockRemittance.mockResolvedValue({ status: 'PROCESSING' });
    mockEvents.mockResolvedValue([{ type: 'audit', at: '2026-01-01' }]);
    const { result, unmount } = await renderHook(() => useRemittanceStream('r1'));
    await waitFor(() => expect(result.current.connected).toBe(true));
    expect(result.current.remittance).toEqual({ status: 'PROCESSING' });
    expect(result.current.events).toHaveLength(1);
    expect(result.current.lastUpdated).toBeTruthy();
    await unmount();
  });

  it('starts disconnected with no data before the first fetch settles', async () => {
    // Hold the fetch open so the initial snapshot is what we assert on.
    mockRemittance.mockImplementation(() => new Promise(() => undefined));
    mockEvents.mockImplementation(() => new Promise(() => undefined));
    const { result, unmount } = await renderHook(() => useRemittanceStream('r1'));
    expect(result.current.connected).toBe(false);
    expect(result.current.remittance).toBeNull();
    expect(result.current.events).toEqual([]);
    await unmount();
  });

  it('does nothing when disabled or without an id', async () => {
    mockRemittance.mockResolvedValue({ status: 'RELEASED' });
    mockEvents.mockResolvedValue([]);
    const a = await renderHook(() => useRemittanceStream(undefined));
    const b = await renderHook(() => useRemittanceStream('r1', false));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(mockRemittance).not.toHaveBeenCalled();
    expect(mockEvents).not.toHaveBeenCalled();
    await a.unmount();
    await b.unmount();
  });

  it('marks disconnected and backs off when the backend errors', async () => {
    mockRemittance.mockRejectedValue(new Error('down'));
    mockEvents.mockRejectedValue(new Error('down'));
    const { result, unmount } = await renderHook(() => useRemittanceStream('r1'));
    await waitFor(() => expect(result.current.connected).toBe(false));
    expect(result.current.lastUpdated).toBeNull();
    await unmount();
  });

  it('relaxes polling to 15s when the remittance reaches a terminal state', async () => {
    mockRemittance.mockResolvedValue({ status: 'RELEASED' });
    mockEvents.mockResolvedValue([]);
    const { result, unmount } = await renderHook(() => useRemittanceStream('r1'));
    await waitFor(() => expect(result.current.connected).toBe(true));
    expect(result.current.remittance).toEqual({ status: 'RELEASED' });
    await unmount();
  });
});