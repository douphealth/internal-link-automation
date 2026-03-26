import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_PAGES = 1000;
const CONCURRENCY = 12;
const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT = "LinkForge/2.1 (internal-link-analysis-bot)";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch existing content hashes for incremental crawling
    const { data: existingPosts } = await supabase
      .from("posts")
      .select("url, content_hash")
      .eq("site_id", site_id);

    const existingHashes = new Map<string, string>();
    for (const p of existingPosts || []) {
      existingHashes.set(p.url, p.content_hash);
    }

    // Create batch job
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

    // Process crawl — edge functions have ~400s wall time
    const crawlPromise = runCrawl(supabase, site_id, url, jobId, existingHashes);

    // Use waitUntil if available, otherwise await
    if (typeof (globalThis as any).EdgeRuntime !== "undefined" && (globalThis as any).EdgeRuntime.waitUntil) {
      (globalThis as any).EdgeRuntime.waitUntil(crawlPromise);
    } else {
      await crawlPromise;
    }

    return new Response(
      JSON.stringify({ success: true, jobId, message: "Crawl started" }),
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

async function runCrawl(
  supabase: any,
  siteId: string,
  url: string,
  jobId: string | undefined,
  existingHashes: Map<string, string>
) {
  try {
    // Phase 1: Discover URLs via sitemap first, then BFS fallback
    console.log(`[site-crawl] Discovering URLs for ${url}`);
    let urlsToFetch = await discoverFromSitemap(url);

    if (urlsToFetch.length === 0) {
      console.log("[site-crawl] No sitemap found, crawling via BFS");
      urlsToFetch = await discoverViaBFS(url);
    }

    urlsToFetch = [...new Set(urlsToFetch)].slice(0, MAX_PAGES);
    console.log(`[site-crawl] Discovered ${urlsToFetch.length} unique URLs`);

    if (jobId) {
      await supabase.from("batch_jobs").update({
        phase: "crawling",
        total: urlsToFetch.length,
        progress: 0,
      }).eq("id", jobId);
    }

    // Phase 2: Fetch pages with concurrency control
    const pages: PageResult[] = [];
    let processed = 0;
    let skippedUnchanged = 0;

    for (let i = 0; i < urlsToFetch.length; i += CONCURRENCY) {
      const batch = urlsToFetch.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(pageUrl => fetchPage(pageUrl, existingHashes))
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          if (result.value === "unchanged") {
            skippedUnchanged++;
          } else if (result.value) {
            pages.push(result.value);
          }
        }
      }

      processed = Math.min(i + CONCURRENCY, urlsToFetch.length);

      // Update progress every 10 batches
      if (jobId && (processed % (CONCURRENCY * 3) === 0 || processed === urlsToFetch.length)) {
        await supabase.from("batch_jobs").update({
          progress: processed,
          metadata: {
            site_id: siteId,
            url,
            pagesFound: urlsToFetch.length,
            pagesCrawled: pages.length,
            skippedUnchanged,
          },
        }).eq("id", jobId);
      }
    }

    console.log(`[site-crawl] Fetched ${pages.length} new/changed, ${skippedUnchanged} unchanged, ${urlsToFetch.length - pages.length - skippedUnchanged} failed`);

    // Phase 3: Upsert into posts table
    if (jobId) {
      await supabase.from("batch_jobs").update({ phase: "storing" }).eq("id", jobId);
    }

    const UPSERT_BATCH = 50;
    for (let i = 0; i < pages.length; i += UPSERT_BATCH) {
      const batch = pages.slice(i, i + UPSERT_BATCH);
      const rows = batch.map((page) => ({
        site_id: siteId,
        title: page.title.slice(0, 500),
        slug: safeSlug(page.url),
        url: page.url,
        content: page.content.slice(0, 100_000),
        content_hash: page.contentHash,
        word_count: page.wordCount,
        source_type: "generic",
        status: "publish",
        fetched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from("posts").upsert(rows, { onConflict: "url" });
      if (error) {
        console.warn(`[site-crawl] Upsert batch error:`, error.message);
        for (const row of rows) {
          await supabase.from("posts").upsert(row, { onConflict: "url" }).catch(() => {});
        }
      }
    }

    // Final total = new pages + unchanged (existing)
    const totalStored = pages.length + skippedUnchanged;

    if (jobId) {
      await supabase.from("batch_jobs").update({
        status: "complete",
        phase: "done",
        progress: totalStored,
        total: urlsToFetch.length,
        completed_at: new Date().toISOString(),
        metadata: {
          site_id: siteId,
          url,
          pagesFound: urlsToFetch.length,
          pagesCrawled: pages.length,
          skippedUnchanged,
          totalStored,
        },
      }).eq("id", jobId);
    }

    console.log(`[site-crawl] Complete: ${totalStored} total pages (${pages.length} new, ${skippedUnchanged} cached)`);
  } catch (error) {
    console.error("[site-crawl] Background error:", error);
    if (jobId) {
      await supabase.from("batch_jobs").update({
        status: "error",
        error: String(error).slice(0, 1000),
      }).eq("id", jobId);
    }
  }
}

// ─── Types ──────────────────────────────────────────────────────
interface PageResult {
  url: string;
  title: string;
  content: string;
  contentHash: string;
  wordCount: number;
}

// ─── Page Fetcher with incremental support ──────────────────────
async function fetchPage(
  pageUrl: string,
  existingHashes: Map<string, string>
): Promise<PageResult | "unchanged" | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const resp = await fetch(pageUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!resp.ok) return null;

    const contentType = resp.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      await resp.body?.cancel();
      return null;
    }

    const html = await resp.text();
    if (html.length < 100) return null;

    // Quick hash check before expensive parsing
    const contentHash = await sha256(html);
    if (existingHashes.get(pageUrl) === contentHash) {
      return "unchanged";
    }

    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) return null;

    // Remove non-content elements
    const removeSelectors = "script, style, nav, footer, header, noscript, svg, iframe, aside, .sidebar, .menu, .nav, .footer, .header, .advertisement, .ads, .cookie-notice, .popup, .modal, .social-share, .comments, #comments";
    doc.querySelectorAll(removeSelectors).forEach((el) => el.remove());

    const title = doc.querySelector("title")?.textContent?.trim() ||
                  doc.querySelector("h1")?.textContent?.trim() ||
                  pageUrl;

    const mainEl = doc.querySelector("main, article, [role='main'], .post-content, .entry-content, .article-content, .content, #content, .page-content");
    const contentHtml = mainEl?.innerHTML || doc.querySelector("body")?.innerHTML || "";

    const bodyText = (mainEl || doc.querySelector("body"))?.textContent || "";
    const cleanText = bodyText.replace(/\s+/g, " ").trim();
    const wordCount = cleanText.split(/\s+/).filter(Boolean).length;

    if (wordCount < 30) return null;

    return { url: pageUrl, title, content: contentHtml, contentHash, wordCount };
  } catch {
    return null;
  }
}

