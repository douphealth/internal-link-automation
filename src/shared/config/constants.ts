/**
 * Application-wide constants and configuration.
 * Single source of truth for magic numbers and configuration values.
 */

/** Vector/Embedding configuration */
export const VECTOR_CONFIG = {
  /** Embedding dimensions (MiniLM-L6-v2) */
  DIMENSIONS: 384,
  /** Default model version identifier */
  MODEL_VERSION: 'all-MiniLM-L6-v2',
  /** Default similarity threshold for match_posts */
  SIMILARITY_THRESHOLD: 0.7,
  /** Maximum results from similarity search */
  MAX_MATCH_COUNT: 20,
} as const;

/** WordPress API configuration */
export const WP_CONFIG = {
  /** Default posts per page */
  DEFAULT_PER_PAGE: 20,
  /** Maximum posts per page (WP API limit) */
  MAX_PER_PAGE: 100,
  /** Rate limit: max requests per window */
  RATE_LIMIT_MAX: 100,
  /** Rate limit window in milliseconds */
  RATE_LIMIT_WINDOW_MS: 60_000,
} as const;

/** Worker pool configuration */
export const WORKER_CONFIG = {
  /** Maximum concurrent workers */
  MAX_WORKERS: navigator?.hardwareConcurrency
    ? Math.max(2, navigator.hardwareConcurrency - 1)
    : 4,
  /** Task queue capacity before backpressure */
  MAX_QUEUE_SIZE: 1000,
  /** Worker idle timeout before termination (ms) */
  IDLE_TIMEOUT_MS: 30_000,
} as const;

/** Batch processing configuration */
export const BATCH_CONFIG = {
  /** Chunk size for batch embedding computation */
  EMBEDDING_CHUNK_SIZE: 50,
  /** Chunk size for batch link suggestion */
  SUGGESTION_CHUNK_SIZE: 20,
  /** Maximum retry attempts for failed operations */
  MAX_RETRIES: 3,
  /** Base delay for exponential backoff (ms) */
  RETRY_BASE_DELAY_MS: 1000,
} as const;

/** Supabase query limits */
export const SUPABASE_CONFIG = {
  /** Default row limit per query */
  DEFAULT_ROW_LIMIT: 1000,
  /** Realtime events per second */
  REALTIME_EVENTS_PER_SEC: 10,
} as const;
