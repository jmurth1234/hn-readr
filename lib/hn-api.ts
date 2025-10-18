 

/**
 * Hacker News TypeScript client (Firebase + Algolia)
 * - Browser & Node compatible
 * - Strongly typed items/users
 * - TTL + LRU cache
 * - Concurrency-limited parallel fetches
 * - Helpers for comment trees, story paging, updates polling, search
 */

export type ItemType = 'job' | 'story' | 'comment' | 'poll' | 'pollopt';

export interface BaseItem {
  id: number;
  type: ItemType;
  by?: string;
  time?: number; // Unix seconds
  text?: string; // HTML
  dead?: boolean;
  deleted?: boolean;
  kids?: number[];
  parent?: number;
  url?: string;
  descendants?: number; // total comment count
}

export interface Story extends BaseItem {
  type: 'story';
  title?: string; // HTML
  score?: number;
}

export interface Comment extends BaseItem {
  type: 'comment';
}

export interface Job extends BaseItem {
  type: 'job';
  title?: string; // HTML
  score?: number;
}

export interface Poll extends BaseItem {
  type: 'poll';
  title?: string; // HTML
  parts?: number[]; // pollopt ids
  score?: number;
}

export interface PollOpt extends BaseItem {
  type: 'pollopt';
  poll?: number; // parent poll id
  score?: number; // votes
}

export type AnyItem = Story | Comment | Job | Poll | PollOpt;

export interface HNUser {
  id: string;
  created?: number;  // Unix seconds
  karma?: number;
  about?: string;    // HTML
  submitted?: number[];
  delay?: number;
}

export type StoryFeedKind =
  | 'top'
  | 'new'
  | 'best'
  | 'ask'
  | 'show'
  | 'job';

export interface ClientOptions {
  firebaseBaseUrl?: string; // default: https://hacker-news.firebaseio.com/v0
  searchBaseUrl?: string;   // default: https://hn.algolia.com/api/v1
  fetchImpl?: typeof fetch; // custom fetch for Node or advanced usage
  timeoutMs?: number;       // per-request timeout
  cacheMaxEntries?: number; // LRU size
  cacheTtlMs?: number;      // TTL for GETs (default 30s)
  maxConcurrency?: number;  // parallel requests limit (default 8)
  defaultPageSize?: number; // for list paging (default 30)
}

/** Small LRU+TTL cache */
class LruCache<V> {
  private map = new Map<string, { value: V; exp: number }>();
  constructor(private maxEntries: number, private ttlMs: number) {}

  get(key: string): V | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (hit.exp < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    // refresh recency
    this.map.delete(key);
    this.map.set(key, hit);
    return hit.value;
    }

  set(key: string, value: V) {
    if (this.map.has(key)) this.map.delete(key);
    // evict LRU entries before adding new one if at capacity
    if (this.map.size >= this.maxEntries) {
      const lruKey = this.map.keys().next().value;
      if (lruKey !== undefined) this.map.delete(lruKey);
    }
    this.map.set(key, { value, exp: Date.now() + this.ttlMs });
  }

  clear() { this.map.clear(); }
}

/** Tiny semaphore for concurrency limiting */
class Semaphore {
  private queue: (() => void)[] = [];
  private active = 0;
  constructor(private max: number) {}

