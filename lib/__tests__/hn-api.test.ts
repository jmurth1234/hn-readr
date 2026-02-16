import { HackerNewsClient } from '../hn-api';

/** Create a mock fetch that returns predefined responses */
function createMockFetch(responses: Record<string, any>) {
  return jest.fn((url: string) => {
    for (const [pattern, data] of Object.entries(responses)) {
      if (url.includes(pattern)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(data),
        });
      }
    }
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve(null),
    });
  }) as unknown as typeof fetch;
}

function createClient(mockFetch: typeof fetch, opts = {}) {
  return new HackerNewsClient({
    fetchImpl: mockFetch,
    timeoutMs: 5000,
    cacheTtlMs: 100, // short TTL for tests
    cacheMaxEntries: 10,
    maxConcurrency: 2,
    ...opts,
  });
}

describe('LruCache behavior (via HackerNewsClient)', () => {
  it('returns cached value without re-fetching', async () => {
    const mockFetch = createMockFetch({ 'item/1.json': { id: 1, type: 'story', title: 'Test' } });
    const client = createClient(mockFetch);

    const first = await client.getItem(1);
    const second = await client.getItem(1);

    expect(first).toEqual(second);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('re-fetches after TTL expires', async () => {
    const mockFetch = createMockFetch({ 'item/1.json': { id: 1, type: 'story', title: 'Test' } });
    const client = createClient(mockFetch, { cacheTtlMs: 50 });

    await client.getItem(1);
    await new Promise((r) => setTimeout(r, 60));
    await client.getItem(1);

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('clearCache empties both caches', async () => {
    const mockFetch = createMockFetch({
      'item/1.json': { id: 1, type: 'story' },
      'topstories.json': [1, 2, 3],
    });
    const client = createClient(mockFetch);

    await client.getItem(1);
    await client.getStoryIds('top');
    client.clearCache();

    await client.getItem(1);
    await client.getStoryIds('top');

    // Each should have been called twice (before and after clear)
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });
});

describe('Semaphore behavior (via HackerNewsClient)', () => {
  it('limits concurrent operations', async () => {
    let concurrent = 0;
    let maxConcurrent = 0;

    const slowFetch = jest.fn((url: string) => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      return new Promise<Response>((resolve) => {
        setTimeout(() => {
          concurrent--;
          resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ id: 1, type: 'story' }),
          } as Response);
        }, 20);
      });
    }) as unknown as typeof fetch;

    const client = createClient(slowFetch, { maxConcurrency: 2, cacheTtlMs: 0 });

    await Promise.all([
      client.getItem(1),
      client.getItem(2),
      client.getItem(3),
      client.getItem(4),
    ]);

    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });
});

describe('fetchJson retry behavior', () => {
  it('retries on 500+ status codes', async () => {
    let callCount = 0;
    const mockFetch = jest.fn((_url: string, _opts: any) => {
      callCount++;
      if (callCount < 3) {
        return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve(null) });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 1 }),
      });
    }) as unknown as typeof fetch;

    const client = createClient(mockFetch);
    const result = await client.getItem(1);
    expect(result).toEqual({ id: 1 });
    expect(callCount).toBe(3);
  });

  it('does NOT retry on 4xx', async () => {
    const mockFetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) }),
    ) as unknown as typeof fetch;

    const client = createClient(mockFetch);
    await expect(client.getItem(1)).rejects.toThrow('HTTP 404');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting retries on server errors', async () => {
    const mockFetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 503, json: () => Promise.resolve(null) }),
    ) as unknown as typeof fetch;

    const client = createClient(mockFetch);
    await expect(client.getItem(1)).rejects.toThrow('HTTP 503');
    // 1 initial + 2 retries = 3 calls
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});

describe('HackerNewsClient.getItem', () => {
  it('fetches the correct Firebase URL', async () => {
    const mockFetch = createMockFetch({ 'item/42.json': { id: 42, type: 'story' } });
    const client = createClient(mockFetch);

    await client.getItem(42);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('item/42.json'),
      expect.any(Object),
    );
  });
});

describe('HackerNewsClient.getUser', () => {
  it('URL-encodes the user id', async () => {
    const mockFetch = createMockFetch({
      'user/user%20name.json': { id: 'user name', karma: 100 },
    });
    const client = createClient(mockFetch);

    await client.getUser('user name');

    const calledUrl = (mockFetch as jest.Mock).mock.calls[0][0];
    expect(calledUrl).toContain('user/user%20name.json');
  });
});