// ─── URL Discovery ──────────────────────────────────────────────
async function discoverFromSitemap(baseUrl: string): Promise<string[]> {
  const urls: string[] = [];
  const sitemapPaths = ["/sitemap.xml", "/sitemap_index.xml", "/wp-sitemap.xml", "/sitemap.xml.gz", "/sitemap-index.xml"];

  for (const path of sitemapPaths) {
    try {
      const resp = await fetch(`${baseUrl}${path}`, {
        headers: { "User-Agent": USER_AGENT },
      });
      if (!resp.ok) { await resp.body?.cancel(); continue; }

      const xml = await resp.text();

      // Check for sitemap index
      const subSitemaps: string[] = [];
      const sitemapMatches = xml.matchAll(/<sitemap>[\s\S]*?<loc>\s*(.*?)\s*<\/loc>[\s\S]*?<\/sitemap>/gi);
      for (const m of sitemapMatches) {
        subSitemaps.push(m[1]);
      }

      if (subSitemaps.length > 0) {
        console.log(`[site-crawl] Found ${subSitemaps.length} sub-sitemaps`);
        const subResults = await Promise.allSettled(
          subSitemaps.slice(0, 20).map(async (subUrl) => {
            try {
              const subResp = await fetch(subUrl, { headers: { "User-Agent": USER_AGENT } });
              if (!subResp.ok) return [];
              const subXml = await subResp.text();
              return extractLocsFromXml(subXml);
            } catch { return []; }
          })
        );
        for (const r of subResults) {
          if (r.status === "fulfilled") urls.push(...r.value);
        }
      } else {
        urls.push(...extractLocsFromXml(xml));
      }

      if (urls.length > 0) break;
    } catch {}
  }

  // Also check robots.txt
  if (urls.length === 0) {
    try {
      const robotsResp = await fetch(`${baseUrl}/robots.txt`, { headers: { "User-Agent": USER_AGENT } });
      if (robotsResp.ok) {
        const robotsTxt = await robotsResp.text();
        const sitemapMatches = robotsTxt.matchAll(/Sitemap:\s*(.*)/gi);
        for (const m of sitemapMatches) {
          const smUrl = m[1].trim();
          try {
            const smResp = await fetch(smUrl, { headers: { "User-Agent": USER_AGENT } });
            if (smResp.ok) {
              const smXml = await smResp.text();
              urls.push(...extractLocsFromXml(smXml));
            }
          } catch {}
        }
      }
    } catch {}
  }

  return [...new Set(urls)].filter(u => !u.match(/\.(jpg|jpeg|png|gif|pdf|zip|mp4|mp3|svg|css|js|webp|ico|woff|woff2)$/i));
}

