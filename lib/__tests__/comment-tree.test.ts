import { AlgoliaHit, CommentNode } from '@/lib/hn-api';
import {
  algoliaHitsToCommentTree,
  collectCommentIds,
  countReplies,
  flattenVisibleComments,
  replaceCommentSubtree,
  withReplyCounts,
} from '../comment-tree';

/** Helper to build a CommentNode quickly */
function makeNode(
  id: number,
  children: CommentNode[] = [],
  replyCount = 0,
): CommentNode {
  return {
    id,
    type: 'comment',
    by: `user${id}`,
    time: 1000 + id,
    text: `text ${id}`,
    children,
    replyCount,
  };
}

describe('countReplies', () => {
  it('returns 0 for empty children', () => {
    expect(countReplies([])).toBe(0);
  });

  it('returns 1 for a single child with no nested replies', () => {
    expect(countReplies([makeNode(1)])).toBe(1);
  });

  it('counts nested children via replyCount', () => {
    const child = makeNode(2, [], 3); // 3 nested replies
    const children = [makeNode(1), child];
    // 1 (child1) + 0 + 1 (child2) + 3 = 5
    expect(countReplies(children)).toBe(5);
  });
});

describe('withReplyCounts', () => {
  it('computes counts bottom-up', () => {
    const grandchild = makeNode(3);
    const child = makeNode(2, [grandchild]);
    const root = makeNode(1, [child]);

    const result = withReplyCounts(root);
    expect(result.replyCount).toBe(2); // child + grandchild
    expect(result.children[0].replyCount).toBe(1); // grandchild
    expect(result.children[0].children[0].replyCount).toBe(0);
  });

  it('handles a node with no children', () => {
    const node = makeNode(1);
    const result = withReplyCounts(node);
    expect(result.replyCount).toBe(0);
  });
});

describe('replaceCommentSubtree', () => {
  it('replaces the root node itself', () => {
    const root = makeNode(1, [makeNode(2)]);
    const replacement = makeNode(1, [makeNode(3), makeNode(4)]);
    const result = replaceCommentSubtree(root, 1, replacement);
    expect(result.children).toHaveLength(2);
    expect(result.children[0].id).toBe(3);
  });

  it('replaces a deep node', () => {
    const root = makeNode(1, [makeNode(2, [makeNode(3)])]);
    const replacement = makeNode(3, [makeNode(4)]);
    const result = replaceCommentSubtree(root, 3, replacement);
    expect(result.children[0].children[0].id).toBe(3);
    expect(result.children[0].children[0].children[0].id).toBe(4);
  });

  it('returns original tree when id not found', () => {
    const root = makeNode(1, [makeNode(2)]);
    const replacement = makeNode(99);
    const result = replaceCommentSubtree(root, 99, replacement);
    expect(result).toBe(root); // unchanged reference
  });
});

describe('flattenVisibleComments', () => {
  it('returns empty array for null tree', () => {
    expect(flattenVisibleComments(null, new Set())).toEqual([]);
  });

  it('flattens all children when nothing is collapsed', () => {
    const root = makeNode(0, [makeNode(1, [makeNode(2)]), makeNode(3)]);
    const result = flattenVisibleComments(root, new Set());
    expect(result.map((n) => n.comment.id)).toEqual([1, 2, 3]);
    expect(result[0].depth).toBe(0);
    expect(result[1].depth).toBe(1);
    expect(result[2].depth).toBe(0);
  });

  it('skips children of collapsed nodes', () => {
    const root = makeNode(0, [
      makeNode(1, [makeNode(2), makeNode(3)]),
      makeNode(4),
    ]);
    const collapsed = new Set([1]);
    const result = flattenVisibleComments(root, collapsed);
    // Node 1 is shown but its children (2, 3) are hidden
    expect(result.map((n) => n.comment.id)).toEqual([1, 4]);
  });

  it('assigns correct depths for deep nesting', () => {
    const root = makeNode(0, [
      makeNode(1, [makeNode(2, [makeNode(3)])]),
    ]);
    const result = flattenVisibleComments(root, new Set());
    expect(result.map((n) => n.depth)).toEqual([0, 1, 2]);
  });
});

