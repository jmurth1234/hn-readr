import React, { memo } from 'react';

import { BaseItem, normalizeStory, type NormalizedItemData } from '@/components/base-item';
import { Story } from '@/lib/hn-api';

export interface StoryItemProps {
  story: Story;
  onPress: (story: Story) => void;
  isSelected?: boolean;
}

export const StoryItem = memo(function StoryItem({ story, onPress, isSelected = false }: StoryItemProps) {
  const normalizedData = normalizeStory(story);

  const handlePress = (data: NormalizedItemData) => {
    // Convert back to original story format for the callback
    onPress(story);
  };

  return (
    <BaseItem
      data={normalizedData}
      onPress={handlePress}
      isSelected={isSelected}
    />
  );
});

