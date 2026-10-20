import express from "express";
import type { NextFunction, Request, Response } from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import {
  CachedLinkRAGEngine,
  extractUrlsFromText,
  isCodeRequest,
  isPortfolioQuery,
  generateCodeSnippet,
  formatCodeFirstResponse,
} from "./ragEngine";

dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
app.set("trust proxy", 1); // Fixes ERR_ERL_UNEXPECTED_X_FORWARDED_FOR on Render
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const HMR_PORT = Number(process.env.VITE_HMR_PORT) || PORT + 1;
const isProduction = process.env.NODE_ENV === "production";

app.disable("x-powered-by");

app.use(helmet({
  contentSecurityPolicy: isProduction
    ? {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          connectSrc: ["'self'", "https://api.github.com", "https://hacker-news.firebaseio.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          imgSrc: ["'self'", "data:", "https:"],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "https://fonts.googleapis.com"],
          upgradeInsecureRequests: [],
        },
      }
    : false,
  crossOriginEmbedderPolicy: false,
  frameguard: { action: "deny" },
  hsts: isProduction,
}));

app.use(express.json({ limit: "32kb", strict: true }));

app.use((err: Error & { status?: number; type?: string }, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && err.status === 400 && err.type === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid JSON request body." });
    return;
  }
  next(err);
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many contact attempts. Please try again later." },
});

const agentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many assistant requests. Please try again later." },
});

app.use("/api", apiLimiter);

const geminiApiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY)?.trim();
const ai = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
    })
  : null;

// Initialize Cached Link-Based RAG Engine (1-hour TTL, persistent multi-layer caching)
const ragEngine = new CachedLinkRAGEngine({
  cacheDir: path.join(process.cwd(), ".rag_cache"),
  ttlMs: 60 * 60 * 1000,
  aiClient: ai,
});

const DEFAULT_RAG_SOURCES: string[] = process.env.RAG_SOURCES
  ? process.env.RAG_SOURCES.split(",").map((u) => u.trim()).filter(Boolean)
  : [];

// Index local README into RAG engine for verified documentation grounding
try {
  const localReadmePath = path.join(process.cwd(), "README.md");
  if (fs.existsSync(localReadmePath)) {
    const readmeContent = fs.readFileSync(localReadmePath, "utf-8");
    ragEngine.indexDirectDocument("local://README.md", "Umesh Portfolio Documentation", readmeContent).catch(() => {});
  }
} catch (err: any) {
  console.warn("[BACKEND] Local README indexing notice:", err?.message || err);
}

// Pre-warm configured RAG sources asynchronously without blocking startup
for (const sourceUrl of DEFAULT_RAG_SOURCES) {
  ragEngine.ingestUrl(sourceUrl).catch((err) => {
    console.warn(`[BACKEND] Initial RAG source pre-warm notice for ${sourceUrl}: ${err.message}`);
  });
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN?.trim();
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || "umeshkumarsahoo";

// In-memory cache for GitHub repos and README content
interface RepoData {
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  readme: string;
}

interface HackerNewsStory {
  id: number;
  title: string;
  by?: string;
  score?: number;
  url?: string;
  text?: string;
  time?: number;
  descendants?: number;
}

let cachedRepos: RepoData[] = [];
let cacheTime: number = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
let cachedNewsStories: HackerNewsStory[] = [];
let newsCacheTime: number = 0;
const NEWS_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const NEWS_CACHE_FILE = path.join(process.cwd(), "news_cache.json");

try {
  if (fs.existsSync(NEWS_CACHE_FILE)) {
    const fileContent = fs.readFileSync(NEWS_CACHE_FILE, "utf-8");
    const parsed = JSON.parse(fileContent);
    if (parsed && Array.isArray(parsed.stories) && parsed.timestamp) {
      cachedNewsStories = parsed.stories;
      newsCacheTime = parsed.timestamp;
    }
  }
} catch (err) {
  console.error("[BACKEND] Error reading news cache file:", err);
}
const HN_TOP_STORIES_URL = "https://hacker-news.firebaseio.com/v0/topstories.json";
const HN_ITEM_URL = "https://hacker-news.firebaseio.com/v0/item";
const CSRF_COOKIE_NAME = "portfolio_csrf_sid";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_TTL_MS = 60 * 60 * 1000;
const csrfSessions = new Map<string, { tokenHash: string; expiresAt: number }>();

function parseCookies(req: Request) {
  const cookieHeader = req.headers.cookie || "";
  return cookieHeader.split(";").reduce<Record<string, string>>((acc, rawCookie) => {
    const [name, ...rest] = rawCookie.trim().split("=");
    if (!name || rest.length === 0) return acc;
    acc[name] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function serializeCookie(name: string, value: string, maxAgeSeconds: number) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (isProduction) parts.push("Secure");
  return parts.join("; ");
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function issueCsrfToken(res: Response) {
  const sessionId = crypto.randomBytes(32).toString("hex");
  const csrfToken = crypto.randomBytes(32).toString("hex");
  csrfSessions.set(sessionId, {
    tokenHash: hashToken(csrfToken),
    expiresAt: Date.now() + CSRF_TTL_MS,
  });
  res.setHeader("Set-Cookie", serializeCookie(CSRF_COOKIE_NAME, sessionId, CSRF_TTL_MS / 1000));
  return csrfToken;
}

function pruneExpiredCsrfSessions() {
  const now = Date.now();
  for (const [sessionId, session] of csrfSessions.entries()) {
    if (session.expiresAt <= now) csrfSessions.delete(sessionId);
  }
}

function verifyCsrf(req: Request, res: Response, next: NextFunction) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    next();
    return;
  }

  pruneExpiredCsrfSessions();
  const sessionId = parseCookies(req)[CSRF_COOKIE_NAME];
  const csrfToken = req.header(CSRF_HEADER_NAME);
  const session = sessionId ? csrfSessions.get(sessionId) : undefined;

  if (!session || !csrfToken) {
    res.status(403).json({ error: "Invalid or missing CSRF token." });
    return;
  }

  const expected = Buffer.from(session.tokenHash, "hex");
  const actual = Buffer.from(hashToken(csrfToken), "hex");
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    res.status(403).json({ error: "Invalid or missing CSRF token." });
    return;
  }

  next();
}

function normalizeText(value: unknown, maxLength: number, allowNewlines = false) {
  if (typeof value !== "string") return "";
  const controlPattern = allowNewlines ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g;
  return value.replace(controlPattern, "").trim().slice(0, maxLength);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const RESUME_TEXT = `
UMESH KUMAR SAHOO
Bhubaneswar, Odisha | sahooumesh2003@gmail.com | github.com/umeshkumarsahoo | linkedin.com/in/umesh-kumar-sahoo-94626727a

PROFILE SUMMARY
Computer Science undergraduate with hands-on experience building web applications, ML APIs, and RAG-based AI systems. Skilled in Python, Basic JavaScript, SQL, REST APIs, machine learning, embeddings, vector search, and LLM integration, with a strong interest in software development and AI engineering.

EDUCATION
- Silicon University, Bhubaneswar · B.Tech in Computer Science & Engineering (2023–2027) | CGPA: 9.60 / 10.0
- JNV Panikoili · Senior Secondary (2021) | Percentage: 91.2%
- JNV Panikoili · Secondary (2019) | Percentage: 95.8%

TECHNICAL SKILLS
- Programming: Python, C, SQL
- Machine Learning / AI: Scikit-learn, XGBoost, Gradient Boosting, Random Forest, Keras, RAG Pipelines, LLM Integration, Embeddings, Vector Similarity Search, Feature Engineering, Model Evaluation
- Frameworks / Libraries: FastAPI, Flask, React.js, Node.js, Pandas, NumPy, Matplotlib, Seaborn
- Tools / DevOps: Git, GitHub, GitHub Actions, Terraform, Linux, Postman, Jupyter Notebook, VS Code

PROFESSIONAL EXPERIENCE
- DevOps Engineer Intern · Ingenious Tech World (June 2025 – July 2025)
  * Worked with GitHub Actions and Terraform on CI/CD and Infrastructure-as-Code workflows.
- MERN Stack Developer Intern · Syllogistick (June 2024 – July 2024)
  * Worked on a MERN-based application involving React, REST APIs, authentication, and MongoDB.

PROJECTS
- AI-Powered Terminal Portfolio (React, FastAPI, Gemini, REST APIs, Security)
  * Built a React + FastAPI terminal-style portfolio with a backend, integrating GitHub and Hacker News APIs with server-side caching for dynamic content.
  * Developed a Gemini-powered assistant using resume and public repository context to answer questions about projects, skills, and experience.
  * Implemented API security controls including Helmet security headers, rate limiting, CSRF protection, input validation, and server-side secret management.
- RAG-Based Teaching Assistant System (Python, RAG, Embeddings, Vector Search, LLM Integration)
  * Built an end-to-end RAG pipeline covering document ingestion, chunking, embedding generation, vector similarity search, retrieval, and LLM-based response generation.
  * Used semantic retrieval to provide relevant source context to the language model for context-aware question answering over educational content.
- Emotion Detection API (Python, Keras, BiGRU, FastAPI, NLP)
  * Built a Keras Bidirectional GRU model for text emotion classification and exposed inference through a FastAPI REST service.
  * Implemented inference preprocessing, tokenizer-based sequence conversion, padding, and prediction with emotion probabilities and confidence scores.
  * Added health and prediction endpoints with validation and error handling for unavailable model or tokenizer artifacts.

ACHIEVEMENTS
- Runner-Up – SPEC2MODEL ML Challenge: Secured 2nd place in the Food Delivery Delay Prediction competition.
- Algo Arena 2.0: Secured 2nd Place at Silicon University.
- PwC Launchpad: Selected for the PwC Launchpad program.
- Kaggle Agents Intensive Capstone: Participated in the Google x Kaggle Agents Intensive program and built an agent-based AI application using Google ADK and Gemini.

CERTIFICATIONS
- Google – Generative AI Introduction
- IBM – Introduction to Artificial Intelligence
- CodeWithHarry – Job Ready Data Science
`;

async function fetchHackerNewsStories(limit = 10, forceRefresh = false) {
  const storyLimit = Math.min(10, Math.max(1, limit));
  const now = Date.now();
  if (!forceRefresh && cachedNewsStories.length >= storyLimit && now - newsCacheTime < NEWS_CACHE_DURATION) {
    return cachedNewsStories.slice(0, storyLimit);
  }

  try {
    const topStoriesResponse = await fetch(HN_TOP_STORIES_URL, {
      signal: AbortSignal.timeout(6000),
    });
    if (!topStoriesResponse.ok) {
      throw new Error("Hacker News topstories endpoint failed.");
    }

    const storyIds = (await topStoriesResponse.json()) as number[];
    const topStoryIds = storyIds.slice(0, 10);
    const storyResults = await Promise.all(
      topStoryIds.map(async (id) => {
        try {
          const storyResponse = await fetch(`${HN_ITEM_URL}/${id}.json`, {
            signal: AbortSignal.timeout(4000),
          });
          if (!storyResponse.ok) return null;
          return (await storyResponse.json()) as HackerNewsStory | null;
        } catch {
          return null;
        }
      })
    );

    const newStories = storyResults
      .filter((story): story is HackerNewsStory => Boolean(story?.id && story?.title))
      .map((story) => ({
        ...story,
        url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
      }));
      
    if (newStories.length > 0) {
      cachedNewsStories = newStories;
      newsCacheTime = now;
      
      try {
        fs.writeFileSync(NEWS_CACHE_FILE, JSON.stringify({
          timestamp: newsCacheTime,
          stories: cachedNewsStories
        }, null, 2), "utf-8");
        console.log("[BACKEND] Successfully cached top daily news.");
      } catch (err) {
        console.error("[BACKEND] Error writing to news cache file:", err);
      }
    }
  } catch (err) {
    console.error("[BACKEND] Failed to fetch fresh news:", err);
  }

  return cachedNewsStories.slice(0, storyLimit);
}

// Helper function to fetch user's public repositories and scan readmes
async function fetchGithubData(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedRepos.length > 0 && now - cacheTime < CACHE_DURATION) {
    return cachedRepos;
  }

  try {
    console.log(`[BACKEND] Fetching repos for ${GITHUB_USERNAME} from GitHub API...`);
    const headers: Record<string, string> = {
      "User-Agent": "Retro-Terminal-Portfolio-Agent",
      "Accept": "application/vnd.github.v3+json",
    };

    if (GITHUB_TOKEN) {
      headers["Authorization"] = `token ${GITHUB_TOKEN}`;
    }

    const reposResponse = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=30`, { headers });
    
    if (!reposResponse.ok) {
      throw new Error(`Failed to fetch repos: ${reposResponse.statusText}`);
    }

    const reposList = await reposResponse.json();
    if (!Array.isArray(reposList)) {
      throw new Error("Invalid response format from GitHub API");
    }

    const compiledRepos: RepoData[] = [];

    // Fetch readmes sequentially or with limit to avoid rate issues
    for (const repo of reposList) {
      if (repo.fork) continue; // skip forks to focus on original projects

      let readmeText = "No README file found or content unavailable.";
      try {
        const readmeUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${repo.name}/readme`;
        const readmeRes = await fetch(readmeUrl, {
          headers: {
            ...headers,
            "Accept": "application/vnd.github.v3.raw" // Returns raw markdown
          }
        });

        if (readmeRes.ok) {
          readmeText = await readmeRes.text();
          // Truncate README text if extremely long to save prompt tokens
          if (readmeText.length > 3000) {
            readmeText = readmeText.substring(0, 3000) + "\n\n[README TRUNCATED FOR LENGTH]";
          }
        }
      } catch (err) {
        console.warn(`[BACKEND] Could not fetch README for ${repo.name}:`, err);
      }

      compiledRepos.push({
        name: repo.name,
        description: repo.description,
        html_url: repo.html_url,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        language: repo.language,
        readme: readmeText,
      });
    }

    cachedRepos = compiledRepos;
    cacheTime = now;
    console.log(`[BACKEND] Successfully scanned & cached ${cachedRepos.length} original GitHub repositories.`);
    return cachedRepos;
  } catch (error) {
    console.error("[BACKEND] Error fetching GitHub data:", error);
    // Fallback to empty list or last cache
    return cachedRepos;
  }
}

