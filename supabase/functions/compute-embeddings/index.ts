import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DIM = 384;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { texts, postIds } = await req.json();

    if (!texts || !postIds || texts.length !== postIds.length) {
      return new Response(
        JSON.stringify({ error: 'texts and postIds must be arrays of equal length' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let embeddings: number[][] = [];
    let modelVersion = 'lovable-ai-384';

    if (OPENAI_API_KEY) {
      // OpenAI text-embedding-3-small — best quality
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: texts,
          dimensions: DIM,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${errText}`);
      }

      const data = await response.json();
      embeddings = data.data.map((d: { embedding: number[] }) => d.embedding);
      modelVersion = 'text-embedding-3-small';
    } else if (LOVABLE_API_KEY) {
      // Use Lovable AI to extract semantic topics, then hash into vector space
      console.log(`[compute-embeddings] Using Lovable AI for ${texts.length} texts`);
      embeddings = await generateEmbeddingsViaAI(texts, LOVABLE_API_KEY);
      modelVersion = 'lovable-ai-384';
    } else {
      // Fallback: deterministic hash-based embeddings (no AI needed)
      console.log(`[compute-embeddings] No AI key, using hash-based embeddings`);
      embeddings = texts.map((t: string) => hashToVector(t, DIM));
      modelVersion = 'hash-384';
    }

    // Store embeddings
    const rows = postIds.map((postId: string, idx: number) => ({
      post_id: postId,
      embedding: JSON.stringify(embeddings[idx]),
      model_version: modelVersion,
    }));

    const { error: insertError } = await supabaseClient
      .from('embeddings')
      .upsert(rows, { onConflict: 'post_id,model_version' });

    if (insertError) {
      console.error('Failed to store embeddings:', insertError);
      for (const row of rows) {
        await supabaseClient.from('embeddings').upsert(row, { onConflict: 'post_id,model_version' });
      }
    }

    console.log(`[compute-embeddings] Stored ${embeddings.length} embeddings (${modelVersion})`);

    return new Response(
      JSON.stringify({
        success: true,
        count: embeddings.length,
        model: modelVersion,
        dimensions: embeddings[0]?.length ?? 0,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[compute-embeddings] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Embedding computation failed', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Generate embeddings via Lovable AI.
 * Send ALL texts in a single prompt to minimize API calls.
 */
async function generateEmbeddingsViaAI(texts: string[], apiKey: string): Promise<number[][]> {
  const embeddings: number[][] = [];

  // Process in batches of 5 to stay within token limits
  const BATCH = 5;
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const batchEmbeddings = await generateBatch(batch, apiKey);
    embeddings.push(...batchEmbeddings);

    // Rate limit protection
    if (i + BATCH < texts.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  return embeddings;
}

async function generateBatch(texts: string[], apiKey: string): Promise<number[][]> {
  const results: number[][] = [];

  for (const text of texts) {
    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [
            {
              role: 'system',
              content: 'You are a semantic analysis engine. Given text, extract exactly 25 key semantic topics/concepts as single words or short phrases. Return ONLY a JSON array of strings. Example: ["machine learning","data science","python"]',
            },
            {
              role: 'user',
              content: text.slice(0, 2500),
            },
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429 || response.status === 402) {
          console.warn(`[compute-embeddings] Rate limited (${response.status}), using hash fallback`);
          results.push(hashToVector(text, DIM));
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        await response.text();
        results.push(hashToVector(text, DIM));
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      let topics: string[] = [];
      try {
        const jsonMatch = content.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          topics = JSON.parse(jsonMatch[0]);
        }
      } catch {
        topics = content.split(/[,\n]/).map((t: string) => t.replace(/["\[\]]/g, '').trim()).filter(Boolean);
      }

      if (topics.length > 0) {
        results.push(topicsToVector(topics, text));
      } else {
        results.push(hashToVector(text, DIM));
      }

      await new Promise(r => setTimeout(r, 150));
    } catch (err) {
      console.warn(`[compute-embeddings] Failed, using fallback:`, err);
      results.push(hashToVector(text, DIM));
    }
  }

  return results;
}

/**
 * Convert extracted topics + text into a normalized embedding vector.
 */
function topicsToVector(topics: string[], originalText: string): number[] {
  const vec = new Float32Array(DIM);

  // Topic-level features (weighted heavily)
  for (const topic of topics) {
    const h = simpleHash(topic.toLowerCase().trim());
    for (let d = 0; d < 12; d++) {
      const idx = Math.abs((h * (d + 1) * 2654435761) | 0) % DIM;
      vec[idx] += 1.0 / topics.length;
    }
  }

  // Word-level features from original text
  const words = originalText
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3);
  const uniqueWords = [...new Set(words)].slice(0, 150);
  for (const word of uniqueWords) {
    const wh = simpleHash(word);
    const idx = Math.abs(wh) % DIM;
    const sign = (wh & 1) === 0 ? 1 : -1;
    vec[idx] += sign * 0.02;
  }

  // L2 normalize
  let norm = 0;
  for (let i = 0; i < DIM; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  return Array.from(vec).map(v => v / norm);
}

/**
 * Hash-based embedding fallback (no AI needed, deterministic).
 */
function hashToVector(text: string, dim: number): number[] {
  const vec = new Float32Array(dim);
  const words = text.toLowerCase().replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 2);

  const wordCounts = new Map<string, number>();
  for (const w of words) {
    wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
  }

  for (const [word, count] of wordCounts) {
    const h = simpleHash(word);
    const idx = Math.abs(h) % dim;
    const sign = (h & 1) === 0 ? 1 : -1;
    vec[idx] += sign * Math.log2(1 + count);

    const idx2 = Math.abs(h * 2654435761 | 0) % dim;
    vec[idx2] += sign * 0.5;
  }

  let norm = 0;
  for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  return Array.from(vec).map(v => v / norm);
}

function simpleHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}
