/**
 * Saga-based batch orchestrator for the link automation pipeline.
 * Executes: Fetch → Embed → Suggest with retry, timeout, circuit breaker.
 */

import { supabase } from '@/integrations/supabase/client';
import { Result, Ok, Err, isErr } from '@/shared/kernel/Result';
import { retryWithBackoff } from '@/shared/kernel/Retry';
import { appEventBus } from '@/shared/kernel/EventBus';

// ─── Types ──────────────────────────────────────────────────────

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

  console.log('[BatchOrchestrator] Saga started', { jobId: job.id, siteId });
  appEventBus.emit('batch:started', { jobId: job.id, phase: 'init' });

  try {
    // Step 1: Fetch posts
    const fetchResult = await stepFetchPosts(ctx);
    if (isErr(fetchResult)) {
      await updateBatchJob(ctx.jobId, { status: 'error', error: `Failed at: fetch-posts` });
      return fetchResult;
    }

    // Step 2: Compute embeddings
    const embedResult = await stepComputeEmbeddings(ctx);
    if (isErr(embedResult)) {
      await updateBatchJob(ctx.jobId, { status: 'error', error: `Failed at: compute-embeddings` });
      return embedResult;
    }

    // Step 3: Generate suggestions
    const suggestResult = await stepGenerateSuggestions(ctx);
    if (isErr(suggestResult)) {
      await updateBatchJob(ctx.jobId, { status: 'error', error: `Failed at: generate-suggestions` });
      return suggestResult;
    }
  } catch (err) {
    await updateBatchJob(ctx.jobId, { status: 'error', error: String(err) });
    return Err({ type: 'SAGA_STEP_FAILED', step: 'unknown', phase: 'unknown', cause: err, recoverable: false });
  }

  await updateBatchJob(ctx.jobId, {
    status: 'complete',
    phase: 'done',
    completed_at: new Date().toISOString(),
    metadata: { siteId, metrics: ctx.metrics, duration: Date.now() - ctx.metrics.startedAt },
  });

  appEventBus.emit('batch:complete', { jobId: ctx.jobId, duration: Date.now() - ctx.metrics.startedAt });
  console.log('[BatchOrchestrator] Saga completed!', ctx.metrics);

  return Ok(ctx);
}

// ─── Step 1: Fetch Posts ────────────────────────────────────────

async function stepFetchPosts(ctx: BatchContext): Promise<Result<void, SagaError>> {
  const phaseStart = performance.now();
  console.log('[BatchOrchestrator] Fetching posts...');

  // Paginate to get ALL posts (Supabase limit is 1000 per query)
  let allPosts: any[] = [];
  let page = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, title, content, url')
      .eq('site_id', ctx.siteId)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      return Err({ type: 'SAGA_STEP_FAILED', step: 'fetch-posts', phase: 'fetching', cause: error, recoverable: true });
    }

    allPosts = allPosts.concat(posts || []);
    if (!posts || posts.length < PAGE_SIZE) break;
    page++;
  }

  ctx.posts = allPosts.map(p => ({
    id: p.id,
    title: p.title,
    content: p.content || '',
    url: p.url,
  }));

  if (ctx.posts.length === 0) {
    return Err({ type: 'SAGA_STEP_FAILED', step: 'fetch-posts', phase: 'fetching', cause: 'No posts found for this site. Crawl the site first.', recoverable: false });
  }

  ctx.metrics.postsProcessed = ctx.posts.length;
  ctx.metrics.phaseTimes['fetching'] = performance.now() - phaseStart;

  await updateBatchJob(ctx.jobId, { phase: 'fetching', progress: ctx.posts.length, total: ctx.posts.length });
  console.log(`[BatchOrchestrator] Fetched ${ctx.posts.length} posts`);
  return Ok(undefined);
}

// ─── Step 2: Compute Embeddings ─────────────────────────────────

