import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StoryItem } from '@/components/story-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { HackerNewsClient, Page, Story, StoryFeedKind } from '@/lib/hn-api';

export interface StoryListProps {
  feedType: StoryFeedKind;
  title?: string;
}

export function StoryList({ feedType, title }: StoryListProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const hnClient = useMemo(() => new HackerNewsClient({
    cacheTtlMs: 60000, // 1 minute cache
    maxConcurrency: 6,
  }), []);

  const fetchStories = useCallback(async (page: number = 0, isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (page === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      setError(null);
      
      const result: Page<Story> = await hnClient.listStories(feedType, { 
        page, 
        pageSize: 30, 
        includeItems: true 
      });
      
      if (page === 0 || isRefresh) {
        setStories(result.items);
        setCurrentPage(0);
      } else {
        setStories(prev => [...prev, ...result.items]);
      }
      
      setHasNextPage(result.hasNextPage);
      setCurrentPage(page);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load stories';
      setError(errorMessage);
      console.error('Error fetching stories:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [hnClient, feedType]);

  const handleRefresh = useCallback(() => {
    fetchStories(0, true);
  }, [fetchStories]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasNextPage) {
      fetchStories(currentPage + 1);
    }
  }, [fetchStories, currentPage, hasNextPage, loadingMore]);

  const handleStoryPress = useCallback((story: Story) => {
    router.push(`/story/${story.id}` as any);
  }, [router]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const renderStory = ({ item }: { item: Story }) => (
    <StoryItem story={item} onPress={handleStoryPress} />
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
          Loading more stories...
        </ThemedText>
      </ThemedView>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    
    if (error) {
      return (
        <ThemedView style={styles.emptyContainer}>
          <ThemedText style={styles.errorTitle}>Failed to load stories</ThemedText>
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
          style={styles.emptyText}
          lightColor="#666"
          darkColor="#9BA1A6"
        >
          No stories available
        </ThemedText>
      </ThemedView>
    );
  };

  if (loading && stories.length === 0) {
    return (
      <ThemedView style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#ff6600" />
        <ThemedText 
          style={styles.loadingText}
          lightColor="#666"
          darkColor="#9BA1A6"
        >
          Loading Hacker News...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={stories}
        renderItem={renderStory}
        keyExtractor={(item) => item.id.toString()}
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
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContainer,
          { paddingTop: insets.top, paddingBottom: insets.bottom }
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
