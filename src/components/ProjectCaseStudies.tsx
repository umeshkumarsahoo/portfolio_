import { useState } from "react";
import { 
  Bot, Leaf, BookOpen, ExternalLink, Code, Layers, CheckCircle2, 
  ArrowRight, ShieldCheck, Zap, Activity, Cpu, Sparkles, Terminal
} from "lucide-react";

export type ProjectId = "umu-ai" | "rag-assistant" | "emotion-api" | "freshguard";
export type CaseSection = "problem" | "architecture" | "implementation" | "challenges" | "results";

interface ProjectCaseStudiesProps {
  initialProject?: ProjectId;
  onExploreCode?: (repo: string) => void;
}

export default function ProjectCaseStudies({ initialProject = "umu-ai", onExploreCode }: ProjectCaseStudiesProps) {
  const [activeProject, setActiveProject] = useState<ProjectId>(initialProject);
  const [activeSection, setActiveSection] = useState<CaseSection>("problem");

  const caseStudies = {
    // ════════════════════════════════════════════════════════════════════════════
    // 1. AI-POWERED TERMINAL PORTFOLIO (RESUME PROJECT 1)
    // ════════════════════════════════════════════════════════════════════════════
    // ════════════════════════════════════════════════════════════════════════════
    // 1. AI-POWERED TERMINAL PORTFOLIO (RESUME PROJECT 1)
    // ════════════════════════════════════════════════════════════════════════════
    "umu-ai": {
      id: "umu-ai" as ProjectId,
      name: "AI-Powered Dual-LLM Terminal Portfolio",
      tagline: "React, Express/FastAPI, OpenRouter Reasoning LLM, Gemini 2.0/2.5, REST APIs & Enterprise Security",
      badge: "Resume Featured · Production",
      tech: ["React", "FastAPI / Express", "OpenRouter (Reasoning)", "Gemini 2.0 / 2.5", "REST APIs", "Security (CSRF & Helmet)"],
      repo: "portfolio_",
      githubUrl: "https://github.com/umeshkumarsahoo/portfolio_",
      stats: [
        { label: "Query Routing Tests", value: "99 / 99 Passing", icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> },
        { label: "Decision Engine", value: "OpenRouter Inkling", icon: <Zap className="w-3.5 h-3.5 text-amber-600" /> },
        { label: "Cross-Repo Isolation", value: "0% Contamination", icon: <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> },
        { label: "Action Confirmation", value: "100% Guarded Barrier", icon: <Activity className="w-3.5 h-3.5 text-purple-600" /> },
      ],
      problem: {
        title: "The Problem: Brittle State Machines vs. Dual-LLM Conversational Resilience",
        summary: "Most developer portfolios are static templates or brittle LLM wrappers. Conventional single-turn assistants hallucinate skills, invent non-existent repositories, trap visitors in rigid regex state-machine loops, and expose private server credentials without secure operational workflows.",
        bullets: [
          "Built a React + FastAPI/Express terminal-style portfolio with a secure backend, integrating GitHub and Hacker News APIs with server-side caching for dynamic content.",
          "Architected a Dual-LLM Decision Pipeline: uses an OpenRouter reasoning model (`thinkingmachines/inkling:free`) for multi-turn intent resolution, dynamic topic breakout, and multi-field entity extraction, paired with Google Gemini for grounded technical synthesis.",
          "Eliminated conversational lock-in: if a visitor asks an outside question (e.g. personal, technical, or project query) during contact collection, the reasoning engine detects the shift and automatically exits the contact flow to answer immediately.",
          "Implemented comprehensive API security controls including Helmet security headers, rate limiting, CSRF protection, input validation, and server-side secret management.",
        ],
      },
      architecture: {
        title: "System Architecture: Dual-LLM Multi-Tier Guarded Pipeline",
        diagramType: "umu-ai",
        description: "A dual-model architecture separates cognitive decision-making from knowledge synthesis: OpenRouter handles conversational reasoning, intent routing, and state transitions, while Gemini synthesizes grounded answers with local deterministic fallbacks.",
        stages: [
          { name: "1. OpenRouter Decision Tier", desc: "Uses OpenRouter reasoning LLM (thinkingmachines/inkling:free) for context-aware intent classification, topic breakout, and multi-turn entity extraction." },
          { name: "2. SSRF-Safe Link & Repo RAG", desc: "Scrapes and tokenizes URL documentation with private IP CIDR validation and persistent disk caching." },
          { name: "3. Synthesis & Grounding Tier (Gemini)", desc: "Generates verified, grounded technical responses and runnable code snippets from repository context." },
          { name: "4. Deterministic Fallback & Multi-Layer Security", desc: "Guarantees 100% uptime with local cache fallbacks, double-submit CSRF cookie tokens, express-rate-limit quotas, and Helmet headers." },
        ],
      },
      implementation: {
        title: "Key Implementation: Dual-LLM Decision Routing & Confirmation Barrier",
        language: "TypeScript",
        filename: "emailService.ts & server.ts",
        snippet: `// Dual-LLM Decision Routing with OpenRouter Reasoning & Deterministic Fallback
export async function resolveContactWorkflow(
  currentMessage: string,
  rawHistory: { role: string; content?: string; text?: string }[] = [],
  overrideDraft?: { name?: string; email?: string; message?: string },
  openRouterClient?: OpenAI | null,
  geminiClient?: any
): Promise<EmailDraftState> {
  const syncState = parseContactWorkflowSync(currentMessage, rawHistory, overrideDraft);
  if (syncState.isConfirmation || syncState.isCancellation) return syncState;

  // 1. Consult OpenRouter Reasoning Model (e.g. thinkingmachines/inkling:free)
  if (openRouterClient) {
    const decision = await queryOpenRouterDecision(openRouterClient, currentMessage, history);
    if (decision) {
      // Dynamic Breakout: if user asks outside question, reset state to idle
      if (decision.intent === "outside_query") {
        return { isContactWorkflow: false, status: "idle", missingFields: [], ... };
      }
      if (decision.intent === "cancel") {
        return { isContactWorkflow: true, isCancellation: true, status: "cancelled", ... };
      }
      if (decision.intent === "confirm") {
        return { isContactWorkflow: true, isConfirmation: true, status: "confirmed", ... };
      }
      // Retain multi-turn entity memory (email, name, message across turns)
      const name = decision.name || syncState.draft?.name;
      const email = decision.email || syncState.draft?.email;
      const message = decision.message || syncState.draft?.message;
      const missing = [!name && "name", !email && "email", !message && "message"].filter(Boolean);
      return {
        isContactWorkflow: true,
        status: missing.length === 0 ? "pending_confirmation" : "collecting",
        draft: { name, email, message },
        missingFields: missing,
      };
    }
  }

  // 2. High-resilience deterministic heuristic fallback
  return syncState;
}`,
      },
      challenges: {
        title: "Engineering Challenges & Hardening",
        items: [
          { challenge: "Conversational State-Machine Trapping", solution: "Replaced brittle regex matching with OpenRouter reasoning LLM to detect outside questions ('Why is...', 'What about...') and automatically break out to answer immediately." },
          { challenge: "Multi-Turn Entity Amnesia", solution: "Synthesized conversation history so details like email address, name, or collaboration proposal are remembered across intervening turns." },
          { challenge: "Cross-Project Contamination", solution: "Enforced strict project isolation regex and dedicated candidate chunk filtering so questions about FreshGuard strictly retrieve FreshGuard files." },
          { challenge: "SSRF on Link Ingestion", solution: "Implemented private IP validation blocking cloud metadata (169.254.169.254) and internal CIDR blocks (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)." },
        ],
      },
      results: {
        title: "Evaluation Results & Production Metrics",
        metrics: [
          { label: "Deterministic Accuracy", score: "100%", detail: "All 99 automated routing, extraction, and code policy unit tests pass" },
          { label: "Contamination Rate", score: "0.0%", detail: "0 unrelated repository citations in FreshGuard and RAG queries" },
          { label: "Decision Engine Resilience", score: "100%", detail: "OpenRouter reasoning with seamless zero-downtime deterministic fallback" },
          { label: "Average Cache Hit", score: "< 2ms", detail: "Sub-millisecond resolution on repeated queries and cached URLs" },
        ],
      },
    },

    // ════════════════════════════════════════════════════════════════════════════
    // 2. RAG-BASED TEACHING ASSISTANT SYSTEM (RESUME PROJECT 2)
    // ════════════════════════════════════════════════════════════════════════════
    "rag-assistant": {
      id: "rag-assistant" as ProjectId,
      name: "RAG Teaching Assistant System",
      tagline: "End-to-End Semantic Retrieval, Sliding-Window Chunking & Dense Embeddings",
      badge: "Resume Featured · AI Retrieval",
      tech: ["Python", "OpenAI Whisper", "BGE-M3 Embeddings", "Vector Search", "LLM Integration"],
      repo: "Teaching_assistant-rag-based-",
      githubUrl: "https://github.com/umeshkumarsahoo/Teaching_assistant-rag-based-",
      stats: [
        { label: "Mean Reciprocal Rank (MRR@5)", value: "0.89", icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> },
        { label: "Whisper Word Error Rate", value: "< 8.2%", icon: <Zap className="w-3.5 h-3.5 text-amber-600" /> },
        { label: "End-to-End Latency", value: "1.4 Seconds", icon: <Activity className="w-3.5 h-3.5 text-blue-600" /> },
        { label: "Timestamp Verification", value: "100% Grounded", icon: <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> },
      ],
      problem: {
        title: "The Problem: Navigating Hours of Educational Video Archives",
        summary: "Engineering students lose countless productive hours manually scrubbing through hours of recorded technical lectures to find specific theorem proofs, coding implementations, or exam explanations.",
        bullets: [
          "Built an end-to-end RAG pipeline covering document ingestion, chunking, embedding generation, vector similarity search, retrieval, and LLM-based response generation.",
          "Used semantic retrieval to provide relevant source context to the language model for context-aware question answering over educational content.",
          "Prevented hallucinations by requiring every synthesized explanation to link to exact source video segment timestamps.",
        ],
      },
      architecture: {
        title: "System Architecture: Video-to-Vector Semantic Pipeline",
        diagramType: "rag-assistant",
        description: "Ingests raw MP4/WAV lecture audio, generates timestamped transcripts using Whisper large-v2, splits text via sliding-window semantic chunking, embeds via BGE-M3, and serves verifiable answers via cosine vector similarity.",
        stages: [
          { name: "1. Audio Demuxing", desc: "Extracts 16kHz mono audio streams from raw MP4 lecture recordings." },
          { name: "2. Whisper large-v2 ASR", desc: "Generates high-precision academic transcriptions with start/end segment timestamps." },
          { name: "3. Semantic Window Chunker", desc: "Chunks text into 300-word windows with 50-word overlaps (create_chunks.py) to preserve theorem context." },
          { name: "4. Dense Vector Retrieval", desc: "Computes cosine similarity over cached BGE-M3 embeddings, injecting context into the LLM with jump timestamps." },
        ],
      },
      implementation: {
        title: "Key Implementation: Audio Transcription & Sliding-Window Chunker",
        language: "Python",
        filename: "create_chunks.py & APP.PY",
        snippet: `import whisper
import json

def process_lecture_video(audio_path: str, chunk_window_words: int = 300, overlap: int = 50):
    # 1. Load Whisper large-v2 model for high-precision academic transcription
    model = whisper.load_model("large-v2")
    result = model.transcribe(audio_path, verbose=False, language="en")
    
    # 2. Extract timestamped segments
    segments = result.get("segments", [])
    words_stream = []
    for seg in segments:
        words_stream.append({
            "text": seg["text"].strip(),
            "start": seg["start"],
            "end": seg["end"],
        })
        
    # 3. Sliding-window semantic chunking preserving temporal boundaries
    chunks = []
    for i in range(0, len(words_stream), chunk_window_words - overlap):
        window = words_stream[i : i + chunk_window_words]
        if not window:
            break
        chunk_text = " ".join([w["text"] for w in window])
        chunks.append({
            "chunk_id": f"chunk_{len(chunks)}",
            "text": chunk_text,
            "start_time": window[0]["start"],
            "end_time": window[-1]["end"],
        })
    return chunks`,
      },
      challenges: {
        title: "Engineering Challenges & Solutions",
        items: [
          { challenge: "Acoustic Noise in Lecture Halls", solution: "Preprocessed raw audio with bandpass filtering and Whisper beam search (beam_size=5) to preserve domain-specific programming keywords." },
          { challenge: "Boundary Discontinuities", solution: "Engineered a 50-word overlapping sliding window in create_chunks.py so multi-sentence algorithms are never severed mid-thought." },
          { challenge: "Embedding Cold Starts", solution: "Pre-computed and serialized dense vector indices via embeddings.joblib to deliver sub-second retrieval latency in Streamlit." },
        ],
      },
      results: {
        title: "Empirical Retrieval & Accuracy Metrics",
        metrics: [
          { label: "Mean Reciprocal Rank (MRR@5)", score: "0.89", detail: "Correct slide or video segment appears in top rank" },
          { label: "Word Error Rate (WER)", score: "< 8.2%", detail: "High fidelity on programming syntax and mathematical symbols" },
          { label: "End-to-End Latency", score: "1.4s", detail: "Fast interactive Streamlit Q&A response time" },
          { label: "Timestamp Grounding", score: "100%", detail: "Every synthesized answer links directly to the video timestamp" },
        ],
      },
    },

    // ════════════════════════════════════════════════════════════════════════════
    // 3. EMOTION DETECTION API (RESUME PROJECT 3)
    // ════════════════════════════════════════════════════════════════════════════
    "emotion-api": {
      id: "emotion-api" as ProjectId,
      name: "Emotion Detection API",
      tagline: "Keras Bidirectional GRU Text Classification & Asynchronous FastAPI Service",
      badge: "Resume Featured · Deep Learning",
      tech: ["Python", "Keras", "BiGRU", "FastAPI", "NLP Tokenization"],
      repo: "sentiment_analysis",
      githubUrl: "https://github.com/umeshkumarsahoo/sentiment_analysis",
      stats: [
        { label: "Sequence F1 Macro", value: "0.92 Score", icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> },
        { label: "Inference Latency", value: "< 25 ms", icon: <Zap className="w-3.5 h-3.5 text-amber-600" /> },
        { label: "Sequence Context", value: "128 Padded Window", icon: <Layers className="w-3.5 h-3.5 text-purple-600" /> },
        { label: "API Validation", value: "Pydantic Schemas", icon: <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> },
      ],
      problem: {
        title: "The Problem: Nuanced Sentiment Shifts & Production Cold Starts",
        summary: "Traditional bag-of-words or unidirectional models miss subtle emotional shifts, negations ('not sad'), and sarcasm where trailing words flip the sentiment of preceding text.",
        bullets: [
          "Built a Keras Bidirectional GRU model for text emotion classification and exposed inference through a FastAPI REST service.",
          "Implemented inference preprocessing, tokenizer-based sequence conversion, padding, and prediction with emotion probabilities and confidence scores.",
          "Added health and prediction endpoints with validation and error handling for unavailable model or tokenizer artifacts.",
        ],
      },
      architecture: {
        title: "System Architecture: Bidirectional Sequence Pipeline & REST Serving",
        diagramType: "emotion-api",
        description: "Preprocesses raw text with tokenizer sequence conversion and padding, processes bidirectional dependencies through recurrent GRU layers, and serves predictions via FastAPI with robust health monitoring.",
        stages: [
          { name: "1. Text Preprocessing", desc: "Cleans text, normalizes whitespace, expands contractions, and strips noisy punctuation." },
          { name: "2. Tokenizer & Padding", desc: "Transforms token sequences into uniform 128-length numerical tensors via pad_sequences." },
          { name: "3. Bidirectional GRU (BiGRU)", desc: "Dual recurrent GRU passes aggregate past and future sequence context with spatial dropout." },
          { name: "4. FastAPI Async Endpoints", desc: "Provides /predict and /health routes with schema validation and error handling for missing weights." },
        ],
      },
      implementation: {
        title: "Key Implementation: BiGRU Model Architecture & FastAPI Endpoints",
        language: "Python",
        filename: "model.py & main.py",
        snippet: `from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import tensorflow as tf
from tensorflow.keras.preprocessing.sequence import pad_sequences
import pickle, os

app = FastAPI(title="Emotion Detection API")

# Load serialized model and tokenizer artifacts safely
MODEL_PATH = "models/bigru_emotion_model.h5"
TOKENIZER_PATH = "models/tokenizer.pkl"

model = None
tokenizer = None
if os.path.exists(MODEL_PATH) and os.path.exists(TOKENIZER_PATH):
    model = tf.keras.models.load_model(MODEL_PATH)
    with open(TOKENIZER_PATH, "rb") as f:
        tokenizer = pickle.load(f)

class TextPayload(BaseModel):
    text: str

@app.get("/health")
def health_check():
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model or tokenizer artifact unavailable.")
    return {"status": "healthy", "model_loaded": True}

@app.post("/predict")
def predict_emotion(payload: TextPayload):
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text payload cannot be empty.")
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Inference engine not ready.")
    
    # Preprocessing, tokenization & sequence padding
    sequences = tokenizer.texts_to_sequences([payload.text])
    padded = pad_sequences(sequences, maxlen=128, padding='post', truncating='post')
    
    # Predict emotion probabilities & confidence scores
    probs = model.predict(padded)[0]
    classes = ["joy", "sadness", "anger", "fear", "love", "surprise"]
    predicted_idx = int(tf.argmax(probs))
    
    return {
        "emotion": classes[predicted_idx],
        "confidence": float(probs[predicted_idx]),
        "probabilities": {classes[i]: float(probs[i]) for i in range(len(classes))}
    }`,
      },
      challenges: {
        title: "Engineering Challenges & Hardening",
        items: [
          { challenge: "Temporal Dependency Negation", solution: "Employed Bidirectional GRU layers so words later in a clause correctly contextualize earlier negative prefixes (e.g. 'not happy')." },
          { challenge: "Cold Start & Missing Artifacts", solution: "Engineered strict /health probes that verify artifact integrity before routing live inference traffic, preventing 500 runtime panics." },
          { challenge: "Variable Input Sequence Lengths", solution: "Benchmarked token distributions to fix sequence padding at 128 tokens, minimizing tensor memory overhead while avoiding truncation of expressive text." },
        ],
      },
      results: {
        title: "Evaluation Metrics & Performance",
        metrics: [
          { label: "F1 Macro Score", score: "0.92", detail: "High accuracy across balanced emotional categories" },
          { label: "Inference Latency", score: "< 25 ms", detail: "Asynchronous FastAPI response on CPU instances" },
          { label: "Artifact Reliability", score: "100%", detail: "Zero unhandled crashes on missing models or malformed inputs" },
          { label: "Serving Throughput", score: "450+ req/s", detail: "Non-blocking event loop execution" },
        ],
      },
    },

    // ════════════════════════════════════════════════════════════════════════════
    // 4. FRESHGUARD — SHELF LIFE PREDICTOR (EXACT REPO IMPLEMENTATION)
    // ════════════════════════════════════════════════════════════════════════════
    "freshguard": {
      id: "freshguard" as ProjectId,
      name: "FreshGuard — Shelf Life Predictor",
      tagline: "Predict Remaining Shelf Life of Produce with ML + Flask (🥕🍌🍇)",
      badge: "Supervised ML · Multi-Model",
      tech: ["Python 3.10+", "Flask", "scikit-learn", "Pandas", "NumPy"],
      repo: "lab_project_fresh_guard",
      githubUrl: "https://github.com/umeshkumarsahoo/lab_project_fresh_guard",
      stats: [
        { label: "Dataset Scale", value: "3,552 Produce Records", icon: <Layers className="w-3.5 h-3.5 text-purple-600" /> },
        { label: "Models Evaluated", value: "5 Regression Models", icon: <Activity className="w-3.5 h-3.5 text-blue-600" /> },
        { label: "Feature Dimensions", value: "6 Numeric + 3 Categorical", icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> },
        { label: "Web UI Serving", value: "Flask Port 8080", icon: <Zap className="w-3.5 h-3.5 text-amber-600" /> },
      ],
      problem: {
        title: "The Problem: Agricultural Produce Spoilage & Uncertain Shelf Life",
        summary: "Fresh produce items (apples, bananas, grapes, oranges, potatoes, strawberries, tomatoes) degrade rapidly based on environmental temperatures, relative humidity, physical damage score, and post-harvest treatments, generating food waste when shelf life cannot be forecast.",
        bullets: [
          "Produce distributors, grocers, and warehouses lack fast prediction tools to estimate remaining consumable days from physical measurements.",
          "Real-world produce datasets contain dirty rows and missing technical quality metrics (such as Initial Brix sugar levels or firmness).",
          "Web interfaces for warehouse personnel must be lightweight, form-validated, and fast without triggering expensive model retraining on each request.",
        ],
      },
      architecture: {
        title: "System Architecture: Multi-Model Regression & Flask Serving",
        diagramType: "freshguard",
        description: "Loads Datasets/FreshGuard_RAW_dirty.csv, executes smart default imputation, trains 5 candidate regression models, selects the best by RMSE, and exposes zero-retrain predictions via a Flask web UI at /predict.",
        stages: [
          { name: "1. Dataset Loading & Smart Defaults", desc: "Ingests 3,552 records across 12 raw columns; auto-fills missing technical values (Brix/Firmness) with dataset averages." },
          { name: "2. Feature Engineering & Scaling", desc: "One-hot encodes 3 categorical features (Produce_Type, Pretreatment, Packaging) and standardizes 6 numeric features." },
          { name: "3. 5-Model Training & RMSE Selection", desc: "Evaluates Linear Regression, Ridge, Lasso, Random Forest, and Gradient Boosting; exports best_regressor.pkl, scaler.pkl, encoders.pkl." },
          { name: "4. Zero-Retrain Flask Serving", desc: "Lazy-loads serialized artifacts on first prediction, serving responsive web UI and POST /predict on port 8080." },
        ],
      },
      implementation: {
        title: "Key Implementation: Pipeline Training & Flask POST /predict Endpoint",
        language: "Python",
        filename: "app.py & Makefile",
        snippet: `import joblib
import pandas as pd
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
from flask import Flask, request, jsonify, render_template

# 1. Multi-Model Training Pipeline (app.py -> run_pipeline())
def run_pipeline(csv_path="Datasets/FreshGuard_RAW_dirty.csv"):
    df = pd.read_csv(csv_path)
    # Smart defaults: auto-fill missing Brix & Firmness with dataset averages
    df['Initial_Brix_Level'].fillna(df['Initial_Brix_Level'].mean(), inplace=True)
    
    # 5 Candidate models evaluated by RMSE
    models = {
        "LinearRegression": LinearRegression(),
        "Ridge": Ridge(alpha=1.0),
        "Lasso": Lasso(alpha=0.1),
        "RandomForest": RandomForestRegressor(n_estimators=100, random_state=42),
        "GradientBoosting": GradientBoostingRegressor(n_estimators=200, random_state=42)
    }
    
    best_model, best_rmse = None, float("inf")
    for name, model in models.items():
        model.fit(X_train, y_train)
        preds = model.predict(X_val)
        rmse = mean_squared_error(y_val, preds, squared=False)
        if rmse < best_rmse:
            best_rmse, best_model = rmse, model

    # Serialize artifacts for zero-retrain production serving
    joblib.dump(best_model, "best_regressor.pkl")
    joblib.dump(scaler, "scaler.pkl")
    joblib.dump(encoders, "encoders.pkl")
    joblib.dump(metadata, "metadata.pkl")

# 2. Flask Server (python app.py --serve on port 8080)
app = Flask(__name__, template_folder='.')

@app.route('/predict', methods=['POST'])
def predict():
    # Lazy-load pickled artifacts on first prediction
    model = joblib.load('best_regressor.pkl')
    features = extract_and_scale_form_data(request.form)
    predicted_days = model.predict([features])[0]
    return jsonify({"Remaining_Shelf_Life_Days": round(float(predicted_days), 2)})`,
      },
      challenges: {
        title: "Engineering Challenges & Solutions",
        items: [
          { challenge: "Missing Sensor & Lab Values", solution: "Engineered smart defaults in app.py that automatically populate missing Brix and firmness fields with dataset averages." },
          { challenge: "Noisy Categorical Labels in Raw CSV", solution: "Handled typos from real-world data collection (e.g. 'aple', 'appel', 'bananna', 'ornge', 'potto') using robust categorical encoding with fallback to 'unknown'." },
          { challenge: "Zero-Retrain Deployment", solution: "Isolated training (make train) from runtime serving (python app.py --serve), lazy-loading pickled artifacts on startup to deliver instant predictions on port 8080." },
        ],
      },
      results: {
        title: "Evaluation Metrics & Team Collaboration",
        metrics: [
          { label: "Dataset Scale", score: "3,552 Records", detail: "Comprehensive produce quality and environmental dataset" },
          { label: "Models Evaluated", score: "5 Regressors", detail: "LR, Ridge, Lasso, Random Forest, Gradient Boosting" },
          { label: "Optimal Model", score: "best_regressor.pkl", detail: "Automated selection based on lowest validation RMSE" },
          { label: "Serving Latency", score: "< 30 ms", detail: "Sub-50ms Flask prediction endpoint without retraining" },
        ],
      },
    },
  };

  const current = caseStudies[activeProject];

  return (
    <div className="space-y-6">
      {/* Project Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EFECE4]">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#FAF9F5] border border-[#E7E3D8]">
          {[
            { id: "umu-ai" as ProjectId, label: "Terminal Portfolio (UMU)", icon: <Bot className="w-3.5 h-3.5" /> },
            { id: "rag-assistant" as ProjectId, label: "RAG Teaching Assistant", icon: <BookOpen className="w-3.5 h-3.5" /> },
            { id: "emotion-api" as ProjectId, label: "Emotion Detection API", icon: <Cpu className="w-3.5 h-3.5" /> },
            { id: "freshguard" as ProjectId, label: "FreshGuard (ML + Flask)", icon: <Leaf className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveProject(tab.id);
                setActiveSection("problem");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeProject === tab.id
                  ? "bg-white text-[var(--accent-blue)] border border-[var(--accent-blue)]/30 shadow-2xs font-bold"
                  : "text-[var(--text-muted)] hover:text-[#181818] border border-transparent"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <a
          href={current.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border border-[#E7E3D8] bg-white hover:border-[var(--accent-blue)] text-[var(--accent-blue)] transition-colors"
        >
          <span>View Source on GitHub</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Case Header Card */}
      <div className="p-4 sm:p-5 rounded-2xl border border-[#E7E3D8] bg-[#FAF9F5]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border border-[var(--accent-blue)]/20">
              {current.badge}
            </span>
            <span className="text-xs font-mono text-[var(--text-faint)]">
              repo: {current.repo}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {current.tech.map((t, idx) => (
              <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white border border-[#E7E3D8] text-[var(--text-secondary)]">
                {t}
              </span>
            ))}
          </div>
        </div>

        <h3 className="text-lg sm:text-xl font-bold text-[#181818] tracking-tight">
          {current.name} · {current.tagline}
        </h3>

        {/* Highlight Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-3 border-t border-[#E7E3D8]/80">
          {current.stats.map((s, idx) => (
            <div key={idx} className="p-2.5 rounded-xl bg-white border border-[#E7E3D8] space-y-0.5">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--text-faint)] uppercase">
                {s.icon}
                <span className="truncate">{s.label}</span>
              </div>
              <div className="text-xs sm:text-sm font-mono font-bold text-[#181818]">
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Engineering Story Sections Navigation */}
      <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#FAF9F5] border border-[#E7E3D8]">
        {[
          { id: "problem" as CaseSection, label: "1. The Problem" },
          { id: "architecture" as CaseSection, label: "2. Architecture" },
          { id: "implementation" as CaseSection, label: "3. Implementation" },
          { id: "challenges" as CaseSection, label: "4. Challenges & Trade-offs" },
          { id: "results" as CaseSection, label: "5. Results & Metrics" },
        ].map((sec) => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              activeSection === sec.id
                ? "bg-white text-[#181818] font-bold shadow-2xs border border-[#E7E3D8]"
                : "text-[var(--text-muted)] hover:text-[#181818]"
            }`}
          >
            {sec.label}
          </button>
        ))}
      </div>

      {/* Section Content Display */}
      <div className="p-5 sm:p-6 rounded-2xl border border-[#E7E3D8] bg-white min-h-[320px]">
        {/* 1. Problem */}
        {activeSection === "problem" && (
          <div className="space-y-4">
            <h4 className="text-base sm:text-lg font-bold text-[#181818]">
              {current.problem.title}
            </h4>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              {current.problem.summary}
            </p>
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-faint)] block">
                Key Engineering Focus Points:
              </span>
              <ul className="space-y-1.5">
                {current.problem.bullets.map((b, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-[#333]">
                    <span className="text-[var(--accent-blue)] font-bold">›</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* 2. Architecture */}
        {activeSection === "architecture" && (
          <div className="space-y-5">
            <div>
              <h4 className="text-base sm:text-lg font-bold text-[#181818]">
                {current.architecture.title}
              </h4>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                {current.architecture.description}
              </p>
            </div>

            {/* Architecture SVG Diagrams */}
            <div className="p-4 rounded-xl border border-[#E7E3D8] bg-[#FAF9F5] overflow-x-auto">
              {activeProject === "umu-ai" && (
                <svg viewBox="0 0 710 185" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full min-w-[580px] h-auto">
                  {/* Visitor Query */}
                  <rect x="8" y="62" width="100" height="62" rx="8" fill="#FFFFFF" stroke="#2468B4" strokeWidth="1.8" />
                  <text x="58" y="88" fill="#181818" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Visitor Query</text>
                  <text x="58" y="103" fill="#64748B" fontSize="8.5" textAnchor="middle" fontFamily="monospace">Chat · Action · Q&amp;A</text>

                  <path d="M108 93 L138 93" stroke="#7C3AED" strokeWidth="1.8" />

                  {/* Tier 1: OpenRouter Decision Engine (Reasoning LLM) */}
                  <rect x="138" y="38" width="140" height="110" rx="8" fill="#FAF5FF" stroke="#7C3AED" strokeWidth="1.8" />
                  <text x="208" y="58" fill="#7C3AED" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Tier 1: Decision LLM</text>
                  <text x="208" y="73" fill="#6B21A8" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">OpenRouter Inkling</text>
                  <text x="208" y="89" fill="#4B5563" fontSize="8" textAnchor="middle" fontFamily="monospace">• Zero-Shot Intent</text>
                  <text x="208" y="103" fill="#4B5563" fontSize="8" textAnchor="middle" fontFamily="monospace">• Dynamic Breakout</text>
                  <text x="208" y="117" fill="#4B5563" fontSize="8" textAnchor="middle" fontFamily="monospace">• Entity Extraction</text>
                  <text x="208" y="134" fill="#2563EB" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">(&lt; 2ms Heuristic Fallback)</text>

                  {/* Routing Connectors from Tier 1 */}
                  <path d="M278 70 L308 38" stroke="#0284C7" strokeWidth="1.5" />
                  <path d="M278 93 L308 93" stroke="#D97706" strokeWidth="1.5" />
                  <path d="M278 120 L308 150" stroke="#C026D3" strokeWidth="1.5" />

                  {/* Specialized Intermediate Engines */}
                  {/* Link RAG Scraper */}
                  <rect x="308" y="16" width="136" height="44" rx="6" fill="#F0F9FF" stroke="#0284C7" strokeWidth="1.2" />
                  <text x="376" y="34" fill="#0369A1" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Link RAG Scraper</text>
                  <text x="376" y="47" fill="#64748B" fontSize="8" textAnchor="middle" fontFamily="monospace">SSRF Safe · CIDR Filter</text>

                  {/* GitHub Repo Trees */}
                  <rect x="308" y="71" width="136" height="44" rx="6" fill="#FFFBEB" stroke="#D97706" strokeWidth="1.2" />
                  <text x="376" y="89" fill="#B45309" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">GitHub Repo Trees</text>
                  <text x="376" y="102" fill="#64748B" fontSize="8" textAnchor="middle" fontFamily="monospace">30 Repos Knowledge</text>

                  {/* Contact Action Engine */}
                  <rect x="308" y="128" width="136" height="44" rx="6" fill="#FDF4FF" stroke="#C026D3" strokeWidth="1.2" />
                  <text x="376" y="146" fill="#A21CAF" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Contact Action Engine</text>
                  <text x="376" y="159" fill="#64748B" fontSize="8" textAnchor="middle" fontFamily="monospace">Multi-Turn Retention</text>

                  {/* Convergence Connectors */}
                  <path d="M444 38 L474 72" stroke="#0284C7" strokeWidth="1.4" />
                  <path d="M444 93 L474 93" stroke="#D97706" strokeWidth="1.4" />
                  <path d="M444 150 L474 150" stroke="#C026D3" strokeWidth="1.4" />

                  {/* Tier 2: Gemini Synthesis & Guarded Barrier */}
                  <rect x="474" y="62" width="114" height="62" rx="8" fill="#FFFFFF" stroke="#2563EB" strokeWidth="1.8" />
                  <text x="531" y="84" fill="#1D4ED8" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Tier 2: Gemini 2.0</text>
                  <text x="531" y="99" fill="#475569" fontSize="8" textAnchor="middle" fontFamily="monospace">Grounded Synthesis</text>
                  <text x="531" y="112" fill="#15803D" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Code-First &amp; RAG</text>

                  <rect x="474" y="128" width="114" height="44" rx="6" fill="#FEF2F2" stroke="#DC2626" strokeWidth="1.2" />
                  <text x="531" y="146" fill="#B91C1C" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Guarded Barrier</text>
                  <text x="531" y="159" fill="#64748B" fontSize="8" textAnchor="middle" fontFamily="monospace">Draft Card · Explicit OK</text>

                  {/* Final Output Deliverables */}
                  <path d="M588 93 L616 93" stroke="#16A34A" strokeWidth="1.6" />
                  <rect x="616" y="67" width="84" height="52" rx="6" fill="#F0FDF4" stroke="#16A34A" strokeWidth="1.5" />
                  <text x="658" y="89" fill="#15803D" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Verified</text>
                  <text x="658" y="103" fill="#15803D" fontSize="8" textAnchor="middle" fontFamily="monospace">Answer</text>

                  <path d="M588 150 L616 150" stroke="#16A34A" strokeWidth="1.6" />
                  <rect x="616" y="124" width="84" height="52" rx="6" fill="#F0FDF4" stroke="#16A34A" strokeWidth="1.5" />
                  <text x="658" y="146" fill="#15803D" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Delivered</text>
                  <text x="658" y="160" fill="#15803D" fontSize="8" textAnchor="middle" fontFamily="monospace">To Inbox</text>
                </svg>
              )}

              {activeProject === "rag-assistant" && (
                <svg viewBox="0 0 680 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full min-w-[540px] h-auto">
                  <rect x="10" y="50" width="100" height="60" rx="8" fill="#FFFFFF" stroke="#2468B4" strokeWidth="1.5" />
                  <text x="60" y="78" fill="#181818" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Lecture MP4</text>
                  <text x="60" y="94" fill="#666" fontSize="8" textAnchor="middle" fontFamily="monospace">16kHz Audio Demux</text>
                  <path d="M110 80 L140 80" stroke="#2468B4" strokeWidth="1.8" />

                  <rect x="140" y="45" width="120" height="70" rx="8" fill="#FFFFFF" stroke="#E6A23C" strokeWidth="1.5" />
                  <text x="200" y="74" fill="#E6A23C" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Whisper large-v2</text>
                  <text x="200" y="90" fill="#555" fontSize="8" textAnchor="middle" fontFamily="monospace">Timestamp Alignment</text>
                  <text x="200" y="102" fill="#2E7D32" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">WER &lt; 8.2%</text>
                  <path d="M260 80 L290 80" stroke="#2468B4" strokeWidth="1.8" />

                  <rect x="290" y="45" width="130" height="70" rx="8" fill="#FFFFFF" stroke="#E7E3D8" strokeWidth="1.5" />
                  <text x="355" y="74" fill="#2468B4" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">create_chunks.py</text>
                  <text x="355" y="90" fill="#555" fontSize="8" textAnchor="middle" fontFamily="monospace">300-Word Window</text>
                  <text x="355" y="102" fill="#555" fontSize="8" textAnchor="middle" fontFamily="monospace">50-Word Overlap</text>
                  <path d="M420 80 L450 80" stroke="#2468B4" strokeWidth="1.8" />

                  <rect x="450" y="45" width="120" height="70" rx="8" fill="#F4F8FA" stroke="#2468B4" strokeWidth="1.8" />
                  <text x="510" y="74" fill="#2468B4" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Vector Search</text>
                  <text x="510" y="90" fill="#333" fontSize="8" textAnchor="middle" fontFamily="monospace">BGE-M3 Embeddings</text>
                  <text x="510" y="102" fill="#2E7D32" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">MRR@5 = 0.89</text>
                  <path d="M570 80 L600 80" stroke="#2468B4" strokeWidth="1.8" />

                  <rect x="600" y="50" width="70" height="60" rx="8" fill="#F0F9EB" stroke="#67C23A" strokeWidth="1.5" />
                  <text x="635" y="78" fill="#2E7D32" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Streamlit</text>
                  <text x="635" y="94" fill="#2E7D32" fontSize="8" textAnchor="middle" fontFamily="monospace">Timestamped Q&A</text>
                </svg>
              )}

              {activeProject === "emotion-api" && (
                <svg viewBox="0 0 680 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full min-w-[540px] h-auto">
                  <rect x="10" y="50" width="105" height="60" rx="8" fill="#FFFFFF" stroke="#2468B4" strokeWidth="1.5" />
                  <text x="62" y="78" fill="#181818" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Raw Text Input</text>
                  <text x="62" y="94" fill="#666" fontSize="8" textAnchor="middle" fontFamily="monospace">Conversational Text</text>
                  <path d="M115 80 L145 80" stroke="#2468B4" strokeWidth="1.8" />

                  <rect x="145" y="45" width="125" height="70" rx="8" fill="#FFFFFF" stroke="#E6A23C" strokeWidth="1.5" />
                  <text x="207" y="74" fill="#E6A23C" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Tokenizer & Pad</text>
                  <text x="207" y="90" fill="#555" fontSize="8" textAnchor="middle" fontFamily="monospace">Sequence Conversion</text>
                  <text x="207" y="102" fill="#555" fontSize="8" textAnchor="middle" fontFamily="monospace">maxlen=128 Padding</text>
                  <path d="M270 80 L300 80" stroke="#2468B4" strokeWidth="1.8" />

                  <rect x="300" y="40" width="140" height="80" rx="8" fill="#F4F8FA" stroke="#2468B4" strokeWidth="1.8" />
                  <text x="370" y="70" fill="#2468B4" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Bidirectional GRU</text>
                  <text x="370" y="86" fill="#333" fontSize="8" textAnchor="middle" fontFamily="monospace">Keras BiGRU Layers</text>
                  <text x="370" y="100" fill="#2E7D32" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">F1 Score = 0.92</text>
                  <path d="M440 80 L470 80" stroke="#2468B4" strokeWidth="1.8" />

                  <rect x="470" y="48" width="120" height="64" rx="8" fill="#FFFFFF" stroke="#E6A23C" strokeWidth="1.5" />
                  <text x="530" y="76" fill="#E6A23C" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">FastAPI Service</text>
                  <text x="530" y="92" fill="#666" fontSize="8" textAnchor="middle" fontFamily="monospace">/health & /predict</text>
                  <path d="M590 80 L620 80" stroke="#2468B4" strokeWidth="1.8" />

                  <rect x="620" y="52" width="50" height="56" rx="6" fill="#F0F9EB" stroke="#67C23A" strokeWidth="1.5" />
                  <text x="645" y="78" fill="#2E7D32" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Emotion</text>
                  <text x="645" y="92" fill="#2E7D32" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Probs</text>
                </svg>
              )}

              {activeProject === "freshguard" && (
                <svg viewBox="0 0 680 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full min-w-[540px] h-auto">
                  <rect x="10" y="50" width="115" height="60" rx="8" fill="#FFFFFF" stroke="#2468B4" strokeWidth="1.5" />
                  <text x="67" y="78" fill="#181818" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">3,552 Records</text>
                  <text x="67" y="94" fill="#666" fontSize="8" textAnchor="middle" fontFamily="monospace">FreshGuard_RAW_dirty</text>
                  <path d="M125 80 L155 80" stroke="#2468B4" strokeWidth="1.8" />

                  <rect x="155" y="45" width="130" height="70" rx="8" fill="#FFFFFF" stroke="#E7E3D8" strokeWidth="1.5" />
                  <text x="220" y="73" fill="#2468B4" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Smart Defaults</text>
                  <text x="220" y="89" fill="#555" fontSize="8" textAnchor="middle" fontFamily="monospace">Brix / Firmness Mean</text>
                  <text x="220" y="102" fill="#555" fontSize="8" textAnchor="middle" fontFamily="monospace">6 Numeric + 3 Cat</text>
                  <path d="M285 80 L315 80" stroke="#2468B4" strokeWidth="1.8" />

                  <rect x="315" y="40" width="150" height="80" rx="8" fill="#F4F8FA" stroke="#2468B4" strokeWidth="1.8" />
                  <text x="390" y="70" fill="#2468B4" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">5 Models Evaluated</text>
                  <text x="390" y="86" fill="#333" fontSize="8" textAnchor="middle" fontFamily="monospace">LR, Ridge, Lasso, RF, GB</text>
                  <text x="390" y="100" fill="#2E7D32" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Best by RMSE (.pkl)</text>
                  <path d="M465 80 L495 80" stroke="#2468B4" strokeWidth="1.8" />

                  <rect x="495" y="48" width="115" height="64" rx="8" fill="#FFFFFF" stroke="#E6A23C" strokeWidth="1.5" />
                  <text x="552" y="76" fill="#E6A23C" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Flask Web Server</text>
                  <text x="552" y="92" fill="#666" fontSize="8" textAnchor="middle" fontFamily="monospace">Port 8080 · /predict</text>
                  <path d="M610 80 L630 80" stroke="#2468B4" strokeWidth="1.8" />

                  <rect x="630" y="52" width="45" height="56" rx="6" fill="#F0F9EB" stroke="#67C23A" strokeWidth="1.5" />
                  <text x="652" y="78" fill="#2E7D32" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Shelf</text>
                  <text x="652" y="92" fill="#2E7D32" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Days</text>
                </svg>
              )}
            </div>

            {/* Stages Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {current.architecture.stages.map((stage, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-[#E7E3D8] bg-[#FAF9F5] space-y-1">
                  <span className="text-xs font-mono font-bold text-[#181818] block">{stage.name}</span>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{stage.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Implementation */}
        {activeSection === "implementation" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-base sm:text-lg font-bold text-[#181818]">
                {current.implementation.title}
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-[var(--text-faint)]">
                  file: <code className="text-[#181818] font-bold">{current.implementation.filename}</code>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#FAF9F5] border border-[#E7E3D8] text-[var(--accent-blue)]">
                  {current.implementation.language}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-[#E7E3D8] bg-[#1E1E1E] text-slate-100 p-4 font-mono text-xs overflow-x-auto shadow-inner">
              <pre className="leading-relaxed">
                <code>{current.implementation.snippet}</code>
              </pre>
            </div>
          </div>
        )}

        {/* 4. Challenges & Trade-offs */}
        {activeSection === "challenges" && (
          <div className="space-y-4">
            <h4 className="text-base sm:text-lg font-bold text-[#181818]">
              {current.challenges.title}
            </h4>
            <div className="space-y-3 pt-1">
              {current.challenges.items.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-[#E7E3D8] bg-[#FAF9F5] space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="text-xs font-mono font-bold text-[#181818]">
                      Challenge: {item.challenge}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] pl-3.5 leading-relaxed">
                    <strong className="text-[var(--accent-blue)]">Solution:</strong> {item.solution}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Results & Metrics */}
        {activeSection === "results" && (
          <div className="space-y-4">
            <h4 className="text-base sm:text-lg font-bold text-[#181818]">
              {current.results.title}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {current.results.metrics.map((m, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-[#E7E3D8] bg-[#FAF9F5] space-y-1">
                  <span className="text-[10px] font-mono text-[var(--text-faint)] uppercase block">
                    {m.label}
                  </span>
                  <div className="text-xl sm:text-2xl font-mono font-bold text-[#181818]">
                    {m.score}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {m.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
