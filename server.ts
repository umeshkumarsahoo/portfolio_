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
Bhubaneswar, Odisha | sahooumesh2003@gmail.com | +91-7735203945 | GitHub | LinkedIn | LeetCode
EDUCATION
- Silicon University, Bhubaneswar · B.Tech – Computer Science & Engineering (4th Year, CGPA: 9.60 / 10) | 2023–2027
- Jawahar Navodaya Vidyalaya, Panikoili · Senior Secondary (PCMB) · CBSE | 91.2% | 2021
- Jawahar Navodaya Vidyalaya, Panikoili · Secondary · CBSE | 95.8% | 2019

TECHNICAL SKILLS
- Languages: Python, Java, JavaScript (ES6+), SQL, C
- AI / ML / Gen AI: Machine Learning, NLP, RAG Pipelines, LLM Integration, Vector Embeddings, Whisper, Scikit-learn, XGBoost, Gradient Boosting, LSTM, RNN, ARIMA, Time Series Forecasting
- Data Engineering: Pandas, NumPy, Feature Engineering, Data Preprocessing, Regression, Classification, Clustering, Statistical Modeling
- Cloud & DevOps: GitHub Actions (CI/CD), Terraform, Infrastructure as Code (IaC), Linux
- Web & Backend: React.js, Node.js, Express.js, MongoDB, Flask, REST APIs
- Tools: TensorFlow, Keras, Jupyter Notebook, Postman, Matplotlib, Seaborn, Plotly, Git, GitHub

EXPERIENCE
- DevOps Engineer Intern · Ingenious Tech World (Jun 2025 – Jul 2025)
  * Engineered CI/CD pipelines via GitHub Actions — automated build, test & deploy workflows, cutting manual deployment effort by 40%.
  * Provisioned scalable cloud infrastructure using Terraform (IaC), ensuring environment consistency across dev and staging; applied distributed-systems principles for multi-region reliability.
- MERN Stack Developer Intern · Syllogistick (Jun 2024 – Jul 2024)
  * Built production e-commerce platform: MongoDB + Express.js + React.js + Node.js with JWT auth and 10+ REST API endpoints.
  * Improved frontend responsiveness via React code-splitting; optimized MongoDB schema design to reduce query latency.

PROJECTS
- RAG-Based Video Teaching Assistant (Python, Whisper, RAG, LLM, Vector Embeddings, Streamlit)
  * Designed Gen AI Q&A system using Retrieval-Augmented Generation (RAG): Whisper transcription → semantic embeddings → cosine similarity retrieval → timestamp-aware chunking.
  * Implemented confidence-threshold filtering to suppress hallucinated responses, improving reliability across educational LLM workflows.
- FreshGuard – Shelf-Life Prediction System (Python, Gradient Boosting, Scikit-learn, Flask, GitHub Actions CI/CD)
  * Led end-to-end ML pipeline on 3,552 real-world records; achieved R²=0.89 with Gradient Boosting — 31% improvement over baseline after benchmarking 5+ regression models.
  * Deployed trained model as Flask REST API with GitHub Actions CI/CD, enabling automated testing and cloud-ready continuous deployment.
- Nifty-50 Stock Price Forecasting (ARIMAX, LSTM, RNN) (Python, TensorFlow, Keras, pmdarima, Statsmodels, LightGBM)
  * Forecasted VWAP on 20-year ICICI Bank / Nifty-50 dataset; engineered 32 lag features via 3d/7d/30d rolling mean+std sliding windows across 5 financial indicators.
  * Confirmed non-stationarity (ADF stat: −2.69); applied Box-Cox transformation + additive/multiplicative seasonal decomposition + ACF/PACF analysis before modelling.
  * Benchmarked AR(3), ARIMAX (auto_arima/pmdarima), LSTM (100 units), SimpleRNN; LSTM outperformed RNN by ~3–4% MAE with EarlyStopping (patience=21) on 80/20 split.

ACHIEVEMENTS & CERTIFICATIONS
- Runner-Up — SPEC2MODEL ML Challenge (Food Delivery Delay Prediction)
- 2nd Place — Algo Arena 2.0, Silicon University
- Selected for the PwC Launchpad Program (Ongoing)
- Google Generative AI (Intro) · IBM Introduction to AI · Job Ready Data Science · Active LeetCode problem-solver (DSA & Design Thinking, username: phribbi39)
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
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort) || 587,
        secure: smtpPort === "465",
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      await transporter.sendMail({
        from: `"${trimmedName} (Portfolio Contact)" <${smtpUser}>`,
        to: mailTo,
        replyTo: trimmedEmail,
        subject: `New Portfolio Message from ${trimmedName}`,
        text: `You have received a new contact submission from your portfolio.\n\nFrom: ${trimmedName} <${trimmedEmail}>\nDate: ${new Date().toLocaleString()}\n\nMessage:\n${trimmedMessage}\n\n(Persisted durably in contacts.json)`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #ccc; padding: 20px;">
            <h2 style="border-bottom: 2px solid #333; padding-bottom: 8px;">New Portfolio Contact</h2>
            <p><strong>From:</strong> ${safeName} (&lt;${safeEmail}&gt;)</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #333; margin-top: 15px; white-space: pre-wrap;">${safeMessage}</div>
            <p style="font-size: 11px; color: #777; margin-top: 25px;">This message was also securely saved to your contacts.json file on the server.</p>
          </div>
        `
      });
      console.log(`[BACKEND] SMTP email sent successfully.`);
    } else {
      console.log(`[BACKEND] SMTP credentials not configured. Simulation succeeded. Message logged locally in contacts.json.`);
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

    // Construct highly detailed portfolio knowledge base context
    const reposContextText = repos.map((r, i) => {
      return `--- REPO #${i + 1}: ${r.name} ---
URL: ${r.html_url}
Language: ${r.language || "Not Specified"}
Stars: ${r.stargazers_count} | Forks: ${r.forks_count}
Description: ${r.description || "No description provided."}
README.md Content:
${r.readme}
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

    console.log(`[BACKEND] Querying Gemini 3.5 Flash for user request...`);
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
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
