/**
 * Tests for LinkScanner service.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scanPostLinks } from '@/contexts/link-automation/services/LinkScanner';
import { isOk } from '@/shared/kernel/Result';

// Mock window.location for isInternal check
beforeEach(() => {
  Object.defineProperty(window, 'location', {
    value: { hostname: 'example.com' },
    writable: true,
  });
});

describe('LinkScanner', () => {
  it('extracts links from HTML content', () => {
    const html = `
      <p>Check out <a href="https://example.com/page-1">Page One</a> and 
      <a href="https://other.com/ext">External Link</a></p>
    `;
    const result = scanPostLinks('post-1' as any, html);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.existingLinks).toHaveLength(2);
      expect(result.value.existingLinks[0].href).toBe('https://example.com/page-1');
      expect(result.value.existingLinks[0].isInternal).toBe(true);
      expect(result.value.existingLinks[1].isInternal).toBe(false);
    }
  });

  it('computes word count and link density', () => {
    const html = `<p>${'word '.repeat(100)}<a href="/link">click</a></p>`;
    const result = scanPostLinks('post-2' as any, html);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.wordCount).toBeGreaterThan(90);
      expect(result.value.linkDensity).toBeGreaterThan(0);
    }
  });

  it('handles empty content', () => {
    const result = scanPostLinks('post-3' as any, '');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.existingLinks).toHaveLength(0);
      expect(result.value.wordCount).toBe(0);
      expect(result.value.linkDensity).toBe(0);
    }
  });

  it('handles content with no links', () => {
    const html = '<p>This is a paragraph with no links at all.</p>';
    const result = scanPostLinks('post-4' as any, html);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.existingLinks).toHaveLength(0);
      expect(result.value.wordCount).toBeGreaterThan(0);
    }
  });
});
