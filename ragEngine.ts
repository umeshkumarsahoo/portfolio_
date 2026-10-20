import fs from "fs";
import path from "path";
import crypto from "crypto";
import dns from "dns";
import http from "http";
import https from "https";
import { URL } from "url";

// ==========================================
// Types & Interfaces
// ==========================================

export interface RAGSourceConfig {
  url: string;
  title?: string;
  lastFetchedAt?: number;
  etag?: string;
  lastModified?: string;
  isStale?: boolean;
}

export interface RAGChunk {
  id: string;
  url: string;
  title: string;
  section: string;
  text: string;
  chunkIndex: number;
  contentHash: string;
}

export interface IndexedChunk {
  chunk: RAGChunk;
  embedding: number[];
}

export interface RetrievalResult {
  chunk: RAGChunk;
  semanticScore: number;
  lexicalScore: number;
  combinedScore: number;
  citationUrl: string;
}

export interface RAGMetrics {
  urlCacheHit: boolean;
  urlFetchMs: number;
  embeddingCacheHits: number;
  embeddingCacheMisses: number;
  embeddingGenMs: number;
  retrievalCacheHit: boolean;
  retrievalMs: number;
  answerCacheHit: boolean;
  generationMs: number;
  totalLatencyMs: number;
  sourcesIndexed: number;
  chunksIndexed: number;
  indexVersion: number;
  isStale: boolean;
}

export interface RAGAnswer {
  answer: string;
  sources: { title: string; url: string }[];
  retrievals: RetrievalResult[];
  metrics: RAGMetrics;
}

export interface PageCacheEntry {
  url: string;
  title: string;
  content: string;
  contentHash: string;
  etag?: string;
  lastModified?: string;
  fetchedAt: number;
  expiresAt: number;
  isStale: boolean;
}

export interface AnswerCacheEntry {
  answer: string;
  sources: { title: string; url: string }[];
  retrievals: RetrievalResult[];
  timestamp: number;
  expiresAt: number;
}

// ==========================================
// SSRF Security & Safe URL Validation
// ==========================================

const PRIVATE_IP_RANGES = [
  /^127\./,                         // 127.0.0.0/8 (Loopback)
  /^10\./,                          // 10.0.0.0/8 (Private)
  /^192\.168\./,                    // 192.168.0.0/16 (Private)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 (Private)
  /^169\.254\./,                    // 169.254.0.0/16 (Link-local / AWS metadata)
  /^0\./,                           // 0.0.0.0/8
  /^::1$/,                          // IPv6 loopback
  /^f[cd][0-9a-f]{2}:/i,            // Unique local IPv6
  /^fe80:/i,                        // Link-local IPv6
];

export async function validateSafeUrl(
  urlString: string,
  options: { allowLocalhost?: boolean } = {}
): Promise<{ safe: boolean; error?: string; parsedUrl?: URL }> {
  try {
    const parsed = new URL(urlString);

    // 1. Only allow HTTP and HTTPS
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { safe: false, error: `Disallowed protocol: ${parsed.protocol}. Only http and https are allowed.` };
    }

    // 2. Reject credentials in URL
    if (parsed.username || parsed.password) {
      return { safe: false, error: "URLs containing user credentials are not permitted." };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Explicit opt-in for unit testing mock servers on loopback
    if (options.allowLocalhost && (hostname === "localhost" || hostname === "127.0.0.1")) {
      return { safe: true, parsedUrl: parsed };
    }

    // 3. Block known loopback and internal hostname patterns
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname === "metadata.google.internal" ||
      hostname === "instance-data"
    ) {
      return { safe: false, error: `Access to internal hostname '${hostname}' is prohibited.` };
    }

    // 4. Resolve DNS to verify all IP addresses
    let addresses: dns.LookupAddress[] = [];
    try {
      addresses = await dns.promises.lookup(hostname, { all: true });
    } catch (dnsErr) {
      return { safe: false, error: `DNS lookup failed for hostname: ${hostname}` };
    }

    for (const addr of addresses) {
      for (const pattern of PRIVATE_IP_RANGES) {
        if (pattern.test(addr.address)) {
          return { safe: false, error: `Access to private IP address '${addr.address}' is blocked for SSRF prevention.` };
        }
      }
    }

    return { safe: true, parsedUrl: parsed };
  } catch (err: any) {
    return { safe: false, error: `Malformed URL: ${err.message}` };
  }
}

export function normalizeTargetUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    if (host === "github.com") {
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length === 2) {
        return `https://raw.githubusercontent.com/${parts[0]}/${parts[1]}/main/README.md`;
      }
      if (parts.length >= 4 && parts[2] === "blob") {
        return `https://raw.githubusercontent.com/${parts[0]}/${parts[1]}/${parts.slice(3).join("/")}`;
      }
    }
  } catch {}
  return rawUrl;
}