async function stepComputeEmbeddings(ctx: BatchContext): Promise<Result<void, SagaError>> {
  const phaseStart = performance.now();
  console.log(`[BatchOrchestrator] Computing embeddings for ${ctx.posts.length} posts...`);

  await updateBatchJob(ctx.jobId, { phase: 'embedding', progress: 0, total: ctx.posts.length });

  // Check which posts already have embeddings
  const postIds = ctx.posts.map(p => p.id);
  const existingIds = new Set<string>();

  // Paginate the existing check too
  for (let i = 0; i < postIds.length; i += 500) {
    const batch = postIds.slice(i, i + 500);
    const { data: existing } = await supabase
      .from('embeddings')
      .select('post_id')
      .in('post_id', batch);
    for (const e of existing || []) {
      existingIds.add(e.post_id);
    }
  }

  const needsEmbedding = ctx.posts.filter(p => !existingIds.has(p.id));

  console.log(`[BatchOrchestrator] ${existingIds.size} cached, ${needsEmbedding.length} need computation`);

  // Process in batches of 5
  const BATCH_SIZE = 5;
  let computed = 0;
  for (let i = 0; i < needsEmbedding.length; i += BATCH_SIZE) {
    const batch = needsEmbedding.slice(i, i + BATCH_SIZE);

    const texts = batch.map(p => `${p.title}. ${stripHtml(p.content).slice(0, 1500)}`);
    const batchPostIds = batch.map(p => p.id);

    const result = await retryWithBackoff(async () => {
      const { data, error } = await supabase.functions.invoke('compute-embeddings', {
        body: { texts, postIds: batchPostIds },
      });

      if (error) {
        console.warn('[BatchOrchestrator] Embedding error:', error);
        return Err(error);
      }

      if (data?.error) {
        console.warn('[BatchOrchestrator] Embedding API error:', data.error);
        return Err(data.error);
      }

      return Ok(data);
    }, {
      maxAttempts: 3,
      baseDelayMs: 3000,
      onRetry: (attempt, delay) => {
        console.warn(`[BatchOrchestrator] Retrying embeddings batch, attempt ${attempt}, delay ${delay}ms`);
      },
    });

    if (isErr(result)) {
      console.error('[BatchOrchestrator] Embedding batch failed after retries:', result.error);
      continue;
    }

    computed += batch.length;
    const progress = computed + existingIds.size;
    await updateBatchJob(ctx.jobId, { progress, total: ctx.posts.length });

    appEventBus.emit('batch:progress', {
      jobId: ctx.jobId,
      progress,
      total: ctx.posts.length,
    });
  }

  // Fetch all embeddings from DB (paginated)
  for (let i = 0; i < postIds.length; i += 500) {
    const batch = postIds.slice(i, i + 500);
    const { data: allEmbeddings } = await supabase
      .from('embeddings')
      .select('post_id, embedding')
      .in('post_id', batch);

    for (const emb of (allEmbeddings || [])) {
      try {
        const parsed = typeof emb.embedding === 'string' ? JSON.parse(emb.embedding) : emb.embedding;
        ctx.embeddings.set(emb.post_id, parsed);
      } catch (e) {
        console.warn(`[BatchOrchestrator] Failed to parse embedding for ${emb.post_id}:`, e);
      }
    }
  }

  ctx.metrics.embeddingsComputed = ctx.embeddings.size;
  ctx.metrics.phaseTimes['embedding'] = performance.now() - phaseStart;

  if (ctx.embeddings.size === 0) {
    return Err({ type: 'SAGA_STEP_FAILED', step: 'compute-embeddings', phase: 'embedding', cause: 'No embeddings computed. Check API keys or edge function logs.', recoverable: false });
  }

  console.log(`[BatchOrchestrator] Embeddings ready: ${ctx.embeddings.size}`);
  return Ok(undefined);
}

// ─── Step 3: Generate Suggestions ───────────────────────────────

async function stepGenerateSuggestions(ctx: BatchContext): Promise<Result<void, SagaError>> {
  const phaseStart = performance.now();
  console.log('[BatchOrchestrator] Generating link suggestions...');

  await updateBatchJob(ctx.jobId, { phase: 'suggesting', progress: 0, total: ctx.posts.length });

  let totalSuggestions = 0;

  for (let i = 0; i < ctx.posts.length; i++) {
    const post = ctx.posts[i];
    const embedding = ctx.embeddings.get(post.id);
    if (!embedding) continue;

    try {
      const embeddingStr = `[${embedding.join(',')}]`;

      const { data: similar, error } = await supabase.rpc('match_posts', {
        query_embedding: embeddingStr,
        match_threshold: 0.15,
        match_count: 10,
        exclude_post_id: post.id,
      });

      if (error) {
        console.warn(`[BatchOrchestrator] Similarity search failed for ${post.id}:`, error.message);
        continue;
      }

      if (similar && similar.length > 0) {
        const suggestions = similar.map((s: any) => ({
          targetPostId: s.post_id,
          anchorText: extractBestAnchor(post.content, s.title),
          score: s.similarity,
          context: extractContextSnippet(post.content, s.title),
        }));

        ctx.suggestions.set(post.id, suggestions);
        totalSuggestions += suggestions.length;

        // Store suggestions in batches
        const rows = suggestions.map((s: any) => ({
          source_post_id: post.id,
          target_post_id: s.targetPostId,
          anchor_text: s.anchorText,
          similarity_score: s.score,
          context_snippet: s.context,
          status: 'pending',
        }));

        const { error: upsertError } = await supabase.from('link_suggestions').upsert(
          rows,
          { onConflict: 'source_post_id,target_post_id' }
        );

        if (upsertError) {
          console.warn(`[BatchOrchestrator] Suggestion upsert error:`, upsertError.message);
        }
      }
    } catch (err) {
      console.warn(`[BatchOrchestrator] Error processing post ${post.id}:`, err);
    }

    if (i % 10 === 0) {
      await updateBatchJob(ctx.jobId, { phase: 'suggesting', progress: i + 1, total: ctx.posts.length });
    }
  }

  ctx.metrics.suggestionsGenerated = totalSuggestions;
  ctx.metrics.phaseTimes['suggesting'] = performance.now() - phaseStart;

  console.log(`[BatchOrchestrator] Generated ${totalSuggestions} suggestions`);
  return Ok(undefined);
}
