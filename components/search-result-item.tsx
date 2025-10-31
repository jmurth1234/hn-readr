import React, { memo } from 'react';
import { StyleSheet } from 'react-native';

import { BaseItem, normalizeAlgoliaHit, type NormalizedItemData } from '@/components/base-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AlgoliaHit } from '@/lib/hn-api';

export interface SearchResultItemProps {
  hit: AlgoliaHit;
  onPress: (hit: AlgoliaHit) => void;
  isSelected?: boolean;
}

export const SearchResultItem = memo(function SearchResultItem({ hit, onPress, isSelected = false }: SearchResultItemProps) {
  const normalizedData = normalizeAlgoliaHit(hit);
  
  // Determine if this is a comment or story
  const isComment = hit._tags?.includes('comment');
  const isStory = hit._tags?.includes('story');
  
  // For comments, show the parent story info
  const showParentStory = isComment && hit.story_title && hit.story_id;

  const handlePress = (data: NormalizedItemData) => {
    // Convert back to original hit format for the callback
    onPress(hit);
  };

  return (
    <BaseItem 
      data={normalizedData} 
      onPress={handlePress}
      isSelected={isSelected}
    >
      {/* Content type indicator */}
      <ThemedView style={styles.typeIndicator}>
        <ThemedText 
          style={[styles.typeText, isComment ? styles.commentType : styles.storyType]}
        >
          {isComment ? 'Comment' : isStory ? 'Story' : 'Item'}
        </ThemedText>
      </ThemedView>

      {/* For comments, show parent story */}
      {showParentStory && (
        <ThemedView style={styles.parentStory}>
          <ThemedText 
            style={styles.parentStoryText}
            lightColor="#666"
            darkColor="#9BA1A6"
          >
            Comment on: {hit.story_title}
          </ThemedText>
        </ThemedView>
      )}

      {/* Comment text preview (for comments) */}
      {isComment && hit.comment_text && (
        <ThemedView style={styles.commentPreview}>
          <ThemedText 
            style={styles.commentText}
            numberOfLines={2}
            lightColor="#666"
            darkColor="#9BA1A6"
          >
            {hit.comment_text.replace(/<[^>]*>/g, '')} {/* Strip HTML tags */}
          </ThemedText>
        </ThemedView>
      )}
    </BaseItem>
  );
});

const styles = StyleSheet.create({
  typeIndicator: {
    marginBottom: 4,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  storyType: {
    color: '#ff6600',
  },
  commentType: {
    color: '#666',
  },
  parentStory: {
    marginBottom: 6,
  },
  parentStoryText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  commentPreview: {
    marginBottom: 8,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#ff6600',
  },
  commentText: {
    fontSize: 14,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
