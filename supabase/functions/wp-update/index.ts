import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only POST allowed
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // ── Auth check ─────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // ── Parse body ─────────────────────────────────────────────
    const { wpPostId, content } = await req.json();

    if (!wpPostId || typeof wpPostId !== "number") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid wpPostId (must be a number)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!content || typeof content !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid content (must be a string)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── WordPress credentials ──────────────────────────────────
    const wpUrl = Deno.env.get("WP_REST_URL");
    const wpUser = Deno.env.get("WP_USERNAME");
    const wpAppPassword = Deno.env.get("WP_APP_PASSWORD");

    if (!wpUrl || !wpUser || !wpAppPassword) {
      return new Response(
        JSON.stringify({ error: "WordPress credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Update post in WordPress ───────────────────────────────
    const wpResponse = await fetch(
      `${wpUrl}/wp/v2/posts/${wpPostId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${wpUser}:${wpAppPassword}`)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      }
    );

    if (!wpResponse.ok) {
      const errorBody = await wpResponse.text();
      console.error("[wp-update] WP API error:", wpResponse.status, errorBody);
      return new Response(
        JSON.stringify({ error: `WordPress update failed: ${wpResponse.statusText}` }),
        { status: wpResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await wpResponse.json();

    // ── Log to analytics (using service role for insert) ──────
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await serviceClient.from("analytics_events").insert({
      event_type: "link_applied",
      payload: {
        wp_post_id: wpPostId,
        user_id: userId,
        timestamp: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({ success: true, post: result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[wp-update] Internal error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