// Safe HTTP Fetch with Timeout, Size Limit, and Redirect Protection
export async function safeFetch(
  targetUrl: string,
  options: {
    etag?: string;
    lastModified?: string;
    timeoutMs?: number;
    maxRedirects?: number;
    allowLocalhost?: boolean;
  } = {}
): Promise<{ status: number; content?: string; etag?: string; lastModified?: string; redirectedUrl?: string }> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const maxRedirects = options.maxRedirects ?? 3;
  let currentUrl = normalizeTargetUrl(targetUrl);
  let redirectsRemaining = maxRedirects;

  while (redirectsRemaining >= 0) {
    const validation = await validateSafeUrl(currentUrl, { allowLocalhost: options.allowLocalhost });
    if (!validation.safe || !validation.parsedUrl) {
      throw new Error(`SSRF Block: ${validation.error}`);
    }

    const parsed = validation.parsedUrl;
    const isHttps = parsed.protocol === "https:";
    const transport = isHttps ? https : http;

    const headers: Record<string, string> = {
      "User-Agent": "Portfolio-RAG-Bot/2.0 (+https://github.com/umeshkumarsahoo)",
      "Accept": "text/html,text/plain,application/json;q=0.9,*/*;q=0.5",
    };

    const githubToken = process.env.GITHUB_TOKEN?.trim();
    if (githubToken && parsed.hostname === "api.github.com") {
      headers["Authorization"] = githubToken.startsWith("Bearer ") || githubToken.startsWith("token ")
        ? githubToken
        : `Bearer ${githubToken}`;
    }

    if (options.etag) headers["If-None-Match"] = options.etag;
    if (options.lastModified) headers["If-Modified-Since"] = options.lastModified;

    const requestPromise = new Promise<{
      status: number;
      content?: string;
      etag?: string;
      lastModified?: string;
      redirectLocation?: string;
    }>((resolve, reject) => {
      const req = transport.request(
        parsed,
        {
          method: "GET",
          headers,
          timeout: timeoutMs,
        },
        (res) => {
          const statusCode = res.statusCode || 0;

          // Handle 304 Not Modified
          if (statusCode === 304) {
            res.resume();
            return resolve({
              status: 304,
              etag: (res.headers["etag"] as string) || options.etag,
              lastModified: (res.headers["last-modified"] as string) || options.lastModified,
            });
          }

          // Handle Redirects (301, 302, 307, 308)
          if ([301, 302, 303, 307, 308].includes(statusCode) && res.headers.location) {
            res.resume();
            try {
              const redirectLocation = new URL(res.headers.location, currentUrl).toString();
              return resolve({ status: statusCode, redirectLocation });
            } catch {
              return reject(new Error(`Invalid redirect location: ${res.headers.location}`));
            }
          }

          if (statusCode < 200 || statusCode >= 300) {
            res.resume();
            return resolve({ status: statusCode });
          }

          let data = "";
          let byteLength = 0;
          const MAX_BYTES = 2 * 1024 * 1024; // 2MB limit

          res.setEncoding("utf8");
          res.on("data", (chunk: string) => {
            byteLength += Buffer.byteLength(chunk, "utf8");
            if (byteLength > MAX_BYTES) {
              req.destroy(new Error("Response exceeded maximum 2MB size limit."));
              return;
            }
            data += chunk;
          });

          res.on("end", () => {
            resolve({
              status: statusCode,
              content: data,
              etag: res.headers["etag"] as string | undefined,
              lastModified: res.headers["last-modified"] as string | undefined,
            });
          });
        }
      );

      req.on("timeout", () => {
        req.destroy(new Error(`Request timed out after ${timeoutMs}ms.`));
      });

      req.on("error", (err) => {
        reject(err);
      });

      req.end();
    });

    const result = await requestPromise;

    if (result.redirectLocation) {
      currentUrl = result.redirectLocation;
      redirectsRemaining--;
      if (redirectsRemaining < 0) {
        throw new Error("Too many redirects encountered.");
      }
      continue;
    }

    return {
      status: result.status,
      content: result.content,
      etag: result.etag,
      lastModified: result.lastModified,
      redirectedUrl: currentUrl !== targetUrl ? currentUrl : undefined,
    };
  }

  throw new Error("Failed to fetch content.");
}

// ==========================================
// Text Cleaning & Structure-Aware Extraction
// ==========================================

export function cleanAndExtractContent(rawContent: string, url: string): { title: string; cleanText: string } {
  // 1. Detect if it's already markdown or plain text
  if (!rawContent.includes("<html") && !rawContent.includes("<!DOCTYPE") && !rawContent.includes("<body")) {
    const firstLine = rawContent.split("\n").find((l) => l.trim().length > 0) || "Document";
    const title = firstLine.replace(/^#+\s*/, "").substring(0, 80).trim();
    return { title: title || "Document", cleanText: rawContent.trim() };
  }

  // 2. HTML Extraction: Extract Title
  let title = "Web Document";
  const titleMatch = rawContent.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].replace(/\s+/g, " ").trim();
  } else {
    const h1Match = rawContent.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match && h1Match[1]) {
      title = h1Match[1].replace(/\s+/g, " ").trim();
    }
  }

  // 3. Strip non-content tags
  let text = rawContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "");

  // 4. Convert structural HTML elements to markdown style
  text = text
    .replace(/<h[1-2][^>]*>(.*?)<\/h[1-2]>/gi, "\n\n## $1\n")
    .replace(/<h[3-6][^>]*>(.*?)<\/h[3-6]>/gi, "\n\n### $1\n")
    .replace(/<p[^>]*>/gi, "\n\n")
    .replace(/<\/p>/gi, "")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/li>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " "); // Strip remaining tags

  // 5. Decode HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  // 6. Normalize whitespace
  text = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  return { title, cleanText: text };
}