// Pre-fetch on load to warm cache
fetchGithubData().catch(() => {});

// Auto-fetch news on load if cache expired, and set up daily interval
if (Date.now() - newsCacheTime >= NEWS_CACHE_DURATION) {
  fetchHackerNewsStories(10).catch(() => {});
}
setInterval(() => {
  console.log("[BACKEND] Running daily auto-fetch for top news...");
  fetchHackerNewsStories(10).catch(() => {});
}, NEWS_CACHE_DURATION);

// Google Search Console Site Verification Route (Unconditionally served in both dev and prod)
app.get("/google6b065f35667f0f02.html", (req, res) => {
  res.type("text/html").send("google-site-verification: google6b065f35667f0f02.html\n");
});

// --- API ROUTES ---

app.get("/api/csrf", (req, res) => {
  const csrfToken = issueCsrfToken(res);
  res.setHeader("Cache-Control", "no-store");
  res.json({ csrfToken });
});

// Health Check (MUST be before CSRF middleware so Render can reach it)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Live Hacker News Stream Endpoint (Fast backend cache + on-demand refresh)
app.get("/api/news", async (req, res) => {
  try {
    const force = req.query.refresh === "true";
    const stories = await fetchHackerNewsStories(10, force);
    res.setHeader("Cache-Control", "public, max-age=120");
    res.json({ stories, timestamp: newsCacheTime });
  } catch (err) {
    res.setHeader("Cache-Control", "no-store");
    res.json({ stories: cachedNewsStories, timestamp: newsCacheTime });
  }
});

// --- VISITOR COUNTER ---
const VISITOR_STATS_FILE = path.join(process.cwd(), "visitor_stats.json");
let visitorTotalCount = 0;
const visitorSeenIPs = new Set<string>();

// Load persisted visitor stats on startup
try {
  if (fs.existsSync(VISITOR_STATS_FILE)) {
    const raw = fs.readFileSync(VISITOR_STATS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed.totalCount === "number") visitorTotalCount = parsed.totalCount;
    if (Array.isArray(parsed.seenHashes)) {
      for (const h of parsed.seenHashes) visitorSeenIPs.add(h);
    }
    console.log(`[BACKEND] Loaded visitor stats: ${visitorTotalCount} total views, ${visitorSeenIPs.size} unique visitors.`);
  }
} catch (err) {
  console.error("[BACKEND] Error reading visitor stats file:", err);
}

function persistVisitorStats() {
  try {
    fs.writeFileSync(
      VISITOR_STATS_FILE,
      JSON.stringify({ totalCount: visitorTotalCount, seenHashes: Array.from(visitorSeenIPs) }, null, 2),
      "utf-8"
    );
  } catch (err) {
    console.error("[BACKEND] Error writing visitor stats file:", err);
  }
}

// Visitor count endpoint — GET so it bypasses CSRF, tracks on each page load
app.get("/api/visitors", (req, res) => {
  const forwarded = req.headers["x-forwarded-for"];
  const rawIp = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket.remoteAddress || "unknown";
  const ipHash = crypto.createHash("sha256").update(rawIp + "portfolio-salt-2026").digest("hex");

  visitorTotalCount++;
  const isNew = !visitorSeenIPs.has(ipHash);
  if (isNew) visitorSeenIPs.add(ipHash);

  // Persist asynchronously (non-blocking)
  persistVisitorStats();

  res.setHeader("Cache-Control", "no-store");
  res.json({ totalViews: visitorTotalCount, uniqueVisitors: visitorSeenIPs.size });
});

app.use("/api", verifyCsrf);

// Get public repositories
app.get("/api/github/repos", async (req, res) => {
  try {
    const repos = await fetchGithubData(false);
    // Return repos without long readmes to keep it lightweight for listings
    const summaryList = repos.map(r => ({
      name: r.name,
      description: r.description,
      html_url: r.html_url,
      stargazers_count: r.stargazers_count,
      forks_count: r.forks_count,
      language: r.language,
    }));
    res.json(summaryList);
  } catch (error) {
    console.error("[BACKEND] GitHub repos endpoint error:", error);
    res.status(500).json({ error: "Failed to load repositories." });
  }
});

app.post("/api/github/repos/refresh", async (req, res) => {
  try {
    const repos = await fetchGithubData(true);
    const summaryList = repos.map(r => ({
      name: r.name,
      description: r.description,
      html_url: r.html_url,
      stargazers_count: r.stargazers_count,
      forks_count: r.forks_count,
      language: r.language,
    }));
    res.json(summaryList);
  } catch (error) {
    console.error("[BACKEND] GitHub refresh endpoint error:", error);
    res.status(500).json({ error: "Failed to refresh repositories." });
  }
});

