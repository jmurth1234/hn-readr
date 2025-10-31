/**
 * Hacker News HTML text formatter
 * Parses HTML content from HN API and renders as React Native components
 */

import { ThemedText } from '@/components/themed-text';
import React from 'react';
import { Linking, StyleSheet, Text, useColorScheme } from 'react-native';

/**
 * Decode HTML entities to their corresponding characters
 */
export function decodeHtmlEntities(text: string): string {
  const entityMap: { [key: string]: string } = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '=',
    '&nbsp;': ' ',
  };

  return text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
    return entityMap[entity] || entity;
  });
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Parse HTML and convert to React Native components
  const parseHtml = (html: string): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    let keyCounter = 0;

    // Simple HTML parser for common tags
    const tagRegex = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\s*([^>]*)>/g;
    let lastIndex = 0;
    let match;

    const stack: { tag: string; props: any }[] = [];

    while ((match = tagRegex.exec(html)) !== null) {
      const [fullMatch, isClosing, tagName, attributes] = match;
      const startIndex = match.index;

      // Add text before this tag
      if (startIndex > lastIndex) {
        const textContent = html.slice(lastIndex, startIndex);
        if (textContent.trim()) {
          const decodedText = decodeHtmlEntities(textContent);
          elements.push(
            <Text key={`text-${keyCounter++}`}>
              {decodedText}
            </Text>
          );
        }
      }

      if (isClosing) {
        // Closing tag - pop from stack
        const openTag = stack.pop();
        if (openTag && openTag.tag === tagName) {
          // Handle closing tag logic if needed
        }
      } else {
        // Opening tag
        const props: any = {};
        
        // Parse attributes
        const attrRegex = /(\w+)=["']([^"']*)["']/g;
        let attrMatch;
        while ((attrMatch = attrRegex.exec(attributes)) !== null) {
          const [, attrName, attrValue] = attrMatch;
          props[attrName] = attrValue;
        }

        stack.push({ tag: tagName, props });

        // Handle specific tags
        switch (tagName.toLowerCase()) {
          case 'p':
            // Paragraph - add spacing
            elements.push(
              <Text key={`para-${keyCounter++}`} style={styles.paragraphBreak}>
                {'\n'}
              </Text>
            );
            break;
          case 'br':
            // Line break
            elements.push(
              <Text key={`br-${keyCounter++}`}>
                {'\n'}
              </Text>
            );
            break;
          case 'a':
            // Link - we'll handle this in the text processing
            break;
          case 'i':
          case 'em':
            // Italic - we'll handle this in the text processing
            break;
          case 'b':
          case 'strong':
            // Bold - we'll handle this in the text processing
            break;
          case 'code':
            // Inline code
            break;
          case 'pre':
            // Code block
            break;
        }
      }

      lastIndex = match.index + fullMatch.length;
    }

    // Add remaining text
    if (lastIndex < html.length) {
      const remainingText = html.slice(lastIndex);
      if (remainingText.trim()) {
        const decodedText = decodeHtmlEntities(remainingText);
        elements.push(
          <Text key={`text-${keyCounter++}`}>
            {decodedText}
          </Text>
        );
      }
    }

    return elements;
  };

  // Process the HTML text
  const processedElements = parseHtml(text);

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Convert HTML to plain text with basic formatting
  let processedText = text;

  // Decode HTML entities
  processedText = decodeHtmlEntities(processedText);

  // Handle paragraphs
  processedText = processedText.replace(/<p[^>]*>/gi, '\n\n');
  processedText = processedText.replace(/<\/p>/gi, '');

  // Handle line breaks
  processedText = processedText.replace(/<br\s*\/?>/gi, '\n');

  // Handle links - extract URL and make it clickable
  processedText = processedText.replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi, (match, url, linkText) => {
    return linkText || url; // Use link text if available, otherwise use URL
  });

  // Handle italics
  processedText = processedText.replace(/<(i|em)[^>]*>([^<]*)<\/(i|em)>/gi, (match, openTag, content, closeTag) => {
    return `*${content}*`; // Convert to markdown-style italics
  });

  // Handle bold
  processedText = processedText.replace(/<(b|strong)[^>]*>([^<]*)<\/(b|strong)>/gi, (match, openTag, content, closeTag) => {
    return `**${content}**`; // Convert to markdown-style bold
  });

  // Handle code
  processedText = processedText.replace(/<code[^>]*>([^<]*)<\/code>/gi, (match, content) => {
    return `\`${content}\``; // Convert to markdown-style code
  });

  // Remove any remaining HTML tags
  processedText = processedText.replace(/<[^>]*>/g, '');

  // Clean up extra whitespace
  processedText = processedText.replace(/\n\s*\n\s*\n/g, '\n\n');
  processedText = processedText.trim();

  // Split into lines and process for formatting
  const lines = processedText.split('\n');
  const elements: React.ReactNode[] = [];
  let keyCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.trim() === '') {
      // Empty line - add paragraph spacing
      elements.push(
        <Text key={`empty-${keyCounter++}`}>
          {'\n'}
        </Text>
      );
    } else {
      // Process line for inline formatting
      const lineElements = processInlineFormatting(line, keyCounter);
      elements.push(...lineElements);
      keyCounter += lineElements.length;
      
      // Add line break if not last line
      if (i < lines.length - 1) {
        elements.push(
          <Text key={`break-${keyCounter++}`}>
            {'\n'}
          </Text>
        );
      }
    }
  }

  return (
    <ThemedText
      style={[styles.container, style]}
      lightColor={lightColor}
      darkColor={darkColor}
    >
      {elements}
    </ThemedText>
  );
}

