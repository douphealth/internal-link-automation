/**
 * Saga-based batch orchestrator for the link automation pipeline.
 * Executes: Fetch → Embed → Suggest with retry, timeout, circuit breaker.
 */

import { supabase } from '@/integrations/supabase/client';
import { Result, Ok, Err, isErr } from '@/shared/kernel/Result';
import { retryWithBackoff } from '@/shared/kernel/Retry';
import { withTimeout } from '@/shared/kernel/Timeout';
import { CircuitBreaker } from '@/shared/kernel/CircuitBreaker';
import { appEventBus } from '@/shared/kernel/EventBus';
import { batchLogger } from '@/shared/kernel/Logger';

// ─── Types ──────────────────────────────────────────────────────

interface SagaStep<TContext> {
  name: string;
  phase: string;
  execute: (ctx: TContext) => Promise<Result<TContext, SagaError>>;
  compensate?: (ctx: TContext) => Promise<void>;
  retryable: boolean;
  timeoutMs: number;
}

export interface SagaError {
  type: 'SAGA_STEP_FAILED';
  step: string;
  phase: string;
  cause: unknown;
  recoverable: boolean;
}

export interface BatchContext {
  jobId: string;
  siteId: string;
  posts: Array<{
    id: string;
    title: string;
    content: string;
    url: string;
  }>;
  embeddings: Map<string, number[]>;
  suggestions: Map<string, Array<{
    targetPostId: string;
    anchorText: string;
    score: number;
    context: string;
  }>>;
  metrics: {
    postsProcessed: number;
    embeddingsComputed: number;
    suggestionsGenerated: number;
    startedAt: number;
    phaseTimes: Record<string, number>;
  };
}

// ─── Helpers ────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractBestAnchor(content: string, targetTitle: string): string {
  const plain = stripHtml(content).toLowerCase();
  const words = targetTitle.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  for (const word of words) {
    const idx = plain.indexOf(word);
    if (idx !== -1) {
      const start = Math.max(0, plain.lastIndexOf(' ', idx - 1));
      const end = Math.min(plain.length, plain.indexOf(' ', idx + word.length + 20));
      const candidate = plain.slice(start, end === -1 ? undefined : end).trim();
      if (candidate.length >= 3 && candidate.length <= 60) return candidate;
    }
  }
  return targetTitle;
}

function extractContextSnippet(content: string, targetTitle: string): string {
  const plain = stripHtml(content);
  const firstWord = targetTitle.split(/\s+/)[0]?.toLowerCase() || '';
  const idx = plain.toLowerCase().indexOf(firstWord);

  if (idx !== -1) {
    const start = Math.max(0, idx - 80);
    const end = Math.min(plain.length, idx + 120);
    return `...${plain.slice(start, end).trim()}...`;
  }
  return plain.slice(0, 200) + '...';
}

async function updateBatchJob(jobId: string, update: Record<string, unknown>): Promise<void> {
  await supabase.from('batch_jobs').update(update).eq('id', jobId);
}

// ─── Circuit Breaker ────────────────────────────────────────────

const wpCircuitBreaker = new CircuitBreaker<unknown, unknown>('wordpress', {
  failureThreshold: 3,
  resetTimeoutMs: 60_000,
});

// ─── Saga Steps ─────────────────────────────────────────────────