  async withLock<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.max) await new Promise<void>(res => this.queue.push(res));
    this.active++;
    try { return await fn(); }
    finally {
      this.active--;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

/** Helper: time-limited fetch with retries */
async function fetchJson<T>(
  fetchImpl: typeof fetch,
  url: string,
  timeoutMs: number,
  retries = 2
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
    if (!res.ok) {
      if (retries > 0 && res.status >= 500) {
        await new Promise(r => setTimeout(r, 100)); // brief backoff
        return fetchJson(fetchImpl, url, timeoutMs, retries - 1);
      }
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return res.json() as Promise<T>;
  } catch (e: any) {
    // Only retry on network errors or timeouts, not on JSON parse errors
    const isRetryable = e.name === 'AbortError' || e.code === 'ECONNRESET' || e.code === 'ETIMEDOUT';
    if (retries > 0 && isRetryable) {
      await new Promise(r => setTimeout(r, 100)); // brief backoff
      return fetchJson(fetchImpl, url, timeoutMs, retries - 1);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export interface Page<T> {
  items: T[];
  ids: number[];
  page: number;
  pageSize: number;
  totalIds: number;
  hasNextPage: boolean;
}

export interface Updates {
  items: number[];
  profiles: string[];
}

export interface CommentNode extends Comment {
  children: CommentNode[];
}

/** Algolia HN Search types (subset) */
export interface AlgoliaHit {
  objectID: string;                 // HN item id as string
  author: string;
  title?: string;
  url?: string;
  story_text?: string | null;
  comment_text?: string | null;
  points?: number;
  num_comments?: number;
  created_at?: string;              // ISO8601
  created_at_i?: number;            // epoch seconds
  story_id?: number | null;
  story_title?: string | null;
  story_url?: string | null;
  _tags?: string[];
  [k: string]: any;
}

export interface AlgoliaResponse {
  hits: AlgoliaHit[];
  page: number;
  nbHits: number;
  nbPages: number;
  hitsPerPage: number;
  exhaustiveNbHits: boolean;
  query: string;
  params: string;
  processingTimeMS: number;
}

export interface SearchOptions {
  page?: number;            // 0-based
  hitsPerPage?: number;     // default 20
  tags?: string;            // e.g. "story", "comment", "author_pg", "(story,comment)"
  numericFilters?: string;  // e.g. "created_at_i>1700000000"
  restrictSearchableAttributes?: string; // e.g. "title,url"
  sortByDate?: boolean;     // use /search_by_date
  query?: string;           // free-text query
  additionalParams?: Record<string, string | number | boolean>;
}

/**
 * Main client
 */
export class HackerNewsClient {
  private base: string;
  private searchBase: string;
  private fetchImpl: typeof fetch;
  private timeoutMs: number;
  private cache: LruCache<any>;
  private sem: Semaphore;
  private defaultPageSize: number;

  constructor(opts: ClientOptions = {}) {
    this.base = (opts.firebaseBaseUrl ?? 'https://hacker-news.firebaseio.com/v0').replace(/\/+$/, '');
    this.searchBase = (opts.searchBaseUrl ?? 'https://hn.algolia.com/api/v1').replace(/\/+$/, '');
    this.fetchImpl = opts.fetchImpl ?? (globalThis.fetch as typeof fetch);
    if (!this.fetchImpl) throw new Error('No fetch implementation available; pass fetchImpl in Node.');
    if (typeof AbortController === 'undefined') {
      throw new Error('AbortController not available. Use a polyfill like "abortcontroller-polyfill" in older environments.');
    }
    this.timeoutMs = opts.timeoutMs ?? 15000;
    this.cache = new LruCache<any>(opts.cacheMaxEntries ?? 2000, opts.cacheTtlMs ?? 30_000);
    this.sem = new Semaphore(Math.max(1, opts.maxConcurrency ?? 8));
    this.defaultPageSize = opts.defaultPageSize ?? 30;
  }

  /** Low-level GET with caching and concurrency guard */
  private async getJson<T>(pathOrUrl: string): Promise<T> {
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${this.base}/${pathOrUrl.replace(/^\/+/, '')}`;
    const key = `GET ${url}`;
    const cached = this.cache.get(key);
    if (cached) return cached as T;
    const val = await this.sem.withLock(() => fetchJson<T>(this.fetchImpl, url, this.timeoutMs));
    this.cache.set(key, val);
    return val;
  }

  /** Items */
  async getItem<T extends AnyItem = AnyItem>(id: number): Promise<T | null> {
    return this.getJson<T | null>(`item/${id}.json`);
  }

  /** Users */
  async getUser(id: string): Promise<HNUser | null> {
    return this.getJson<HNUser | null>(`user/${encodeURIComponent(id)}.json`);
  }

  /** Current max item id (highest ever issued) */
  async getMaxItemId(): Promise<number> {
    return this.getJson<number>('maxitem.json');
  }

  /** IDs that recently changed (items) and usernames that changed (profiles) */
  async getUpdates(): Promise<Updates> {
    return this.getJson<Updates>('updates.json');
  }

  /** Raw list of story IDs for a given feed */
  async getStoryIds(kind: StoryFeedKind): Promise<number[]> {
    const map: Record<StoryFeedKind, string> = {
      top: 'topstories.json',
      new: 'newstories.json',
      best: 'beststories.json',
      ask: 'askstories.json',
      show: 'showstories.json',
      job: 'jobstories.json',
    };
    return this.getJson<number[]>(map[kind]);
  }

  /**
   * Paged stories with optional hydration.
   * Slices the ID list locally to avoid re-fetching, then hydrates in parallel.
   */
  async listStories(kind: StoryFeedKind, opts?: { page?: number; pageSize?: number; includeItems?: boolean }): Promise<Page<Story>> {
    const page = Math.max(0, opts?.page ?? 0);
    const pageSize = Math.max(1, opts?.pageSize ?? this.defaultPageSize);
    const ids = await this.getStoryIds(kind);
    const start = page * pageSize;
    const end = Math.min(ids.length, start + pageSize);
    const pageIds = ids.slice(start, end);

    let items: Story[] = [];
    if (opts?.includeItems !== false) {
      const fetched = await Promise.all(pageIds.map(id => this.getItem<Story>(id)));
      items = fetched.filter(Boolean) as Story[];
      // Preserve HN ordering
      const order = new Map(pageIds.map((id, i) => [id, i]));
      items.sort((a, b) => (order.get(a.id)! - order.get(b.id)!));
    }

    return {
      items,
      ids: pageIds,
      page,
      pageSize,
      totalIds: ids.length,
      hasNextPage: end < ids.length,
    };
  }

  /** Fetch many items with concurrency limit */
  async getItems(ids: number[]): Promise<(AnyItem | null)[]> {
    return Promise.all(ids.map(id => this.getItem(id)));
  }

  /**
   * Recursively fetch a comment subtree.
   * depth: limit recursion (undefined => full tree)
   * maxNodes: hard cap to protect your app in massive threads
   */
  async getCommentsTree(rootId: number, opts?: { depth?: number; maxNodes?: number }): Promise<CommentNode | null> {
    const visited = new Set<number>();
    const maxNodes = opts?.maxNodes ?? 5000;

    const build = async (id: number, depth: number): Promise<CommentNode | null> => {
      if (visited.size >= maxNodes) return null;
      const item = await this.getItem<AnyItem>(id);
      if (!item || item.type !== 'comment') return null;
      visited.add(id);

      const node: CommentNode = { ...(item as Comment), children: [] };
      if (item.kids && item.kids.length && (opts?.depth === undefined || depth < (opts.depth))) {
        const kids = await Promise.all(item.kids.map(kid => build(kid, depth + 1)));
        node.children = kids.filter(Boolean) as CommentNode[];
      }
      return node;
    };

    // Root can be a story; if so, attach its immediate comment children
    const root = await this.getItem<AnyItem>(rootId);
    if (!root) return null;

    if (root.type === 'comment') {
      return build(rootId, 0);
    }

    if (root.kids && root.kids.length) {
      const children = await Promise.all(root.kids.map(kid => build(kid, 0)));
      // fabricate a pseudo root carrying story metadata for convenience
      const pseudo: CommentNode = {
        id: root.id,
        type: 'comment',
        by: root.by,
        time: root.time,
        text: (root as Story).title ?? '',
        children: children.filter(Boolean) as CommentNode[],
      };
      return pseudo;
    }

    return {
      id: root.id,
      type: 'comment',
      by: root.by,
      time: root.time,
      text: (root as Story).title ?? '',
      children: [],
    };
  }

  /**
   * Watch updates via simple polling. Returns a cancel function.
   * You’ll get batches of changed item IDs and usernames.
   */
  watchUpdates(
    onUpdate: (u: Updates) => void,
    intervalMs = 20_000
  ): () => void {
    let stopped = false;
    let timer: any;

    const tick = async () => {
      if (stopped) return;
      try {
        const u = await this.getUpdates();
        onUpdate(u);
      } catch {
        // swallow; next tick will try again
      } finally {
        if (!stopped) timer = setTimeout(tick, intervalMs);
      }
    };

    tick();
    return () => { stopped = true; if (timer) clearTimeout(timer); };
  }

  /**
   * Algolia-powered search (the one the HN site uses).
   * Tags are ANDed by default; use parentheses to OR, e.g. "(story,comment)".
   * Author filter is `author_<username>`; to search only comments: "author_pg,comment".
   */
  async search(options: SearchOptions): Promise<AlgoliaResponse> {
    const {
      page = 0,
      hitsPerPage = 20,
      tags,
      numericFilters,
      restrictSearchableAttributes,
      sortByDate,
      query = '',
      additionalParams = {},
    } = options;

    const endpoint = sortByDate ? 'search_by_date' : 'search';
    const params = new URLSearchParams({
      query,
      page: String(page),
      hitsPerPage: String(hitsPerPage),
    });
    if (tags) params.set('tags', tags);
    if (numericFilters) params.set('numericFilters', numericFilters);
    if (restrictSearchableAttributes) params.set('restrictSearchableAttributes', restrictSearchableAttributes);
    for (const [k, v] of Object.entries(additionalParams)) params.set(k, String(v));

    const url = `${this.searchBase}/${endpoint}?${params.toString()}`;
    // Search responses are OK to cache briefly as well
    const key = `ALG ${url}`;
    const cached = this.cache.get(key);
    if (cached) return cached as AlgoliaResponse;
    const res = await fetchJson<AlgoliaResponse>(this.fetchImpl, url, this.timeoutMs);
    this.cache.set(key, res);
    return res;
  }

  /** Convenience: submissions by a user (stories only) via Algolia */
  async searchUserStories(username: string, opts?: Omit<SearchOptions, 'tags'>): Promise<AlgoliaResponse> {
    return this.search({
      ...(opts ?? {}),
      query: opts?.query ?? '',
      tags: `author_${username},story`,
    });
  }

  /** Convenience: comments by a user via Algolia */
  async searchUserComments(username: string, opts?: Omit<SearchOptions, 'tags'>): Promise<AlgoliaResponse> {
    return this.search({
      ...(opts ?? {}),
      query: opts?.query ?? '',
      tags: `author_${username},comment`,
      sortByDate: opts?.sortByDate ?? true,
    });
  }

  /** Convenience: all activity for a user via Algolia (stories or comments) */
  async searchUserAll(username: string, opts?: Omit<SearchOptions, 'tags'>): Promise<AlgoliaResponse> {
    return this.search({
      ...(opts ?? {}),
      query: opts?.query ?? '',
      tags: `author_${username},(story,comment)`,
    });
  }

  /** Build a full “front page” slice with hydrated stories */
  async frontPage(page = 0, pageSize = this.defaultPageSize): Promise<Page<Story>> {
    return this.listStories('top', { page, pageSize, includeItems: true });
  }

  /** Given a story id, return the story and a fully fetched comment tree */
  async storyWithComments(storyId: number, opts?: { depth?: number; maxNodes?: number }) {
    const story = await this.getItem<Story>(storyId);
    if (!story || story.type !== 'story') return null;
    const tree = await this.getCommentsTree(storyId, opts);
    return { story, comments: tree };
  }

  /** Clear the internal cache (e.g., after an invalidate action) */
  clearCache() { this.cache.clear(); }
}
