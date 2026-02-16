import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useInfiniteList } from '../use-infinite-list';

function createMockFetch(pages: Record<number, { items: any[]; hasNextPage: boolean }>) {
  return jest.fn(async (page: number, _pageSize: number) => {
    const result = pages[page];
    if (!result) throw new Error(`No data for page ${page}`);
    return result;
  });
}

describe('useInfiniteList', () => {
  it('triggers initial load and sets loading states', async () => {
    const fetchFn = createMockFetch({
      0: { items: [{ id: 1 }, { id: 2 }], hasNextPage: true },
    });

    const { result } = renderHook(() => useInfiniteList(fetchFn));

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toEqual([{ id: 1 }, { id: 2 }]);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('handleLoadMore fetches next page and appends items', async () => {
    const fetchFn = createMockFetch({
      0: { items: [{ id: 1 }], hasNextPage: true },
      1: { items: [{ id: 2 }], hasNextPage: false },
    });

    const { result } = renderHook(() => useInfiniteList(fetchFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      result.current.handleLoadMore();
    });

    await waitFor(() => {
      expect(result.current.items).toEqual([{ id: 1 }, { id: 2 }]);
    });
    expect(result.current.hasNextPage).toBe(false);
  });

  it('handleLoadMore no-ops when no next page', async () => {
    const fetchFn = createMockFetch({
      0: { items: [{ id: 1 }], hasNextPage: false },
    });

    const { result } = renderHook(() => useInfiniteList(fetchFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const callCount = fetchFn.mock.calls.length;

    await act(async () => {
      result.current.handleLoadMore();
    });

    expect(fetchFn.mock.calls.length).toBe(callCount);
  });

  it('handleRefresh resets to page 0 and replaces items', async () => {
    let callCount = 0;
    const fetchFn = jest.fn(async (page: number) => {
      callCount++;
      if (page === 0 && callCount <= 1) {
        return { items: [{ id: 1 }], hasNextPage: true };
      }
      if (page === 1) {
        return { items: [{ id: 2 }], hasNextPage: true };
      }
      // Refresh call
      return { items: [{ id: 10 }], hasNextPage: true };
    });

    const { result } = renderHook(() => useInfiniteList(fetchFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      result.current.handleRefresh();
    });

    await waitFor(() => {
      expect(result.current.refreshing).toBe(false);
    });

    expect(result.current.items).toEqual([{ id: 10 }]);
    expect(result.current.currentPage).toBe(0);
  });

  it('sets error state on fetch failure', async () => {
    const fetchFn = jest.fn(async () => {
      throw new Error('Network error');
    });

    const { result } = renderHook(() => useInfiniteList(fetchFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.items).toEqual([]);
  });

  it('reset clears all state', async () => {
    const fetchFn = createMockFetch({
      0: { items: [{ id: 1 }], hasNextPage: true },
    });

    const { result } = renderHook(() => useInfiniteList(fetchFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.currentPage).toBe(0);
    expect(result.current.hasNextPage).toBe(true);
  });
});
