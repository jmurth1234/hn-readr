import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommentItem } from '@/components/comment-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { createPressableStyle, createRippleConfig, getActivityIndicatorColor, TAB_BAR_HEIGHT } from '@/constants/platform-styles';
import { useHNClient } from '@/contexts/hn-client-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { CommentNode, Story } from '@/lib/hn-api';
import { extractDomain, formatNumber, formatTimeAgo } from '@/lib/utils';

export interface StoryDetailViewProps {
  storyId: number | null;
  onError?: (error: string) => void;
}

export function StoryDetailView({ storyId, onError }: StoryDetailViewProps) {
  const [story, setStory] = useState<Story | null>(null);
  const [commentTree, setCommentTree] = useState<CommentNode | null>(null);
  const [storyLoading, setStoryLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const borderColor = useThemeColor({}, 'border');
  const hnClient = useHNClient();

  const fetchStory = useCallback(async () => {
    if (!storyId) return;
    
    try {
      setStoryLoading(true);
      setError(null);
      const storyData = await hnClient.getItem<Story>(storyId);
      if (!storyData || storyData.type !== 'story') {
        const errorMsg = 'Story not found';
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }
      setStory(storyData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load story';
      setError(errorMessage);
      onError?.(errorMessage);
      console.error('Error fetching story:', err);
    } finally {
      setStoryLoading(false);
    }
  }, [hnClient, storyId, onError]);

  const fetchComments = useCallback(async () => {
    if (!storyId) return;
    
    try {
      setCommentsLoading(true);
      const tree = await hnClient.getCommentsTree(storyId, {
        depth: 3, // Limit comment depth for performance
        maxNodes: 1000, // Reasonable limit
      });
      setCommentTree(tree);
    } catch (err) {
      console.error('Error fetching comments:', err);
      // Don't set main error state, just log
    } finally {
      setCommentsLoading(false);
    }
  }, [hnClient, storyId]);

  useEffect(() => {
    if (!storyId) {
      setStory(null);
      setCommentTree(null);
      setError(null);
      setStoryLoading(false);
      return;
    }
    
    fetchStory();
    fetchComments();
  }, [storyId, fetchStory, fetchComments]);

  const handleUrlPress = async () => {
    if (!story?.url) return;

    // Add haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      await WebBrowser.openBrowserAsync(story.url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
      });
    } catch (error) {
      console.error('Failed to open URL:', error);
      Alert.alert('Error', 'Failed to open URL');
    }
  };

  const handleShowMoreComments = useCallback(async (commentId: number, remainingCount: number) => {
    try {
      // Fetch the full comment tree for this specific comment
      const fullCommentTree = await hnClient.getCommentsTree(commentId, {
        depth: 10, // Allow deeper nesting for expanded comments
        maxNodes: 500,
      });

      if (fullCommentTree) {
        // Update the comment tree to include the expanded comments
        setCommentTree(prevTree => {
          if (!prevTree) return prevTree;
          
          const updateCommentTree = (node: CommentNode): CommentNode => {
            if (node.id === commentId) {
              return fullCommentTree;
            }
            return {
              ...node,
              children: node.children.map(updateCommentTree),
            };
          };
          
          return updateCommentTree(prevTree);
        });
      }
    } catch (error) {
      console.error('Failed to load more comments:', error);
    }
  }, [hnClient]);

  // Empty state when no story is selected
  if (!storyId) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText 
          style={styles.emptyText}
          lightColor="#666"
          darkColor="#9BA1A6"
        >
          Select a story to view details
        </ThemedText>
      </ThemedView>
    );
  }

  if (storyLoading) {
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
          Loading story...
        </ThemedText>
      </ThemedView>
    );
  }

  if (error || !story) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText style={styles.errorTitle}>
          {error || 'Story not found'}
        </ThemedText>
      </ThemedView>
    );
  }

  const domain = story.url ? extractDomain(story.url) : null;
  const points = story.score || 0;
  const commentCount = story.descendants || 0;
  const author = story.by || 'unknown';
  const timeAgo = story.time ? formatTimeAgo(story.time) : 'unknown';

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: insets.top + TAB_BAR_HEIGHT,
          paddingBottom: insets.bottom
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Story Header */}
        <ThemedView 
          style={[
            styles.storyHeader,
            { borderBottomColor: borderColor }
          ]}
          lightColor="#fff"
          darkColor="#151718"
        >
          <ThemedText style={styles.title}>{story.title}</ThemedText>
          
        {/* Metadata */}
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
            {formatNumber(commentCount)} comments
          </ThemedText>
        </ThemedView>

          {/* URL/Domain */}
          {story.url && (
            <ThemedView 
              style={styles.urlContainer}
              lightColor="#f8f9fa"
              darkColor="#2a2a2a"
            >
              <Pressable 
                onPress={handleUrlPress}
                style={createPressableStyle(styles.urlButton)}
                android_ripple={createRippleConfig()}
              >
              <ThemedText 
                style={styles.url} 
                numberOfLines={1}
                lightColor="#0066cc"
                darkColor="#4A9EFF"
              >
                {story.url}
              </ThemedText>
              <ThemedText style={styles.domain}>
                {domain}
              </ThemedText>
              </Pressable>
            </ThemedView>
          )}
        </ThemedView>

        {/* Comments Section */}
        <ThemedView style={styles.commentsSection}>
          <ThemedText style={styles.commentsTitle}>
            Comments ({formatNumber(commentCount)})
          </ThemedText>
          
          {commentsLoading ? (
            <ThemedView style={styles.commentsLoading}>
              <ActivityIndicator 
                size="small" 
                color={getActivityIndicatorColor(colorScheme || 'light')} 
              />
              <ThemedText 
                style={styles.loadingText}
                lightColor="#666"
                darkColor="#9BA1A6"
              >
                Loading comments...
              </ThemedText>
            </ThemedView>
          ) : commentTree && commentTree.children.length > 0 ? (
            <ThemedView style={styles.commentsList}>
              {commentTree.children.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  depth={0}
                  maxDepth={6}
                  onShowMore={handleShowMoreComments}
                />
              ))}
            </ThemedView>
          ) : (
            <ThemedView style={styles.noComments}>
              <ThemedText 
                style={styles.noCommentsText}
                lightColor="#666"
                darkColor="#9BA1A6"
              >
                No comments yet
              </ThemedText>
            </ThemedView>
          )}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  storyHeader: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    marginBottom: 12,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  metadataText: {
    fontSize: 14,
    lineHeight: 20,
  },
  separator: {
    fontSize: 14,
    marginHorizontal: 6,
    lineHeight: 20,
  },
  urlContainer: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6600',
  },
  urlButton: {
    // URL button styling handled by Pressable
  },
  url: {
    fontSize: 14,
    marginBottom: 4,
  },
  domain: {
    fontSize: 12,
    color: '#ff6600',
    fontWeight: '500',
  },
  commentsSection: {
    padding: 16,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  commentsList: {
    // Comments are rendered with their own styling
  },
  noComments: {
    padding: 20,
    alignItems: 'center',
  },
  noCommentsText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  commentsLoading: {
    padding: 20,
    alignItems: 'center',
  },
});