// Structure-Aware Chunking with Section Header Preservation
export function chunkTextWithStructure(
  text: string,
  metadata: { url: string; title: string },
  maxChunkChars = 750,
  overlapChars = 120
): RAGChunk[] {
  const chunks: RAGChunk[] = [];
  const lines = text.split("\n");

  let currentHeading = metadata.title;
  let currentChunkLines: string[] = [];
  let currentChunkLength = 0;
  let chunkIndex = 0;

  function pushCurrentChunk() {
    if (currentChunkLines.length === 0) return;
    const body = currentChunkLines.join("\n").trim();
    if (body.length < 30) return; // skip trivial fragments

    const textWithContext = `[Source: ${metadata.title}] [Section: ${currentHeading}]\n${body}`;
    const hash = crypto.createHash("sha256").update(textWithContext).digest("hex");
    const id = `${crypto.createHash("md5").update(metadata.url).digest("hex").slice(0, 8)}_${chunkIndex}`;

    chunks.push({
      id,
      url: metadata.url,
      title: metadata.title,
      section: currentHeading,
      text: textWithContext,
      chunkIndex,
      contentHash: hash,
    });

    chunkIndex++;

    // Preserve overlap lines
    let retained: string[] = [];
    let retainedLen = 0;
    for (let i = currentChunkLines.length - 1; i >= 0; i--) {
      const line = currentChunkLines[i];
      if (retainedLen + line.length <= overlapChars) {
        retained.unshift(line);
        retainedLen += line.length;
      } else {
        break;
      }
    }
    currentChunkLines = retained;
    currentChunkLength = retainedLen;
  }

  for (const line of lines) {
    if (/^#+\s+/.test(line)) {
      // Encountered a new heading: close previous chunk
      if (currentChunkLength > 200) {
        pushCurrentChunk();
      }
      currentHeading = line.replace(/^#+\s*/, "").trim();
      currentChunkLines.push(line);
      currentChunkLength += line.length;
    } else {
      currentChunkLines.push(line);
      currentChunkLength += line.length;

      if (currentChunkLength >= maxChunkChars) {
        pushCurrentChunk();
      }
    }
  }

  pushCurrentChunk();
  return chunks;
}

// Common English stop words to filter out for higher semantic contrast
const STOP_WORDS = new Set([
  "the", "a", "an", "is", "was", "are", "were", "what", "which", "who", "whom",
  "this", "that", "these", "those", "am", "been", "being", "have", "has", "had",
  "having", "do", "does", "did", "doing", "would", "should", "could", "ought",
  "i", "you", "he", "she", "it", "we", "they", "them", "their", "theirs", "my",
  "mine", "your", "yours", "his", "her", "hers", "its", "our", "ours", "of",
  "in", "to", "for", "with", "on", "at", "from", "by", "about", "as", "into",
  "like", "through", "after", "over", "between", "out", "against", "during",
  "without", "before", "under", "around", "among"
]);

// ==========================================
// Deterministic Semantic Embedding Vectorizer
// (Dense 256-D with TF-IDF subword hashing + L2 Normalization)
// ==========================================

export function computeDenseEmbedding(text: string, dimensions = 256): number[] {
  const vector = new Array(dimensions).fill(0);
  const normalized = text.toLowerCase().replace(/[^a-z0-9_\s]/g, " ");
  const tokens = normalized
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));

  if (tokens.length === 0) return vector;

  // 1. Unigram and bigram subword feature hashing
  for (let i = 0; i < tokens.length; i++) {
    const unigram = tokens[i];
    const hash1 = Math.abs(crc32(unigram)) % dimensions;
    vector[hash1] += 1.0;

    // Substring 3-gram hashing for spelling/morphological capture
    if (unigram.length >= 3) {
      for (let s = 0; s <= unigram.length - 3; s++) {
        const tri = unigram.substring(s, s + 3);
        const subHash = Math.abs(crc32(tri)) % dimensions;
        vector[subHash] += 0.35;
      }
    }

    if (i < tokens.length - 1) {
      const bigram = `${unigram}_${tokens[i + 1]}`;
      const hash2 = Math.abs(crc32(bigram)) % dimensions;
      vector[hash2] += 1.5;
    }
  }

  // 2. L2 Normalization (Unit Length) for Cosine Similarity
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vector[i] /= norm;
    }
  }

  return vector;
}

function crc32(str: string): number {
  let crc = -1;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ code) & 0xff];
  }
  return crc ^ -1;
}

const CRC_TABLE = new Int32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c;
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return Math.max(0, Math.min(1, dotProduct));
}

// Lexical BM25 / Keyword Score for exact identifier & code matching
export function computeLexicalScore(query: string, documentText: string): number {
  const queryTerms = query
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
  if (queryTerms.length === 0) return 0;

  const docLower = documentText.toLowerCase();
  let matches = 0;
  for (const term of queryTerms) {
    if (docLower.includes(term)) {
      matches += 1;
      // Bonus if matched as a whole word
      const wordRegex = new RegExp(`\\b${term}\\b`, "i");
      if (wordRegex.test(documentText)) {
        matches += 0.5;
      }
    }
  }
  return Math.min(1, matches / queryTerms.length);
}

// ==========================================
// Cached URL-Based RAG Engine
// ==========================================

export class CachedLinkRAGEngine {
  private cacheDir: string;
  private pagesDir: string;
  private embeddingCacheFile: string;
  private answersCacheFile: string;

  private ttlMs: number;
  private indexVersion: number = 1;
  private indexedChunks: IndexedChunk[] = [];
  private sources: Map<string, RAGSourceConfig> = new Map();

  // In-Memory Caches
  private embeddingCache: Map<string, number[]> = new Map();
  private retrievalCache: Map<string, RetrievalResult[]> = new Map();
  private answerCache: Map<string, AnswerCacheEntry> = new Map();

  // Gemini Client (Optional)
  private aiClient: any = null;
  private allowLocalhost: boolean = false;

  constructor(options: { cacheDir?: string; ttlMs?: number; aiClient?: any; allowLocalhost?: boolean } = {}) {
    this.cacheDir = options.cacheDir || path.join(process.cwd(), ".rag_cache");
    this.pagesDir = path.join(this.cacheDir, "pages");
    this.embeddingCacheFile = path.join(this.cacheDir, "embeddings.json");
    this.answersCacheFile = path.join(this.cacheDir, "answers.json");
    this.ttlMs = options.ttlMs || 60 * 60 * 1000; // 1 hour TTL
    this.aiClient = options.aiClient || null;
    this.allowLocalhost = options.allowLocalhost ?? false;

    this.initStorage();
  }

  public setAIClient(ai: any) {
    this.aiClient = ai;
  }

