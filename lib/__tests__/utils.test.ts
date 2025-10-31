/**
 * Unit tests for utility functions
 */

import { extractDomain, formatNumber, formatTimeAgo } from '../utils';

describe('formatTimeAgo', () => {
  beforeEach(() => {
    // Mock Date.now() to return a consistent timestamp (Jan 1, 2024, 00:00:00)
    jest.spyOn(Date, 'now').mockReturnValue(1704067200000); // Jan 1, 2024 in ms
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return "just now" for times less than 60 seconds ago', () => {
    const timestamp = 1704067200 - 30; // 30 seconds ago
    expect(formatTimeAgo(timestamp)).toBe('just now');
  });

  it('should return minutes for times less than 60 minutes ago', () => {
    const timestamp = 1704067200 - 5 * 60; // 5 minutes ago
    expect(formatTimeAgo(timestamp)).toBe('5m ago');

    const timestamp2 = 1704067200 - 45 * 60; // 45 minutes ago
    expect(formatTimeAgo(timestamp2)).toBe('45m ago');
  });

  it('should return hours for times less than 24 hours ago', () => {
    const timestamp = 1704067200 - 3 * 60 * 60; // 3 hours ago
    expect(formatTimeAgo(timestamp)).toBe('3h ago');

    const timestamp2 = 1704067200 - 12 * 60 * 60; // 12 hours ago
    expect(formatTimeAgo(timestamp2)).toBe('12h ago');
  });

  it('should return days for times less than 7 days ago', () => {
    const timestamp = 1704067200 - 2 * 24 * 60 * 60; // 2 days ago
    expect(formatTimeAgo(timestamp)).toBe('2d ago');

    const timestamp2 = 1704067200 - 5 * 24 * 60 * 60; // 5 days ago
    expect(formatTimeAgo(timestamp2)).toBe('5d ago');
  });

  it('should return weeks for times less than 52 weeks ago', () => {
    const timestamp = 1704067200 - 3 * 7 * 24 * 60 * 60; // 3 weeks ago
    expect(formatTimeAgo(timestamp)).toBe('3w ago');

    const timestamp2 = 1704067200 - 10 * 7 * 24 * 60 * 60; // 10 weeks ago
    expect(formatTimeAgo(timestamp2)).toBe('10w ago');
  });

  it('should return years for times more than 52 weeks ago', () => {
    const timestamp = 1704067200 - 365 * 24 * 60 * 60; // 1 year ago
    expect(formatTimeAgo(timestamp)).toBe('1y ago');

    const timestamp2 = 1704067200 - 2 * 365 * 24 * 60 * 60; // 2 years ago
    expect(formatTimeAgo(timestamp2)).toBe('2y ago');
  });

  it('should handle edge case of exactly 60 seconds', () => {
    const timestamp = 1704067200 - 60; // exactly 60 seconds ago
    expect(formatTimeAgo(timestamp)).toBe('1m ago');
  });
});

describe('extractDomain', () => {
  it('should extract domain from valid http URL', () => {
    expect(extractDomain('http://example.com')).toBe('example.com');
    expect(extractDomain('http://example.com/path')).toBe('example.com');
  });

  it('should extract domain from valid https URL', () => {
    expect(extractDomain('https://example.com')).toBe('example.com');
    expect(extractDomain('https://example.com/path/to/page')).toBe('example.com');
  });

  it('should remove www prefix', () => {
    expect(extractDomain('https://www.example.com')).toBe('example.com');
    expect(extractDomain('http://www.example.com/path')).toBe('example.com');
  });

  it('should handle subdomains', () => {
    expect(extractDomain('https://blog.example.com')).toBe('blog.example.com');
    expect(extractDomain('https://api.blog.example.com')).toBe('api.blog.example.com');
  });

  it('should handle URLs with ports', () => {
    expect(extractDomain('https://example.com:8080')).toBe('example.com');
    expect(extractDomain('http://localhost:3000')).toBe('localhost');
  });

  it('should handle URLs with query parameters and fragments', () => {
    expect(extractDomain('https://example.com/path?query=value')).toBe('example.com');
    expect(extractDomain('https://example.com/path#section')).toBe('example.com');
  });

  it('should return "unknown" for invalid URLs', () => {
    expect(extractDomain('not a url')).toBe('unknown');
    expect(extractDomain('')).toBe('unknown');
    expect(extractDomain('just-text')).toBe('unknown');
  });

  it('should handle edge cases', () => {
    expect(extractDomain('https://example.com/')).toBe('example.com');
    expect(extractDomain('https://example.com////path')).toBe('example.com');
  });
});

describe('formatNumber', () => {
  it('should return numbers less than 1000 as strings', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(1)).toBe('1');
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(500)).toBe('500');
  });

  it('should format thousands with "k" abbreviation', () => {
    expect(formatNumber(1000)).toBe('1k');
    expect(formatNumber(1500)).toBe('1.5k');
    expect(formatNumber(2300)).toBe('2.3k');
    expect(formatNumber(5000)).toBe('5k');
    expect(formatNumber(15000)).toBe('15k');
    expect(formatNumber(999000)).toBe('999k');
  });

  it('should format millions with "M" abbreviation', () => {
    expect(formatNumber(1000000)).toBe('1M');
    expect(formatNumber(1500000)).toBe('1.5M');
    expect(formatNumber(2300000)).toBe('2.3M');
    expect(formatNumber(45000000)).toBe('45M');
    expect(formatNumber(999000000)).toBe('999M');
  });

  it('should format billions with "B" abbreviation', () => {
    expect(formatNumber(1000000000)).toBe('1B');
    expect(formatNumber(1500000000)).toBe('1.5B');
    expect(formatNumber(2300000000)).toBe('2.3B');
    expect(formatNumber(45000000000)).toBe('45B');
  });

  it('should handle edge cases', () => {
    expect(formatNumber(1001)).toBe('1k');
    expect(formatNumber(1099)).toBe('1k');
    expect(formatNumber(1100)).toBe('1.1k');
  });

  it('should round down decimals appropriately', () => {
    expect(formatNumber(1549)).toBe('1.5k'); // 549/1000 = 0.549, floor(5.49) = 5
    expect(formatNumber(1551)).toBe('1.5k'); // 551/1000 = 0.551, floor(5.51) = 5
    expect(formatNumber(1950)).toBe('1.9k');
  });
});