function extractLocsFromXml(xml: string): string[] {
  const urls: string[] = [];
  const locMatches = xml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi);
  for (const match of locMatches) {
    const loc = match[1];
    if (!loc.endsWith(".xml") && !loc.endsWith(".xml.gz")) {
      urls.push(loc);
    }
  }
  return urls;
}

async function discoverViaBFS(baseUrl: string): Promise<string[]> {
  const visited = new Set<string>();
  const queue: Array<{ url: string; depth: number }> = [{ url: baseUrl, depth: 0 }];
  const maxDepth = 3;
  const base = new URL(baseUrl);

  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const batch = queue.splice(0, Math.min(CONCURRENCY, queue.length));
    const results = await Promise.allSettled(
      batch.filter(item => !visited.has(item.url)).map(async (item) => {
        visited.add(item.url);
        if (item.depth >= maxDepth) return [];

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
          const resp = await fetch(item.url, {
            headers: { "User-Agent": USER_AGENT, "Accept": "text/html" },
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (!resp.ok) return [];

          const html = await resp.text();
          const doc = new DOMParser().parseFromString(html, "text/html");
          if (!doc) return [];

          const links: string[] = [];
          doc.querySelectorAll("a[href]").forEach((a) => {
            try {
              const href = a.getAttribute("href");
              if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return;
              const resolved = new URL(href, item.url);
              if (resolved.hostname === base.hostname && !resolved.hash) {
                const normalized = resolved.origin + resolved.pathname.replace(/\/$/, "");
                if (!visited.has(normalized) && !normalized.match(/\.(jpg|jpeg|png|gif|pdf|zip|mp4|mp3|svg|css|js)$/i)) {
                  links.push(normalized);
                }
              }
            } catch {}
          });
          return links.map(u => ({ url: u, depth: item.depth + 1 }));
        } catch { return []; }
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") {
        for (const item of r.value) {
          if (!visited.has(item.url) && visited.size < MAX_PAGES) {
            queue.push(item);
          }
        }
      }
    }
  }

  return [...visited];
}

// ─── Utilities ──────────────────────────────────────────────────
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(text));
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function safeSlug(pageUrl: string): string {
  try {
    return new URL(pageUrl).pathname.replace(/\/$/, "") || "/";
  } catch {
    return "/";
  }
}