  private initStorage() {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
      if (!fs.existsSync(this.pagesDir)) {
        fs.mkdirSync(this.pagesDir, { recursive: true });
      }

      // Load Embedding Cache from Disk
      if (fs.existsSync(this.embeddingCacheFile)) {
        const raw = fs.readFileSync(this.embeddingCacheFile, "utf8");
        const parsed = JSON.parse(raw);
        for (const [k, v] of Object.entries(parsed)) {
          if (Array.isArray(v)) this.embeddingCache.set(k, v as number[]);
        }
      }

      // Load Answer Cache from Disk
      if (fs.existsSync(this.answersCacheFile)) {
        const raw = fs.readFileSync(this.answersCacheFile, "utf8");
        const parsed = JSON.parse(raw);
        const now = Date.now();
        for (const [k, v] of Object.entries(parsed)) {
          const entry = v as AnswerCacheEntry;
          if (entry.expiresAt > now) {
            this.answerCache.set(k, entry);
          }
        }
      }
    } catch (err) {
      console.warn("[RAG] Cache storage initialization warning:", err);
    }
  }

  private saveEmbeddingCache() {
    try {
      const obj: Record<string, number[]> = {};
      for (const [k, v] of this.embeddingCache.entries()) {
        obj[k] = v;
      }
      fs.writeFileSync(this.embeddingCacheFile, JSON.stringify(obj), "utf8");
    } catch (err) {
      console.warn("[RAG] Failed to save embedding cache:", err);
    }
  }

  private saveAnswerCache() {
    try {
      const obj: Record<string, AnswerCacheEntry> = {};
      const now = Date.now();
      for (const [k, v] of this.answerCache.entries()) {
        if (v.expiresAt > now) obj[k] = v;
      }
      fs.writeFileSync(this.answersCacheFile, JSON.stringify(obj), "utf8");
    } catch (err) {
      console.warn("[RAG] Failed to save answer cache:", err);
    }
  }

  // ==========================================
  // Layer A: URL Ingestion with Caching & Stale Fallback
  // ==========================================

  public async ingestUrl(
    targetUrl: string,
    forceRefresh = false
  ): Promise<{ page: PageCacheEntry; isCacheHit: boolean; fetchTimeMs: number }> {
    const startTime = Date.now();
    const urlHash = crypto.createHash("sha256").update(targetUrl).digest("hex");
    const pageCachePath = path.join(this.pagesDir, `${urlHash}.json`);

    let existingPage: PageCacheEntry | null = null;
    if (fs.existsSync(pageCachePath)) {
      try {
        existingPage = JSON.parse(fs.readFileSync(pageCachePath, "utf8"));
      } catch (err) {
        console.warn(`[RAG] Error reading cached page for ${targetUrl}:`, err);
      }
    }

    const now = Date.now();
    // Cache Hit: if not force-refreshed and still within TTL
    if (!forceRefresh && existingPage && existingPage.expiresAt > now) {
      return { page: existingPage, isCacheHit: true, fetchTimeMs: Date.now() - startTime };
    }

    // Refresh needed: Make conditional HTTP request if ETag or Last-Modified exists
    try {
      const fetchRes = await safeFetch(targetUrl, {
        etag: existingPage?.etag,
        lastModified: existingPage?.lastModified,
        timeoutMs: 6000,
        allowLocalhost: this.allowLocalhost,
      });

      // 304 Not Modified: Reuse cached content and update TTL
      if (fetchRes.status === 304 && existingPage) {
        existingPage.fetchedAt = now;
        existingPage.expiresAt = now + this.ttlMs;
        existingPage.isStale = false;
        fs.writeFileSync(pageCachePath, JSON.stringify(existingPage), "utf8");
        return { page: existingPage, isCacheHit: true, fetchTimeMs: Date.now() - startTime };
      }

      // Successful 200 response: Extract, clean, and store
      if (fetchRes.status === 200 && fetchRes.content) {
        const { title, cleanText } = cleanAndExtractContent(fetchRes.content, targetUrl);
        const contentHash = crypto.createHash("sha256").update(cleanText).digest("hex");

        const isContentUnchanged = existingPage && existingPage.contentHash === contentHash;

        const newPage: PageCacheEntry = {
          url: targetUrl,
          title,
          content: cleanText,
          contentHash,
          etag: fetchRes.etag,
          lastModified: fetchRes.lastModified,
          fetchedAt: now,
          expiresAt: now + this.ttlMs,
          isStale: false,
        };

        fs.writeFileSync(pageCachePath, JSON.stringify(newPage), "utf8");

        // Re-index only if content actually changed or hasn't been indexed
        if (!isContentUnchanged) {
          await this.indexPage(newPage);
        }

        return { page: newPage, isCacheHit: false, fetchTimeMs: Date.now() - startTime };
      }

      throw new Error(`HTTP Error ${fetchRes.status}`);
    } catch (fetchErr: any) {
      // Failure Handling: If previous cached copy exists, use it as a valid stale copy
      if (existingPage) {
        console.warn(`[RAG] Refresh failed for ${targetUrl} (${fetchErr.message}). Using valid stale cached copy.`);
        existingPage.isStale = true;
        return { page: existingPage, isCacheHit: true, fetchTimeMs: Date.now() - startTime };
      }
      throw fetchErr;
    }
  }

  // ==========================================
  // Layer B: Chunking & Embedding Generation
  // ==========================================

  private async indexPage(page: PageCacheEntry) {
    const chunks = chunkTextWithStructure(page.content, { url: page.url, title: page.title });

    // Remove existing chunks for this URL from the index
    this.indexedChunks = this.indexedChunks.filter((ic) => ic.chunk.url !== page.url);

    let newEmbeddingsGenerated = 0;

    for (const chunk of chunks) {
      // Embedding cache key: hash(normalizedText + ":v1_256")
      const embedKey = `${chunk.contentHash}:dense_v1_256`;
      let vector = this.embeddingCache.get(embedKey);

      if (!vector) {
        vector = computeDenseEmbedding(chunk.text, 256);
        this.embeddingCache.set(embedKey, vector);
        newEmbeddingsGenerated++;
      }

      this.indexedChunks.push({ chunk, embedding: vector });
    }

    if (newEmbeddingsGenerated > 0) {
      this.saveEmbeddingCache();
    }

    // Invalidate retrieval cache because underlying content changed!
    this.indexVersion++;
    this.retrievalCache.clear();

    this.sources.set(page.url, {
      url: page.url,
      title: page.title,
      lastFetchedAt: page.fetchedAt,
      etag: page.etag,
      lastModified: page.lastModified,
      isStale: page.isStale,
    });
  }

  public async indexDirectDocument(id: string, title: string, text: string) {
    const contentHash = crypto.createHash("sha256").update(text).digest("hex");
    const entry: PageCacheEntry = {
      url: id,
      title,
      content: text,
      contentHash,
      fetchedAt: Date.now(),
      expiresAt: Date.now() + this.ttlMs,
      isStale: false,
    };
    await this.indexPage(entry);
  }

  // ==========================================
  // Layer C: Hybrid Semantic + Lexical Retrieval
  // ==========================================

  public retrieve(
    query: string,
    topK = 4,
    threshold = 0.15
  ): { results: RetrievalResult[]; isCacheHit: boolean; retrievalTimeMs: number } {
    const startTime = Date.now();
    const normalizedQuery = query.toLowerCase().trim();
    const cacheKey = `${crypto.createHash("md5").update(normalizedQuery).digest("hex")}_v${this.indexVersion}_k${topK}_t${threshold}`;

    if (this.retrievalCache.has(cacheKey)) {
      return {
        results: this.retrievalCache.get(cacheKey)!,
        isCacheHit: true,
        retrievalTimeMs: Date.now() - startTime,
      };
    }

    if (this.indexedChunks.length === 0) {
      return { results: [], isCacheHit: false, retrievalTimeMs: Date.now() - startTime };
    }

    const queryEmbedding = computeDenseEmbedding(query, 256);

    const scoredResults: RetrievalResult[] = [];
    for (const item of this.indexedChunks) {
      const semanticScore = cosineSimilarity(queryEmbedding, item.embedding);
      const lexicalScore = computeLexicalScore(query, item.chunk.text);

      // Hybrid combination: 65% dense semantic, 35% lexical keyword
      const combinedScore = 0.65 * semanticScore + 0.35 * lexicalScore;

      if (combinedScore >= threshold) {
        scoredResults.push({
          chunk: item.chunk,
          semanticScore,
          lexicalScore,
          combinedScore,
          citationUrl: item.chunk.url,
        });
      }
    }

    // Sort descending by combined score
    scoredResults.sort((a, b) => b.combinedScore - a.combinedScore);
    const topResults = scoredResults.slice(0, topK);

    this.retrievalCache.set(cacheKey, topResults);
    return { results: topResults, isCacheHit: false, retrievalTimeMs: Date.now() - startTime };
  }

  // ==========================================
  // Layer D: Answer Generation with Answer Caching
  // ==========================================

  public async answerQuestion(
    question: string,
    history: { role: string; content: string }[] = [],
    configuredUrls: string[] = []
  ): Promise<RAGAnswer> {
    const totalStart = Date.now();

    // 1. Detect any URLs in the question or ensure configured URLs are ingested
    const detectedUrls = extractUrlsFromText(question);
    const allUrlsToEnsure = Array.from(new Set([...configuredUrls, ...detectedUrls]));

    let urlCacheHit = true;
    let maxUrlFetchTime = 0;
    let isStale = false;

    for (const u of allUrlsToEnsure) {
      try {
        const res = await this.ingestUrl(u);
        if (!res.isCacheHit) urlCacheHit = false;
        if (res.page.isStale) isStale = true;
        maxUrlFetchTime = Math.max(maxUrlFetchTime, res.fetchTimeMs);
      } catch (err: any) {
        console.warn(`[RAG] Ingestion warning for URL ${u}:`, err.message);
      }
    }

    // 2. Answer Cache Lookup (Considers Question + Conversation Context + Knowledge Version)
    const contextHistoryText = (history || [])
      .slice(-3)
      .map((h) => `${h.role}:${h.content.trim()}`)
      .join("|");
    const contextHash = crypto.createHash("sha256").update(contextHistoryText).digest("hex").slice(0, 16);
    const normalizedQ = question.toLowerCase().trim();
    const answerCacheKey = `${crypto.createHash("sha256").update(normalizedQ).digest("hex")}_ctx${contextHash}_v${this.indexVersion}`;

    const cachedAnswer = this.answerCache.get(answerCacheKey);
    if (cachedAnswer && cachedAnswer.expiresAt > Date.now()) {
      return {
        answer: cachedAnswer.answer,
        sources: cachedAnswer.sources,
        retrievals: cachedAnswer.retrievals,
        metrics: {
          urlCacheHit,
          urlFetchMs: maxUrlFetchTime,
          embeddingCacheHits: this.indexedChunks.length,
          embeddingCacheMisses: 0,
          embeddingGenMs: 0,
          retrievalCacheHit: true,
          retrievalMs: 0,
          answerCacheHit: true,
          generationMs: 0,
          totalLatencyMs: Date.now() - totalStart,
          sourcesIndexed: this.sources.size,
          chunksIndexed: this.indexedChunks.length,
          indexVersion: this.indexVersion,
          isStale,
        },
      };
    }

    // 3. Retrieval (Top 3 relevant chunks)
    const retrievalRes = this.retrieve(question, 3, 0.18);
    const relevantChunks = retrievalRes.results;

    // Collect citations
    const sourcesMap = new Map<string, string>();
    for (const r of relevantChunks) {
      sourcesMap.set(r.chunk.url, r.chunk.title);
    }
    const sources = Array.from(sourcesMap.entries()).map(([url, title]) => ({ title, url }));

    // 4. Generate Answer (via Gemini LLM or Grounded Synthesizer)
    const genStart = Date.now();
    let answerText = "";

    if (this.aiClient) {
      try {
        const evidenceText = relevantChunks
          .map((r, i) => `[Evidence ${i + 1} | ${r.chunk.title} (${r.chunk.url})]\n${r.chunk.text}`)
          .join("\n\n");

        const prompt = `You are a direct, concise technical assistant.

SOURCE EVIDENCE (Top 3 Relevant Chunks):
${evidenceText || "No relevant external evidence found."}

CONVERSATION CONTEXT:
${(history || []).slice(-3).map((h) => `${h.role}: ${h.content}`).join("\n")}

USER QUESTION:
${question}

STRICT ANSWER RULES:
1. Answer the exact question directly in the very first sentence.
2. CODE-FIRST POLICY: If the user requests code or implementation, provide complete, runnable code FIRST in a markdown code block, followed by a brief 1-2 sentence explanation. Never omit requested code.
3. CONCISENESS: For simple questions, answer directly in 2 to 5 sentences. For technical explanations, use concise bullet points. Expand only when explicitly requested.
4. Do NOT repeat portfolio background, greetings, or entire retrieved documents.
5. If information is unavailable or unsupported by the evidence, state what is unknown briefly in 1 sentence. Do not invent facts.
6. Provide markdown source links [Title](URL) for citations.`;

        const isCode = isCodeRequest(question);
        let response;
        try {
          response = await this.aiClient.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              temperature: 0.2,
              maxOutputTokens: isCode ? 600 : 350,
            },
          });
        } catch (firstErr) {
          response = await this.aiClient.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              temperature: 0.2,
              maxOutputTokens: isCode ? 600 : 350,
            },
          });
        }

        if (response && response.text) {
          answerText = response.text.trim();
        }
      } catch (llmErr) {
        console.warn("[RAG] LLM generation failed, falling back to deterministic synthesizer:", llmErr);
      }
    }

    // Deterministic High-Quality Fallback Synthesizer if no Gemini or LLM failed
    if (!answerText) {
      answerText = this.synthesizeDeterministicAnswer(question, relevantChunks, isStale);
    }

    const genTime = Date.now() - genStart;

    // 5. Store in Answer Cache (Do not cache empty answers or low-confidence errors)
    if (answerText && answerText.length > 20 && !answerText.startsWith("Error")) {
      const answerEntry: AnswerCacheEntry = {
        answer: answerText,
        sources,
        retrievals: relevantChunks,
        timestamp: Date.now(),
        expiresAt: Date.now() + 30 * 60 * 1000, // 30 mins
      };
      this.answerCache.set(answerCacheKey, answerEntry);
      this.saveAnswerCache();
    }

    return {
      answer: answerText,
      sources,
      retrievals: relevantChunks,
      metrics: {
        urlCacheHit,
        urlFetchMs: maxUrlFetchTime,
        embeddingCacheHits: this.indexedChunks.length,
        embeddingCacheMisses: 0,
        embeddingGenMs: 0,
        retrievalCacheHit: retrievalRes.isCacheHit,
        retrievalMs: retrievalRes.retrievalTimeMs,
        answerCacheHit: false,
        generationMs: genTime,
        totalLatencyMs: Date.now() - totalStart,
        sourcesIndexed: this.sources.size,
        chunksIndexed: this.indexedChunks.length,
        indexVersion: this.indexVersion,
        isStale,
      },
    };
  }

  // Deterministic Synthesizer with Clear Citations
  public synthesizeDeterministicAnswer(
    question: string,
    chunks: RetrievalResult[],
    isStale: boolean
  ): string {
    if (isCodeRequest(question)) {
      const snippet = generateCodeSnippet(question);
      if (snippet) {
        return formatCodeFirstResponse(snippet.code, snippet.language, snippet.explanation);
      }
    }

    if (chunks.length === 0) {
      return "Based on the configured sources, I could not find verifiable information to answer your question. Could you clarify what specific topic or source URL you would like me to inspect?";
    }

    const topChunk = chunks[0];
    const cleanExcerpt = topChunk.chunk.text
      .replace(/^\[Source:.*?\]\s*\[Section:.*?\]\s*/, "")
      .replace(/\n+/g, " ")
      .substring(0, 420);

    const staleNotice = isStale ? "\n\n*(Note: Sourced from a cached copy as the upstream URL is temporarily unreachable)*" : "";

    return `${cleanExcerpt}...\n\n**Source Citation:** [${topChunk.chunk.title}](${topChunk.chunk.url})${staleNotice}`;
  }

  // Clear or Invalidate Cache
  public invalidateAll() {
    this.indexVersion++;
    this.retrievalCache.clear();
    this.answerCache.clear();
    this.indexedChunks = [];
    this.sources.clear();
  }

  public getStats() {
    return {
      sourcesCount: this.sources.size,
      chunksCount: this.indexedChunks.length,
      embeddingCacheSize: this.embeddingCache.size,
      answerCacheSize: this.answerCache.size,
      indexVersion: this.indexVersion,
    };
  }
}