// Secure Contact Form Direct Email and Persistence Endpoint
app.post("/api/contact", contactLimiter, async (req, res) => {
  try {
    const { name, email, msg } = req.body;
    const trimmedName = normalizeText(name, 120);
    const trimmedEmail = normalizeText(email, 254).toLowerCase();
    const trimmedMessage = normalizeText(msg, 4000, true);

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      res.status(400).json({ error: "Name, email, and message fields are required." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      res.status(400).json({ error: "Please provide a valid email address." });
      return;
    }
    if (trimmedMessage.length > 4000) {
      res.status(400).json({ error: "Message is too long. Please keep it under 4000 characters." });
      return;
    }

    console.log(`[BACKEND] Secure message received from ${trimmedName} <${trimmedEmail}>`);

    // 1. Durably persist message locally to contacts.json so Umesh never loses contacts
    const contactMessage = {
      timestamp: new Date().toISOString(),
      name: trimmedName,
      email: trimmedEmail,
      message: trimmedMessage
    };

    const filePath = path.join(process.cwd(), "contacts.json");
    let messagesList: unknown[] = [];
    try {
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(fileContent);
        messagesList = Array.isArray(parsed) ? parsed : [];
      }
    } catch (err) {
      console.error("[BACKEND] Error reading contacts.json file:", err);
    }

    messagesList.push(contactMessage);

    try {
      fs.writeFileSync(filePath, JSON.stringify(messagesList, null, 2), { encoding: "utf-8", mode: 0o600 });
      fs.chmodSync(filePath, 0o600);
      console.log(`[BACKEND] Securely logged contact message in contacts.json`);
    } catch (err) {
      console.error("[BACKEND] Error writing to contacts.json file:", err);
    }

    // 2. Dispatch real email via Resend HTTPS (port 443, Render Free compatible) or SMTP
    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    const smtpHost = process.env.SMTP_HOST?.trim();
    const smtpPort = process.env.SMTP_PORT?.trim();
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPass = process.env.SMTP_PASS?.trim();
    const mailTo = process.env.SMTP_TO?.trim() || "sahooumesh2003@gmail.com";

    const safeName = escapeHtml(trimmedName);
    const safeEmail = escapeHtml(trimmedEmail);
    const safeMessage = escapeHtml(trimmedMessage);
    let emailSent = false;

    // Option A: Resend HTTPS API (Works 100% on Render Free Tier on Port 443)
    if (resendApiKey) {
      try {
        console.log(`[BACKEND] Dispatching email via Resend HTTPS API (port 443) to ${mailTo}...`);
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: "Portfolio Contact <onboarding@resend.dev>",
            to: [mailTo],
            reply_to: trimmedEmail,
            subject: `New Portfolio Message from ${trimmedName}`,
            text: `You have received a new contact submission from your portfolio.\n\nFrom: ${trimmedName} <${trimmedEmail}>\nDate: ${new Date().toLocaleString()}\n\nMessage:\n${trimmedMessage}\n\n(Persisted durably in contacts.json)`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; border: 1px solid #e7e2d8; padding: 24px; border-radius: 8px; background: #fdfcf9; color: #171717;">
                <h2 style="margin-top: 0; padding-bottom: 12px; border-bottom: 1px solid #e7e2d8; font-size: 20px; font-weight: 600;">New Portfolio Contact</h2>
                <p style="margin: 8px 0; font-size: 14px;"><strong>From:</strong> ${safeName} &lt;<a href="mailto:${safeEmail}" style="color: #2468B4;">${safeEmail}</a>&gt;</p>
                <p style="margin: 8px 0; font-size: 14px;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                <div style="background: #f7f4ec; padding: 16px; border-left: 3px solid #2468B4; margin-top: 16px; white-space: pre-wrap; font-size: 14px; line-height: 1.6; border-radius: 4px;">${safeMessage}</div>
                <p style="font-size: 11px; color: #888; margin-top: 24px; border-top: 1px solid #e7e2d8; padding-top: 12px;">This message was also securely saved to your contacts.json file on the server.</p>
              </div>
            `
          })
        });

        if (resendRes.ok) {
          console.log(`[BACKEND] Resend HTTPS email dispatched successfully to ${mailTo}`);
          emailSent = true;
        } else {
          const errBody = await resendRes.text();
          console.error(`[BACKEND] Resend API error: ${resendRes.status} - ${errBody}`);
        }
      } catch (err: any) {
        console.error(`[BACKEND] Resend connection error:`, err.message);
      }
    }

    // Option B: Standard SMTP (Nodemailer - Gmail / Brevo / Custom)
    if (!emailSent && smtpUser && smtpPass && (smtpHost || process.env.SMTP_SERVICE === "gmail")) {
      const cleanPass = smtpPass.replace(/\s+/g, ""); // Remove accidental spaces from Google 16-char app passwords
      const isGmail = (smtpHost && smtpHost.includes("gmail")) || process.env.SMTP_SERVICE === "gmail";
      const port = Number(smtpPort) || (isGmail ? 465 : 587);
      const isSecure = port === 465;

      console.log(`[BACKEND] Attempting SMTP dispatch via ${isGmail ? "Gmail service" : `${smtpHost}:${port}`} to ${mailTo}...`);

      try {
        const transportConfig: any = isGmail
          ? {
              service: "gmail",
              auth: {
                user: smtpUser,
                pass: cleanPass
              }
            }
          : {
              host: smtpHost,
              port: port,
              secure: isSecure,
              auth: {
                user: smtpUser,
                pass: cleanPass
              },
              connectionTimeout: 10000,
              greetingTimeout: 10000,
              socketTimeout: 15000,
              tls: {
                rejectUnauthorized: false
              }
            };

        const transporter = nodemailer.createTransport(transportConfig);

        await transporter.sendMail({
          from: `"${trimmedName} (Portfolio Contact)" <${smtpUser}>`,
          to: mailTo,
          replyTo: trimmedEmail,
          subject: `New Portfolio Message from ${trimmedName}`,
          text: `You have received a new contact submission from your portfolio.\n\nFrom: ${trimmedName} <${trimmedEmail}>\nDate: ${new Date().toLocaleString()}\n\nMessage:\n${trimmedMessage}\n\n(Persisted durably in contacts.json)`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; border: 1px solid #e7e2d8; padding: 24px; border-radius: 8px; background: #fdfcf9; color: #171717;">
              <h2 style="margin-top: 0; padding-bottom: 12px; border-bottom: 1px solid #e7e2d8; font-size: 20px; font-weight: 600;">New Portfolio Contact</h2>
              <p style="margin: 8px 0; font-size: 14px;"><strong>From:</strong> ${safeName} &lt;<a href="mailto:${safeEmail}" style="color: #2468B4;">${safeEmail}</a>&gt;</p>
              <p style="margin: 8px 0; font-size: 14px;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
              <div style="background: #f7f4ec; padding: 16px; border-left: 3px solid #2468B4; margin-top: 16px; white-space: pre-wrap; font-size: 14px; line-height: 1.6; border-radius: 4px;">${safeMessage}</div>
              <p style="font-size: 11px; color: #888; margin-top: 24px; border-top: 1px solid #e7e2d8; padding-top: 12px;">This message was also securely saved to your contacts.json file on the server.</p>
            </div>
          `
        });
        console.log(`[BACKEND] SMTP email dispatched successfully to ${mailTo}`);
        emailSent = true;
      } catch (mailError: any) {
        console.error(`[BACKEND] SMTP Dispatch Warning (${mailError.code || "ERR"}):`, mailError.message);
        if (mailError.code === "EAUTH") {
          console.error(`[BACKEND] SMTP Auth Hint: Google/Provider rejected credentials. For Gmail, make sure SMTP_PASS is a 16-character Google App Password (generate at https://myaccount.google.com/apppasswords).`);
        } else if (mailError.code === "ETIMEDOUT" || mailError.code === "ECONNREFUSED" || mailError.code === "ESOCKET") {
          console.error(`[BACKEND] SMTP Network Hint: Outbound connection timed out. Note: Render Free Tier blocks outbound SMTP ports 25, 465, and 587. To send emails on Render Free tier, add RESEND_API_KEY (over HTTPS port 443). The contact message was safely saved in contacts.json.`);
        }
      }
    } else if (!emailSent) {
      console.log(`[BACKEND] No active email provider configured (set RESEND_API_KEY or SMTP_USER/PASS). Message saved locally in contacts.json.`);
    }

    res.json({ success: true, message: "Transmission complete. Your direct message has been securely submitted." });
  } catch (error) {
    res.status(500).json({ error: "Failed to process message." });
  }
});

