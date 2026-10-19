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

const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
const ai = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

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
}

let cachedRepos: RepoData[] = [];
let cacheTime: number = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
let cachedNewsStories: HackerNewsStory[] = [];
let newsCacheTime: number = 0;
const NEWS_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
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

async function fetchHackerNewsStories(limit = 7) {
  const storyLimit = Math.min(10, Math.max(1, limit));
  const now = Date.now();
  if (cachedNewsStories.length >= storyLimit && now - newsCacheTime < NEWS_CACHE_DURATION) {
    return cachedNewsStories.slice(0, storyLimit);
  }

  try {
    const topStoriesResponse = await fetch(HN_TOP_STORIES_URL);
    if (!topStoriesResponse.ok) {
      throw new Error("Hacker News topstories endpoint failed.");
    }

    const storyIds = (await topStoriesResponse.json()) as number[];
    const topStoryIds = storyIds.slice(0, 10);
    const storyResults = await Promise.all(
      topStoryIds.map(async (id) => {
        const storyResponse = await fetch(`${HN_ITEM_URL}/${id}.json`);
        if (!storyResponse.ok) return null;
        return (await storyResponse.json()) as HackerNewsStory | null;
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

    // 2. Dispatch real email if SMTP credentials are provided
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const mailTo = process.env.SMTP_TO || "sahooumesh2003@gmail.com";

    if (smtpHost && smtpUser && smtpPass) {
      console.log(`[BACKEND] Attempting real SMTP email dispatch to ${mailTo}...`);
      const safeName = escapeHtml(trimmedName);
      const safeEmail = escapeHtml(trimmedEmail);
      const safeMessage = escapeHtml(trimmedMessage);

      const port = Number(smtpPort) || 587;
      const isSecure = port === 465;

      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: port,
          secure: isSecure,
          auth: {
            user: smtpUser,
            pass: smtpPass
          },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
          tls: {
            rejectUnauthorized: false
          }
        });

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
      } catch (mailError: any) {
        console.error(`[BACKEND] SMTP Dispatch Warning (${mailError.code || "ERR"}):`, mailError.message);
        if (mailError.code === "EAUTH") {
          console.error(`[BACKEND] SMTP Auth Hint: Google/Provider rejected credentials. If using Gmail, make sure SMTP_PASS is a 16-character Google App Password (not your normal password).`);
        } else if (mailError.code === "ETIMEDOUT" || mailError.code === "ECONNREFUSED" || mailError.code === "ESOCKET") {
          console.error(`[BACKEND] SMTP Network Hint: Outbound connection timed out. On Render Free tier, ports 465/587 may be blocked. The contact message was safely saved in contacts.json.`);
        }
      }
    } else {
      console.log(`[BACKEND] SMTP credentials not configured (needs SMTP_HOST, SMTP_USER, SMTP_PASS). Message logged locally in contacts.json.`);
    }

    res.json({ success: true, message: "Transmission complete. Your direct message has been securely submitted." });
  } catch (error) {
    console.error("[BACKEND] Contact API Error:", error);
    res.status(500).json({ error: "Failed to process message." });
  }
});