// Utility: Extract URLs from query text
export function extractUrlsFromText(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s"'<>()[\]{}]+)/gi;
  const matches = text.match(urlRegex) || [];
  return matches.map((u) => u.replace(/[.,;!?)]+$/, ""));
}

// Query Classification Helpers
export function isCodeRequest(text: string): boolean {
  const t = text.toLowerCase().trim();

  // Inquiries about codebases, repositories, projects, or system architecture are NOT code generation requests
  if (
    /\b(codebase|code base|repo|repository|repositories|architecture|overview|explain|tell me about|how was|project|system|model|file|files)\b/i.test(t) &&
    !/\b(write|generate|give me code|code snippet|runnable code|sample code|example code)\b/i.test(t)
  ) {
    return false;
  }

  // Portfolio, RAG Teaching Assistant, and personal credential questions are never algorithmic code requests
  if (
    /\b(rag|teaching assistant|umesh|cgpa|silicon|internship|hackathon|spec2model|algo arena|sentiment)\b/i.test(t) &&
    !/\b(write a|implement a function|write python|write code|code snippet for)\b/i.test(t)
  ) {
    return false;
  }

  // Conceptual and architectural inquiries without explicit request to write code
  if (
    /^(what is|what are|explain|difference between|why is|why does|how does|compare|tell me|describe|overview)\b/i.test(t) &&
    !/\b(write|generate|give me code|code snippet)\b/i.test(t)
  ) {
    return false;
  }

  return (
    /\b(write|generate|give me|show me)\s+(a\s+)?(code|function|script|snippet|program|implementation)\b/i.test(t) ||
    /\b(how to\s+(code|write|program|implement|create))\b/i.test(t) ||
    /\b(code\s+(for|to|snippet|example|sample))\b/i.test(t) ||
    /\b(reverse string|reverse array|binary search|debounce|throttle|fibonacci|two sum|quicksort|merge sort|linked list|bfs|dfs|palindrome|factorial)\b/i.test(t) ||
    t.startsWith("how to write") ||
    t.startsWith("write a") ||
    t.startsWith("how to implement") ||
    t.startsWith("give me code") ||
    t.startsWith("show code") ||
    t.startsWith("sample code") ||
    t.startsWith("example code")
  );
}