/**
 * Process inline formatting (italics, bold, code, links)
 */
function processInlineFormatting(text: string, startKey: number): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  let keyCounter = startKey;

  // URL regex
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g;
  
  // Find all URLs
  const urlMatches: { url: string; start: number; end: number }[] = [];
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    urlMatches.push({
      url: match[1],
      start: match.index,
      end: match.index + match[1].length
    });
  }

  // Sort by start position
  urlMatches.sort((a, b) => a.start - b.start);

  let lastEnd = 0;
  for (const urlMatch of urlMatches) {
    // Add text before URL
    if (urlMatch.start > lastEnd) {
      const beforeText = text.slice(lastEnd, urlMatch.start);
      if (beforeText) {
        elements.push(
          <Text key={`text-${keyCounter++}`}>
            {processMarkdownFormatting(beforeText)}
          </Text>
        );
      }
    }

    // Add clickable URL
    elements.push(
      <Text
        key={`url-${keyCounter++}`}
        style={styles.link}
        onPress={() => handleLinkPress(urlMatch.url)}
      >
        {urlMatch.url}
      </Text>
    );

    lastEnd = urlMatch.end;
  }

  // Add remaining text
  if (lastEnd < text.length) {
    const remainingText = text.slice(lastEnd);
    if (remainingText) {
      elements.push(
        <Text key={`text-${keyCounter++}`}>
          {processMarkdownFormatting(remainingText)}
        </Text>
      );
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

  // Handle bold (**text**)
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let processedText = text.replace(boldRegex, (match, content) => {
    return `__BOLD_START__${content}__BOLD_END__`;
  });

  // Handle italics (*text*)
  const italicRegex = /\*([^*]+)\*/g;
  processedText = processedText.replace(italicRegex, (match, content) => {
    return `__ITALIC_START__${content}__ITALIC_END__`;
  });

  // Handle code (`text`)
  const codeRegex = /`([^`]+)`/g;
  processedText = processedText.replace(codeRegex, (match, content) => {
    return `__CODE_START__${content}__CODE_END__`;
  });

  // Split by markers and process
  const parts = processedText.split(/(__(?:BOLD|ITALIC|CODE)_(?:START|END)__)/g);
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    
    if (part === '__BOLD_START__') {
      // Next part is bold content
      i++;
      const content = parts[i];
      elements.push(
        <Text key={`bold-${keyCounter++}`} style={styles.bold}>
          {content}
        </Text>
      );
      i++; // Skip __BOLD_END__
    } else if (part === '__ITALIC_START__') {
      // Next part is italic content
      i++;
      const content = parts[i];
      elements.push(
        <Text key={`italic-${keyCounter++}`} style={styles.italic}>
          {content}
        </Text>
      );
      i++; // Skip __ITALIC_END__
    } else if (part === '__CODE_START__') {
      // Next part is code content
      i++;
      const content = parts[i];
      elements.push(
        <Text key={`code-${keyCounter++}`} style={styles.inlineCode}>
          {content}
        </Text>
      );
      i++; // Skip __CODE_END__
    } else if (part) {
      // Regular text
      elements.push(
        <Text key={`text-${keyCounter++}`}>
          {part}
        </Text>
      );
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
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  inlineCode: {
    fontFamily: 'monospace',
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 2,
  },
});