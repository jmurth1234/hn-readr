jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (opts: any) => opts.ios ?? opts.default },
  Linking: { openURL: jest.fn() },
  Pressable: 'Pressable',
  StyleSheet: { create: (styles: any) => styles, hairlineWidth: 1 },
  Text: 'Text',
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
  WebBrowserPresentationStyle: { FORM_SHEET: 'FORM_SHEET' },
}));

jest.mock('@/components/themed-text', () => ({ ThemedText: 'ThemedText' }));
jest.mock('@/components/themed-view', () => ({ ThemedView: 'ThemedView' }));
jest.mock('@/constants/platform-styles', () => ({
  createPressableStyle: (s: any) => s,
  createRippleConfig: () => null,
}));
jest.mock('@/hooks/use-theme-color', () => ({
  useThemeColor: () => '#ccc',
}));

// Mock formatTimeAgo to return predictable values
jest.mock('@/lib/utils', () => ({
  ...jest.requireActual('@/lib/utils'),
  formatTimeAgo: (time: number) => `${time}s ago`,
}));

import { AlgoliaHit, Story } from '@/lib/hn-api';
import { normalizeAlgoliaHit, normalizeStory } from '../base-item';

describe('normalizeStory', () => {
  it('maps all fields from a complete Story', () => {
    const story: Story = {
      id: 42,
      type: 'story',
      title: 'Test Story',
      url: 'https://example.com',
      score: 100,
      descendants: 50,
      by: 'alice',
      time: 1700000000,
    };

    const result = normalizeStory(story);

    expect(result).toEqual({
      id: 42,
      title: 'Test Story',
      url: 'https://example.com',
      points: 100,
      comments: 50,
      author: 'alice',
      timeAgo: '1700000000s ago',
      type: 'story',
    });
  });

  it('handles missing title', () => {
    const story: Story = { id: 1, type: 'story' };
    expect(normalizeStory(story).title).toBe('No title');
  });

  it('handles missing score', () => {
    const story: Story = { id: 1, type: 'story' };
    expect(normalizeStory(story).points).toBe(0);
  });

  it('handles missing by', () => {
    const story: Story = { id: 1, type: 'story' };
    expect(normalizeStory(story).author).toBe('unknown');
  });

  it('handles missing time', () => {
    const story: Story = { id: 1, type: 'story' };
    expect(normalizeStory(story).timeAgo).toBe('unknown');
  });

  it('handles missing descendants', () => {
    const story: Story = { id: 1, type: 'story' };
    expect(normalizeStory(story).comments).toBe(0);
  });
});

describe('normalizeAlgoliaHit', () => {
  it('maps all fields from a complete AlgoliaHit', () => {
    const hit: AlgoliaHit = {
      objectID: '123',
      author: 'bob',
      title: 'Algolia Story',
      url: 'https://example.com',
      points: 200,
      num_comments: 75,
      created_at_i: 1700000000,
      _tags: ['story'],
    };

    const result = normalizeAlgoliaHit(hit);

    expect(result).toEqual({
      id: '123',
      title: 'Algolia Story',
      url: 'https://example.com',
      points: 200,
      comments: 75,
      author: 'bob',
      timeAgo: '1700000000s ago',
      type: 'story',
      parentStoryTitle: undefined,
      commentText: undefined,
    });
  });

  it('detects comment type from _tags', () => {
    const hit: AlgoliaHit = {
      objectID: '456',
      author: 'carol',
      _tags: ['comment', 'author_carol'],
      comment_text: 'A comment',
      story_title: 'Parent Story',
    };

    const result = normalizeAlgoliaHit(hit);

    expect(result.type).toBe('comment');
    expect(result.commentText).toBe('A comment');
    expect(result.parentStoryTitle).toBe('Parent Story');
  });

  it('defaults to story type when _tags has no comment tag', () => {
    const hit: AlgoliaHit = {
      objectID: '789',
      author: 'dave',
      _tags: ['story'],
    };

    expect(normalizeAlgoliaHit(hit).type).toBe('story');
  });

  it('handles missing _tags', () => {
    const hit: AlgoliaHit = { objectID: '1', author: 'x' };
    expect(normalizeAlgoliaHit(hit).type).toBe('story');
  });

  it('handles null story_title and comment_text', () => {
    const hit: AlgoliaHit = {
      objectID: '1',
      author: 'x',
      story_title: null,
      comment_text: null,
    };
    const result = normalizeAlgoliaHit(hit);
    expect(result.parentStoryTitle).toBeUndefined();
    expect(result.commentText).toBeUndefined();
  });

  it('handles missing author', () => {
    const hit: AlgoliaHit = { objectID: '1', author: '' };
    expect(normalizeAlgoliaHit(hit).author).toBe('unknown');
  });

  it('handles missing points and num_comments', () => {
    const hit: AlgoliaHit = { objectID: '1', author: 'x' };
    expect(normalizeAlgoliaHit(hit).points).toBe(0);
    expect(normalizeAlgoliaHit(hit).comments).toBe(0);
  });

  it('handles missing created_at_i', () => {
    const hit: AlgoliaHit = { objectID: '1', author: 'x' };
    expect(normalizeAlgoliaHit(hit).timeAgo).toBe('unknown');
  });
});