export function isPortfolioQuery(text: string): boolean {
  const t = text.toLowerCase().trim();
  return (
    /\b(umesh|sahoo|portfolio|resume|cv|silicon university|panikoili|jnv)\b/i.test(t) ||
    /\b(9\.60?|cgpa|gpa|grades?|marks?|btech|degree|college|school)\b/i.test(t) ||
    /\b(intern|internship|internships|ingenious|syllogistick)\b/i.test(t) ||
    /\b(spec2model|algo arena|pwc|hackathon|runner up)\b/i.test(t) ||
    /\b(rag|teaching assistant|sentiment analysis|bigru|classifier|codebase|code base)\b/i.test(t) ||
    /\b(who are you|who made this|who created|about yourself|your background|contact|hire|email|linkedin)\b/i.test(t) ||
    (t.includes("your") && (t.includes("project") || t.includes("skill") || t.includes("experience") || t.includes("repo") || t.includes("work") || t.includes("code")))
  );
}

export function isSourceQuery(text: string): boolean {
  const t = text.toLowerCase().trim();
  const urls = extractUrlsFromText(text);
  return (
    urls.length > 0 ||
    t.includes("http") ||
    t.includes("url") ||
    t.includes("readme") ||
    t.includes("doc") ||
    t.includes("documentation") ||
    t.includes("configured link") ||
    t.includes("source link") ||
    t.startsWith("check ")
  );
}

