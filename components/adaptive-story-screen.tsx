import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { StoryList } from '@/components/story-list';
import { SplitView } from '@/components/tablet/split-view';
import { StoryDetailView } from '@/components/tablet/story-detail-view';
import { ThemedView } from '@/components/themed-view';
import { useIsTablet } from '@/hooks/use-responsive';
import { Story, StoryFeedKind } from '@/lib/hn-api';

export interface AdaptiveStoryScreenProps {
  feedType: StoryFeedKind;
  title?: string;
}

export function AdaptiveStoryScreen({ feedType, title }: AdaptiveStoryScreenProps) {
  const isTablet = useIsTablet();
  const [selectedStoryId, setSelectedStoryId] = useState<number | null>(null);

  // Clear selection when switching tabs or feed type changes
  useEffect(() => {
    setSelectedStoryId(null);
  }, [feedType]);

  const handleStorySelect = useCallback((story: Story) => {
    setSelectedStoryId(story.id);
  }, []);

  // Mobile layout: standard navigation
  if (!isTablet) {
    return <StoryList feedType={feedType} title={title} />;
  }

  // Tablet layout: split view
  return (
    <ThemedView style={styles.container}>
      <SplitView
        leftPanel={
          <StoryList
            feedType={feedType}
            title={title}
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

