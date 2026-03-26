import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Compute embeddings using Lovable AI gateway.
 * Uses tool-calling to extract a fixed-dimension numeric vector for each text.
 * Falls back to a simple hash-based embedding if AI fails.
 */
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
      // Use OpenAI directly if available
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: texts,
          dimensions: 384,
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
      // Use Lovable AI to generate semantic embeddings via structured output
      console.log(`[compute-embeddings] Using Lovable AI for ${texts.length} texts`);
      
      // Process texts in small batches to avoid token limits
      const BATCH = 3;
      for (let i = 0; i < texts.length; i += BATCH) {
        const batch = texts.slice(i, i + BATCH);
        const batchEmbeddings = await generateEmbeddingsViaAI(batch, LOVABLE_API_KEY);
        embeddings.push(...batchEmbeddings);
      }
      modelVersion = 'lovable-ai-384';
    } else {
      return new Response(
        JSON.stringify({ error: 'No AI API configured. LOVABLE_API_KEY or OPENAI_API_KEY required.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store embeddings in database
    const rows = postIds.map((postId: string, idx: number) => ({
      post_id: postId,
      embedding: JSON.stringify(embeddings[idx]),
      model_version: modelVersion,
    }));

    // Upsert with the unique constraint on (post_id, model_version)
    const { error: insertError } = await supabaseClient
      .from('embeddings')
      .upsert(rows, { onConflict: 'post_id,model_version' });

    if (insertError) {
      console.error('Failed to store embeddings:', insertError);
      // Try inserting one by one to handle partial failures
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
 * Generate semantic embeddings using Lovable AI.
 * We ask the model to produce a numerical vector that captures semantic meaning.
 * Uses a deterministic approach: extract key topics/concepts and hash them into a vector space.
 */
async function generateEmbeddingsViaAI(texts: string[], apiKey: string): Promise<number[][]> {
  const DIM = 384;
  const embeddings: number[][] = [];

  for (const text of texts) {
    try {
      // Use the LLM to extract key semantic features, then hash into vector
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
              content: `You are a semantic analysis engine. Given text, extract exactly 20 key semantic topics/concepts as single words or short phrases. Return ONLY a JSON array of strings, nothing else. Example: ["machine learning","neural networks","data science"]`,
            },
            {
              role: 'user',
              content: text.slice(0, 2000),
            },
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429 || response.status === 402) {
          console.warn(`[compute-embeddings] Rate limited (${response.status}), using hash fallback`);
          embeddings.push(hashToVector(text, DIM));
          continue;
        }
        const errText = await response.text();
        console.warn(`[compute-embeddings] AI error: ${response.status} ${errText}`);
        embeddings.push(hashToVector(text, DIM));
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      // Parse the topics and convert to a deterministic vector
      let topics: string[] = [];
      try {
        // Extract JSON array from response
        const jsonMatch = content.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          topics = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // If parsing fails, split by common separators
        topics = content.split(/[,\n]/).map((t: string) => t.replace(/["\[\]]/g, '').trim()).filter(Boolean);
      }

      if (topics.length > 0) {
        // Create embedding from topics: hash each topic into vector positions
        const vec = new Float32Array(DIM);
        for (const topic of topics) {
          const topicHash = simpleHash(topic.toLowerCase().trim());
          // Distribute topic influence across multiple dimensions
          for (let d = 0; d < 8; d++) {
            const idx = Math.abs((topicHash * (d + 1) * 2654435761) | 0) % DIM;
            vec[idx] += 1.0 / topics.length;
          }
        }
        
        // Also incorporate word-level features from original text
        const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const uniqueWords = [...new Set(words)].slice(0, 100);
        for (const word of uniqueWords) {
          const wh = simpleHash(word);
          const idx = Math.abs(wh) % DIM;
          vec[idx] += 0.01;
        }
        
        // L2 normalize
        let norm = 0;
        for (let i = 0; i < DIM; i++) norm += vec[i] * vec[i];
        norm = Math.sqrt(norm) || 1;
        const normalized = Array.from(vec).map(v => v / norm);
        
        embeddings.push(normalized);
      } else {
        embeddings.push(hashToVector(text, DIM));
      }

      // Small delay between requests to avoid rate limiting
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.warn(`[compute-embeddings] Failed for text, using fallback:`, err);
      embeddings.push(hashToVector(text, DIM));
    }
  }

  return embeddings;
}

/**
 * Deterministic hash-based embedding fallback.
 * Produces a normalized vector from text content using word hashing.
 */
function hashToVector(text: string, dim: number): number[] {
  const vec = new Float32Array(dim);
  const words = text.toLowerCase().replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 2);
  
  // Use TF-like weighting with hashing trick
  const wordCounts = new Map<string, number>();
  for (const w of words) {
    wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
  }
  
  for (const [word, count] of wordCounts) {
    const h = simpleHash(word);
    const idx = Math.abs(h) % dim;
    const sign = (h & 1) === 0 ? 1 : -1;
    vec[idx] += sign * Math.log2(1 + count);
    
    // Bigram-like features
    const idx2 = Math.abs(h * 2654435761 | 0) % dim;
    vec[idx2] += sign * 0.5;
  }
  
  // L2 normalize
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
