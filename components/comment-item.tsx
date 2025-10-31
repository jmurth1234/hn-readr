import * as Haptics from 'expo-haptics';
import React, { memo, useState } from 'react';
import { Platform, Pressable, StyleSheet, useColorScheme } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { createPressableStyle, createRippleConfig } from '@/constants/platform-styles';
import { useThemeColor } from '@/hooks/use-theme-color';
import { CommentNode } from '@/lib/hn-api';
import { SimpleHtmlText } from '@/lib/hn-text-formatter';
import { formatTimeAgo } from '@/lib/utils';

export interface CommentItemProps {
  comment: CommentNode;
  depth: number;
  maxDepth?: number;
  onShowMore?: (commentId: number, remainingCount: number) => void;
}

export const CommentItem = memo(function CommentItem({ comment, depth, maxDepth = 6, onShowMore }: CommentItemProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const borderColor = useThemeColor({}, 'border');

  const handleToggleCollapse = () => {
    // Add haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsCollapsed(!isCollapsed);
  };

  const getPreviewText = (text: string): string => {
    const firstLine = text.split('\n')[0];
    return firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine;
  };

  const getReplyCount = (comment: CommentNode): number => {
    let count = 0;
    const countReplies = (node: CommentNode) => {
      count += node.children.length;
      node.children.forEach(countReplies);
    };
    countReplies(comment);
    return count;
  };

  const shouldShowMoreButton = depth >= maxDepth && comment.children.length > 0;
  const replyCount = getReplyCount(comment);
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
            {getPreviewText(comment.text)}
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

      {/* Child Comments */}
      {!isCollapsed && comment.children.length > 0 && (
        <ThemedView style={styles.children}>
          {comment.children.map((child) => (
            <CommentItem
              key={child.id}
              comment={child}
              depth={depth + 1}
              maxDepth={maxDepth}
              onShowMore={onShowMore}
            />
          ))}
        </ThemedView>
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
  children: {
    // Children are rendered with their own indentation
  },
});
