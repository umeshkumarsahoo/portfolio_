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
  resolveQueryProject,
  ProjectId,
  ChunkMetadata,
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

interface RepoData {
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  readme: string;
  files?: string[];
}

// Index 5 Core Flagship Projects into RAG engine with explicit ProjectId and ChunkMetadata

// 1. FreshGuard: Produce Shelf-Life Predictor
ragEngine.indexDirectDocument(
  "https://github.com/umeshkumarsahoo/lab_project_fresh_guard",
  "GitHub: lab_project_fresh_guard (FreshGuard Produce Shelf-Life Predictor)",
  `Repository: lab_project_fresh_guard
Author: Umesh Kumar Sahoo
GitHub URL: https://github.com/umeshkumarsahoo/lab_project_fresh_guard
Primary Language: Python
Description: FreshGuard is a supervised machine learning produce shelf-life predictor. It predicts remaining shelf life in days from produce quality and storage conditions.
Dataset & Features: Evaluated on 3,552 produce records from Datasets/FreshGuard_RAW_dirty.csv across 6 numeric features (Initial_Brix_Level, Storage_Temperature_C, Storage_Humidity_Percent, Initial_Damage_Score, Firmness_Score, Weight_Loss_Percent) and 3 categorical features (Produce_Type, Packaging_Type, Ripeness_Stage).
Model Training & Metrics: Evaluated LinearRegression, Ridge, Lasso, RandomForestRegressor, and GradientBoostingRegressor. The best model was GradientBoostingRegressor selected based on Root Mean Squared Error (RMSE). Metrics tracked: MAE, RMSE, and R² score. Optimal model weights exported to best_regressor.pkl.
Web Deployment: Flask web server running on port 8080 with a /predict POST endpoint for real-time shelf life inference.
Files in Repository: app.py, train.py, Datasets/FreshGuard_RAW_dirty.csv, best_regressor.pkl, requirements.txt`,
  {
    projectId: "freshguard",
    documentType: "documentation",
    sourceUrl: "https://github.com/umeshkumarsahoo/lab_project_fresh_guard",
    language: "Python",
  }
).catch(() => {});

// 1b. FreshGuard Source Code (app.py)
ragEngine.indexDirectDocument(
  "https://github.com/umeshkumarsahoo/lab_project_fresh_guard/blob/main/app.py",
  "Source: app.py (FreshGuard GradientBoostingRegressor & Flask Server)",
  `from flask import Flask, render_template, request
from sklearn.ensemble import GradientBoostingRegressor
import joblib

app = Flask(__name__, template_folder='.')

# 1. Train GradientBoostingRegressor on produce dataset (selected best by RMSE)
gb = GradientBoostingRegressor(n_estimators=100, random_state=42)
gb.fit(X_train, y_train)
joblib.dump(gb, "best_regressor.pkl")

# 2. Flask prediction endpoint for produce shelf life
@app.route("/predict", methods=["POST"])
def predict():
    model = joblib.load("best_regressor.pkl")
    features = [float(request.form[k]) for k in numeric_cols]
    prediction = model.predict([features])
    return {"remaining_shelf_life_days": float(prediction[0])}`,
  {
    projectId: "freshguard",
    documentType: "source_code",
    sourceUrl: "https://github.com/umeshkumarsahoo/lab_project_fresh_guard",
    filePath: "app.py",
    language: "Python",
  }
).catch(() => {});