const SAGA_STEPS: SagaStep<BatchContext>[] = [
  {
    name: 'fetch-posts',
    phase: 'fetching',
    retryable: true,
    timeoutMs: 120_000,
    execute: async (ctx) => {
      const phaseStart = performance.now();
      batchLogger.info('Fetching posts from database...', { siteId: ctx.siteId });

      const { data: posts, error } = await supabase
        .from('posts')
        .select('id, title, content, url')
        .eq('site_id', ctx.siteId);

      if (error) {
        return Err({ type: 'SAGA_STEP_FAILED', step: 'fetch-posts', phase: 'fetching', cause: error, recoverable: true });
      }

      ctx.posts = (posts || []).map(p => ({
        id: p.id,
        title: p.title,
        content: p.content || '',
        url: p.url,
      }));

      ctx.metrics.postsProcessed = ctx.posts.length;
      ctx.metrics.phaseTimes['fetching'] = performance.now() - phaseStart;

      await updateBatchJob(ctx.jobId, { phase: 'fetching', progress: ctx.posts.length, total: ctx.posts.length });
      appEventBus.emit('batch:progress', { jobId: ctx.jobId, progress: ctx.posts.length, total: ctx.posts.length });

      batchLogger.info(`Fetched ${ctx.posts.length} posts`, { duration: ctx.metrics.phaseTimes['fetching'] });
      return Ok(ctx);
    },
  },
  {
    name: 'compute-embeddings',
    phase: 'embedding',
    retryable: true,
    timeoutMs: 300_000,
    execute: async (ctx) => {
      const phaseStart = performance.now();
      batchLogger.info(`Computing embeddings for ${ctx.posts.length} posts...`);

      const { data: existing } = await supabase
        .from('embeddings')
        .select('post_id')
        .in('post_id', ctx.posts.map(p => p.id));

      const existingIds = new Set((existing || []).map(e => e.post_id));
      const needsEmbedding = ctx.posts.filter(p => !existingIds.has(p.id));

      batchLogger.info(`${existingIds.size} cached, ${needsEmbedding.length} need computation`);

      const BATCH_SIZE = 10;
      for (let i = 0; i < needsEmbedding.length; i += BATCH_SIZE) {
        const batch = needsEmbedding.slice(i, i + BATCH_SIZE);

        const result = await wpCircuitBreaker.execute(async () => {
          const { data, error } = await supabase.functions.invoke('compute-embeddings', {
            body: {
              texts: batch.map(p => `${p.title}. ${stripHtml(p.content).slice(0, 1000)}`),
              postIds: batch.map(p => p.id),
            },
          });
          if (error) return Err(error);
          return Ok(data);
        });

        if (isErr(result)) {
          return Err({ type: 'SAGA_STEP_FAILED', step: 'compute-embeddings', phase: 'embedding', cause: result.error, recoverable: true });
        }

        await updateBatchJob(ctx.jobId, {
          phase: 'embedding',
          progress: Math.min(i + BATCH_SIZE, needsEmbedding.length) + existingIds.size,
          total: ctx.posts.length,
        });
      }

      const { data: allEmbeddings } = await supabase
        .from('embeddings')
        .select('post_id, embedding')
        .in('post_id', ctx.posts.map(p => p.id));

      for (const emb of (allEmbeddings || [])) {
        ctx.embeddings.set(emb.post_id, JSON.parse(emb.embedding));
      }

      ctx.metrics.embeddingsComputed = ctx.embeddings.size;
      ctx.metrics.phaseTimes['embedding'] = performance.now() - phaseStart;

      batchLogger.info(`Embeddings ready: ${ctx.embeddings.size}`, { duration: ctx.metrics.phaseTimes['embedding'] });
      return Ok(ctx);
    },
  },
  {
    name: 'generate-suggestions',
    phase: 'suggesting',
    retryable: true,
    timeoutMs: 180_000,
    execute: async (ctx) => {
      const phaseStart = performance.now();
      batchLogger.info('Generating link suggestions via pgvector...');

      let totalSuggestions = 0;

      for (let i = 0; i < ctx.posts.length; i++) {
        const post = ctx.posts[i];
        const embedding = ctx.embeddings.get(post.id);
        if (!embedding) continue;

        const { data: similar, error } = await supabase.rpc('match_posts', {
          query_embedding: JSON.stringify(embedding),
          match_threshold: 0.65,
          match_count: 10,
          exclude_post_id: post.id,
        });

        if (error) {
          batchLogger.warn(`Similarity search failed for post ${post.id}`, { error: error.message });
          continue;
        }

        if (similar && similar.length > 0) {
          const suggestions = similar.map((s) => ({
            targetPostId: s.post_id,
            anchorText: extractBestAnchor(post.content, s.title),
            score: s.similarity,
            context: extractContextSnippet(post.content, s.title),
          }));

          ctx.suggestions.set(post.id, suggestions);
          totalSuggestions += suggestions.length;

          await supabase.from('link_suggestions').upsert(
            suggestions.map(s => ({
              source_post_id: post.id,
              target_post_id: s.targetPostId,
              anchor_text: s.anchorText,
              similarity_score: s.score,
              context_snippet: s.context,
              status: 'pending',
            })),
            { onConflict: 'source_post_id,target_post_id' }
          );
        }

        if (i % 10 === 0) {
          await updateBatchJob(ctx.jobId, { phase: 'suggesting', progress: i + 1, total: ctx.posts.length });
        }
      }

      ctx.metrics.suggestionsGenerated = totalSuggestions;
      ctx.metrics.phaseTimes['suggesting'] = performance.now() - phaseStart;

      batchLogger.info(`Generated ${totalSuggestions} suggestions`, { duration: ctx.metrics.phaseTimes['suggesting'] });
      return Ok(ctx);
    },
  },
];

