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

    let url = rawUrl.trim().replace(/\/$/, "");
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Create a batch job for tracking progress
    const { data: job } = await supabase
      .from("batch_jobs")
      .insert({
        status: "running",
        phase: "discovering",
        progress: 0,
        total: 0,
        started_at: new Date().toISOString(),
        metadata: { site_id, url },
      })
      .select()
      .single();

    const jobId = job?.id;

    // Start background crawl processing
    const crawlPromise = (async () => {
      try {
        // Discover URLs
        const sitemapUrls = await discoverFromSitemap(url);
        const urlsToFetch = sitemapUrls.length > 0
          ? sitemapUrls.slice(0, 500)
          : await discoverFromHomepage(url);

        console.log(`[site-crawl] Discovered ${urlsToFetch.length} URLs for ${url}`);

        if (jobId) {
          await supabase.from("batch_jobs").update({
            phase: "crawling",
            total: urlsToFetch.length,
            progress: 0,
          }).eq("id", jobId);
        }

        // Fetch pages concurrently in batches of 5
        const pages: Array<{ url: string; title: string; content: string; wordCount: number }> = [];
        const CONCURRENCY = 5;

        for (let i = 0; i < urlsToFetch.length; i += CONCURRENCY) {
          const batch = urlsToFetch.slice(i, i + CONCURRENCY);
          const results = await Promise.allSettled(
            batch.map(pageUrl => fetchPage(pageUrl))
          );

          for (const result of results) {
            if (result.status === "fulfilled" && result.value) {
              pages.push(result.value);
            }
          }

          // Update progress
          if (jobId && i % 10 === 0) {
            await supabase.from("batch_jobs").update({
              progress: Math.min(i + CONCURRENCY, urlsToFetch.length),
            }).eq("id", jobId);
          }
        }

        console.log(`[site-crawl] Successfully fetched ${pages.length}/${urlsToFetch.length} pages`);

        // Upsert pages into posts table in batches
        const UPSERT_BATCH = 20;
        for (let i = 0; i < pages.length; i += UPSERT_BATCH) {
          const batch = pages.slice(i, i + UPSERT_BATCH);
          const rows = await Promise.all(batch.map(async (page) => {
            const encoder = new TextEncoder();
            const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(page.content));
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const contentHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
            const slug = new URL(page.url).pathname.replace(/\/$/, "") || "/";

            return {
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
            };
          }));

          await supabase.from("posts").upsert(rows, { onConflict: "url" });
        }

        // Mark job complete
        if (jobId) {
          await supabase.from("batch_jobs").update({
            status: "complete",
            phase: "done",
            progress: pages.length,
            total: urlsToFetch.length,
            completed_at: new Date().toISOString(),
            metadata: { site_id, url, pagesFound: urlsToFetch.length, pagesCrawled: pages.length },
          }).eq("id", jobId);
        }

        console.log(`[site-crawl] Completed: ${pages.length} pages stored`);
      } catch (error) {
        console.error("[site-crawl] Background crawl error:", error);
        if (jobId) {
          await supabase.from("batch_jobs").update({
            status: "error",
            error: String(error),
          }).eq("id", jobId);
        }
      }
    })();

    // Use EdgeRuntime.waitUntil if available for true background processing
    if (typeof (globalThis as any).EdgeRuntime !== "undefined" && (globalThis as any).EdgeRuntime.waitUntil) {
      (globalThis as any).EdgeRuntime.waitUntil(crawlPromise);
    } else {
      // Fallback: await the crawl (will work but may timeout for very large sites)
      await crawlPromise;
    }

    return new Response(
      JSON.stringify({ success: true, jobId, message: "Crawl started. Check batch_jobs for progress." }),
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

async function fetchPage(pageUrl: string): Promise<{ url: string; title: string; content: string; wordCount: number } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    const resp = await fetch(pageUrl, {
      headers: { "User-Agent": "LinkForge/1.0 (internal-link-bot)" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) return null;

    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) return null;

    doc.querySelectorAll("script, style, nav, footer, header, noscript, svg, iframe").forEach((el) => el.remove());

    const title = doc.querySelector("title")?.textContent?.trim() || pageUrl;
    const bodyText = doc.querySelector("body")?.textContent || "";
    const cleanText = bodyText.replace(/\s+/g, " ").trim();
    const wordCount = cleanText.split(/\s+/).filter(Boolean).length;

    const mainEl = doc.querySelector("main, article, [role='main'], .content, #content");
    const contentHtml = mainEl?.innerHTML || doc.querySelector("body")?.innerHTML || "";

    return { url: pageUrl, title, content: contentHtml.slice(0, 50000), wordCount };
  } catch (e) {
    console.warn(`[site-crawl] Failed to fetch ${pageUrl}:`, e);
    return null;
  }
}

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
      const locMatches = xml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi);
      for (const match of locMatches) {
        const loc = match[1];
        if (loc.match(/\.(jpg|png|gif|pdf|zip|mp4|mp3)$/i)) continue;
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

    return [...urls].slice(0, 500);
  } catch {
    return [baseUrl];
  }
}