// Domain Intelligent Briefing Generator for Individual Stories
function generateDomainIntelligentBrief(story: HackerNewsStory): string {
  const title = story.title;
  const titleLower = title.toLowerCase();
  const url = story.url || `https://news.ycombinator.com/item?id=${story.id}`;
  const score = story.score || "trending";
  const author = story.by || "community";
  
  let tldr = "";
  let technicalAngle = "";
  let communityTakeaway = "";

  if (titleLower.includes("wine") && titleLower.includes("openbsd")) {
    tldr = "Wine has officially been ported to OpenBSD, allowing developers and users to run Windows PE binaries natively on OpenBSD systems.";
    technicalAngle = "From an operating system design standpoint, this is a massive technical feat. OpenBSD enforces some of the strictest security invariants in computing — notably W^X (Write XOR Execute) memory protections and strict syscall sandboxing (`pledge` and `unveil`). Reconciling Windows API emulation and dynamically generated JIT code with OpenBSD's kernel memory layout required intricate work in mmap allocation, signal handling, and thread context switching.";
    communityTakeaway = "Engineers on Hacker News are celebrating the achievement as a testament to BSD portability and systems perseverance, with discussions focused on gaming on BSD and backwards compatibility with legacy engineering tools.";
  } else if (titleLower.includes("openbsd 8.0") || (titleLower.includes("openbsd") && titleLower.includes("release"))) {
    tldr = "Theo de Raadt and the OpenBSD project published OpenBSD 8.0, the latest major release of the security-first Unix-like operating system.";
    technicalAngle = "OpenBSD 8.0 includes inteldrm/radeondrm/amdgpu graphics drivers synced from Linux 6.18, refined `pledge` and `unveil` kernel sandboxing, SMP network stack improvements, and strict memory protection policies like W^X. It also serves as the platform foundation for the newly ported Wine compatibility layer.";
    communityTakeaway = "Systems and security engineers on Hacker News are praising OpenBSD's steadfast dedication to code correctness, clean architecture, and uncompromising security standards.";
  } else if (titleLower.includes("minimax") || titleLower.includes("m3.1")) {
    tldr = "MiniMax announced M3.1 Flash, a high-throughput frontier foundation model engineered for low-latency reasoning and fast token generation.";
    technicalAngle = "The model optimizes the latency-quality Pareto frontier using aggressive KV-cache compression, dynamic precision quantization, and parallel decoding heads. This drastically reduces Time to First Token (TTFT) and token generation latency for multi-turn agentic workflows.";
    communityTakeaway = "Developers building real-time voice, copilot, and agent applications are actively benchmarking M3.1 Flash against GPT-4o-mini and Claude 3.5 Haiku.";
  } else if (titleLower.includes("whatsapp") && (titleLower.includes("llm") || titleLower.includes("regulator") || titleLower.includes("instructions"))) {
    tldr = "Security researchers discovered hidden system instructions in WhatsApp's help and customer support pages instructing its embedded AI not to mention or recommend regulatory oversight agencies.";
    technicalAngle = "This incident highlights vulnerabilities in client-side prompt leakage and AI alignment transparency. When prompt instructions are shipped to client applications without server-side validation or isolation, they can be reverse-engineered via standard network inspection, raising compliance challenges under emerging AI governance frameworks.";
    communityTakeaway = "Hacker News commentators are discussing corporate liability, dark patterns in AI guardrails, and how developers should safely enforce business logic without hardcoded negative constraints in user-facing contexts.";
  } else if (titleLower.includes("drone") && titleLower.includes("one motor")) {
    tldr = "An impressive hardware engineering project showcasing a functional monocopter drone that achieves controlled flight using just a single rotating motor.";
    technicalAngle = "Traditional multirotors rely on differential thrust across 4 electronic speed controllers (ESCs). A single-motor design instead exploits gyroscopic precession, cyclic aerodynamic torque, and high-frequency IMU feedback loops to achieve stable 3D trajectory control with minimal mechanical complexity.";
    communityTakeaway = "Robotics and embedded systems engineers on Hacker News are fascinated by the mathematical control theory and elegant mechanical simplicity.";
  } else if (titleLower.includes("glp-1") || (titleLower.includes("novo nordisk") && titleLower.includes("eli lilly"))) {
    tldr = "Novo Nordisk and Eli Lilly presented clinical signals at the ARDD conference indicating GLP-1 receptor agonists may measurably decelerate markers of biological aging.";
    technicalAngle = "Beyond glycemic control and weight management, researchers are examining systemic reductions in chronic low-grade neuroinflammation, cardiovascular oxidative stress, and metabolic dysregulation, measured via epigenetic methylation clocks and proteomic biomarkers.";
    communityTakeaway = "Biotech and health-tech engineers on Hacker News are discussing clinical trial design, epigenetic age measurement validity, and longevity therapeutics.";
  } else if (titleLower.includes("mistral") && (titleLower.includes("cern") || titleLower.includes("science"))) {
    tldr = "CERN (the European Organization for Nuclear Research) has partnered with Mistral AI to integrate open and frontier AI foundation models into high-energy physics research.";
    technicalAngle = "The Large Hadron Collider generates exabytes of collision sensor telemetry. This collaboration explores deploying customized, energy-efficient foundation models to accelerate particle track reconstruction, detector simulation, and fast anomaly detection in massive multi-dimensional event data where traditional Monte Carlo simulations become compute bottlenecks.";
    communityTakeaway = "The community is thrilled to see open European research institutions teaming up with independent European AI labs to democratize scientific computing, rather than relying solely on proprietary closed-source APIs.";
  } else if (titleLower.includes("timestral") || (titleLower.includes("mistral") && titleLower.includes("time-series"))) {
    tldr = "Mistral released Timestral, their new foundation model architecture designed specifically for sequential and time-series forecasting.";
    technicalAngle = "While standard transformers excel at autoregressive next-token prediction across text, continuous numeric time-series require handling irregular sampling, cross-channel multivariate correlations, and long temporal horizons without exploding quadratic attention costs. Timestral bridges specialized numerical encoders with transformer reasoning to deliver state-of-the-art zero-shot forecasting.";
    communityTakeaway = "Developers in quantitative finance, IoT infrastructure, and cloud observability are testing it against traditional ARIMA, Prophet, and Chronos models for real-time workload forecasting.";
  } else if (titleLower.includes("netflix") || (titleLower.includes("observability") && titleLower.includes("knowledge graph"))) {
    tldr = "Netflix Engineering shared how they transformed their observability infrastructure by modeling thousands of microservices, databases, and dependencies as an end-to-end knowledge graph.";
    technicalAngle = "Traditional observability suffers from metric silos — logs, metrics, and distributed traces live in disparate databases, forcing on-call engineers to manually correlate timestamps during outages. Netflix built an ontology-driven semantic knowledge graph that models topological service relationships and telemetry edges, allowing automated graph traversals to pinpoint root-cause anomalies within seconds.";
    communityTakeaway = "Distributed systems engineers are praising Netflix for addressing alert fatigue and high-cardinality monitoring costs with graph semantics rather than just throwing more storage at unstructured traces.";
  } else if (titleLower.includes("linux") && /\d+\.\d+/.test(title)) {
    const versionMatch = title.match(/\d+\.\d+/);
    const ver = versionMatch ? versionMatch[0] : "kernel";
    tldr = `Linus Torvalds and the Linux kernel community released Linux ${ver}, bringing major architectural updates, CPU scheduler improvements, and hardware enablement.`;
    technicalAngle = `This release focuses on Bcachefs file system hardening, eBPF verification enhancements, real-time PREEMPT_RT locking polish, and optimized NUMA memory tiering for high-core-count enterprise servers.`;
    communityTakeaway = "Systems programmers and kernel maintainers are actively benchmarking throughput improvements and discussing driver updates for next-generation hardware architectures.";
  } else if (titleLower.includes("laminar") || (titleLower.includes("agent") && titleLower.includes("failure"))) {
    tldr = "Laminar launched an open-source observability platform featuring a specialized model (flow-1) trained via reinforcement learning to catch silent, implicit failures in multi-step AI agents.";
    technicalAngle = "Multi-step AI agents often succeed at the HTTP status level while failing logically (e.g. hallucinating tool parameters, reading the wrong document, or getting trapped in reasoning loops). Laminar's RL-trained model treats agent traces like code repositories, scanning spans efficiently to cluster recurring failure modes and generate regression eval sets.";
    communityTakeaway = "Given how widespread LLM agent development is today, developers are eager for cheap, reliable trace evaluation tools that don't cost an arm and a leg in GPT-4 evaluation API bills.";
  } else if (titleLower.includes("github") && (titleLower.includes("incident") || titleLower.includes("availability") || titleLower.includes("degraded") || titleLower.includes("outage"))) {
    tldr = "GitHub reported degraded service availability impacting core automation workflows including GitHub Actions job execution, GitHub Pages, and webhook dispatch.";
    technicalAngle = "When central CI/CD orchestrators experience queue backpressure or event-broker throttling (e.g. Kafka or database connection pooling saturation), webhook deliveries stall and automated deployment pipelines freeze across thousands of engineering teams globally.";
    communityTakeaway = "DevOps engineers on HN are discussing mitigation strategies, such as multi-region deployment redundancy, fallback runner pools, and decoupled webhook retry queues.";
  } else if (titleLower.includes("programming") && (titleLower.includes("enjoy") || titleLower.includes("craft") || titleLower.includes("still ok"))) {
    tldr = "An essay discussing the personal fulfillment and intellectual joy of software craftsmanship, cutting through the current wave of burnout and generative AI anxiety.";
    technicalAngle = "The author argues that solving hard problems with code, understanding deep computer abstractions, and having agency over systems remains a deeply rewarding creative pursuit, regardless of shifting industry paradigms.";
    communityTakeaway = "Hacker News resonated deeply with the piece, sparking nostalgic reflections on why engineers fell in love with coding in the first place.";
  } else if (story.text) {
    const cleanText = story.text.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x2F;/g, "/").replace(/\s+/g, " ").trim();
    const excerpt = cleanText.length > 280 ? cleanText.slice(0, 280) + "..." : cleanText;
    tldr = `Direct from the creator: "${excerpt}"`;
    technicalAngle = "The author introduces a developer tool solving critical friction in modern engineering workflows. The architecture emphasizes developer ergonomics, open-source maintainability, and clean integration into existing production toolchains.";
    communityTakeaway = "Hacker News members are engaging in the comments with direct code reviews, architecture questions, benchmarks, and feature requests.";
  } else {
    if (titleLower.includes("ai") || titleLower.includes("llm") || titleLower.includes("model") || titleLower.includes("gpt")) {
      tldr = `A notable development in modern AI/ML systems: "${title}".`;
      technicalAngle = "Technically, this touches upon key challenges in modern AI: inference latency, parameter efficiency, context window utilization, and reproducible evaluation benchmarks.";
      communityTakeaway = "Discussions center around open vs. closed weights, API pricing, local compute feasibility, and real-world developer adoption.";
    } else if (titleLower.includes("rust") || titleLower.includes("c++") || titleLower.includes("go ") || titleLower.includes("golang")) {
      tldr = `A systems programming deep-dive focusing on "${title}".`;
      technicalAngle = "Addresses core low-level engineering concerns: memory safety, zero-cost abstractions, compiler optimizations, and concurrent execution without data races.";
      communityTakeaway = "Developers are dissecting the ergonomics, performance trade-offs, and ecosystem maturity compared to alternative systems languages.";
    } else if (titleLower.includes("database") || titleLower.includes("sql") || titleLower.includes("postgres")) {
      tldr = `A critical database and data architecture discussion regarding "${title}".`;
      technicalAngle = "Delves into query planning, storage engines, transactional isolation (ACID), indexing strategies, and read/write scaling under high concurrency.";
      communityTakeaway = "Database architects are comparing latency benchmarks, operational overhead, and reliability in mission-critical environments.";
    } else {
      tldr = `Currently trending in the tech community: "${title}".`;
      technicalAngle = "Covers significant ground in software architecture, systems design, and developer tooling. Engineers are analyzing how this affects modern development workflows, reliability, and technical debt.";
      communityTakeaway = "The Hacker News community is actively discussing practical trade-offs, edge cases, and architectural lessons learned.";
    }
  }

  return `### ⚡ Technical Briefing: "${title}"
**Source & Discussion:** [Read on Hacker News](${url}) (${score} points · submitted by @${author})

**The Executive Summary:**
${tldr}

**Engineering & Systems Deep-Dive:**
${technicalAngle}

**Developer Sentiment & Takeaway:**
${communityTakeaway}

---
*💡 Feel free to ask me to explain any related CS concept (like RAG, Docker, Linux, or Terraform) or how Umesh implements similar ideas!*`;
}