// 2. RAG Teaching Assistant: Video Lecture Semantic Search
ragEngine.indexDirectDocument(
  "https://github.com/umeshkumarsahoo/Teaching_assistant-rag-based-",
  "GitHub: Teaching_assistant-rag-based- (Video RAG Teaching Assistant)",
  `Repository: Teaching_assistant-rag-based-
Author: Umesh Kumar Sahoo
GitHub URL: https://github.com/umeshkumarsahoo/Teaching_assistant-rag-based-
Primary Language: Python
Description: A video-to-text Retrieval-Augmented Generation (RAG) teaching assistant that lets students search video lectures by concept and jump to exact timestamps.
Files in Repository: APP.PY, api.py, create_chunks.py, process_video.py, requirements.txt, prompt.txt, After_chunking.ipynb, process_incoming.ipynb
Pipeline Architecture:
1. Video to Audio (process_video.py): Uses ffmpeg to convert video to mp3.
2. Transcription & Timestamped Chunking (create_chunks.py): Uses OpenAI Whisper large-v2 to transcribe audio and output structured JSON segments with start and end timestamps.
3. Vector Embeddings & Storage (APP.PY, api.py): Generates dense vector representations with BGE-M3 (via Ollama) or all-MiniLM-L6-v2 (via Hugging Face) and caches in embeddings.joblib.
4. Cosine Similarity Search & UI (api.py): Computes cosine similarity with threshold 0.60 in Streamlit with direct timestamp navigation.`,
  {
    projectId: "rag",
    documentType: "architecture",
    sourceUrl: "https://github.com/umeshkumarsahoo/Teaching_assistant-rag-based-",
    language: "Python",
  }
).catch(() => {});

// 2b. RAG Teaching Assistant Source Code (create_chunks.py)
ragEngine.indexDirectDocument(
  "https://github.com/umeshkumarsahoo/Teaching_assistant-rag-based-/blob/main/create_chunks.py",
  "Source: create_chunks.py (Whisper large-v2 Transcription & Chunking)",
  `import whisper
import json
import os

# 1. Load OpenAI Whisper large-v2 for accurate speech transcription
model = whisper.load_model("large-v2")
audios = os.listdir("audios")

# 2. Transcribe and extract time-indexed segments
for audio in audios:
    number = audio.split("_")[0].strip()
    title = audio.split("_")[1].replace(".mp3", "").replace("_", " ")
    result = model.transcribe(
        audio=f"audios/{audio}",
        language='hi',
        task='translate',
        word_timestamps=False,
    )
    chunks = []
    for segment in result['segments']:
        chunks.append({
            "number": number,
            "title": title,
            "start": segment['start'],
            "end": segment['end'],
            "text": segment['text'].strip()
        })
    chunks_with_data = {"chunks": chunks, "data": result['text']}
    with open(f"jsons/{audio}.json", "w") as f:
        json.dump(chunks_with_data, f, indent=4)`,
  {
    projectId: "rag",
    documentType: "source_code",
    sourceUrl: "https://github.com/umeshkumarsahoo/Teaching_assistant-rag-based-",
    filePath: "create_chunks.py",
    language: "Python",
  }
).catch(() => {});

// 3. Time Series Forecasting: Nifty-50 Stock Analysis
ragEngine.indexDirectDocument(
  "https://github.com/umeshkumarsahoo/Time_series-",
  "GitHub: Time_series- (Nifty-50 Time Series Forecasting)",
  `Repository: Time_series-
Author: Umesh Kumar Sahoo
GitHub URL: https://github.com/umeshkumarsahoo/Time_series-
Primary Language: Python / Jupyter Notebook
Description: Time-series analysis and forecasting system on the Nifty-50 stock market dataset.
Models & Architecture: Tests statistical and deep learning forecasting architectures—including ARIMA, pmdarima (AutoARIMA), LSTMs, and Recurrent Neural Networks (RNNs) in Keras—to model trends, seasonality, and price volatility.
Frameworks: Statsmodels, Keras, pmdarima, Scikit-learn, Pandas`,
  {
    projectId: "timeseries",
    documentType: "documentation",
    sourceUrl: "https://github.com/umeshkumarsahoo/Time_series-",
    language: "Python",
  }
).catch(() => {});

