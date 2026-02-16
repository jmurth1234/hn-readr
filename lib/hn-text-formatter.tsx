/**
 * Hacker News HTML text formatter
 * Parses HTML content from HN API and renders as React Native components
 */

import React, { useMemo } from 'react';
import { Linking, StyleSheet, Text } from 'react-native';

import { ThemedText } from '@/components/themed-text';

const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#x27;': "'",
  '&#x2F;': '/',
  '&#x60;': '`',
  '&#x3D;': '=',
  '&nbsp;': ' ',
  '&mdash;': '—',
  '&ndash;': '–',
  '&hellip;': '…',
  '&lsquo;': '‘',
  '&rsquo;': '’',
  '&ldquo;': '“',
  '&rdquo;': '”',
};

const HTML_ENTITY_REGEX = /&[a-zA-Z0-9#]+;/g;
const PARAGRAPH_OPEN_REGEX = /<p[^>]*>/gi;
const PARAGRAPH_CLOSE_REGEX = /<\/p>/gi;
const LINE_BREAK_REGEX = /<br\s*\/?>/gi;
const LINK_TAG_REGEX = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
const ITALIC_TAG_REGEX = /<(i|em)[^>]*>([^<]*)<\/(i|em)>/gi;
const BOLD_TAG_REGEX = /<(b|strong)[^>]*>([^<]*)<\/(b|strong)>/gi;
const CODE_TAG_REGEX = /<code[^>]*>([^<]*)<\/code>/gi;
const REMAINING_TAG_REGEX = /<[^>]*>/g;
const EXTRA_LINE_BREAK_REGEX = /\n\s*\n\s*\n/g;
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g;
const BOLD_REGEX = /\*\*([^*]+)\*\*/g;
const ITALIC_REGEX = /\*([^*]+)\*/g;
const INLINE_CODE_REGEX = /`([^`]+)`/g;
const MARKER_SPLIT_REGEX = /(__(?:BOLD|ITALIC|CODE)_(?:START|END)__)/g;

/**
 * Decode HTML entities to their corresponding characters
 */
export function decodeHtmlEntities(text: string): string {
  const decodeEntity = (entity: string): string => {
    const mapped = ENTITY_MAP[entity];
    if (mapped !== undefined) {
      return mapped;
    }

    const decimalMatch = entity.match(/^&#(\d+);$/);
    if (decimalMatch) {
      const codePoint = Number(decimalMatch[1]);
      if (Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff) {
        try {
          return String.fromCodePoint(codePoint);
        } catch {
          return entity;
        }
      }
    }

    const hexMatch = entity.match(/^&#x([0-9a-fA-F]+);$/);
    if (hexMatch) {
      const codePoint = Number.parseInt(hexMatch[1], 16);
      if (Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff) {
        try {
          return String.fromCodePoint(codePoint);
        } catch {
          return entity;
        }
      }
    }

    return entity;
  };

  // Decode repeatedly to handle cases like "&amp;#39;" => "&#39;" => "'"
  let output = text;
  for (let i = 0; i < 3; i++) {
    const decoded = output.replace(HTML_ENTITY_REGEX, decodeEntity);
    if (decoded === output) {
      break;
    }
    output = decoded;
  }

  return output;
}

export function htmlToPreviewText(text: string): string {
  return normalizeCommentHtml(text, false);
}

/**
 * Handle link press - opens URL in default browser
 */
export async function handleLinkPress(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch (error) {
    console.error('Failed to open URL:', error);
  }
}

interface FormattedTextProps {
  text: string;
  style?: any;
  lightColor?: string;
  darkColor?: string;
  numberOfLines?: number;
}

/**
 * Parse and format HTML text from HN API
 * Handles common HTML tags: <p>, <a>, <i>, <em>, <strong>, <b>, <code>, <pre>
 */
export function FormattedText({ text, style, lightColor, darkColor }: FormattedTextProps) {
  const processedElements = useMemo(() => parseHtml(text), [text]);

  return (
    <ThemedText
      style={[styles.container, style]}
      lightColor={lightColor}
      darkColor={darkColor}
    >
      {processedElements}
    </ThemedText>
  );
}

/**
 * Simple HTML to React Native text converter
 * Handles the most common HTML tags found in HN comments
 */
export function SimpleHtmlText({ text, style, lightColor, darkColor, numberOfLines }: FormattedTextProps) {
  const elements = useMemo(() => {
    const processedText = normalizeCommentHtml(text, true);

    const lines = processedText.split('\n');
    const nextElements: React.ReactNode[] = [];
    let keyCounter = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim() === '') {
        nextElements.push(<Text key={`empty-${keyCounter++}`}>{'\n'}</Text>);
      } else {
        const lineElements = processInlineFormatting(line, keyCounter);
        nextElements.push(...lineElements);
        keyCounter += lineElements.length;

        if (i < lines.length - 1) {
          nextElements.push(<Text key={`break-${keyCounter++}`}>{'\n'}</Text>);
        }
      }
    }

    return nextElements;
  }, [text]);

  return (
    <ThemedText
      style={[styles.container, style]}
      lightColor={lightColor}
      darkColor={darkColor}
      numberOfLines={numberOfLines}
    >
      {elements}
    </ThemedText>
  );
}

function normalizeCommentHtml(text: string, preserveFormattingMarkers: boolean): string {
  let processedText = decodeHtmlEntities(text);
  processedText = processedText.replace(PARAGRAPH_OPEN_REGEX, '\n\n');
  processedText = processedText.replace(PARAGRAPH_CLOSE_REGEX, '');
  processedText = processedText.replace(LINE_BREAK_REGEX, '\n');
  processedText = processedText.replace(LINK_TAG_REGEX, (_match, url, linkText) => linkText || url);

  if (preserveFormattingMarkers) {
    processedText = processedText.replace(ITALIC_TAG_REGEX, (_match, _openTag, content) => `*${content}*`);
    processedText = processedText.replace(BOLD_TAG_REGEX, (_match, _openTag, content) => `**${content}**`);
    processedText = processedText.replace(CODE_TAG_REGEX, (_match, content) => `\`${content}\``);
  } else {
    processedText = processedText.replace(ITALIC_TAG_REGEX, (_match, _openTag, content) => content);
    processedText = processedText.replace(BOLD_TAG_REGEX, (_match, _openTag, content) => content);
    processedText = processedText.replace(CODE_TAG_REGEX, (_match, content) => content);
  }

  processedText = processedText.replace(REMAINING_TAG_REGEX, '');
  processedText = processedText.replace(EXTRA_LINE_BREAK_REGEX, '\n\n');
  return processedText.trim();
}

