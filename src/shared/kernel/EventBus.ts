/**
 * Type-safe EventBus for cross-context communication.
 * Decouples bounded contexts while allowing reactive data flow.
 *
 * @example
 * const bus = createEventBus<AppEvents>();
 * const unsub = bus.on('posts:synced', (payload) => { ... });
 * bus.emit('posts:synced', { count: 42 });
 * unsub(); // cleanup
 */

type EventHandler<T> = (payload: T) => void;

export interface EventBus<TEvents extends Record<string, unknown>> {
  /** Subscribe to an event */
  on<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): () => void;

  /** Emit an event to all subscribers */
  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void;

  /** Remove all handlers for an event (or all events) */
  clear(event?: keyof TEvents): void;
}

/** Create a new type-safe EventBus instance */
export function createEventBus<
  TEvents extends Record<string, unknown>
>(): EventBus<TEvents> {
  const handlers = new Map<keyof TEvents, Set<EventHandler<unknown>>>();

  return {
    on<K extends keyof TEvents>(
      event: K,
      handler: EventHandler<TEvents[K]>
    ): () => void {
      if (!handlers.has(event)) {
        handlers.set(event, new Set());
      }
      const set = handlers.get(event)!;
      set.add(handler as EventHandler<unknown>);

      return () => {
        set.delete(handler as EventHandler<unknown>);
        if (set.size === 0) handlers.delete(event);
      };
    },

    emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
      const set = handlers.get(event);
      if (!set) return;
      for (const handler of set) {
        try {
          handler(payload);
        } catch (err) {
          console.error(`[EventBus] Error in handler for "${String(event)}":`, err);
        }
      }
    },

    clear(event?: keyof TEvents): void {
      if (event) {
        handlers.delete(event);
      } else {
        handlers.clear();
      }
    },
  };
}

// ─── Application Event Map ──────────────────────────────────────

export interface AppEvents {
  'posts:synced': { count: number; timestamp: number };
  'posts:updated': { postId: string; wpPostId: number };
  'embeddings:computed': { postId: string; dimensions: number };
  'embeddings:batchComplete': { count: number; duration: number };
  'clusters:computed': { clusterCount: number; coherence: number };
  'links:suggested': { count: number; sourcePostId: string };
  'links:applied': { linkId: string; sourcePostId: string; targetPostId: string };
  'batch:started': { jobId: string; phase: string };
  'batch:progress': { jobId: string; progress: number; total: number };
  'batch:complete': { jobId: string; duration: number };
  'batch:error': { jobId: string; error: string };
  'worker:taskComplete': { workerId: string; taskType: string; duration: number };
  'worker:error': { workerId: string; error: string };
}

/** Singleton application event bus */
export const appEventBus = createEventBus<AppEvents>();