// 4. DevOps & Cloud Infrastructure
ragEngine.indexDirectDocument(
  "https://github.com/umeshkumarsahoo/portfolio_/devops",
  "DevOps & Cloud Infrastructure Architecture",
  `Project: DevOps & Cloud Infrastructure Architecture
Author: Umesh Kumar Sahoo
Description: Cloud infrastructure automation, container orchestration, and continuous integration pipelines.
Stack & Tools: HashiCorp Terraform for Infrastructure as Code, Docker for containerizing microservices, GitHub Actions for automated CI/CD deployment pipelines, AWS and Linux cloud servers, Nginx reverse proxy configuration, rate limiting, and Postman API automation.
GitHub Link: https://github.com/umeshkumarsahoo/portfolio_`,
  {
    projectId: "devops",
    documentType: "documentation",
    sourceUrl: "https://github.com/umeshkumarsahoo/portfolio_",
    language: "HCL / Dockerfile / YAML",
  }
).catch(() => {});

// 5. BiGRU Emotion Classifier
ragEngine.indexDirectDocument(
  "https://github.com/umeshkumarsahoo/sentiment_analysis",
  "GitHub: sentiment_analysis (BiGRU Text Emotion Classifier)",
  `Repository: sentiment_analysis
Author: Umesh Kumar Sahoo
GitHub URL: https://github.com/umeshkumarsahoo/sentiment_analysis
Primary Language: Python
Description: Bidirectional Gated Recurrent Unit (BiGRU) deep learning neural network for sequence-aware text sentiment and emotion classification.
Architecture: Built in Keras/TensorFlow to process sequential text tokens in both forward and backward directions, capturing long-term contextual nuances. Deployed as an asynchronous low-latency microservice using FastAPI.`,
  {
    projectId: "emotion",
    documentType: "documentation",
    sourceUrl: "https://github.com/umeshkumarsahoo/sentiment_analysis",
    language: "Python",
  }
).catch(() => {});

// 6. E-Commerce Advance: Full-Stack Express, MongoDB & React Platform
ragEngine.indexDirectDocument(
  "https://github.com/umeshkumarsahoo/ecommerce_advance",
  "GitHub: ecommerce_advance (Full-Stack E-Commerce & Auth)",
  `Repository: ecommerce_advance
Author: Umesh Kumar Sahoo
GitHub URL: https://github.com/umeshkumarsahoo/ecommerce_advance
Primary Language: JavaScript
Description: Full-stack e-commerce web platform featuring Express REST API routes, MongoDB User/Order models, and authentication.
Files in Repository: backend/routes/auth.js, backend/models/User.js, backend/models/Order.js, backend/models/Product.js, src/context/AuthContext.jsx, src/pages/LoginPage.jsx, package.json`,
  {
    projectId: "ecommerce",
    documentType: "documentation",
    sourceUrl: "https://github.com/umeshkumarsahoo/ecommerce_advance",
    language: "JavaScript",
  }
).catch(() => {});

// 6b. E-Commerce Authentication Route Code
ragEngine.indexDirectDocument(
  "https://github.com/umeshkumarsahoo/ecommerce_advance/blob/main/backend/routes/auth.js",
  "Source: auth.js (User Registration & Authentication Endpoint)",
  `const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.post('/register', async (req, res) => {
    try {
        const { name, email, mobile, password } = req.body;
        if (!name || !email || !mobile || !password) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'An account with this email already exists' });
        }
        const user = new User({ name, email: email.toLowerCase(), mobile, password });
        await user.save();
        return res.status(201).json({ success: true, message: 'User registered successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});`,
  {
    projectId: "ecommerce",
    documentType: "source_code",
    sourceUrl: "https://github.com/umeshkumarsahoo/ecommerce_advance",
    filePath: "backend/routes/auth.js",
    language: "JavaScript",
  }
).catch(() => {});

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

