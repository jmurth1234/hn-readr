/**
 * Utility functions for the Hacker News reader app
 */

/**
 * Convert Unix timestamp to human-readable time ago format
 * @param unixSeconds - Unix timestamp in seconds
 * @returns Formatted time string like "2h ago", "1d ago", "just now"
 */
export function formatTimeAgo(unixSeconds: number): string {
  const now = Date.now() / 1000; // Convert to seconds
  const diff = now - unixSeconds;
  
  if (diff < 60) {
    return 'just now';
  }
  
  const minutes = Math.floor(diff / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  
  const weeks = Math.floor(days / 7);
  if (weeks < 52) {
    return `${weeks}w ago`;
  }
  
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

/**
 * Extract domain from URL for display
 * @param url - Full URL string
 * @returns Domain name or "unknown" if invalid
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, ''); // Remove www prefix
  } catch {
    return 'unknown';
  }
}

/**
 * Format numbers with appropriate abbreviations
 * @param num - Number to format
 * @returns Formatted string like "1.2k", "5.6M", "999"
 */
export function formatNumber(num: number): string {
  if (num < 1000) {
    return num.toString();
  }
  
  if (num < 1000000) {
    const k = Math.floor(num / 1000);
    const remainder = Math.floor((num % 1000) / 100);
    return remainder > 0 ? `${k}.${remainder}k` : `${k}k`;
  }
  
  if (num < 1000000000) {
    const m = Math.floor(num / 1000000);
    const remainder = Math.floor((num % 1000000) / 100000);
    return remainder > 0 ? `${m}.${remainder}M` : `${m}M`;
  }
  
  const b = Math.floor(num / 1000000000);
  const remainder = Math.floor((num % 1000000000) / 100000000);
  return remainder > 0 ? `${b}.${remainder}B` : `${b}B`;
}