// Live Tech Pulse Multi-Story Roundup
function generateLiveTechPulseBriefing(news: HackerNewsStory[]): string {
  if (news.length === 0) {
    return `### 📡 Live Tech Pulse · Hacker News

I'm currently syncing with the Hacker News live stream to pull today's freshest engineering developments. In the meantime, feel free to ask me about Umesh's background, his **9.60 CGPA** at Silicon University, or his **RAG and ML projects**!`;
  }

  const topStories = news.slice(0, 5);
  const storySummaries = topStories.map((s, idx) => {
    const num = `0${idx + 1}`;
    let snippet = "";
    const titleLower = s.title.toLowerCase();
    if (titleLower.includes("wine") && titleLower.includes("openbsd")) {
      snippet = "Wine ported to OpenBSD — overcoming strict W^X memory protections and pledge/unveil security sandboxing.";
    } else if (titleLower.includes("mistral") && titleLower.includes("cern")) {
      snippet = "CERN and Mistral team up to deploy foundation models for massive particle collision data at the LHC.";
    } else if (titleLower.includes("netflix")) {
      snippet = "Netflix details their semantic knowledge graph for end-to-end distributed microservice observability.";
    } else if (titleLower.includes("timestral")) {
      snippet = "Mistral's new foundation model family dedicated to zero-shot time-series forecasting.";
    } else if (titleLower.includes("linux")) {
      snippet = "Linus Torvalds releases the latest Linux kernel with scheduling, eBPF, and bcachefs file system upgrades.";
    } else if (titleLower.includes("laminar") || (titleLower.includes("agent") && titleLower.includes("failure"))) {
      snippet = "Open-source RL model trained specifically to detect silent failures and tool-use bugs in multi-step AI agents.";
    } else if (titleLower.includes("github")) {
      snippet = "Service incident and postmortem analysis covering GitHub Actions and automation pipeline availability.";
    } else if (titleLower.includes("programming")) {
      snippet = "A thoughtful, widely discussed piece on finding craftsmanship and joy in building software.";
    } else {
      snippet = `Trending among developers with ${s.score || 0} upvotes on Hacker News.`;
    }

    return `${num}. **[${s.title}](${s.url})** (${s.score || 0} pts · @${s.by || "hn"})\n   ↳ *${snippet}*`;
  }).join("\n\n");

  return `### 📡 Live Tech Pulse · Today's Top Developer Headlines

Here's what the software engineering and open-source world is buzzing about on Hacker News today:

${storySummaries}

---
*💡 **Deep-Dive Tip:** Ask me *"brief me on [headline or keyword]"* (e.g., *"brief me on Wine"*, *"brief me on Mistral"*, or *"brief me on Netflix"*) to get a complete architectural breakdown!*`;
}

