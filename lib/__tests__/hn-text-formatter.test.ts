jest.mock('react-native', () => ({
  Platform: { select: (opts: any) => opts.ios ?? opts.default },
  Linking: { openURL: jest.fn() },
  StyleSheet: { create: (styles: any) => styles },
  Text: 'Text',
}));

jest.mock('@/components/themed-text', () => ({ ThemedText: 'ThemedText' }));

import { decodeHtmlEntities, htmlToPreviewText } from '../hn-text-formatter';

describe('decodeHtmlEntities', () => {
  it('decodes named entities', () => {
    expect(decodeHtmlEntities('&amp;')).toBe('&');
    expect(decodeHtmlEntities('&lt;')).toBe('<');
    expect(decodeHtmlEntities('&gt;')).toBe('>');
    expect(decodeHtmlEntities('&quot;')).toBe('"');
    expect(decodeHtmlEntities('&apos;')).toBe("'");
    expect(decodeHtmlEntities('&nbsp;')).toBe(' ');
    expect(decodeHtmlEntities('&mdash;')).toBe('—');
    expect(decodeHtmlEntities('&ndash;')).toBe('–');
    expect(decodeHtmlEntities('&hellip;')).toBe('…');
  });

  it('decodes decimal numeric entities', () => {
    expect(decodeHtmlEntities('&#65;')).toBe('A');
    expect(decodeHtmlEntities('&#97;')).toBe('a');
    expect(decodeHtmlEntities('&#39;')).toBe("'");
  });

  it('decodes hex numeric entities', () => {
    expect(decodeHtmlEntities('&#x41;')).toBe('A');
    expect(decodeHtmlEntities('&#x27;')).toBe("'");
    expect(decodeHtmlEntities('&#x2F;')).toBe('/');
  });

  it('handles nested entities like &amp;#39;', () => {
    // First pass: &amp; -> &, yielding &#39;
    // Second pass: &#39; -> '
    expect(decodeHtmlEntities('&amp;#39;')).toBe("'");
  });

  it('passes through unknown entities', () => {
    expect(decodeHtmlEntities('&unknown;')).toBe('&unknown;');
    expect(decodeHtmlEntities('&foobar;')).toBe('&foobar;');
  });

  it('handles text with no entities', () => {
    expect(decodeHtmlEntities('hello world')).toBe('hello world');
  });

  it('handles mixed text and entities', () => {
    expect(decodeHtmlEntities('a &amp; b &lt; c')).toBe('a & b < c');
  });
});

describe('htmlToPreviewText', () => {
  it('strips HTML tags', () => {
    expect(htmlToPreviewText('<b>bold</b> text')).toBe('bold text');
    expect(htmlToPreviewText('<span class="x">inner</span>')).toBe('inner');
  });

  it('converts <p> tags to newlines', () => {
    const result = htmlToPreviewText('first<p>second</p>');
    expect(result).toContain('first');
    expect(result).toContain('second');
    expect(result).toContain('\n');
  });

  it('converts <br> to newlines', () => {
    expect(htmlToPreviewText('line1<br>line2')).toBe('line1\nline2');
    expect(htmlToPreviewText('line1<br/>line2')).toBe('line1\nline2');
    expect(htmlToPreviewText('line1<br />line2')).toBe('line1\nline2');
  });

  it('extracts link text from anchor tags', () => {
    expect(htmlToPreviewText('<a href="http://example.com">click here</a>')).toBe('click here');
  });

  it('uses URL when link has no text', () => {
    expect(htmlToPreviewText('<a href="http://example.com"></a>')).toBe('http://example.com');
  });

  it('strips formatting tags (italic, bold, code) without markers', () => {
    expect(htmlToPreviewText('<i>italic</i>')).toBe('italic');
    expect(htmlToPreviewText('<em>emphasis</em>')).toBe('emphasis');
    expect(htmlToPreviewText('<b>bold</b>')).toBe('bold');
    expect(htmlToPreviewText('<strong>strong</strong>')).toBe('strong');
    expect(htmlToPreviewText('<code>code</code>')).toBe('code');
  });

  it('trims extra whitespace', () => {
    expect(htmlToPreviewText('  hello  ')).toBe('hello');
  });

  it('collapses excessive newlines', () => {
    const result = htmlToPreviewText('a<p>b<p>c<p>d');
    // Should not have more than 2 consecutive newlines
    expect(result).not.toMatch(/\n\s*\n\s*\n/);
  });

  it('decodes HTML entities in preview text', () => {
    expect(htmlToPreviewText('a &amp; b')).toBe('a & b');
  });
});
