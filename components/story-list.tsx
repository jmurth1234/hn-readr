import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StoryItem } from '@/components/story-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getActivityIndicatorColor, getRefreshControlColors, TAB_BAR_HEIGHT } from '@/constants/platform-styles';
import { useHNClient } from '@/contexts/hn-client-context';
import { useInfiniteList } from '@/hooks/use-infinite-list';
import { Page, Story, StoryFeedKind } from '@/lib/hn-api';

export interface StoryListProps {
  feedType: StoryFeedKind;
  title?: string;
  selectedStoryId?: number | null;
  isTablet?: boolean;
  onStorySelect?: (story: Story) => void;
}

export function StoryList({ feedType, selectedStoryId, isTablet = false, onStorySelect }: StoryListProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const hnClient = useHNClient();

  const fetchStories = useCallback(async (page: number, pageSize: number) => {
    const result: Page<Story> = await hnClient.listStories(feedType, { 
      page, 
      pageSize, 
      includeItems: true 
    });
    
    return {
      items: result.items,
      hasNextPage: result.hasNextPage,
    };
  }, [hnClient, feedType]);

  const {
    items: stories,
    loading,
    refreshing,
    loadingMore,
    error,
    handleRefresh,
    handleLoadMore,
  } = useInfiniteList(fetchStories, { pageSize: 30 });

  const handleStoryPress = useCallback((story: Story) => {
    if (isTablet && onStorySelect) {
      // In tablet mode, select the story instead of navigating
      onStorySelect(story);
    } else {
      // In mobile mode, navigate to story detail screen
      router.push(`/story/${story.id}` as `/${string}`);
    }
  }, [router, isTablet, onStorySelect]);

  const renderStory = ({ item }: { item: Story }) => (
    <StoryItem 
      story={item} 
      onPress={handleStoryPress}
      isSelected={isTablet && selectedStoryId === item.id}
    />
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
        <ActivityIndicator 
          size="large" 
          color={getActivityIndicatorColor(colorScheme || 'light')} 
        />
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
            {...getRefreshControlColors(colorScheme || 'light')}
            title="Pull to refresh"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContainer,
          {
            paddingTop: insets.top + (isTablet ? TAB_BAR_HEIGHT : 0),
            paddingBottom: insets.bottom
          }
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