// ─── Saga Executor ──────────────────────────────────────────────

export async function executeBatchSaga(siteId: string): Promise<Result<BatchContext, SagaError>> {
  const { data: job, error: jobError } = await supabase
    .from('batch_jobs')
    .insert({
      status: 'running',
      phase: 'init',
      progress: 0,
      total: 0,
      started_at: new Date().toISOString(),
      metadata: { siteId },
    })
    .select()
    .single();

  if (jobError || !job) {
    return Err({ type: 'SAGA_STEP_FAILED', step: 'init', phase: 'init', cause: jobError || 'Failed to create batch job', recoverable: false });
  }

  const ctx: BatchContext = {
    jobId: job.id,
    siteId,
    posts: [],
    embeddings: new Map(),
    suggestions: new Map(),
    metrics: {
      postsProcessed: 0,
      embeddingsComputed: 0,
      suggestionsGenerated: 0,
      startedAt: Date.now(),
      phaseTimes: {},
    },
  };

  const completedSteps: SagaStep<BatchContext>[] = [];
  batchLogger.info('Batch saga started', { jobId: job.id, siteId });
  appEventBus.emit('batch:started', { jobId: job.id, phase: 'init' });

  for (const step of SAGA_STEPS) {
    batchLogger.info(`Executing step: ${step.name}`);

    const executeStep = () => withTimeout(() => step.execute(ctx), step.timeoutMs, step.name);

    const result = step.retryable
      ? await retryWithBackoff(executeStep, {
          maxAttempts: 3,
          baseDelayMs: 2000,
          onRetry: (attempt, delay) => {
            batchLogger.warn(`Retrying ${step.name}`, { attempt, delayMs: delay });
          },
        })
      : await executeStep();

    if (isErr(result)) {
      batchLogger.error(`Step ${step.name} failed`, undefined, { error: result.error });

      for (const completed of completedSteps.reverse()) {
        if (completed.compensate) {
          batchLogger.info(`Compensating: ${completed.name}`);
          await completed.compensate(ctx);
        }
      }

      await updateBatchJob(ctx.jobId, { status: 'error', error: `Failed at step: ${step.name}` });
      appEventBus.emit('batch:error', { jobId: ctx.jobId, error: `Failed at step: ${step.name}` });

      return Err(result.error as SagaError);
    }

    completedSteps.push(step);
  }

  await updateBatchJob(ctx.jobId, {
    status: 'complete',
    phase: 'done',
    completed_at: new Date().toISOString(),
    metadata: { siteId, metrics: ctx.metrics, duration: Date.now() - ctx.metrics.startedAt },
  });

  appEventBus.emit('batch:complete', { jobId: ctx.jobId, duration: Date.now() - ctx.metrics.startedAt });
  batchLogger.info('Batch saga completed!', { ...ctx.metrics, totalDurationMs: Date.now() - ctx.metrics.startedAt });

  return Ok(ctx);
}
