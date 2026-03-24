/**
 * WordPress integration domain errors.
 */

export type WordPressError =
  | { type: 'AUTH_ERROR'; message: string }
  | { type: 'RATE_LIMITED'; message: string }
  | { type: 'WP_API_ERROR'; message: string; status: number }
  | { type: 'NETWORK_ERROR'; message: string }
  | { type: 'SYNC_ERROR'; message: string }
  | { type: 'CREDENTIALS_MISSING'; message: string };