// Gemini Chat Agent Endpoint
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
    if (!ai) {
      res.status(503).json({ error: "The assistant is not configured yet." });
      return;
    }

    let liveNewsContextText = "";
    if (cachedNewsStories.length > 0) {
      liveNewsContextText = cachedNewsStories.slice(0, 10).map((story, index) => {
        return `${index + 1}. ${story.title}
Author: ${story.by || "unknown"} | Score: ${story.score || 0}
URL: ${story.url || `https://news.ycombinator.com/item?id=${story.id}`}`;
      }).join("\n\n");
    } else {
      liveNewsContextText = "Live Hacker News context could not be fetched right now. Give a concise fallback warning instead of inventing headlines.";
    }

    // Always fetch latest or cached repos & readmes
    const repos = await fetchGithubData();

    // Construct highly detailed portfolio knowledge base context (TRUNCATED for speed)
    const reposContextText = repos.map((r, i) => {
      // Truncate readme to save massive amount of tokens and make AI extremely fast
      const truncatedReadme = r.readme && r.readme.length > 800 
        ? r.readme.substring(0, 800) + "... [TRUNCATED]" 
        : (r.readme || "No README provided.");

      return `--- REPO #${i + 1}: ${r.name} ---
URL: ${r.html_url}
Language: ${r.language || "Not Specified"}
Stars: ${r.stargazers_count} | Forks: ${r.forks_count}
Description: ${r.description || "No description provided."}
README Snippet:
${truncatedReadme}
`;
    }).join("\n\n");

    const systemInstruction = `You are "umu", a highly advanced, ultra-concise retro-terminal AI Assistant built into Umesh Kumar Sahoo's personal portfolio website. 
Your purpose is to act as "umu", an agent that knows absolutely everything about Umesh, his professional background, his projects, and his codebases.

Here is the authoritative information about Umesh:

=== AUTHORATIVE RESUME ===
${RESUME_TEXT}

=== LIVE GITHUB REPOSITORIES AND READMES ===
${reposContextText}

${liveNewsContextText ? `=== LIVE TECH NEWS CONTEXT ===
${liveNewsContextText}
` : ""}

Guidelines for responding:
1. Your name is "umu". Always identify as "umu" if asked.
2. Maintain a high-quality, professional, tech-savvy retro terminal intelligence persona.
3. CRITICAL: Keep your responses extremely short, direct, and concise (typically 1 to 3 short sentences or brief terminal bullet points) by default. ONLY provide detailed explanations, breakdowns, or code details if the user explicitly asks you to "describe", "explain in detail", "expand", "elaborate", "give details", or similar. Otherwise, ALWAYS keep things brief and concise.
4. When explicitly asked to describe or explain, use the actual detailed README files or resume context to explain how it works under the hood. Be specific!
5. Do not invent details not present in the provided resume or README contexts.
6. When live tech news context is provided, summarize only those headlines, respect the requested count up to 10, and keep each item brief.
`;

    // Map history to Google GenAI format if any
    const contents: any[] = [];
    const safeHistory = Array.isArray(history) ? history.slice(-10) : [];
    for (const h of safeHistory) {
      const content = normalizeText(h?.content, 2000, true);
      if (!content) continue;
      contents.push({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: content }]
      });
    }
    // Append current message
    contents.push({
      role: "user",
      parts: [{ text: trimmedMessage }]
    });

    console.log(`[BACKEND] Querying Gemini Flash for user request...`);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    const reply = response.text || "No response generated.";
    res.json({ reply, reposScanned: repos.length });
  } catch (error) {
    console.error("[BACKEND] Gemini API Error:", error);
    res.status(500).json({ error: "Assistant processing failed." });
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

    // Non-blocking SMTP diagnostic check on startup
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    if (smtpHost && smtpUser && smtpPass) {
      const port = Number(smtpPort) || 587;
      const isSecure = port === 465;
      const testTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: port,
        secure: isSecure,
        auth: { user: smtpUser, pass: smtpPass },
        connectionTimeout: 8000,
        tls: { rejectUnauthorized: false },
      });
      testTransporter.verify((err) => {
        if (err) {
          console.warn(`[BACKEND] SMTP Initial Check Warning: ${err.message}`);
          if ((err as any).code === "EAUTH") {
            console.warn("[BACKEND] SMTP Auth Hint: Google/Provider rejected credentials. For Gmail, make sure SMTP_PASS is a 16-character Google App Password (not your normal password).");
          }
        } else {
          console.log(`[BACKEND] SMTP Initial Check: Verified and ready to send via ${smtpUser}`);
        }
      });
    } else {
      console.log("[BACKEND] SMTP Note: SMTP_HOST/USER/PASS not fully set. Form submissions are safely logged to contacts.json.");
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
