import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { Linking, StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AlgoliaHit } from '@/lib/hn-api';
import { extractDomain, formatNumber, formatTimeAgo } from '@/lib/utils';

export interface SearchResultItemProps {
  hit: AlgoliaHit;
  onPress: (hit: AlgoliaHit) => void;
}

export function SearchResultItem({ hit, onPress }: SearchResultItemProps) {
  const handleTitlePress = () => {
    onPress(hit);
  };

  const handleDomainPress = async () => {
    if (hit.url) {
      try {
        await WebBrowser.openBrowserAsync(hit.url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        });
      } catch (error) {
        console.error('Failed to open URL:', error);
        // Fallback to Linking if WebBrowser fails
        await Linking.openURL(hit.url);
      }
    }
  };

  const domain = hit.url ? extractDomain(hit.url) : null;
  const points = hit.points || 0;
  const comments = hit.num_comments || 0;
  const author = hit.author || 'unknown';
  const timeAgo = hit.created_at_i ? formatTimeAgo(hit.created_at_i) : 'unknown';
  
  // Determine if this is a comment or story
  const isComment = hit._tags?.includes('comment');
  const isStory = hit._tags?.includes('story');
  
  // For comments, show the parent story info
  const showParentStory = isComment && hit.story_title && hit.story_id;

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity 
        style={styles.content} 
        onPress={handleTitlePress}
        activeOpacity={0.7}
      >
        {/* Content type indicator */}
        <ThemedView style={styles.typeIndicator}>
          <ThemedText 
            style={[styles.typeText, isComment ? styles.commentType : styles.storyType]}
          >
            {isComment ? 'Comment' : isStory ? 'Story' : 'Item'}
          </ThemedText>
        </ThemedView>

        {/* Title */}
        <ThemedText style={styles.title} numberOfLines={3}>
          {hit.title || 'No title'}
        </ThemedText>

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

        {/* Metadata row */}
        <ThemedView style={styles.metadata}>
          <ThemedText 
            style={styles.metadataText}
            lightColor="#666"
            darkColor="#9BA1A6"
          >
            {formatNumber(points)} points
          </ThemedText>
          <ThemedText 
            style={styles.separator}
            lightColor="#999"
            darkColor="#666"
          >
            •
          </ThemedText>
          <ThemedText 
            style={styles.metadataText}
            lightColor="#666"
            darkColor="#9BA1A6"
          >
            by {author}
          </ThemedText>
          <ThemedText 
            style={styles.separator}
            lightColor="#999"
            darkColor="#666"
          >
            •
          </ThemedText>
          <ThemedText 
            style={styles.metadataText}
            lightColor="#666"
            darkColor="#9BA1A6"
          >
            {timeAgo}
          </ThemedText>
          <ThemedText 
            style={styles.separator}
            lightColor="#999"
            darkColor="#666"
          >
            •
          </ThemedText>
          <ThemedText 
            style={styles.metadataText}
            lightColor="#666"
            darkColor="#9BA1A6"
          >
            {formatNumber(comments)} comments
          </ThemedText>
        </ThemedView>

        {/* Domain row */}
        {domain && (
          <ThemedView style={styles.domainRow}>
            <TouchableOpacity 
              onPress={handleDomainPress}
              activeOpacity={0.6}
            >
              <ThemedText style={styles.domain}>
                {domain}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
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
  title: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 8,
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
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  metadataText: {
    fontSize: 13,
    lineHeight: 18,
  },
  separator: {
    fontSize: 13,
    marginHorizontal: 6,
    lineHeight: 18,
  },
  domainRow: {
    marginTop: 2,
  },
  domain: {
    fontSize: 12,
    color: '#ff6600',
    fontWeight: '500',
  },
});
