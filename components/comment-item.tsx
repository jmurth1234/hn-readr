import * as Haptics from 'expo-haptics';
import React, { memo, useCallback, useMemo } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { createPressableStyle, createRippleConfig } from '@/constants/platform-styles';
import { useThemeColor } from '@/hooks/use-theme-color';
import { CommentNode } from '@/lib/hn-api';
import { htmlToPreviewText, SimpleHtmlText } from '@/lib/hn-text-formatter';
import { formatTimeAgo } from '@/lib/utils';

export interface CommentItemProps {
  comment: CommentNode;
  depth: number;
  maxDepth?: number;
  isCollapsed: boolean;
  onToggleCollapse: (commentId: number) => void;
  onShowMore?: (commentId: number, remainingCount: number) => void;
}

export const CommentItem = memo(function CommentItem({
  comment,
  depth,
  maxDepth = 6,
  isCollapsed,
  onToggleCollapse,
  onShowMore,
}: CommentItemProps) {
  const borderColor = useThemeColor({}, 'border');

  const handleToggleCollapse = useCallback(() => {
    // Add haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggleCollapse(comment.id);
  }, [comment.id, onToggleCollapse]);

  const previewText = useMemo(() => {
    if (!comment.text) {
      return '';
    }
    const formattedText = htmlToPreviewText(comment.text);
    const firstNonEmptyLine = formattedText.split('\n').find((line) => line.trim().length > 0) ?? '';
    return firstNonEmptyLine.length > 100 ? `${firstNonEmptyLine.substring(0, 100)}...` : firstNonEmptyLine;
  }, [comment.text]);

  const shouldShowMoreButton = depth >= maxDepth && comment.children.length > 0;
  const replyCount = comment.replyCount ?? 0;
  const indentLevel = Math.min(depth, maxDepth);

  return (
    <ThemedView style={[styles.container, { paddingLeft: indentLevel * 16, borderBottomColor: borderColor }]}>
      {/* Comment Header */}
      <Pressable
        style={createPressableStyle(styles.header)}
        onPress={handleToggleCollapse}
        android_ripple={createRippleConfig()}
      >
        <ThemedView style={styles.headerContent}>
          <ThemedText style={styles.collapseButton}>
            {isCollapsed ? '[+]' : '[-]'}
          </ThemedText>
          
          <ThemedText
            style={styles.author}
            lightColor="#ff6600"
            darkColor="#ff6600"
          >
            {comment.by || 'unknown'}
          </ThemedText>
          
          <ThemedText
            style={styles.separator}
            lightColor="#999"
            darkColor="#666"
          >
            •
          </ThemedText>
          
          <ThemedText
            style={styles.timestamp}
            lightColor="#666"
            darkColor="#9BA1A6"
          >
            {comment.time ? formatTimeAgo(comment.time) : 'unknown'}
          </ThemedText>

          {isCollapsed && replyCount > 0 && (
            <>
              <ThemedText
                style={styles.separator}
                lightColor="#999"
                darkColor="#666"
              >
                •
              </ThemedText>
              <ThemedText
                style={styles.replyCount}
                lightColor="#666"
                darkColor="#9BA1A6"
              >
                {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
              </ThemedText>
            </>
          )}
        </ThemedView>
      </Pressable>

      {/* Comment Content */}
      {!isCollapsed && (
        <ThemedView style={styles.content}>
          {comment.text && (
            <SimpleHtmlText
              text={comment.text}
              style={styles.commentText}
              lightColor="#333"
              darkColor="#e0e0e0"
            />
          )}
          
          {comment.deleted && (
            <ThemedText
              style={styles.deletedText}
              lightColor="#999"
              darkColor="#666"
            >
              [deleted]
            </ThemedText>
          )}
          
          {comment.dead && (
            <ThemedText
              style={styles.deadText}
              lightColor="#999"
              darkColor="#666"
            >
              [dead]
            </ThemedText>
          )}
        </ThemedView>
      )}

      {/* Collapsed Preview */}
      {isCollapsed && comment.text && (
        <ThemedView style={styles.preview}>
          <ThemedText
            style={styles.previewText}
            lightColor="#666"
            darkColor="#9BA1A6"
            numberOfLines={1}
          >
            {previewText}
          </ThemedText>
        </ThemedView>
      )}

      {/* Show More Button for Deep Nesting */}
      {shouldShowMoreButton && !isCollapsed && (
        <Pressable
          style={createPressableStyle(styles.showMoreButton)}
          onPress={() => onShowMore?.(comment.id, replyCount)}
          android_ripple={createRippleConfig()}
        >
          <ThemedText
            style={styles.showMoreText}
            lightColor="#ff6600"
            darkColor="#ff6600"
          >
            Show {replyCount} more {replyCount === 1 ? 'reply' : 'replies'}
          </ThemedText>
        </Pressable>
      )}

    </ThemedView>
  );
});

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 44, // Minimum touch target
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  collapseButton: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 8,
    minWidth: 24,
    color: '#ff6600',
  },
  author: {
    fontSize: 13,
    fontWeight: '500',
    marginRight: 6,
  },
  separator: {
    fontSize: 13,
    marginHorizontal: 4,
  },
  timestamp: {
    fontSize: 13,
  },
  replyCount: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  deletedText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  deadText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  preview: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  previewText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  showMoreButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  showMoreText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