// Helper function to discover all repositories via pagination and scan trees & readmes
async function fetchGithubData(forceRefresh = false): Promise<RepoData[]> {
  const now = Date.now();
  if (!forceRefresh && cachedRepos.length > 0 && now - cacheTime < CACHE_DURATION) {
    return cachedRepos;
  }

  try {
    console.log(`[BACKEND] Discovering full repository catalogue for ${GITHUB_USERNAME} from GitHub API...`);
    const headers: Record<string, string> = {
      "User-Agent": "Retro-Terminal-Portfolio-Agent",
      "Accept": "application/vnd.github.v3+json",
    };

    if (GITHUB_TOKEN) {
      const trimmedToken = GITHUB_TOKEN.trim();
      headers["Authorization"] = trimmedToken.startsWith("Bearer ") || trimmedToken.startsWith("token ")
        ? trimmedToken
        : `Bearer ${trimmedToken}`;
    }

    let page = 1;
    const allFetchedRepos: any[] = [];

    while (true) {
      const pageUrl = `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=100&page=${page}`;
      let pageRes = await fetch(pageUrl, { headers });

      // If token expired or rate-limited on private scope, retry unauthenticated
      if (!pageRes.ok && (pageRes.status === 401 || pageRes.status === 403) && headers["Authorization"]) {
        console.warn(`[BACKEND] GitHub token returned HTTP ${pageRes.status}. Retrying unauthenticated for public repositories...`);
        delete headers["Authorization"];
        pageRes = await fetch(pageUrl, { headers });
      }

      if (!pageRes.ok) {
        if (page === 1) {
          throw new Error(`Failed to fetch repos: ${pageRes.statusText} (${pageRes.status})`);
        }
        break; // partial pagination success
      }

      const list = await pageRes.json();
      if (!Array.isArray(list) || list.length === 0) break;
      allFetchedRepos.push(...list);
      if (list.length < 100) break;
      page++;
    }

    // Build and update the unified catalogue in ragEngine
    const catalogueEntries = allFetchedRepos.map((r: any) => ({
      name: r.name,
      fullName: r.full_name || `${GITHUB_USERNAME}/${r.name}`,
      description: r.description,
      htmlUrl: r.html_url,
      defaultBranch: r.default_branch || "main",
      language: r.language,
      topics: Array.isArray(r.topics) ? r.topics : [],
      stars: r.stargazers_count || 0,
      forks: r.forks_count || 0,
      isFork: Boolean(r.fork),
      updatedAt: r.updated_at || new Date().toISOString(),
      size: r.size || 0,
    }));

    if (catalogueEntries.length > 0) {
      ragEngine.updateRepoCatalogue(catalogueEntries);
    }

    const compiledRepos: RepoData[] = [];

    // Process repositories for READMEs and Git trees
    for (const repo of allFetchedRepos) {
      if (repo.fork) continue; // Focus deep indexing on original projects

      let readmeText = "No README file found or content unavailable.";
      let files: string[] = [];

      // 1. Fetch README
      try {
        const readmeUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${repo.name}/readme`;
        const readmeRes = await fetch(readmeUrl, {
          headers: { ...headers, Accept: "application/vnd.github.v3.raw" },
          signal: AbortSignal.timeout(5000),
        });

        if (readmeRes.ok) {
          readmeText = await readmeRes.text();
          if (readmeText.length > 3500) {
            readmeText = readmeText.substring(0, 3500) + "\n\n[README TRUNCATED FOR LENGTH]";
          }
        }
      } catch (err) {
        // README fetch failure is non-fatal
      }

      // 2. Fetch Recursive Git Tree to discover supported source files (skip large forks like docs)
      if (repo.size < 50000) {
        try {
          const branch = repo.default_branch || "main";
          const treeUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${repo.name}/git/trees/${branch}?recursive=1`;
          const treeRes = await fetch(treeUrl, { headers, signal: AbortSignal.timeout(5000) });
          if (treeRes.ok) {
            const treeData = await treeRes.json();
            if (Array.isArray(treeData.tree)) {
              files = treeData.tree
                .filter((item: any) => item.type === "blob")
                .map((item: any) => item.path)
                .filter((p: string) => {
                  const lower = p.toLowerCase();
                  if (lower.startsWith(".") && !lower.startsWith(".github")) return false;
                  if (lower.includes("node_modules/") || lower.includes("dist/") || lower.includes("build/")) return false;
                  return !lower.endsWith(".png") && !lower.endsWith(".jpg") && !lower.endsWith(".pkl") && !lower.endsWith(".csv");
                });
            }
          }
        } catch {
          // Tree fetch failure is non-fatal
        }
      }

      const repoData: RepoData = {
        name: repo.name,
        description: repo.description,
        html_url: repo.html_url,
        stargazers_count: repo.stargazers_count || 0,
        forks_count: repo.forks_count || 0,
        language: repo.language,
        readme: readmeText,
        files: files.length > 0 ? files : undefined,
      };

      compiledRepos.push(repoData);

      // Deeply index repository documentation into RAG engine with ProjectId
      let repoProjId: ProjectId = "general";
      const nameL = repo.name.toLowerCase();
      if (nameL.includes("fresh_guard") || nameL.includes("freshguard")) repoProjId = "freshguard";
      else if (nameL.includes("teaching_assistant") || nameL.includes("rag")) repoProjId = "rag";
      else if (nameL.includes("time_series")) repoProjId = "timeseries";
      else if (nameL.includes("sentiment") || nameL.includes("emotion")) repoProjId = "emotion";
      else if (nameL.includes("ecommerce")) repoProjId = "ecommerce";
      else if (nameL.includes("devops")) repoProjId = "devops";
      else if (nameL.includes("portfolio")) repoProjId = "portfolio";

      const ragDoc = `Repository: ${repo.name}
Language: ${repo.language || "Code"}
URL: ${repo.html_url}
Description: ${repo.description || "Open-source repository by Umesh Kumar Sahoo."}
${files.length > 0 ? `Files in Repository: ${files.slice(0, 20).join(", ")}` : ""}

=== README & DOCUMENTATION ===
${readmeText}`;

      ragEngine.indexDirectDocument(
        repo.html_url,
        `GitHub: ${repo.name} (${repo.language || "Code"})`,
        ragDoc,
        {
          projectId: repoProjId,
          documentType: "readme",
          sourceUrl: repo.html_url,
          language: repo.language || undefined,
        }
      ).catch(() => {});
    }

    cachedRepos = compiledRepos;
    cacheTime = now;
    console.log(`[BACKEND] Discovered and indexed ${allFetchedRepos.length} total repositories (${cachedRepos.length} original projects).`);
    return cachedRepos;
  } catch (error) {
    console.warn("[BACKEND] Notice fetching live GitHub data, using persisted catalogue:", (error as any)?.message || error);
    // Graceful fallback to persisted/authoritative catalogue
    if (cachedRepos.length === 0) {
      const catalogue = ragEngine.getRepoCatalogue();
      cachedRepos = catalogue
        .filter((r) => !r.isFork)
        .map((r) => ({
          name: r.name,
          description: r.description,
          html_url: r.htmlUrl,
          stargazers_count: r.stars,
          forks_count: r.forks,
          language: r.language,
          readme: r.description || "Open-source project by Umesh Kumar Sahoo.",
          files: r.files,
        }));
    }
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
      files: r.files,
    }));
    res.json(summaryList);
  } catch (error) {
    console.error("[BACKEND] GitHub refresh endpoint error:", error);
    res.status(500).json({ error: "Failed to refresh repositories." });
  }
});

