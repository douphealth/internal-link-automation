import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * In-memory per-instance rate limiter.
 * Tracks request counts per client within a sliding window.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(clientId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(clientId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

/**
 * Strip dangerous HTML: script tags, event handlers, javascript: URIs.
 * Heavy sanitization layer before content reaches the client.
 */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "");
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Auth check ─────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify JWT via Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Rate limit ─────────────────────────────────────────────
    const clientId = claimsData.claims.sub as string;
    if (!checkRateLimit(clientId)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── WordPress credentials from Vault ───────────────────────
    const wpUrl = Deno.env.get("WP_REST_URL");
    const wpUser = Deno.env.get("WP_USERNAME");
    const wpAppPassword = Deno.env.get("WP_APP_PASSWORD");

    if (!wpUrl || !wpUser || !wpAppPassword) {
      return new Response(
        JSON.stringify({ error: "WordPress credentials not configured in Vault" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Parse request params ───────────────────────────────────
    let params: Record<string, string> = {};

    if (req.method === "POST") {
      try {
        params = await req.json();
      } catch {
        params = {};
      }
    } else {
      const url = new URL(req.url);
      url.searchParams.forEach((value, key) => {
        params[key] = value;
      });
    }

    const perPage = params.per_page || "20";
    const page = params.page || "1";
    const search = params.search || "";

    // Validate numeric params
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const perPageNum = Math.min(100, Math.max(1, parseInt(perPage, 10) || 20));

    // ── Build WP API request ───────────────────────────────────
    const wpParams = new URLSearchParams({
      per_page: String(perPageNum),
      page: String(pageNum),
      status: "publish",
      _fields: "id,title,slug,link,content,date,modified",
    });

    if (search) wpParams.set("search", search);

    const wpResponse = await fetch(
      `${wpUrl}/wp/v2/posts?${wpParams}`,
      {
        headers: {
          Authorization: `Basic ${btoa(`${wpUser}:${wpAppPassword}`)}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!wpResponse.ok) {
      const errorBody = await wpResponse.text();
      console.error("[wp-proxy] WP API error:", wpResponse.status, errorBody);
      return new Response(
        JSON.stringify({ error: `WordPress API error: ${wpResponse.statusText}` }),
        { status: wpResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const posts = await wpResponse.json();
    const total = wpResponse.headers.get("X-WP-Total");
    const totalPages = wpResponse.headers.get("X-WP-TotalPages");

    // ── Sanitize content before sending to client ──────────────
    const sanitizedPosts = posts.map((post: Record<string, unknown>) => ({
      ...post,
      title: {
        rendered: sanitizeHtml((post.title as Record<string, string>)?.rendered || ""),
      },
      content: {
        rendered: sanitizeHtml((post.content as Record<string, string>)?.rendered || ""),
      },
    }));

    return new Response(
      JSON.stringify({
        posts: sanitizedPosts,
        pagination: {
          total: Number(total),
          totalPages: Number(totalPages),
          currentPage: pageNum,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[wp-proxy] Internal error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
