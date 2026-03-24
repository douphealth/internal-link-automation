/**
 * Link Scanner service skeleton.
 * Extracts existing links from post HTML content.
 */

import { Result, Ok } from '@/shared/kernel/Result';
import type { LinkScanResult, ExistingLink } from '../types';
import type { LinkAutomationError } from '../errors';
import type { PostId } from '@/shared/kernel/BrandedTypes';
import { sanitizeHtml } from '@/shared/utils/sanitize';

/**
 * Scan a post's HTML content to extract existing links.
 */
export function scanPostLinks(
  postId: PostId,
  htmlContent: string
): Result<LinkScanResult, LinkAutomationError> {
  const sanitized = sanitizeHtml(htmlContent);
  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitized, 'text/html');

  const anchors = doc.querySelectorAll('a[href]');
  const existingLinks: ExistingLink[] = [];

  anchors.forEach((anchor) => {
    const href = anchor.getAttribute('href') || '';
    const anchorText = anchor.textContent?.trim() || '';
    const isInternal = !href.startsWith('http') || href.includes(window.location.hostname);

    existingLinks.push({ href, anchorText, isInternal });
  });

  const textContent = doc.body.textContent || '';
  const wordCount = textContent.split(/\s+/).filter(Boolean).length;
  const linkDensity = wordCount > 0 ? existingLinks.length / (wordCount / 1000) : 0;

  return Ok({
    postId,
    existingLinks,
    wordCount,
    linkDensity,
  });
}
