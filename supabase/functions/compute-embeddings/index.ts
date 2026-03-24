import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { texts, postIds } = await req.json();

    if (!texts || !postIds || texts.length !== postIds.length) {
      return new Response(
        JSON.stringify({ error: 'texts and postIds must be arrays of equal length' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    const hfKey = Deno.env.get('HF_API_KEY');

    let embeddings: number[][] = [];

    if (openAiKey) {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: texts,
          dimensions: 384,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      embeddings = data.data.map((d: { embedding: number[] }) => d.embedding);
    } else if (hfKey) {
      const response = await fetch(
        'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hfKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inputs: texts }),
        }
      );

      if (!response.ok) {
        throw new Error(`HuggingFace API error: ${response.statusText}`);
      }

      embeddings = await response.json();
    } else {
      return new Response(
        JSON.stringify({ error: 'No embedding API configured. Set OPENAI_API_KEY or HF_API_KEY.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const rows = postIds.map((postId: string, idx: number) => ({
      post_id: postId,
      embedding: JSON.stringify(embeddings[idx]),
      model_version: openAiKey ? 'text-embedding-3-small' : 'all-MiniLM-L6-v2',
    }));

    const { error: insertError } = await supabase
      .from('embeddings')
      .upsert(rows, { onConflict: 'post_id' });

    if (insertError) {
      console.error('Failed to store embeddings:', insertError);
    }

    return new Response(
      JSON.stringify({
        embeddings: postIds.map((postId: string, idx: number) => ({
          postId,
          vector: embeddings[idx],
          dimensions: embeddings[idx].length,
        })),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Embedding computation failed', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
