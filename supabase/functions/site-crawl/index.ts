import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { site_id, url: rawUrl } = await req.json();

    if (!site_id || !rawUrl) {
      return new Response(
        JSON.stringify({ error: "site_id and url are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize URL: ensure https:// prefix
    let url = rawUrl.trim().replace(/\/$/, "");
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch the sitemap or homepage to discover pages
    const pages: Array<{ url: string; title: string; content: string; wordCount: number }> = [];

    // Try sitemap first
    const sitemapUrls = await discoverFromSitemap(url);

    const urlsToFetch = sitemapUrls.length > 0
      ? sitemapUrls.slice(0, 50) // Limit to 50 pages
      : await discoverFromHomepage(url);

    console.log(`[site-crawl] Discovered ${urlsToFetch.length} URLs for ${url}`);

    // Fetch each page
    for (const pageUrl of urlsToFetch) {
      try {
        const resp = await fetch(pageUrl, {
          headers: { "User-Agent": "LinkForge/1.0 (internal-link-bot)" },
        });
        if (!resp.ok) continue;

        const html = await resp.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        if (!doc) continue;

        // Remove script/style tags
        doc.querySelectorAll("script, style, nav, footer, header").forEach((el) => el.remove());

        const title = doc.querySelector("title")?.textContent?.trim() || pageUrl;
        const bodyText = doc.querySelector("body")?.textContent || "";
        const cleanText = bodyText.replace(/\s+/g, " ").trim();
        const wordCount = cleanText.split(/\s+/).filter(Boolean).length;

        // Get main content HTML
        const mainEl = doc.querySelector("main, article, [role='main'], .content, #content");
        const contentHtml = mainEl?.innerHTML || doc.querySelector("body")?.innerHTML || "";

        pages.push({ url: pageUrl, title, content: contentHtml.slice(0, 50000), wordCount });
      } catch (e) {
        console.warn(`[site-crawl] Failed to fetch ${pageUrl}:`, e);
      }
    }

    // Upsert pages into posts table
    const crypto = globalThis.crypto;
    for (const page of pages) {
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(page.content));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const contentHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      const slug = new URL(page.url).pathname.replace(/\/$/, "") || "/";

      await supabase.from("posts").upsert(
        {
          site_id,
          title: page.title.slice(0, 500),
          slug,
          url: page.url,
          content: page.content,
          content_hash: contentHash,
          word_count: page.wordCount,
          source_type: "generic",
          status: "publish",
          fetched_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "url" }
      );
    }

    return new Response(
      JSON.stringify({ success: true, pages: pages.map((p) => ({ url: p.url, title: p.title, wordCount: p.wordCount })) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[site-crawl] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function discoverFromSitemap(baseUrl: string): Promise<string[]> {
  const urls: string[] = [];
  const sitemapPaths = ["/sitemap.xml", "/sitemap_index.xml", "/wp-sitemap.xml"];

  for (const path of sitemapPaths) {
    try {
      const resp = await fetch(`${baseUrl}${path}`, {
        headers: { "User-Agent": "LinkForge/1.0" },
      });
      if (!resp.ok) continue;

      const xml = await resp.text();
      // Extract URLs from sitemap
      const locMatches = xml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi);
      for (const match of locMatches) {
        const loc = match[1];
        // Skip image/video sitemaps and non-page resources
        if (loc.match(/\.(jpg|png|gif|pdf|zip|mp4|mp3)$/i)) continue;
        // If it's a sub-sitemap, try to fetch it too
        if (loc.includes("sitemap") && loc.endsWith(".xml")) {
          try {
            const subResp = await fetch(loc);
            if (subResp.ok) {
              const subXml = await subResp.text();
              const subMatches = subXml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi);
              for (const sm of subMatches) {
                if (!sm[1].match(/\.(jpg|png|gif|pdf|zip|mp4|mp3)$/i)) {
                  urls.push(sm[1]);
                }
              }
            }
          } catch {}
        } else {
          urls.push(loc);
        }
      }
      if (urls.length > 0) break;
    } catch {}
  }

  return [...new Set(urls)];
}

async function discoverFromHomepage(baseUrl: string): Promise<string[]> {
  try {
    const resp = await fetch(baseUrl, {
      headers: { "User-Agent": "LinkForge/1.0" },
    });
    if (!resp.ok) return [baseUrl];

    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) return [baseUrl];

    const urls = new Set<string>([baseUrl]);
    const base = new URL(baseUrl);

    doc.querySelectorAll("a[href]").forEach((a) => {
      try {
        const href = a.getAttribute("href");
        if (!href) return;
        const resolved = new URL(href, baseUrl);
        if (resolved.hostname === base.hostname && !resolved.hash) {
          urls.add(resolved.origin + resolved.pathname);
        }
      } catch {}
    });

    return [...urls].slice(0, 50);
  } catch {
    return [baseUrl];
  }
}
