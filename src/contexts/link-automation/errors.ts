/**
 * Link Automation domain errors.
 */

export type LinkAutomationError =
  | { type: 'SCAN_ERROR'; message: string; postId?: string }
  | { type: 'RANK_ERROR'; message: string }
  | { type: 'INJECTION_ERROR'; message: string; postId?: string }
  | { type: 'CONTENT_PARSE_ERROR'; message: string }
  | { type: 'DUPLICATE_LINK'; message: string };
