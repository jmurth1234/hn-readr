import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  StyleProp,
  StyleSheet,
  useColorScheme,
  ViewStyle,
} from 'react-native';

import { CommentItem } from '@/components/comment-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getActivityIndicatorColor } from '@/constants/platform-styles';
import { collectCommentIds, flattenVisibleComments, FlattenedCommentNode } from '@/lib/comment-tree';
import { CommentNode } from '@/lib/hn-api';
import { formatNumber } from '@/lib/utils';

export interface CommentThreadListProps {
  commentTree: CommentNode | null;
  commentsLoading: boolean;
  commentCount: number;
  maxDepth?: number;
  onShowMore?: (commentId: number, remainingCount: number) => void;
  header?: React.ReactElement | null;
  contentContainerStyle?: StyleProp<ViewStyle>;
  showsVerticalScrollIndicator?: boolean;
}

export function CommentThreadList({
  commentTree,
  commentsLoading,
  commentCount,
  maxDepth = 6,
  onShowMore,
  header,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
}: CommentThreadListProps) {
  const colorScheme = useColorScheme();
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const validIds = collectCommentIds(commentTree);
    setCollapsedIds((previous) => {
      if (previous.size === 0) {
        return previous;
      }

      const next = new Set<number>();
      for (const id of previous) {
        if (validIds.has(id)) {
          next.add(id);
        }
      }

      return next.size === previous.size ? previous : next;
    });
  }, [commentTree]);

  const visibleComments = useMemo(
    () => flattenVisibleComments(commentTree, collapsedIds),
    [commentTree, collapsedIds]
  );

  const toggleCollapsed = useCallback((commentId: number) => {
    setCollapsedIds((previous) => {
      const next = new Set(previous);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  }, []);

  const renderComment = useCallback(
    ({ item }: ListRenderItemInfo<FlattenedCommentNode>) => (
      <CommentItem
        comment={item.comment}
        depth={item.depth}
        maxDepth={maxDepth}
        isCollapsed={collapsedIds.has(item.comment.id)}
        onToggleCollapse={toggleCollapsed}
        onShowMore={onShowMore}
      />
    ),
    [collapsedIds, maxDepth, onShowMore, toggleCollapsed]
  );

  const listHeader = useMemo(
    () => (
      <>
        {header}
        <ThemedView style={styles.commentsSection}>
          <ThemedText style={styles.commentsTitle}>Comments ({formatNumber(commentCount)})</ThemedText>
        </ThemedView>
      </>
    ),
    [commentCount, header]
  );

  const renderEmptyState = useCallback(() => {
    if (commentsLoading) {
      return (
        <ThemedView style={styles.commentsLoading}>
          <ActivityIndicator size="small" color={getActivityIndicatorColor(colorScheme || 'light')} />
          <ThemedText style={styles.loadingText} lightColor="#666" darkColor="#9BA1A6">
            Loading comments...
          </ThemedText>
        </ThemedView>
      );
    }

    return (
      <ThemedView style={styles.noComments}>
        <ThemedText style={styles.noCommentsText} lightColor="#666" darkColor="#9BA1A6">
          No comments yet
        </ThemedText>
      </ThemedView>
    );
  }, [colorScheme, commentsLoading]);

  const renderFooter = useCallback(() => {
    if (!commentsLoading || visibleComments.length === 0) {
      return null;
    }

    return (
      <ThemedView style={styles.commentsLoadingFooter}>
        <ActivityIndicator size="small" color={getActivityIndicatorColor(colorScheme || 'light')} />
        <ThemedText style={styles.loadingText} lightColor="#666" darkColor="#9BA1A6">
          Loading comments...
        </ThemedText>
      </ThemedView>
    );
  }, [colorScheme, commentsLoading, visibleComments.length]);

  return (
    <FlatList
      data={visibleComments}
      renderItem={renderComment}
      keyExtractor={(item) => item.comment.id.toString()}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={renderEmptyState}
      ListFooterComponent={renderFooter}
      contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      initialNumToRender={16}
      maxToRenderPerBatch={24}
      windowSize={9}
      removeClippedSubviews
      extraData={collapsedIds}
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
  },
  commentsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  commentsLoading: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  commentsLoadingFooter: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  noComments: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  noCommentsText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
});