describe('HackerNewsClient.getStoryIds', () => {
  it('fetches correct endpoint for each feed kind', async () => {
    const mockFetch = createMockFetch({ 'topstories.json': [1, 2, 3] });
    const client = createClient(mockFetch);

    const ids = await client.getStoryIds('top');
    expect(ids).toEqual([1, 2, 3]);
  });

  it('caches story IDs across calls', async () => {
    const mockFetch = createMockFetch({ 'topstories.json': [1, 2] });
    const client = createClient(mockFetch);

    await client.getStoryIds('top');
    await client.getStoryIds('top');
    // Should only fetch once due to caching
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('re-fetches after clearCache', async () => {
    const mockFetch = createMockFetch({ 'topstories.json': [1, 2] });
    const client = createClient(mockFetch);

    await client.getStoryIds('top');
    client.clearCache();
    await client.getStoryIds('top');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe('HackerNewsClient.listStories', () => {
  it('paginates correctly', async () => {
    const storyIds = Array.from({ length: 100 }, (_, i) => i + 1);
    const responses: Record<string, any> = { 'topstories.json': storyIds };
    for (let i = 1; i <= 100; i++) {
      responses[`item/${i}.json`] = { id: i, type: 'story', title: `Story ${i}` };
    }
    const mockFetch = createMockFetch(responses);
    const client = createClient(mockFetch);

    const page0 = await client.listStories('top', { page: 0, pageSize: 10 });
    expect(page0.items).toHaveLength(10);
    expect(page0.hasNextPage).toBe(true);
    expect(page0.page).toBe(0);
    expect(page0.items[0].id).toBe(1);

    const page1 = await client.listStories('top', { page: 1, pageSize: 10 });
    expect(page1.items[0].id).toBe(11);
  });

  it('preserves ordering from story ID list', async () => {
    const responses: Record<string, any> = {
      'topstories.json': [3, 1, 2],
      'item/3.json': { id: 3, type: 'story' },
      'item/1.json': { id: 1, type: 'story' },
      'item/2.json': { id: 2, type: 'story' },
    };
    const mockFetch = createMockFetch(responses);
    const client = createClient(mockFetch);

    const result = await client.listStories('top', { page: 0, pageSize: 10 });
    expect(result.items.map((s) => s.id)).toEqual([3, 1, 2]);
  });
});

describe('HackerNewsClient.search', () => {
  it('constructs correct Algolia URL', async () => {
    const mockFetch = createMockFetch({
      'search?': { hits: [], page: 0, nbHits: 0, nbPages: 0, hitsPerPage: 20 },
    });
    const client = createClient(mockFetch);

    await client.search({ query: 'react', tags: 'story', page: 0 });

    const calledUrl = (mockFetch as jest.Mock).mock.calls[0][0];
    expect(calledUrl).toContain('hn.algolia.com/api/v1/search?');
    expect(calledUrl).toContain('query=react');
    expect(calledUrl).toContain('tags=story');
  });

  it('uses search_by_date endpoint when sortByDate is true', async () => {
    const mockFetch = createMockFetch({
      'search_by_date?': { hits: [], page: 0, nbHits: 0, nbPages: 0, hitsPerPage: 20 },
    });
    const client = createClient(mockFetch);

    await client.search({ query: 'test', sortByDate: true });

    const calledUrl = (mockFetch as jest.Mock).mock.calls[0][0];
    expect(calledUrl).toContain('search_by_date');
  });

  it('passes additionalParams', async () => {
    const mockFetch = createMockFetch({
      'search?': { hits: [], page: 0, nbHits: 0, nbPages: 0, hitsPerPage: 20 },
    });
    const client = createClient(mockFetch);

    await client.search({ query: '', additionalParams: { typoTolerance: 'false' } });

    const calledUrl = (mockFetch as jest.Mock).mock.calls[0][0];
    expect(calledUrl).toContain('typoTolerance=false');
  });
});

describe('HackerNewsClient.searchUserStories/Comments/All', () => {
  it('searchUserStories uses correct tags', async () => {
    const mockFetch = createMockFetch({
      'search?': { hits: [], page: 0, nbHits: 0, nbPages: 0, hitsPerPage: 20 },
    });
    const client = createClient(mockFetch);

    await client.searchUserStories('pg');

    const calledUrl = (mockFetch as jest.Mock).mock.calls[0][0];
    expect(calledUrl).toContain('tags=author_pg%2Cstory');
  });

  it('searchUserComments uses correct tags and sortByDate', async () => {
    const mockFetch = createMockFetch({
      'search_by_date?': { hits: [], page: 0, nbHits: 0, nbPages: 0, hitsPerPage: 20 },
    });
    const client = createClient(mockFetch);

    await client.searchUserComments('dang');

    const calledUrl = (mockFetch as jest.Mock).mock.calls[0][0];
    expect(calledUrl).toContain('tags=author_dang%2Ccomment');
    expect(calledUrl).toContain('search_by_date');
  });

  it('searchUserAll uses OR tag for story/comment', async () => {
    const mockFetch = createMockFetch({
      'search?': { hits: [], page: 0, nbHits: 0, nbPages: 0, hitsPerPage: 20 },
    });
    const client = createClient(mockFetch);

    await client.searchUserAll('pg');

    const calledUrl = (mockFetch as jest.Mock).mock.calls[0][0];
    expect(calledUrl).toContain('author_pg');
    expect(calledUrl).toContain('story%2Ccomment');
  });
});

describe('HackerNewsClient.getCommentsTree', () => {
  it('builds a comment tree from a story root', async () => {
    const responses: Record<string, any> = {
      'item/100.json': { id: 100, type: 'story', title: 'Story', kids: [1] },
      'item/1.json': { id: 1, type: 'comment', text: 'c1', kids: [2] },
      'item/2.json': { id: 2, type: 'comment', text: 'c2', kids: [] },
    };
    const mockFetch = createMockFetch(responses);
    const client = createClient(mockFetch);

    const tree = await client.getCommentsTree(100);
    expect(tree).not.toBeNull();
    expect(tree!.id).toBe(100);
    expect(tree!.children).toHaveLength(1);
    expect(tree!.children[0].id).toBe(1);
    expect(tree!.children[0].children[0].id).toBe(2);
  });

  it('respects depth limit', async () => {
    const responses: Record<string, any> = {
      'item/100.json': { id: 100, type: 'story', kids: [1] },
      'item/1.json': { id: 1, type: 'comment', kids: [2] },
      'item/2.json': { id: 2, type: 'comment', kids: [3] },
      'item/3.json': { id: 3, type: 'comment', kids: [] },
    };
    const mockFetch = createMockFetch(responses);
    const client = createClient(mockFetch);

    const tree = await client.getCommentsTree(100, { depth: 1 });
    expect(tree!.children[0].id).toBe(1);
    // depth=1 means children at depth 0 can fetch kids, but depth 1 cannot
    expect(tree!.children[0].children).toHaveLength(1);
    expect(tree!.children[0].children[0].children).toHaveLength(0);
  });

  it('returns null for non-existent root', async () => {
    const mockFetch = createMockFetch({ 'item/999.json': null });
    const client = createClient(mockFetch);

    const tree = await client.getCommentsTree(999);
    expect(tree).toBeNull();
  });

  it('returns empty tree for story with no kids', async () => {
    const mockFetch = createMockFetch({
      'item/100.json': { id: 100, type: 'story', title: 'No comments' },
    });
    const client = createClient(mockFetch);

    const tree = await client.getCommentsTree(100);
    expect(tree).not.toBeNull();
    expect(tree!.children).toHaveLength(0);
    expect(tree!.replyCount).toBe(0);
  });
});

describe('HackerNewsClient.watchUpdates', () => {
  it('calls callback and can be cancelled', async () => {
    const mockFetch = createMockFetch({
      'updates.json': { items: [1, 2], profiles: ['user1'] },
    });
    const client = createClient(mockFetch);
    const callback = jest.fn();

    const cancel = client.watchUpdates(callback, 50);

    await new Promise((r) => setTimeout(r, 30));
    expect(callback).toHaveBeenCalledWith({ items: [1, 2], profiles: ['user1'] });

    cancel();
    const callCountAfterCancel = callback.mock.calls.length;
    await new Promise((r) => setTimeout(r, 100));
    expect(callback.mock.calls.length).toBe(callCountAfterCancel);
  });
});