describe('collectCommentIds', () => {
  it('returns empty set for null tree', () => {
    expect(collectCommentIds(null).size).toBe(0);
  });

  it('collects ids from flat children', () => {
    const root = makeNode(0, [makeNode(1), makeNode(2), makeNode(3)]);
    const ids = collectCommentIds(root);
    expect(ids).toEqual(new Set([1, 2, 3]));
  });

  it('collects ids from nested children', () => {
    const root = makeNode(0, [makeNode(1, [makeNode(2, [makeNode(3)])])]);
    const ids = collectCommentIds(root);
    expect(ids).toEqual(new Set([1, 2, 3]));
  });

  it('does not include the root id', () => {
    const root = makeNode(0, [makeNode(1)]);
    const ids = collectCommentIds(root);
    expect(ids.has(0)).toBe(false);
  });
});

describe('algoliaHitsToCommentTree', () => {
  function makeHit(overrides: Partial<AlgoliaHit> & { objectID: string }): AlgoliaHit {
    return {
      author: 'user1',
      comment_text: 'text',
      created_at_i: 1000,
      ...overrides,
    } as AlgoliaHit;
  }

  it('returns empty pseudo-root for empty hits', () => {
    const result = algoliaHitsToCommentTree([], 100);
    expect(result.id).toBe(100);
    expect(result.children).toHaveLength(0);
    expect(result.replyCount).toBe(0);
  });

  it('creates a single top-level comment from one hit', () => {
    const hits = [makeHit({ objectID: '1', author: 'alice', comment_text: 'hello' })];
    const result = algoliaHitsToCommentTree(hits, 100);
    expect(result.children).toHaveLength(1);
    expect(result.children[0].by).toBe('alice');
    expect(result.children[0].text).toBe('hello');
  });

  it('links parent and child comments', () => {
    const hits = [
      makeHit({ objectID: '1', created_at_i: 1000 }),
      makeHit({ objectID: '2', parent_id: 1, created_at_i: 2000 }),
    ];
    const result = algoliaHitsToCommentTree(hits, 100);
    expect(result.children).toHaveLength(1);
    expect(result.children[0].id).toBe(1);
    expect(result.children[0].children).toHaveLength(1);
    expect(result.children[0].children[0].id).toBe(2);
  });

  it('orders top-level by kidsOrder', () => {
    const hits = [
      makeHit({ objectID: '3', created_at_i: 3000 }),
      makeHit({ objectID: '1', created_at_i: 1000 }),
      makeHit({ objectID: '2', created_at_i: 2000 }),
    ];
    const result = algoliaHitsToCommentTree(hits, 100, [2, 3, 1]);
    expect(result.children.map((c) => c.id)).toEqual([2, 3, 1]);
  });

  it('falls back to chronological when no kidsOrder', () => {
    const hits = [
      makeHit({ objectID: '3', created_at_i: 3000 }),
      makeHit({ objectID: '1', created_at_i: 1000 }),
    ];
    const result = algoliaHitsToCommentTree(hits, 100);
    expect(result.children.map((c) => c.id)).toEqual([1, 3]);
  });

  it('skips hits with no author and no comment_text', () => {
    const hits = [
      makeHit({ objectID: '1', author: '', comment_text: null as any }),
      makeHit({ objectID: '2', author: 'bob', comment_text: 'hi' }),
    ];
    const result = algoliaHitsToCommentTree(hits, 100);
    expect(result.children).toHaveLength(1);
    expect(result.children[0].id).toBe(2);
  });

  it('skips hits with invalid objectID', () => {
    const hits = [
      makeHit({ objectID: 'not-a-number', author: 'bob' }),
      makeHit({ objectID: '2', author: 'alice' }),
    ];
    const result = algoliaHitsToCommentTree(hits, 100);
    expect(result.children).toHaveLength(1);
  });

  it('applies storyMeta to pseudo-root', () => {
    const result = algoliaHitsToCommentTree([], 100, undefined, {
      by: 'storyAuthor',
      time: 9999,
      title: 'My Story',
    });
    expect(result.by).toBe('storyAuthor');
    expect(result.time).toBe(9999);
    expect(result.text).toBe('My Story');
  });

  it('computes replyCount bottom-up', () => {
    const hits = [
      makeHit({ objectID: '1', created_at_i: 1000 }),
      makeHit({ objectID: '2', parent_id: 1, created_at_i: 2000 }),
      makeHit({ objectID: '3', parent_id: 2, created_at_i: 3000 }),
    ];
    const result = algoliaHitsToCommentTree(hits, 100);
    expect(result.children[0].replyCount).toBe(2);
    expect(result.children[0].children[0].replyCount).toBe(1);
    expect(result.replyCount).toBe(3);
  });
});
