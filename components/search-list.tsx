import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchResultItem } from '@/components/search-result-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getActivityIndicatorColor, getRefreshControlColors } from '@/constants/platform-styles';
import { useInfiniteList } from '@/hooks/use-infinite-list';
import { useThemeColor } from '@/hooks/use-theme-color';
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
  const [totalResults, setTotalResults] = useState(0);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const borderColor = useThemeColor({}, 'border');
  const hnClient = useMemo(() => new HackerNewsClient({
    cacheTtlMs: 30000, // 30 second cache for search
    maxConcurrency: 6,
  }), []);

  const searchStories = useCallback(async (page: number, pageSize: number) => {
    if (!query.trim()) {
      return { items: [], hasNextPage: false };
    }

    // Build search options
    const searchOptions = {
      page,
      hitsPerPage: pageSize,
      query: query.trim(),
      sortByDate: sortOrder === 'date',
      tags: filterType === 'all' ? '(story,comment)' : filterType,
    };
    
    const response: AlgoliaResponse = await hnClient.search(searchOptions);
    
    // Update total results for display
    setTotalResults(response.nbHits);
    
    return {
      items: response.hits,
      hasNextPage: page < response.nbPages - 1,
    };
  }, [hnClient, query, filterType, sortOrder]);

  const {
    items: results,
    loading,
    refreshing,
    loadingMore,
    error,
    handleRefresh,
    handleLoadMore,
    reset,
  } = useInfiniteList(searchStories, { 
    pageSize: 20, 
    debounceMs: 500 
  });

  // Reset when query changes
  useEffect(() => {
    if (!query.trim()) {
      reset();
      setTotalResults(0);
    }
  }, [query, reset]);

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
        <ActivityIndicator 
          size="small" 
          color={getActivityIndicatorColor(colorScheme || 'light')} 
        />
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
      <ThemedView style={[styles.header, { borderBottomColor: borderColor }]}>
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
        <ActivityIndicator 
          size="large" 
          color={getActivityIndicatorColor(colorScheme || 'light')} 
        />
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
            {...getRefreshControlColors(colorScheme || 'light')}
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
