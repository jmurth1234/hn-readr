import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { Linking, StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Story } from '@/lib/hn-api';
import { extractDomain, formatNumber, formatTimeAgo } from '@/lib/utils';

export interface StoryItemProps {
  story: Story;
  onPress: (story: Story) => void;
}

export function StoryItem({ story, onPress }: StoryItemProps) {
  const handleTitlePress = () => {
    onPress(story);
  };

  const handleDomainPress = async () => {
    if (story.url) {
      try {
        await WebBrowser.openBrowserAsync(story.url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        });
      } catch (error) {
        console.error('Failed to open URL:', error);
        // Fallback to Linking if WebBrowser fails
        await Linking.openURL(story.url);
      }
    }
  };

  const domain = story.url ? extractDomain(story.url) : null;
  const points = story.score || 0;
  const comments = story.descendants || 0;
  const author = story.by || 'unknown';
  const timeAgo = story.time ? formatTimeAgo(story.time) : 'unknown';

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity 
        style={styles.content} 
        onPress={handleTitlePress}
        activeOpacity={0.7}
      >
        {/* Title */}
        <ThemedText style={styles.title} numberOfLines={3}>
          {story.title}
        </ThemedText>

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
  domain: {
    fontSize: 12,
    color: '#ff6600', // HN orange - consistent across themes
    fontWeight: '500',
  },
});
