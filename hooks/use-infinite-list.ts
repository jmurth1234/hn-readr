import { useCallback, useEffect, useState } from 'react';

export interface InfiniteListState<T> {
  items: T[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  currentPage: number;
  hasNextPage: boolean;
}

export interface InfiniteListOptions {
  pageSize?: number;
  cacheTtlMs?: number;
  maxConcurrency?: number;
  debounceMs?: number;
}

export interface InfiniteListActions<T> {
  fetchItems: (page: number, isRefresh?: boolean) => Promise<void>;
  handleRefresh: () => void;
  handleLoadMore: () => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export function useInfiniteList<T>(
  fetchFunction: (page: number, pageSize: number) => Promise<{ items: T[]; hasNextPage: boolean }>,
  options: InfiniteListOptions = {}
): InfiniteListState<T> & InfiniteListActions<T> {
  const {
    pageSize = 30,
    debounceMs = 0,
  } = options;

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(true);

  const fetchItems = useCallback(async (page: number = 0, isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (page === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      setError(null);
      
      const result = await fetchFunction(page, pageSize);
      
      if (page === 0 || isRefresh) {
        setItems(result.items);
        setCurrentPage(0);
      } else {
        setItems(prev => [...prev, ...result.items]);
      }
      
      setHasNextPage(result.hasNextPage);
      setCurrentPage(page);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load items';
      setError(errorMessage);
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [fetchFunction, pageSize]);

  const handleRefresh = useCallback(() => {
    fetchItems(0, true);
  }, [fetchItems]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasNextPage) {
      fetchItems(currentPage + 1);
    }
  }, [fetchItems, currentPage, hasNextPage, loadingMore]);

  const reset = useCallback(() => {
    setItems([]);
    setLoading(true);
    setRefreshing(false);
    setLoadingMore(false);
    setError(null);
    setCurrentPage(0);
    setHasNextPage(true);
  }, []);

  // Debounced effect for initial load
  useEffect(() => {
    if (debounceMs > 0) {
      const timeoutId = setTimeout(() => {
        fetchItems(0, true);
      }, debounceMs);

      return () => clearTimeout(timeoutId);
    } else {
      fetchItems();
    }
  }, [fetchItems, debounceMs]);

  return {
    // State
    items,
    loading,
    refreshing,
    loadingMore,
    error,
    currentPage,
    hasNextPage,
    
    // Actions
    fetchItems,
    handleRefresh,
    handleLoadMore,
    setError,
    reset,
  };
}