export function formatCodeFirstResponse(code: string, language: string, explanation: string): string {
  return "```" + language + "\n" + code.trim() + "\n```\n\n" + explanation.trim();
}

export function generateCodeSnippet(query: string): { code: string; explanation: string; language: string } | null {
  const q = query.toLowerCase();

  // Detect language
  let lang = "python";
  if (q.includes("typescript") || q.includes(" ts ")) lang = "typescript";
  else if (q.includes("javascript") || q.includes(" js ") || q.includes("node")) lang = "javascript";
  else if (q.includes("go") || q.includes("golang")) lang = "go";
  else if (q.includes("c++") || q.includes("cpp")) lang = "cpp";
  else if (q.includes("rust")) lang = "rust";
  else if (q.includes("python") || q.includes("py")) lang = "python";

  // 1. Reverse String / Array
  if (q.includes("reverse") && (q.includes("string") || q.includes("word") || q.includes("str"))) {
    if (lang === "javascript" || lang === "typescript") {
      return {
        language: lang,
        code: `function reverseString(str: string): string {\n  return str.split("").reverse().join("");\n}\n\n// Example:\n// console.log(reverseString("hello")); // "olleh"`,
        explanation: "Splits the string into an array of characters, reverses the array in-place, and joins the elements back into a new string in O(n) time.",
      };
    }
    return {
      language: "python",
      code: `def reverse_string(s: str) -> str:\n    """Reverses a string using slicing."""\n    return s[::-1]\n\n# Example:\n# print(reverse_string("hello"))  # "olleh"`,
      explanation: "Python's extended slice syntax `[::-1]` traverses the sequence backward with a step of -1, producing a reversed string in O(n) time.",
    };
  }

  // 2. Binary Search
  if (q.includes("binary search") || (q.includes("search") && q.includes("sorted"))) {
    if (lang === "javascript" || lang === "typescript") {
      return {
        language: lang,
        code: `function binarySearch(arr: number[], target: number): number {\n  let left = 0;\n  let right = arr.length - 1;\n\n  while (left <= right) {\n    const mid = Math.floor(left + (right - left) / 2);\n    if (arr[mid] === target) return mid;\n    if (arr[mid] < target) left = mid + 1;\n    else right = mid - 1;\n  }\n  return -1; // Target not found\n}\n\n// Example: binarySearch([1, 3, 5, 7, 9], 7) -> 3`,
        explanation: "Binary search halves the search range at each step, operating in O(log n) time and O(1) auxiliary space.",
      };
    }
    return {
      language: "python",
      code: `def binary_search(arr: list[int], target: int) -> int:\n    """Performs binary search on a sorted array. Returns index or -1."""\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1\n\n# Example: binary_search([1, 3, 5, 7, 9], 7) -> 3`,
      explanation: "Divides the sorted search interval in half during each iteration, achieving O(log n) time complexity and O(1) auxiliary space.",
    };
  }

  // 3. Debounce
  if (q.includes("debounce")) {
    return {
      language: lang === "python" ? "python" : "typescript",
      code: lang === "python"
        ? `import time\nfrom functools import wraps\n\ndef debounce(wait_seconds: float):\n    """Decorator that delays invoking func until wait_seconds have elapsed."""\n    def decorator(fn):\n        last_called = [0.0]\n        @wraps(fn)\n        def debounced(*args, **kwargs):\n            now = time.time()\n            if now - last_called[0] >= wait_seconds:\n                last_called[0] = now\n                return fn(*args, **kwargs)\n        return debounced\n    return decorator`
        : `function debounce<T extends (...args: any[]) => any>(\n  fn: T,\n  delayMs: number = 300\n): (...args: Parameters<T>) => void {\n  let timerId: ReturnType<typeof setTimeout> | null = null;\n\n  return function (...args: Parameters<T>) {\n    if (timerId) clearTimeout(timerId);\n    timerId = setTimeout(() => fn(...args), delayMs);\n  };\n}`,
      explanation: "Cancels the active timer on each rapid invocation and only triggers the callback after the specified delay elapses without new calls.",
    };
  }

  // 4. Two Sum
  if (q.includes("two sum") || (q.includes("sum") && q.includes("target"))) {
    if (lang === "javascript" || lang === "typescript") {
      return {
        language: lang,
        code: `function twoSum(nums: number[], target: number): [number, number] | null {\n  const seen = new Map<number, number>();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (seen.has(complement)) {\n      return [seen.get(complement)!, i];\n    }\n    seen.set(nums[i], i);\n  }\n  return null;\n}`,
        explanation: "Uses a hash map to look up the required complement for each element in O(1) average time, achieving an overall O(n) runtime.",
      };
    }
    return {
      language: "python",
      code: `def two_sum(nums: list[int], target: int) -> list[int]:\n    """Finds two indices such that nums[i] + nums[j] == target."""\n    seen = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in seen:\n            return [seen[complement], i]\n        seen[num] = i\n    return []\n\n# Example: two_sum([2, 7, 11, 15], 9) -> [0, 1]`,
      explanation: "Uses a dictionary to store visited values and their indices, checking for the target complement in O(n) time and O(n) space.",
    };
  }

  // 5. Fibonacci
  if (q.includes("fibonacci") || q.includes("fib")) {
    if (lang === "javascript" || lang === "typescript") {
      return {
        language: lang,
        code: `function fibonacci(n: number): number {\n  if (n <= 1) return n;\n  let prev = 0, curr = 1;\n  for (let i = 2; i <= n; i++) {\n    const next = prev + curr;\n    prev = curr;\n    curr = next;\n  }\n  return curr;\n}\n\n// Example: fibonacci(10) -> 55`,
        explanation: "Iteratively computes the nth Fibonacci number in O(n) time using only two variables for O(1) memory.",
      };
    }
    return {
      language: "python",
      code: `def fibonacci(n: int) -> int:\n    """Returns the nth Fibonacci number iteratively in O(n) time and O(1) space."""\n    if n <= 1:\n        return n\n    a, b = 0, 1\n    for _ in range(2, n + 1):\n        a, b = b, a + b\n    return b\n\n# Example: fibonacci(10) -> 55`,
      explanation: "Computes the Fibonacci number in O(n) time and O(1) space by tracking the last two values in a simple loop.",
    };
  }

  // 6. Quicksort
  if (q.includes("quicksort") || q.includes("quick sort")) {
    return {
      language: "python",
      code: `def quicksort(arr: list[int]) -> list[int]:\n    """Quicksort using list comprehension."""\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    middle = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quicksort(left) + middle + quicksort(right)\n\n# Example: quicksort([3, 6, 8, 10, 1, 2, 1]) -> [1, 1, 2, 3, 6, 8, 10]`,
      explanation: "Quicksort partitions the array around a pivot into smaller and larger elements, running in O(n log n) expected time.",
    };
  }

  // 7. Palindrome Check
  if (q.includes("palindrome")) {
    return {
      language: "python",
      code: `def is_palindrome(s: str) -> bool:\n    """Checks whether a string is a palindrome, ignoring non-alphanumeric chars."""\n    clean = "".join(c.lower() for c in s if c.isalnum())\n    return clean == clean[::-1]\n\n# Example: is_palindrome("A man, a plan, a canal: Panama") -> True`,
      explanation: "Filters the string to lowercase alphanumeric characters and checks if it equals its reverse in O(n) time.",
    };
  }

  // 8. Factorial
  if (q.includes("factorial")) {
    return {
      language: "python",
      code: `def factorial(n: int) -> int:\n    """Computes factorial iteratively to prevent recursion limit errors."""\n    if n < 0:\n        raise ValueError("Factorial is not defined for negative numbers.")\n    result = 1\n    for i in range(2, n + 1):\n        result *= i\n    return result\n\n# Example: factorial(5) -> 120`,
      explanation: "Calculates n! iteratively in O(n) time and O(1) space, avoiding recursion depth limits.",
    };
  }

  // 9. Fetch API / HTTP Request
  if (q.includes("fetch") || q.includes("http get") || q.includes("api request")) {
    return {
      language: "typescript",
      code: `async function fetchData<T>(url: string): Promise<T> {\n  const response = await fetch(url, {\n    headers: { "Accept": "application/json" },\n  });\n  if (!response.ok) {\n    throw new Error(\`HTTP error! status: \${response.status}\`);\n  }\n  return (await response.json()) as T;\n}`,
      explanation: "Fetches JSON data asynchronously with HTTP status validation and TypeScript generic typing.",
    };
  }

  // 10. RAG Audio Chunking & Transcription (From Teaching_assistant-rag-based- codebase)
  if (q.includes("chunk") || q.includes("whisper") || q.includes("transcribe")) {
    return {
      language: "python",
      code: `import whisper\nimport json\nimport os\n\n# Load OpenAI Whisper large-v2 for accurate speech transcription\nmodel = whisper.load_model("large-v2")\n\ndef transcribe_and_chunk(audio_path: str, output_json: str):\n    """Transcribes audio and produces timestamped JSON chunks."""\n    result = model.transcribe(audio_path, language="hi", task="translate")\n    chunks = []\n    for segment in result["segments"]:\n        chunks.append({\n            "start": segment["start"],\n            "end": segment["end"],\n            "text": segment["text"].strip()\n        })\n    with open(output_json, "w") as f:\n        json.dump({"chunks": chunks, "full_text": result["text"]}, f, indent=4)\n    return chunks`,
      explanation: "Transcribes audio files using OpenAI's Whisper large-v2 model and generates structured time-indexed segments for semantic vector retrieval.",
    };
  }

  // 11. Cosine Similarity Vector Retrieval (From Teaching_assistant-rag-based- codebase)
  if (q.includes("cosine") || q.includes("vector search") || q.includes("similarity")) {
    return {
      language: "python",
      code: `import numpy as np\nfrom sklearn.metrics.pairwise import cosine_similarity\n\ndef retrieve_best_chunk(query_embedding: np.ndarray, doc_embeddings: np.ndarray, chunks: list[dict], threshold: float = 0.60):\n    """Performs cosine similarity search against indexed document chunks."""\n    query_vec = query_embedding.reshape(1, -1)\n    scores = cosine_similarity(query_vec, doc_embeddings)[0]\n    best_idx = int(np.argmax(scores))\n    \n    if scores[best_idx] >= threshold:\n        return {"chunk": chunks[best_idx], "score": float(scores[best_idx])}\n    return None`,
      explanation: "Computes cosine similarity between a dense query embedding and pre-indexed chunk vectors, returning the top match exceeding the similarity threshold.",
    };
  }

  return null;
}

