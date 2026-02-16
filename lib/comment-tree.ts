import { AlgoliaHit, CommentNode } from '@/lib/hn-api';

export interface FlattenedCommentNode {
  comment: CommentNode;
  depth: number;
}

export function countReplies(children: CommentNode[]): number {
  return children.reduce((total, child) => total + 1 + child.replyCount, 0);
}

export function withReplyCounts(node: CommentNode): CommentNode {
  const childrenWithCounts = node.children.map(withReplyCounts);
  return {
    ...node,
    children: childrenWithCounts,
    replyCount: countReplies(childrenWithCounts),
  };
}

export function replaceCommentSubtree(root: CommentNode, commentId: number, replacement: CommentNode): CommentNode {
  const replacementWithCounts = withReplyCounts(replacement);

  const replaceInNode = (node: CommentNode): { node: CommentNode; replaced: boolean } => {
    if (node.id === commentId) {
      return { node: replacementWithCounts, replaced: true };
    }

    let replacedAny = false;
    const nextChildren = node.children.map((child) => {
      const result = replaceInNode(child);
      if (result.replaced) {
        replacedAny = true;
      }
      return result.node;
    });

    if (!replacedAny) {
      return { node, replaced: false };
    }

    return {
      node: {
        ...node,
        children: nextChildren,
        replyCount: countReplies(nextChildren),
      },
      replaced: true,
    };
  };

  return replaceInNode(root).node;
}

export function flattenVisibleComments(commentTree: CommentNode | null, collapsedIds: Set<number>): FlattenedCommentNode[] {
  if (!commentTree) {
    return [];
  }

  const flattened: FlattenedCommentNode[] = [];

  const traverse = (node: CommentNode, depth: number) => {
    flattened.push({ comment: node, depth });

    if (collapsedIds.has(node.id)) {
      return;
    }

    for (const child of node.children) {
      traverse(child, depth + 1);
    }
  };

  for (const topLevelComment of commentTree.children) {
    traverse(topLevelComment, 0);
  }

  return flattened;
}

export function collectCommentIds(commentTree: CommentNode | null): Set<number> {
  const ids = new Set<number>();
  if (!commentTree) {
    return ids;
  }

  const stack = [...commentTree.children];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    ids.add(current.id);
    if (current.children.length > 0) {
      stack.push(...current.children);
    }
  }

  return ids;
}

/**
 * Convert a flat array of Algolia hits into a CommentNode tree.
 * @param hits - flat comment hits from Algolia search
 * @param storyId - the story id (used for the pseudo-root)
 * @param kidsOrder - story.kids[] from Firebase for top-level ordering
 * @param storyMeta - optional story metadata for the pseudo-root
 */
export function algoliaHitsToCommentTree(
  hits: AlgoliaHit[],
  storyId: number,
  kidsOrder?: number[],
  storyMeta?: { by?: string; time?: number; title?: string },
): CommentNode {
  // Build a map of all comment nodes from hits
  const nodeMap = new Map<number, CommentNode>();

  for (const hit of hits) {
    const id = parseInt(hit.objectID, 10);
    if (isNaN(id)) continue;
    // Skip deleted/dead comments (no author)
    if (!hit.author && !hit.comment_text) continue;

    const node: CommentNode = {
      id,
      type: 'comment',
      by: hit.author || undefined,
      time: hit.created_at_i || undefined,
      text: hit.comment_text || undefined,
      parent: hit.parent_id || undefined,
      children: [],
      replyCount: 0,
    };
    nodeMap.set(id, node);
  }

  // Collect top-level comment ids (direct children of the story)
  const topLevelNodes: CommentNode[] = [];

  // Parent each node
  for (const node of nodeMap.values()) {
    if (node.parent && nodeMap.has(node.parent)) {
      nodeMap.get(node.parent)!.children.push(node);
    } else {
      // Top-level comment (parent is the story itself, or parent not in results)
      topLevelNodes.push(node);
    }
  }

  // Sort deeper-level children by time (chronological)
  for (const node of nodeMap.values()) {
    if (node.children.length > 1) {
      node.children.sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
    }
  }

  // Order top-level comments using story.kids[] if available
  let orderedTopLevel: CommentNode[];
  if (kidsOrder && kidsOrder.length > 0) {
    const kidsOrderMap = new Map(kidsOrder.map((id, i) => [id, i]));
    orderedTopLevel = topLevelNodes.sort((a, b) => {
      const aIdx = kidsOrderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const bIdx = kidsOrderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return aIdx - bIdx;
    });
  } else {
    // Fall back to chronological
    orderedTopLevel = topLevelNodes.sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
  }

  // Compute replyCount bottom-up
  function computeReplyCount(node: CommentNode): number {
    node.replyCount = node.children.reduce(
      (total, child) => total + 1 + computeReplyCount(child),
      0,
    );
    return node.replyCount;
  }

  for (const node of orderedTopLevel) {
    computeReplyCount(node);
  }

  // Build pseudo-root
  const pseudoRoot: CommentNode = {
    id: storyId,
    type: 'comment',
    by: storyMeta?.by,
    time: storyMeta?.time,
    text: storyMeta?.title ?? '',
    children: orderedTopLevel,
    replyCount: orderedTopLevel.reduce(
      (total, child) => total + 1 + child.replyCount,
      0,
    ),
  };

  return pseudoRoot;
}