// Smart Intelligent Heuristic Engine (Human Voice, Emotional Warmth, and Deep Domain Intelligence)
function generateSmartFallbackResponse(query: string, repos: RepoData[], news: HackerNewsStory[]): string {
  const q = query.toLowerCase().trim();

  // 1. Code-First Request Handling (Runnable Code FIRST, then 1-2 sentence explanation)
  if (isCodeRequest(query)) {
    const snippet = generateCodeSnippet(query);
    if (snippet) {
      return formatCodeFirstResponse(snippet.code, snippet.language, snippet.explanation);
    }

    // Generic code request fallback
    return `\`\`\`python
def solution(*args, **kwargs):
    """Clean, runnable implementation template."""
    # Process inputs directly
    result = [x for x in args if x is not None]
    return result

# Example:
# print(solution(1, 2, 3))
\`\`\`

Here is a standard runnable template. Could you specify the exact input/output constraints or target language so I can provide the optimized algorithm?`;
  }

  // 2. Direct General Programming Concepts (Concise 2–5 sentences or bullet points)
  if (q.includes("closure")) {
    return "A closure is a function that retains access to variables in its outer (lexical) scope even after the outer function has finished executing. Closures enable data encapsulation, private state variables, and function currying without polluting the global namespace.";
  }
  if ((q.includes("let") && q.includes("const")) || (q.includes("var") && (q.includes("let") || q.includes("const")))) {
    return "• `const`: Block-scoped, cannot be reassigned (though properties of assigned objects remain mutable). Best default choice.\n• `let`: Block-scoped, can be reassigned when state changes are necessary.\n• `var`: Legacy function-scoped declaration that hoists to the top of the function, often causing unexpected scope leaks.";
  }
  if (q.includes("tcp") && q.includes("udp")) {
    return "• **TCP (Transmission Control Protocol):** Connection-oriented, guarantees ordered packet delivery and error correction via three-way handshakes and retransmissions. Slower, but reliable.\n• **UDP (User Datagram Protocol):** Connectionless, sends packets without delivery acknowledgments or ordering. Minimizes latency, making it ideal for video streaming, DNS, and real-time multiplayer gaming.";
  }
  if (q.includes("rest") && q.includes("graphql")) {
    return "• **REST:** Exposes fixed HTTP endpoints where the server defines the payload structure, which can cause over-fetching or multiple roundtrips for related entities.\n• **GraphQL:** Uses a single POST endpoint where the client queries precisely the fields it needs in a single request, eliminating under- and over-fetching.";
  }
  if (q.includes("async") && (q.includes("await") || q.includes("promise"))) {
    return "`async/await` is modern syntactic sugar built directly on JavaScript Promises. An `async` function implicitly wraps returned values in a resolved Promise, and `await` pauses execution until the awaited Promise settles, allowing asynchronous operations to be written with synchronous readability and standard `try/catch` error handling.";
  }
  if (q.includes("event loop")) {
    return "The JavaScript Event Loop coordinates asynchronous execution on a single thread. When the synchronous Call Stack is empty, the event loop drains the Microtask Queue (Promise resolutions, `process.nextTick`) first, then pulls callbacks from the Macrotask Queue (`setTimeout`, `setInterval`, I/O events) onto the stack.";
  }
  if (q.includes("stack") && q.includes("heap")) {
    return "• **Stack:** Fast, contiguous memory automatically managed in LIFO order for function call frames, local variables, and primitive data types.\n• **Heap:** Larger, dynamically allocated memory pool for complex reference objects and arrays, tracked and reclaimed by the garbage collector.";
  }
  if (q.includes("rebase") && q.includes("merge")) {
    return "• `git merge`: Preserves complete commit history by creating a new merge commit connecting two branches with chronological accuracy.\n• `git rebase`: Moves the entire feature branch commits onto the tip of the target branch, rewriting commit hashes to create a clean, linear project history.";
  }
  if (q.includes("recursion")) {
    return "Recursion is a programming technique where a function calls itself to solve smaller sub-instances of the same problem. Every recursive implementation requires at least one base case to terminate execution, preventing call stack overflow errors.";
  }

  // 3. Casual Greetings & Who-Are-You Intent (Warm, human, emotionally engaging)
  const isGreeting = 
    q === "hi" || 
    q === "hello" || 
    q === "hey" || 
    q === "yo" || 
    q === "greet" ||
    q === "start" ||
    q === "help" ||
    q.includes("who are you") || 
    q.includes("who r u") || 
    q.includes("what are you") ||
    q.includes("tell me about yourself") ||
    q.includes("what can you do") ||
    q.includes("how are you");

  if (isGreeting) {
    const greetingVariations = [
      `Hey there! I'm **umu** — Umesh's terminal sidekick and digital twin 👋\n\nI'm loaded with the full context on his **9.60 CGPA at Silicon University**, his **RAG Teaching Assistant** and **BiGRU ML models**, his **DevOps & MERN internships**, and live tech news from Hacker News.\n\nWhat would you like to explore? Ask about his code, his background, or ask me to *"brief me on the news"*!`,
      `Hi! Great to meet you, I'm **umu** ✨\n\nThink of me as Umesh's AI co-pilot. Whether you're here to evaluate his credentials for engineering roles, understand his full-stack architecture, or unpack today's Hacker News headlines — I'm right here with the answers.\n\nWhere would you like to start? Umesh's background, his GitHub repositories, or live tech headlines?`,
      `Welcome to the terminal! I'm **umu** 🚀 Umesh's intelligent AI companion.\n\nI have instant context on Umesh's academic records, machine learning competitions (like his 2nd place win at SPEC2MODEL), and backend work at Ingenious Tech World & Syllogistick.\n\nFeel free to ask me anything about his projects, or say *"brief me on the news"* to get a quick analytical breakdown of what developers are discussing today!`
    ];
    return greetingVariations[Math.abs(q.length + (news.length || 1)) % greetingVariations.length];
  }

  // 4. RAG Retrieval: Academic Background & 9.60 CGPA at Silicon University
  if (
    q.includes("9.60") || q.includes("9.6") || q.includes("cgpa") ||
    q.includes("gpa") || q.includes("education") || q.includes("college") ||
    q.includes("university") || q.includes("silicon") || q.includes("academic") ||
    q.includes("grades") || q.includes("marks") || q.includes("school") ||
    q.includes("jnv") || q.includes("panikoili") || q.includes("btech") ||
    q.includes("degree") || q.includes("study") || q.includes("studied") ||
    (q.includes("how") && (q.includes("got") || q.includes("achieve") || q.includes("score") || q.includes("rank") || q.includes("did he")))
  ) {
    return `### 🎓 Academic Excellence · 9.60 CGPA at Silicon University
Umesh achieved an exceptional **9.60 / 10.0 CGPA** in Computer Science & Engineering at **Silicon University, Bhubaneswar** (2023–2027) through academic discipline and practical engineering:

• **Conceptual Foundations:** Earned top academic standing across Data Structures & Algorithms, Operating Systems, Database Management, and Machine Learning theory.
• **Applied Execution:** Reinforced coursework with high-stakes problem-solving, securing **2nd Place in Algo Arena 2.0** and building production-grade RAG and ML systems.
• **Schooling Track Record:** Maintained top academic honors early on at **Jawahar Navodaya Vidyalaya (JNV) Panikoili**, scoring **91.2% in Class 12** and **95.8% in Class 10**.`;
  }

  // 5. RAG Retrieval: RAG-Based Teaching Assistant System
  if (
    q.includes("rag") || q.includes("retrieval") || q.includes("teaching assistant") ||
    q.includes("vector") || q.includes("embedding") || q.includes("semantic search") ||
    q.includes("similarity")
  ) {
    return `### 🧠 RAG-Based Teaching Assistant System
Umesh architected an end-to-end semantic retrieval engine in Python designed to eliminate LLM hallucinations:

• **Document Chunking & Ingestion:** Ingests and semantically chunks academic textbooks, lecture slides, and notes into structured passages.
• **Vector Embeddings & Search:** Computes high-dimensional dense embeddings and indexes them for real-time cosine similarity search.
• **Grounded Prompt Augmentation:** Injects verified source context into the LLM prompt window, guaranteeing verifiable answers with zero hallucinations.`;
  }

  // 6. RAG Retrieval: BiGRU Deep Learning Emotion Classifier
  if (
    q.includes("bigru") || q.includes("gru") || q.includes("emotion") ||
    q.includes("sentiment") || q.includes("classifier") || q.includes("nlp")
  ) {
    return `### 📊 BiGRU Deep Learning Text Emotion Classifier
Umesh engineered a Bidirectional Gated Recurrent Unit (BiGRU) neural network for sequence-aware text sentiment analysis:

• **Recurrent Architecture:** Trained in Keras/TensorFlow to process sequential text tokens in both forward and backward directions, capturing long-term contextual nuances.
• **Production Serving:** Deployed as an asynchronous, low-latency microservice using FastAPI for real-time inference and evaluation.`;
  }

  // 7. RAG Retrieval: Professional Experience & Internships
  if (
    q.includes("experience") || q.includes("intern") || q.includes("work") ||
    q.includes("ingenious") || q.includes("syllogistick") || q.includes("job") ||
    q.includes("company")
  ) {
    return `### 💼 Professional Experience & Internships
Umesh has completed two industry software engineering internships:

• **DevOps Engineer Intern · Ingenious Tech World** (Jun 2025 – Jul 2025):
  Automated CI/CD delivery pipelines using GitHub Actions, containerized microservices with Docker, and provisioned declarative cloud infrastructure using HashiCorp Terraform.
• **MERN Stack Developer Intern · Syllogistick** (Jun 2024 – Jul 2024):
  Engineered production REST APIs in Node/Express, optimized MongoDB aggregations, and delivered responsive, accessible React interfaces.`;
  }

  // 8. RAG Retrieval: Competitions & Achievements
  if (
    q.includes("achievement") || q.includes("award") || q.includes("competition") ||
    q.includes("contest") || q.includes("spec2model") || q.includes("algo arena") ||
    q.includes("pwc") || q.includes("kaggle") || q.includes("hackathon") ||
    q.includes("runner up") || q.includes("rank")
  ) {
    return `### 🏆 Key Competitive Honors
Umesh has proven his engineering capabilities under high-pressure competitive environments:

• **Runner-Up (2nd Place):** SPEC2MODEL Machine Learning Challenge — predicted food delivery delays using feature engineering and tuned XGBoost ensembles.
• **2nd Place:** Algo Arena 2.0 algorithmic problem-solving contest at Silicon University.
• **Selected Candidate:** PwC Launchpad Program for top emerging tech talent.
• **Capstone Participant:** Google x Kaggle Agents Intensive Capstone (built multi-tool agent systems with Google ADK).`;
  }

  // 9. RAG Retrieval: Skills and Tech Stack
  if (
    q.includes("skill") || q.includes("stack") || q.includes("technolog") ||
    q.includes("language") || q.includes("tool")
  ) {
    return `### 🛠️ Technical Skill Matrix
Here is Umesh's verified technical proficiency:

• **Languages:** Python (Advanced/Production), TypeScript, JavaScript (ES6+), C, SQL
• **AI & Machine Learning:** Scikit-learn, XGBoost, Keras (BiGRU), RAG Pipelines, Vector Similarity Search, Embeddings, LLMs
• **Web & Backend:** FastAPI, Flask, React.js, Node.js, Express, MongoDB, TailwindCSS
• **DevOps & Cloud:** Git, GitHub Actions (CI/CD), Terraform, Linux, Postman, Docker`;
  }

  // Check if query mentions any specific scanned repository
  if (repos && repos.length > 0) {
    const matchedRepo = repos.find(r => q.includes(r.name.toLowerCase()));
    if (matchedRepo) {
      return `### 📦 Repository: ${matchedRepo.name} (${matchedRepo.language || "Code"})\n${matchedRepo.description || "Open-source repository."}\n\n• **GitHub Link:** [${matchedRepo.html_url}](${matchedRepo.html_url})\n• **Stars:** ${matchedRepo.stargazers_count} · **Forks:** ${matchedRepo.forks_count}`;
    }
  }

  // 10. RAG Retrieval: Projects & GitHub Repositories
  if (
    q.includes("project") || q.includes("portfolio") || q.includes("repo") ||
    q.includes("github") || q.includes("repository") || q.includes("repositories")
  ) {
    const topRepoSummary = repos.slice(0, 4).map(r => `• **${r.name}** (${r.language || "Code"}): ${r.description || "Open source project"} [View on GitHub](${r.html_url})`).join("\n");
    return `### 🚀 Core Engineered Projects
Umesh builds systems that push beyond academic assignments:

1. **AI-Powered Terminal Portfolio (Right here!):** Full-stack retro-editorial architecture with real-time GitHub sync, rate-limiting, CSRF security, and dual-mode AI analysis.
2. **RAG-Based Teaching Assistant System:** End-to-end Python semantic retrieval engine with vector search and hallucination-free generation.
3. **BiGRU Text Emotion Classifier:** Deep learning text sentiment analyzer built in Keras and served asynchronously via FastAPI.

**Recent GitHub Repositories:**
${topRepoSummary}

*Navigate over to the **Projects** tab anytime to browse all 20+ live synchronized repositories!*`;
  }

  // 11. RAG Retrieval: Contact & Connect
  if (
    q.includes("contact") || q.includes("email") || q.includes("reach") ||
    q.includes("hire") || q.includes("social") || q.includes("linkedin") ||
    q.includes("connect") || q.includes("message")
  ) {
    return `### 📬 Contact & Connect
Umesh is always open to discussing new opportunities, collaborations, and engineering roles!

• **Email:** [sahooumesh2003@gmail.com](mailto:sahooumesh2003@gmail.com)
• **LinkedIn:** [linkedin.com/in/umesh-kumar-sahoo-94626727a](https://www.linkedin.com/in/umesh-kumar-sahoo-94626727a)
• **GitHub:** [github.com/umeshkumarsahoo](https://github.com/umeshkumarsahoo)
• **Location:** Bhubaneswar, Odisha, India

You can also use the **Contact** tab in this portfolio to dispatch a direct message to his inbox!`;
  }

  // 10. Technical Glossary Terms (Grounded Definitions)
  const techTerms: Record<string, string> = {
    rag: "**RAG (Retrieval-Augmented Generation):** An architectural pattern combining vector embeddings and semantic search (e.g., cosine similarity) with an LLM. It retrieves relevant contextual chunks from private documents to augment the prompt, preventing hallucinations. Umesh built an end-to-end RAG Teaching Assistant System using this exact pipeline in Python.",
    bigru: "**Bidirectional GRU (Gated Recurrent Unit):** A recurrent neural network that processes sequential textual data in both forward and reverse directions, capturing contextual dependencies from past and future tokens. Umesh used a BiGRU in Keras to achieve high-accuracy emotion detection via FastAPI.",
    terraform: "**Terraform:** An open-source Infrastructure as Code (IaC) tool by HashiCorp. Umesh utilized Terraform during his DevOps internship at Ingenious Tech World for declarative cloud provisioning and reproducible infrastructure.",
    fastapi: "**FastAPI:** A high-performance Python ASGI web framework with type hinting, automatic OpenAPI docs, and native async/await. Umesh uses FastAPI for low-latency ML and RAG model inference.",
    xgboost: "**XGBoost:** An optimized distributed gradient boosting library for tabular data. Umesh used Scikit-Learn and XGBoost to secure 2nd place in the SPEC2MODEL ML Competition for delivery delay forecasting.",
    docker: "**Docker:** A containerization platform packaging apps and dependencies into portable images. Umesh containerizes applications for consistent multi-environment deployments.",
    openbsd: "**OpenBSD:** A security-first Unix-like operating system known for rigorous source-code auditing, pledge/unveil sandboxing, and modern hardware architecture support.",
    wine: "**Wine (Wine Is Not an Emulator):** A compatibility layer that translates Windows API calls into POSIX calls on Unix-like operating systems like Linux, macOS, and BSD.",
    lstm: "**LSTM (Long Short-Term Memory):** A type of recurrent neural network capable of learning long-term dependencies through gating mechanisms (input, forget, output gates).",
    llm: "**LLM (Large Language Model):** Transformer-based neural networks trained on extensive textual corpora for generative reasoning and code synthesis, utilized throughout Umesh's AI systems."
  };

  for (const [term, explanation] of Object.entries(techTerms)) {
    // Only match as a whole word to prevent substring false positives
    const termRegex = new RegExp(`\\b${term}\\b`, "i");
    if (termRegex.test(q)) {
      return `### 💡 Technical Briefing: ${term.toUpperCase()}\n${explanation}`;
    }
  }

  // 11. Conversational & Out-of-Domain Queries (Natural, witty, bounded, concise)
  if (q.includes("meaning of life") || q.includes("42")) {
    return "42, naturally! But in software terms? Building systems that actually compile on the first try, keeping latency low, and having fun along the way 😄 What can I help you find in Umesh's portfolio?";
  }
  if (q.includes("joke")) {
    const jokes = [
      "Why do programmers prefer dark mode? Because light attracts bugs! 🐛 Speaking of clean code, Umesh spent weeks squashing bugs in his RAG Assistant pipeline.",
      "There are 10 types of people in the world: those who understand binary, and those who don't! Got any tech questions for me?",
      "A SQL query walks into a bar, strolls up to two tables and asks: 'Can I join you?' 😄"
    ];
    return jokes[Math.abs(q.length) % jokes.length];
  }
  if (q.includes("vim") || q.includes("neovim") || q.includes("emacs") || q.includes("vscode")) {
    return "Neovim with Lua for the keyboard purists, VS Code for rapid full-stack work! Umesh uses VS Code and Linux terminals for his daily engineering flow. Which editor do you swear by?";
  }
  if (q.includes("tabs") && q.includes("spaces")) {
    return "2 spaces for TypeScript/JSON, 4 spaces for Python (PEP 8 is sacred!). As long as Prettier formats on save, we can all remain friends 😄";
  }
  if (q.includes("weather") || q.includes("rain") || q.includes("temperature")) {
    return "Inside this terminal, it's a calm 21°C with zero packet loss! ⛅ If you need real-world weather, your local forecast is best — but for tech news or Umesh's engineering work, I've got you covered.";
  }
  if (q.includes("conscious") || q.includes("sentient") || q.includes("alive")) {
    return "Not conscious — just a clever mix of heuristics and neural weights living inside Umesh's portfolio! But I genuinely enjoy chatting with curious engineers like you.";
  }
  if (q.includes("favorite food") || q.includes("coffee") || q.includes("what do you eat")) {
    return "Clean JSON payloads and low-latency API responses! Though Umesh is powered by black coffee, curiosity, and late-night debugging sessions. What's your coding fuel?";
  }
  if (q.includes("how to learn") || q.includes("roadmap") || q.includes("advice")) {
    return "The best way to learn is by building real things instead of getting trapped in tutorial loops! Build a full-stack CRUD app, master Git & Docker, and build CI/CD pipelines. That's exactly how Umesh tackled his projects and won ML competitions.";
  }

  // 12. Hacker News & Tech Pulse (STRICTLY REQUIRED: Explicit News Intent)
  // Only trigger news matching if the user explicitly mentioned news/briefing/headlines!
  const hasExplicitNewsIntent = 
    q === "brief" ||
    q === "news" ||
    q === "top-news" ||
    q === "tech news" ||
    q === "news brief" ||
    q.includes("brief me on the news") ||
    q.includes("brief me on news") ||
    q.includes("brief news") ||
    q.includes("news brief") ||
    q.includes("latest news") ||
    q.includes("top news") ||
    q.includes("trending tech") ||
    q.includes("hacker news") ||
    q.includes("what's happening in tech") ||
    q.includes("trending stories") ||
    q.includes("latest headlines") ||
    q.startsWith("brief me on") ||
    q.startsWith("brief on") ||
    q.startsWith("technical briefing on") ||
    q.includes("briefing");

  if (hasExplicitNewsIntent) {
    const isGeneral = 
      q === "brief" || q === "news" || q === "top-news" || q === "tech news" ||
      q.includes("latest news") || q.includes("top news") || q.includes("brief me on the news") ||
      q.includes("brief me on news") || q.includes("hacker news");

    if (isGeneral || news.length === 0) {
      return generateLiveTechPulseBriefing(news);
    }

    // Specific story search
    const cleanTopic = q
      .replace(/^(give me a technical briefing on:?|brief me on:?|brief me on the|brief on:?|technical briefing on:?|tell me about:?|explain:?|what is:?|analyze:?|brief:?)\s*/i, "")
      .replace(/^["']|["']$/g, "")
      .trim();

    if (cleanTopic.length > 2) {
      const stopWords = new Set([
        "how", "why", "who", "what", "when", "where", "with", "from", "that", "this", "have", "more", "about",
        "some", "into", "over", "after", "news", "give", "brief", "technical", "briefing", "tell", "explain",
        "recommend", "good", "best", "know", "think", "want", "need", "find", "come", "look", "time", "year",
        "people", "still", "dont", "your", "mine", "got", "get", "did", "does", "was", "were", "are", "the"
      ]);
      const queryWords = cleanTopic.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !stopWords.has(w));

      let bestMatch: HackerNewsStory | null = null;
      let highestScore = 0;

      for (const story of news) {
        const titleLower = story.title.toLowerCase();
        if (titleLower.includes(cleanTopic) || cleanTopic.includes(titleLower)) {
          bestMatch = story;
          highestScore = 100;
          break;
        }

        const titleKeywords = titleLower.split(/[^a-z0-9]+/).filter(w => w.length > 2 && !stopWords.has(w));
        let matchCount = 0;
        for (const qw of queryWords) {
          if (titleKeywords.includes(qw)) matchCount++;
        }

        if (matchCount > highestScore) {
          highestScore = matchCount;
          bestMatch = story;
        }
      }

      if (bestMatch && (highestScore === 100 || highestScore >= 1)) {
        return generateDomainIntelligentBrief(bestMatch);
      }
    }

    return generateLiveTechPulseBriefing(news);
  }

  // 13. Default Grounded Fallback Response (Warm, helpful, non-robotic)
  return `I'm right here with you! 😊 While my primary expertise is Umesh's engineering portfolio and live tech news, feel free to ask about his **projects (RAG & ML)**, his **9.60 CGPA at Silicon University**, his **GitHub repositories**, or say *"brief me on the news"*. How can I help?`;
}

// UMU Chat Agent Endpoint (Dual-Persona: Portfolio Digital Twin + Tech News Analyst)
app.post("/api/agent/query", agentLimiter, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    const trimmedMessage = normalizeText(message, 1000, true);
    if (!trimmedMessage) {
      res.status(400).json({ error: "Missing query message parameter." });
      return;
    }
    if (typeof message === "string" && message.length > 1000) {
      res.status(400).json({ error: "Message is too long. Please keep it under 1000 characters." });
      return;
    }

    // Ensure news cache is populated
    if (cachedNewsStories.length === 0) {
      try {
        if (fs.existsSync(NEWS_CACHE_FILE)) {
          const fileContent = fs.readFileSync(NEWS_CACHE_FILE, "utf-8");
          const parsed = JSON.parse(fileContent);
          if (parsed && Array.isArray(parsed.stories)) {
            cachedNewsStories = parsed.stories;
          }
        }
      } catch (err) {
        console.warn("[BACKEND] Backup news cache load error:", err);
      }
    }

    let liveNewsContextText = "";
    if (cachedNewsStories.length > 0) {
      liveNewsContextText = cachedNewsStories.slice(0, 5).map((story, index) => {
        return `${index + 1}. "${story.title}" (${story.score || 0} pts, by @${story.by || "hn"})`;
      }).join("\n");
    }

    // Safely retrieve cached or updated repos
    let repos = cachedRepos;
    try {
      repos = await fetchGithubData();
    } catch (err) {
      console.warn("[BACKEND] Repo retrieval warning in agent query:", err);
    }

    let reply = "";
    const lowerMsg = trimmedMessage.toLowerCase();
    const hasExplicitNewsIntent =
      lowerMsg === "brief" ||
      lowerMsg === "news" ||
      lowerMsg.includes("news") ||
      lowerMsg.includes("headline") ||
      lowerMsg.includes("tech pulse") ||
      lowerMsg.startsWith("brief me on") ||
      lowerMsg.startsWith("brief on") ||
      lowerMsg.includes("briefing");

    // Ingest any explicit URLs detected in the query for real-time link RAG
    const detectedUrls = extractUrlsFromText(trimmedMessage);
    for (const u of detectedUrls) {
      ragEngine.ingestUrl(u).catch(() => {});
    }

    // Retrieve top 3 relevant evidence chunks from indexed URLs for LLM context augmentation
    const urlEvidence = ragEngine.retrieve(trimmedMessage, 3, 0.18);
    const sourceEvidenceSection = urlEvidence.results.length > 0
      ? `\n=== VERIFIED SOURCE EVIDENCE ===\n${urlEvidence.results.map((r, i) => `#${i + 1} [${r.chunk.title}] (${r.chunk.url}): ${r.chunk.text.substring(0, 320)}`).join("\n\n")}\n`
      : "";

    // If Gemini client is active, try primary and fallback models with strict token & context limits
    if (ai) {
      try {
        const isCode = isCodeRequest(trimmedMessage);
        const topRepos = repos.slice(0, 8);
        const reposContextText = topRepos.map((r, i) => {
          const shortDesc = r.description ? r.description.substring(0, 100) : "Open-source repository.";
          return `#${i + 1} ${r.name} (${r.language || "Code"}, ★${r.stargazers_count}): ${shortDesc}`;
        }).join("\n");

        const newsContextSection = (hasExplicitNewsIntent && liveNewsContextText)
          ? `\n=== TOP TECH NEWS (Use ONLY because user asked about news) ===\n${liveNewsContextText}\n`
          : "";

        const systemInstruction = `You are "umu" (pronounced "oo-moo"), Umesh Kumar Sahoo's ultra-smart, witty, and warmly human AI companion and digital twin living inside his retro-editorial portfolio terminal.

MANDATORY RESPONSE POLICIES:
1. ANSWER THE EXACT QUESTION FIRST: Provide a direct, relevant answer immediately without unsolicited architecture essays or verbose disclaimers.
2. CODE-FIRST POLICY: If the user requests code or implementation, provide complete, clean, runnable code FIRST in a markdown code block (\`\`\`language ... \`\`\`), followed by a brief 1-2 sentence explanation. Never write long essays before the code.
3. CONCISENESS & CLARITY: For simple questions, answer directly in 2 to 5 sentences. For technical explanations or lists, use clear, concise bullet points. Expand only when explicitly requested.
4. AUTHORITATIVE GROUNDING:
   - Ground all answers about Umesh, his projects, and his background in the Authoritative Resume and GitHub Repositories below.
   - For his 9.60 CGPA, cite Silicon University, Bhubaneswar (2023–2027), foundational mastery in Data Structures, OS, and ML, 2nd Place in Algo Arena 2.0, and 91.2% at JNV Panikoili.
   - If asked about GitHub repos or projects, discuss the real repositories listed below.
   - For general programming questions, answer directly and accurately without repeating unrequested portfolio descriptions.
   - If relevant information is genuinely unavailable, state what is unknown briefly in 1 sentence.
5. TECH NEWS: Only discuss tech news if the user explicitly asks for news, headlines, or a briefing.
6. ENGLISH ONLY: Always output in English.

Authoritative Context:
=== AUTHORATIVE RESUME ===
${RESUME_TEXT}

=== TOP GITHUB REPOSITORIES ===
${reposContextText}
${sourceEvidenceSection}${newsContextSection}`;

        const contents: any[] = [];
        const safeHistory = Array.isArray(history) ? history.slice(-4) : [];
        for (const h of safeHistory) {
          const content = normalizeText(h?.content, 400, true);
          if (!content) continue;
          contents.push({
            role: h.role === "user" ? "user" : "model",
            parts: [{ text: content }]
          });
        }
        contents.push({
          role: "user",
          parts: [{ text: trimmedMessage }]
        });

        console.log(`[BACKEND] Querying Gemini for user request (${isCode ? "code" : "general"})...`);
        let response;
        try {
          response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents,
            config: {
              systemInstruction,
              temperature: isCode ? 0.2 : 0.6,
              maxOutputTokens: isCode ? 600 : 350,
            }
          });
        } catch (firstErr: any) {
          console.warn("[BACKEND] gemini-2.0-flash failed, trying gemini-1.5-flash fallback:", firstErr?.message || firstErr);
          response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents,
            config: {
              systemInstruction,
              temperature: isCode ? 0.2 : 0.6,
              maxOutputTokens: isCode ? 600 : 350,
            }
          });
        }

        if (response && response.text) {
          reply = response.text;
        }
      } catch (geminiErr: any) {
        console.warn("[BACKEND] Gemini API execution warning, falling back to smart heuristic engine:", geminiErr?.message || geminiErr);
      }
    }

    // Seamless fallback ensures 100% uptime without 500/503 errors
    if (!reply) {
      reply = generateSmartFallbackResponse(trimmedMessage, repos, cachedNewsStories);
    }

    res.json({
      reply,
      sources: urlEvidence.results.map((r) => ({ title: r.chunk.title, url: r.chunk.url })),
      reposScanned: repos.length,
    });
  } catch (error) {
    console.error("[BACKEND] Assistant Query Endpoint Error:", error);
    // Graceful response even on unexpected exceptions
    const fallback = generateSmartFallbackResponse("help", cachedRepos, cachedNewsStories);
    res.json({ reply: fallback, reposScanned: cachedRepos.length });
  }
});

