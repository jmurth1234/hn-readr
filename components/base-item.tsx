import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { Linking, Platform, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { createPressableStyle, createRippleConfig } from '@/constants/platform-styles';
import { useThemeColor } from '@/hooks/use-theme-color';
import { AlgoliaHit, Story } from '@/lib/hn-api';
import { extractDomain, formatNumber, formatTimeAgo } from '@/lib/utils';

// Normalized data interface for both Story and AlgoliaHit
export interface NormalizedItemData {
  id: string | number;
  title: string;
  url?: string;
  points: number;
  comments: number;
  author: string;
  timeAgo: string;
  // Optional fields for search results
  type?: 'story' | 'comment';
  parentStoryTitle?: string;
  commentText?: string;
}

// Props for the base item components
export interface BaseItemProps {
  data: NormalizedItemData;
  onPress: (data: NormalizedItemData) => void;
  children?: React.ReactNode; // For additional content like type indicators
}

// Normalize Story data to common format
export const normalizeStory = (story: Story): NormalizedItemData => ({
  id: story.id,
  title: story.title,
  url: story.url,
  points: story.score || 0,
  comments: story.descendants || 0,
  author: story.by || 'unknown',
  timeAgo: story.time ? formatTimeAgo(story.time) : 'unknown',
  type: 'story',
});

// Normalize AlgoliaHit data to common format
export const normalizeAlgoliaHit = (hit: AlgoliaHit): NormalizedItemData => ({
  id: hit.objectID,
  title: hit.title || 'No title',
  url: hit.url,
  points: hit.points || 0,
  comments: hit.num_comments || 0,
  author: hit.author || 'unknown',
  timeAgo: hit.created_at_i ? formatTimeAgo(hit.created_at_i) : 'unknown',
  type: hit._tags?.includes('comment') ? 'comment' : 'story',
  parentStoryTitle: hit.story_title,
  commentText: hit.comment_text,
});

// Shared metadata component
export function ItemMetadata({ data }: { data: NormalizedItemData }) {
  return (
    <ThemedView style={styles.metadata}>
      <ThemedText 
        style={styles.metadataText}
        lightColor="#666"
        darkColor="#9BA1A6"
      >
        {formatNumber(data.points)} points
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
        by {data.author}
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
        {data.timeAgo}
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
        {formatNumber(data.comments)} comments
      </ThemedText>
    </ThemedView>
  );
}

// Shared domain link component
export function ItemDomain({ url }: { url: string }) {
  const handleDomainPress = async () => {
    try {
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
      });
    } catch (error) {
      console.error('Failed to open URL:', error);
      // Fallback to Linking if WebBrowser fails
      await Linking.openURL(url);
    }
  };

  const domain = extractDomain(url);

  return (
    <ThemedView style={styles.domainRow}>
      <Pressable
        onPress={handleDomainPress}
        style={createPressableStyle(styles.domainButton)}
        android_ripple={createRippleConfig()}
      >
        <ThemedText style={styles.domain}>
          {domain}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

// Base item component with shared structure
export function BaseItem({ data, onPress, children }: BaseItemProps) {
  const borderColor = useThemeColor({}, 'border');
  
  const handlePress = () => {
    // Add haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress(data);
  };

  return (
    <ThemedView style={[styles.container, { borderBottomColor: borderColor }]}>
      <Pressable 
        style={createPressableStyle(styles.content)}
        onPress={handlePress}
        android_ripple={createRippleConfig()}
      >
        {/* Additional content (type indicators, etc.) */}
        {children}

        {/* Title */}
        <ThemedText style={styles.title} numberOfLines={3}>
          {data.title}
        </ThemedText>

        {/* Metadata */}
        <ItemMetadata data={data} />

        {/* Domain link */}
        {data.url && <ItemDomain url={data.url} />}
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44, // Minimum touch target
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 8,
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
  domainButton: {
    alignSelf: 'flex-start',
  },
  domain: {
    fontSize: 12,
    color: '#ff6600', // HN orange - consistent across themes
    fontWeight: '500',
  },
});