// Inspect file tree / file contents from public repository
app.get("/api/github/repos/:repo/contents", async (req, res) => {
  try {
    const repoName = req.params.repo.replace(/[^a-zA-Z0-9_.-]/g, "");
    const repos = await fetchGithubData(false);
    const targetRepo = repos.find(r => r.name.toLowerCase() === repoName.toLowerCase());

    if (!targetRepo) {
      res.status(404).json({ error: "Repository not found in Umesh's projects." });
      return;
    }

    res.json({
      name: targetRepo.name,
      html_url: targetRepo.html_url,
      language: targetRepo.language,
      files: targetRepo.files || [],
      readmeExcerpt: targetRepo.readme ? targetRepo.readme.substring(0, 500) : "",
    });
  } catch (err) {
    console.error("[BACKEND] Repo contents lookup error:", err);
    res.status(500).json({ error: "Failed to read repository contents." });
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

// Live Tech Pulse Multi-Story Roundup
function generateLiveTechPulseBriefing(news: HackerNewsStory[]): string {
  if (!news || news.length === 0) {
    return `### 📡 Live Tech Pulse · Hacker News

I'm currently syncing with the Hacker News live stream to pull today's freshest engineering developments. In the meantime, feel free to ask me about Umesh's background, his **9.60 CGPA** at Silicon University, or his **RAG and ML projects**!`;
  }

  const topStories = news.slice(0, 5);
  const storySummaries = topStories.map((s, idx) => {
    const num = `0${idx + 1}`;
    const cleanSnippet = s.text
      ? s.text.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").slice(0, 140).trim()
      : `Trending among developers with ${s.score || 0} upvotes on Hacker News.`;
    return `${num}. **[${s.title}](${s.url || `https://news.ycombinator.com/item?id=${s.id}`})** (${s.score || 0} pts · @${s.by || "hn"})\n   ↳ *${cleanSnippet}*`;
  }).join("\n\n");

  return `### 📡 Live Tech Pulse · Today's Top Developer Headlines

Here's what the software engineering and open-source world is buzzing about on Hacker News today:

${storySummaries}

---
*💡 Feel free to ask about any engineering topic, code implementation, or Umesh's projects!*`;
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

    const safeHistory = Array.isArray(history) ? history.slice(-6) : [];
    const projectFilter = resolveQueryProject(trimmedMessage, safeHistory);
    const isCode = isCodeRequest(trimmedMessage);

    const isGreeting =
      lowerMsg === "hi" ||
      lowerMsg === "hello" ||
      lowerMsg === "hey" ||
      lowerMsg === "yo" ||
      lowerMsg === "help" ||
      lowerMsg.startsWith("hi ") ||
      lowerMsg.startsWith("hello ") ||
      lowerMsg.startsWith("hey ") ||
      lowerMsg.includes("who are you") ||
      lowerMsg.includes("who r u") ||
      lowerMsg.includes("what can you do");

    // Retrieve top 3-5 relevant evidence chunks from indexed URLs (skip noisy search for greetings)
    const urlEvidence = isGreeting ? { results: [] } : ragEngine.retrieve(trimmedMessage, 4, 0.15, projectFilter, isCode);
    const sourceEvidenceSection = urlEvidence.results.length > 0
      ? `\n=== VERIFIED SOURCE EVIDENCE ===\n${urlEvidence.results.map((r, i) => `#${i + 1} [${r.chunk.title}] (${r.chunk.url}): ${r.chunk.text.substring(0, 320)}`).join("\n\n")}\n`
      : "";

    // If Gemini client is active, try primary and fallback models with strict token & context limits
    if (ai) {
      try {
        const topRepos = repos.slice(0, 10);
        const reposContextText = topRepos.map((r, i) => {
          const shortDesc = r.description ? r.description.substring(0, 100) : "Open-source repository.";
          const filesSummary = r.files && r.files.length > 0 ? ` [Files: ${r.files.slice(0, 6).join(", ")}]` : "";
          return `#${i + 1} ${r.name} (${r.language || "Code"}, ★${r.stargazers_count}): ${shortDesc}${filesSummary}`;
        }).join("\n");

        const newsContextSection = (hasExplicitNewsIntent && liveNewsContextText)
          ? `\n=== TOP TECH NEWS (Use ONLY because user asked about news) ===\n${liveNewsContextText}\n`
          : "";

        const REQUIRED_SYSTEM_PROMPT = `You are UMU, Umesh's portfolio assistant and technical coding helper. Answer the exact question directly and accurately. Retrieve portfolio facts from the correct project before answering. When asked for code, provide actual retrieved source code whenever available; do not replace it with generic boilerplate. Use conversation history to resolve follow-up questions. Keep answers concise, relevant, and readable. Do not include unrelated project descriptions or repeat source documents. Distinguish verified project facts from general technical knowledge. If the requested code or evidence is unavailable, state that clearly rather than fabricating it. Cite the relevant source. Never claim zero hallucinations.`;

        const systemInstruction = `${REQUIRED_SYSTEM_PROMPT}

ADDITIONAL CONTEXT & GUIDELINES:
1. ANSWER THE EXACT QUESTION FIRST: Provide a direct, relevant answer immediately.
2. CONCISENESS & CLARITY: For simple questions, answer directly in 2 to 5 sentences. For technical explanations or lists, use clear, concise bullet points. Expand only when explicitly requested. Never dump an entire README or unrelated project descriptions.
3. CODE-FIRST POLICY: When the user requests code or implementation, provide complete, runnable code FIRST in a markdown code block (\`\`\`language ... \`\`\`), followed by a brief 1-2 sentence explanation. Never write dummy placeholder functions.
4. CORRECT PROJECT IDENTITY: Maintain strict boundaries for FreshGuard (lab_project_fresh_guard produce shelf life), RAG Teaching Assistant (Teaching_assistant-rag-based-), DevOps (Terraform, Docker, CI/CD), BiGRU Emotion Classifier (sentiment_analysis), and Time Series Forecasting (Time_series-). Link to the exact repository or source file used. Never cite an unrelated repository.
5. GREETINGS & CASUAL INTROS: If the user says hello or greets you, respond warmly and briefly in 1-2 sentences as UMU and offer to help with projects or coding.
6. ENGLISH ONLY: Always output in English.

Authoritative Context:
=== AUTHORATIVE RESUME ===
${RESUME_TEXT}

=== TOP GITHUB REPOSITORIES ===
${reposContextText}
${sourceEvidenceSection}${newsContextSection}`;

        const contents: any[] = [];
        let lastRole = "";
        for (const h of safeHistory) {
          const role = h.role === "user" ? "user" : "model";
          // Gemini requires the conversation history to start with a user turn
          if (contents.length === 0 && role !== "user") continue;
          // Gemini requires strictly alternating roles
          if (role === lastRole) continue;
          const content = normalizeText(h?.content, 400, true);
          if (!content) continue;
          contents.push({
            role,
            parts: [{ text: content }]
          });
          lastRole = role;
        }
        // If the last message in history was user, remove it so we can cleanly push current user query
        if (lastRole === "user") {
          contents.pop();
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

    // Seamless fallback ensures 100% uptime: uses verified RAG evidence if available, else smart heuristic engine
    if (!reply) {
      if (hasExplicitNewsIntent && cachedNewsStories.length > 0) {
        reply = generateLiveTechPulseBriefing(cachedNewsStories);
      } else {
        reply = ragEngine.synthesizeDeterministicAnswer(
          trimmedMessage,
          urlEvidence.results,
          false,
          safeHistory,
          projectFilter
        );
      }
    }

    res.json({
      reply,
      sources: urlEvidence.results.map((r) => ({ title: r.chunk.title, url: r.chunk.url })),
      reposScanned: repos.length,
    });
  } catch (error) {
    console.error("[BACKEND] Assistant Query Endpoint Error:", error);
    // Graceful response even on unexpected exceptions
    const fallback = ragEngine.synthesizeDeterministicAnswer("help", [], false);
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