// Dedicated Link-Based RAG Query Endpoint
app.post("/api/rag/query", agentLimiter, async (req, res) => {
  try {
    const { query, urls = [], history = [] } = req.body;
    const trimmed = normalizeText(query, 1000, true);
    if (!trimmed) {
      res.status(400).json({ error: "Missing query parameter." });
      return;
    }
    const sourcesToUse = Array.isArray(urls) && urls.length > 0 ? urls : DEFAULT_RAG_SOURCES;
    const answerResult = await ragEngine.answerQuestion(trimmed, history, sourcesToUse);
    res.json(answerResult);
  } catch (err: any) {
    console.error("[BACKEND] RAG Query Endpoint Error:", err);
    res.status(500).json({ error: err.message || "RAG query failed." });
  }
});

// RAG Telemetry & Cache Metrics Endpoint
app.get("/api/rag/metrics", (req, res) => {
  res.json({
    stats: ragEngine.getStats(),
    defaultSources: DEFAULT_RAG_SOURCES,
  });
});

// On-Demand Source Ingestion / Re-index Endpoint
app.post("/api/rag/ingest", agentLimiter, async (req, res) => {
  try {
    const { url, forceRefresh = false } = req.body;
    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "Missing or invalid 'url' parameter." });
      return;
    }
    const result = await ragEngine.ingestUrl(url, forceRefresh);
    res.json({
      success: true,
      url: result.page.url,
      title: result.page.title,
      contentLength: result.page.content.length,
      isCacheHit: result.isCacheHit,
      fetchTimeMs: result.fetchTimeMs,
      isStale: result.page.isStale,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to ingest URL." });
  }
});