function parseHtml(html: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  let keyCounter = 0;

  const tagRegex = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\s*([^>]*)>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const stack: { tag: string; props: Record<string, string> }[] = [];

  while ((match = tagRegex.exec(html)) !== null) {
    const [fullMatch, isClosing, tagName, attributes] = match;
    const startIndex = match.index;

    if (startIndex > lastIndex) {
      const textContent = html.slice(lastIndex, startIndex);
      if (textContent.trim()) {
        elements.push(<Text key={`text-${keyCounter++}`}>{decodeHtmlEntities(textContent)}</Text>);
      }
    }

    if (isClosing) {
      const openTag = stack.pop();
      if (openTag && openTag.tag === tagName) {
        // no-op for this simple parser
      }
    } else {
      const props: Record<string, string> = {};
      const attrRegex = /(\w+)=["']([^"']*)["']/g;
      let attrMatch: RegExpExecArray | null;
      while ((attrMatch = attrRegex.exec(attributes)) !== null) {
        const [, attrName, attrValue] = attrMatch;
        props[attrName] = attrValue;
      }

      stack.push({ tag: tagName, props });

      switch (tagName.toLowerCase()) {
        case 'p':
          elements.push(
            <Text key={`para-${keyCounter++}`} style={styles.paragraphBreak}>
              {'\n'}
            </Text>
          );
          break;
        case 'br':
          elements.push(<Text key={`br-${keyCounter++}`}>{'\n'}</Text>);
          break;
        default:
          break;
      }
    }

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < html.length) {
    const remainingText = html.slice(lastIndex);
    if (remainingText.trim()) {
      elements.push(<Text key={`text-${keyCounter++}`}>{decodeHtmlEntities(remainingText)}</Text>);
    }
  }

  return elements;
}

/**
 * Process inline formatting (italics, bold, code, links)
 */
function processInlineFormatting(text: string, startKey: number): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  let keyCounter = startKey;
  let lastEnd = 0;

  URL_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = URL_REGEX.exec(text)) !== null) {
    const url = match[1];
    const start = match.index;
    const end = start + url.length;

    if (start > lastEnd) {
      const beforeText = text.slice(lastEnd, start);
      if (beforeText) {
        elements.push(<Text key={`text-${keyCounter++}`}>{processMarkdownFormatting(beforeText)}</Text>);
      }
    }

    elements.push(
      <Text
        key={`url-${keyCounter++}`}
        style={styles.link}
        onPress={() => handleLinkPress(url)}
      >
        {url}
      </Text>
    );

    lastEnd = end;
  }

  if (lastEnd < text.length) {
    const remainingText = text.slice(lastEnd);
    if (remainingText) {
      elements.push(<Text key={`text-${keyCounter++}`}>{processMarkdownFormatting(remainingText)}</Text>);
    }
  }

  return elements.length > 0 ? elements : [<Text key={`text-${keyCounter}`}>{text}</Text>];
}

/**
 * Process markdown-style formatting (*italic*, **bold**, `code`)
 */
function processMarkdownFormatting(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  let keyCounter = 0;

  let processedText = text.replace(BOLD_REGEX, (_match, content) => `__BOLD_START__${content}__BOLD_END__`);
  processedText = processedText.replace(ITALIC_REGEX, (_match, content) => `__ITALIC_START__${content}__ITALIC_END__`);
  processedText = processedText.replace(INLINE_CODE_REGEX, (_match, content) => `__CODE_START__${content}__CODE_END__`);

  const parts = processedText.split(MARKER_SPLIT_REGEX);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (part === '__BOLD_START__') {
      i++;
      const content = parts[i];
      elements.push(
        <Text key={`bold-${keyCounter++}`} style={styles.bold}>
          {content}
        </Text>
      );
      i++;
    } else if (part === '__ITALIC_START__') {
      i++;
      const content = parts[i];
      elements.push(
        <Text key={`italic-${keyCounter++}`} style={styles.italic}>
          {content}
        </Text>
      );
      i++;
    } else if (part === '__CODE_START__') {
      i++;
      const content = parts[i];
      elements.push(
        <Text key={`code-${keyCounter++}`} style={styles.inlineCode}>
          {content}
        </Text>
      );
      i++;
    } else if (part) {
      elements.push(<Text key={`text-${keyCounter++}`}>{part}</Text>);
    }
  }

  return elements.length > 0 ? elements : [<Text key={`text-${keyCounter}`}>{text}</Text>];
}

const styles = StyleSheet.create({
  container: {
    fontSize: 14,
    lineHeight: 20,
  },
  paragraphBreak: {
    marginBottom: 8,
  },
  link: {
    color: '#0066cc',
    textDecorationLine: 'underline',
  },
  bold: {
    fontWeight: '600',
  },
  italic: {
    fontStyle: 'italic',
  },
  inlineCode: {
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 2,
    borderRadius: 2,
  },
});
