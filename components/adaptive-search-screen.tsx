import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { SearchFilterType, SearchList, SearchSortOrder } from '@/components/search-list';
import { SplitView } from '@/components/tablet/split-view';
import { StoryDetailView } from '@/components/tablet/story-detail-view';
import { ThemedView } from '@/components/themed-view';
import { useIsTablet } from '@/hooks/use-responsive';

export interface AdaptiveSearchScreenProps {
  query: string;
  filterType?: SearchFilterType;
  sortOrder?: SearchSortOrder;
}

export function AdaptiveSearchScreen({ query, filterType, sortOrder }: AdaptiveSearchScreenProps) {
  const isTablet = useIsTablet();
  const [selectedStoryId, setSelectedStoryId] = useState<number | null>(null);

  // Clear selection when query changes
  useEffect(() => {
    setSelectedStoryId(null);
  }, [query]);

  const handleStorySelect = useCallback((storyId: number) => {
    setSelectedStoryId(storyId);
  }, []);

  // Mobile layout: standard navigation
  if (!isTablet) {
    return (
      <SearchList 
        query={query} 
        filterType={filterType} 
        sortOrder={sortOrder}
      />
    );
  }

  // Tablet layout: split view
  return (
    <ThemedView style={styles.container}>
      <SplitView
        leftPanel={
          <SearchList
            query={query}
            filterType={filterType}
            sortOrder={sortOrder}
            selectedStoryId={selectedStoryId}
            isTablet={true}
            onStorySelect={handleStorySelect}
          />
        }
        rightPanel={
          <StoryDetailView storyId={selectedStoryId} />
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

