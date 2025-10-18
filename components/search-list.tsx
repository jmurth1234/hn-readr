import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchResultItem } from '@/components/search-result-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AlgoliaHit, AlgoliaResponse, HackerNewsClient } from '@/lib/hn-api';

export type SearchFilterType = 'all' | 'story' | 'comment';
export type SearchSortOrder = 'relevance' | 'date';

export interface SearchListProps {
  query: string;
  filterType?: SearchFilterType;
  sortOrder?: SearchSortOrder;
}

export function SearchList({ 
  query, 
  filterType = 'all', 
  sortOrder = 'relevance' 
}: SearchListProps) {
  const [results, setResults] = useState<AlgoliaHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const hnClient = useMemo(() => new HackerNewsClient({
    cacheTtlMs: 30000, // 30 second cache for search
    maxConcurrency: 6,
  }), []);

  const searchStories = useCallback(async (page: number = 0, isRefresh: boolean = false) => {
    if (!query.trim()) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (page === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      setError(null);
      
      // Build search options
      const searchOptions = {
        page,
        hitsPerPage: 20,
        query: query.trim(),
        sortByDate: sortOrder === 'date',
        tags: filterType === 'all' ? '(story,comment)' : filterType,
      };
      
      const response: AlgoliaResponse = await hnClient.search(searchOptions);
      
      if (page === 0 || isRefresh) {
        setResults(response.hits);
        setCurrentPage(0);
      } else {
        setResults(prev => [...prev, ...response.hits]);
      }
      
      setTotalResults(response.nbHits);
      setHasNextPage(page < response.nbPages - 1);
      setCurrentPage(page);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search stories';
      setError(errorMessage);
      console.error('Error searching stories:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [hnClient, query, filterType, sortOrder]);

  // Debounced search effect
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setCurrentPage(0);
      setHasNextPage(true);
      setTotalResults(0);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchStories(0, true);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [query, filterType, sortOrder, searchStories]);

  const handleRefresh = useCallback(() => {
    if (query.trim()) {
      searchStories(0, true);
    }
  }, [searchStories, query]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasNextPage && query.trim()) {
      searchStories(currentPage + 1);
    }
  }, [searchStories, currentPage, hasNextPage, loadingMore, query]);

  const handleResultPress = useCallback((hit: AlgoliaHit) => {
    // For stories, navigate to story detail
    if (hit._tags?.includes('story')) {
      router.push(`/story/${hit.objectID}` as any);
    } 
    // For comments, navigate to the parent story
    else if (hit._tags?.includes('comment') && hit.story_id) {
      router.push(`/story/${hit.story_id}` as any);
    }
  }, [router]);

  const renderResult = ({ item }: { item: AlgoliaHit }) => (
    <SearchResultItem hit={item} onPress={handleResultPress} />
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <ThemedView style={styles.loadingMore}>
        <ActivityIndicator size="small" color="#ff6600" />
        <ThemedText 
          style={styles.loadingText}
          lightColor="#666"
          darkColor="#9BA1A6"
        >
          Loading more results...
        </ThemedText>
      </ThemedView>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    
    if (!query.trim()) {
      return (
        <ThemedView style={styles.emptyContainer}>
          <ThemedText 
            style={styles.emptyTitle}
            lightColor="#666"
            darkColor="#9BA1A6"
          >
            Search Hacker News
          </ThemedText>
          <ThemedText 
            style={styles.emptyText}
            lightColor="#999"
            darkColor="#666"
          >
            Enter a search query in the search bar above to find stories and comments.
          </ThemedText>
        </ThemedView>
      );
    }
    
    if (error) {
      return (
        <ThemedView style={styles.emptyContainer}>
          <ThemedText style={styles.errorTitle}>Search failed</ThemedText>
          <ThemedText 
            style={styles.errorText}
            lightColor="#666"
            darkColor="#9BA1A6"
          >
            {error}
          </ThemedText>
        </ThemedView>
      );
    }
    
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText 
          style={styles.emptyTitle}
          lightColor="#666"
          darkColor="#9BA1A6"
        >
          No results found
        </ThemedText>
        <ThemedText 
          style={styles.emptyText}
          lightColor="#999"
          darkColor="#666"
        >
          No results found for &ldquo;{query}&rdquo;. Try different keywords or check your spelling.
        </ThemedText>
      </ThemedView>
    );
  };

  const renderHeader = () => {
    if (!query.trim() || loading) return null;
    
    return (
      <ThemedView style={styles.header}>
        <ThemedText 
          style={styles.headerText}
          lightColor="#666"
          darkColor="#9BA1A6"
        >
          {totalResults.toLocaleString()} result{totalResults !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
        </ThemedText>
        <View style={styles.filters}>
          <ThemedText 
            style={styles.filterText}
            lightColor="#999"
            darkColor="#666"
          >
            {filterType === 'all' ? 'All' : filterType.charAt(0).toUpperCase() + filterType.slice(1)} • {sortOrder === 'relevance' ? 'Relevance' : 'Date'}
          </ThemedText>
        </View>
      </ThemedView>
    );
  };

  if (loading && results.length === 0) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6600" />
        <ThemedText 
          style={styles.loadingText}
          lightColor="#666"
          darkColor="#9BA1A6"
        >
          Searching...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={results}
        renderItem={renderResult}
        keyExtractor={(item) => item.objectID}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#ff6600"
            title="Pull to refresh"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContainer,
          { paddingBottom: insets.bottom }
        ]}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  headerText: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 2,
  },
  filters: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterText: {
    fontSize: 12,
    opacity: 0.7,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