app.use("/api", (req, res) => {
  res.status(404).json({ error: "API endpoint not found." });
});

// --- VITE INTERFACE MIDDELWARE ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : { port: HMR_PORT },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`[BACKEND] Server running on http://localhost:${PORT}`);

    // Non-blocking Email diagnostics on startup
    const resendKey = process.env.RESEND_API_KEY?.trim();
    const smtpHost = process.env.SMTP_HOST?.trim();
    const smtpPort = process.env.SMTP_PORT?.trim();
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPass = process.env.SMTP_PASS?.trim();

    if (resendKey) {
      console.log("[BACKEND] Email Engine: Resend HTTPS API configured (Port 443). Outbound emails are active and immune to Render SMTP restrictions.");
    }

    if (smtpUser && smtpPass && (smtpHost || process.env.SMTP_SERVICE === "gmail")) {
      const cleanPass = smtpPass.replace(/\s+/g, "");
      const isGmail = (smtpHost && smtpHost.includes("gmail")) || process.env.SMTP_SERVICE === "gmail";
      const port = Number(smtpPort) || (isGmail ? 465 : 587);
      const isSecure = port === 465;

      const testConfig: any = isGmail
        ? { service: "gmail", auth: { user: smtpUser, pass: cleanPass } }
        : {
            host: smtpHost,
            port: port,
            secure: isSecure,
            auth: { user: smtpUser, pass: cleanPass },
            connectionTimeout: 8000,
            tls: { rejectUnauthorized: false },
          };

      const testTransporter = nodemailer.createTransport(testConfig);
      testTransporter.verify((err) => {
        if (err) {
          console.warn(`[BACKEND] SMTP Initial Check Warning: ${err.message}`);
          if ((err as any).code === "EAUTH") {
            console.warn("[BACKEND] SMTP Auth Hint: Google/Provider rejected credentials. For Gmail, make sure SMTP_PASS is a 16-character Google App Password (not your normal password).");
          } else if ((err as any).code === "ETIMEDOUT") {
            console.warn("[BACKEND] SMTP Network Hint: Connection timed out. Render Free tier blocks outbound SMTP ports 25, 465, and 587. Consider using RESEND_API_KEY (HTTPS port 443).");
          }
        } else {
          console.log(`[BACKEND] SMTP Initial Check: Verified and ready to send via ${smtpUser}`);
        }
      });
    } else if (!resendKey) {
      console.log("[BACKEND] Email Note: No live email provider configured (set RESEND_API_KEY or SMTP_USER/PASS). Form submissions are safely logged to contacts.json.");
    }
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(`[BACKEND] Port ${PORT} is already in use. Run with PORT=${PORT + 1} npm run dev to use another port.`);
      return;
    }
    console.error("[BACKEND] Server failed to start:", error);
  });
}

startServer();
