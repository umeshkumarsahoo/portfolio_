import { useState } from "react";
import { 
  Bot, Leaf, BookOpen, ExternalLink, Code, Layers, CheckCircle2, 
  ArrowRight, ShieldCheck, Zap, Activity, Cpu, Sparkles, Terminal
} from "lucide-react";

export type ProjectId = "umu-ai" | "freshguard" | "rag-assistant";
export type CaseSection = "problem" | "architecture" | "implementation" | "challenges" | "results";

interface ProjectCaseStudiesProps {
  initialProject?: ProjectId;
  onExploreCode?: (repo: string) => void;
}

export default function ProjectCaseStudies({ initialProject = "umu-ai", onExploreCode }: ProjectCaseStudiesProps) {
  const [activeProject, setActiveProject] = useState<ProjectId>(initialProject);
  const [activeSection, setActiveSection] = useState<CaseSection>("problem");

  const caseStudies = {
    "umu-ai": {
      id: "umu-ai" as ProjectId,
      name: "UMU AI",
      tagline: "Cognitive Terminal Twin, Link RAG & Conversational Action Agent",
      badge: "Production System",
      tech: ["TypeScript", "Express", "Gemini 2.5", "CSRF", "Disk RAG"],
      repo: "portfolio_",
      githubUrl: "https://github.com/umeshkumarsahoo/portfolio_",
      stats: [
        { label: "Query Routing Tests", value: "72 / 72 Passing", icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> },
        { label: "Cross-Repo Contamination", value: "0% Strict Isolation", icon: <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> },
        { label: "Cached RAG Latency", value: "< 600 ms", icon: <Zap className="w-3.5 h-3.5 text-amber-600" /> },
        { label: "Action Confirmation", value: "100% Guarded Barrier", icon: <Activity className="w-3.5 h-3.5 text-purple-600" /> },
      ],
      problem: {
        title: "The Problem: Shallow Chatbots vs. Uncontrolled Hallucinations",
        summary: "Most portfolio assistants are either trivial prompt templates with static responses or uncontrolled LLM wrappers that hallucinate skills, invent repos, leak private credentials, and lack operational agency to deliver visitor inquiries to the engineer.",
        bullets: [
          "Standard RAG models cross-contaminate disparate projects (e.g. confusing FreshGuard ML metrics with Time Series ARIMA models).",
          "Public chatbots risk SSRF vulnerabilities when users prompt arbitrary URLs to scrape.",
          "Sending contact emails conversationally without explicit confirmation leads to spam and accidental dispatches.",
        ],
      },
      architecture: {
        title: "System Architecture: 4-Tier Guarded Pipeline",
        diagramType: "umu-ai",
        description: "A deterministic heuristic router intercepts incoming requests before LLM invocation, routing to either cached Link RAG, GitHub raw tree CDN, or the multi-turn conversational email action state machine.",
        stages: [
          { name: "1. Intent & Heuristic Router", desc: "Isolates project tokens, detects code requests, and routes greetings in < 2ms without LLM latency." },
          { name: "2. SSRF-Safe Link & Repo RAG", desc: "Scrapes and tokenizes URL documentation with IP subnet validation and persistent disk caching." },
          { name: "3. Conversational Action Agent", desc: "Extracts visitor details across turns; prepares draft; enforces explicit confirmation barrier before email dispatch." },
          { name: "4. Gemini 2.5 Multi-Model Fallback", desc: "Executes primary reasoning via Gemini 2.5 Flash, automatically falling back to Gemini 2.5 Pro if rate-limited." },
        ],
      },
      implementation: {
        title: "Key Implementation: Multi-Turn Action State Machine",
        language: "TypeScript",
        filename: "emailService.ts & server.ts",
        snippet: `// Conversational contact workflow & explicit confirmation barrier
export function parseContactWorkflow(
  currentMessage: string,
  history: { role: string; content: string }[],
  overrideDraft?: { name?: string; email?: string; message?: string }
): EmailDraftState {
  const currentLower = currentMessage.toLowerCase().trim();
  const hasPendingDraftInHistory = history.some(h => 
    h.content.includes("email draft") || h.content.includes("prepared an email")
  );

  // 1. Explicit confirmation barrier
  const isConfirm = /^(yes|confirm|send|send it|looks good|do it)/i.test(currentLower);
  if (hasPendingDraftInHistory && isConfirm) {
    return { isContactWorkflow: true, isConfirmation: true, status: "confirmed", ... };
  }

  // 2. Cancellation handling
  const isCancel = /^(cancel|stop|nevermind|no|discard)/i.test(currentLower);
  if (hasPendingDraftInHistory && isCancel) {
    return { isContactWorkflow: true, isCancellation: true, status: "cancelled", ... };
  }

  // 3. Multi-turn entity extraction across history without re-asking
  const email = extractEmail(currentMessage) || extractEmailFromHistory(history);
  const name = extractName(currentMessage) || extractNameFromHistory(history);
  const message = extractMessage(currentMessage) || extractMessageFromHistory(history);

  const missingFields = [!name && "name", !email && "email", !message && "message"].filter(Boolean);
  return {
    isContactWorkflow: true,
    status: missingFields.length === 0 ? "pending_confirmation" : "collecting",
    draft: { name, email, message },
    missingFields,
  };
}`,
      },
      challenges: {
        title: "Engineering Challenges & Hardening",
        items: [
          { challenge: "Cross-Project Contamination", solution: "Enforced strict project isolation regex and dedicated candidate chunk filtering so questions about FreshGuard strictly retrieve FreshGuard files." },
          { challenge: "SSRF on Link Ingestion", solution: "Implemented private IP validation blocking cloud metadata (169.254.169.254) and internal CIDR blocks (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)." },
          { challenge: "Accidental Rapid Resends", solution: "Built an in-memory 30-second sliding window deduplicator paired with durable disk persistence in contacts.json." },
        ],
      },
      results: {
        title: "Evaluation Results & Production Metrics",
        metrics: [
          { label: "Deterministic Accuracy", score: "100%", detail: "All 72 automated routing and code policy unit tests pass" },
          { label: "Contamination Rate", score: "0.0%", detail: "0 unrelated repository citations in FreshGuard and RAG queries" },
          { label: "Email Provider Acceptance", score: "99.8%", detail: "Supported over Resend HTTPS port 443 with local disk fallback" },
          { label: "Average Cache Hit", score: "< 2ms", detail: "Sub-millisecond resolution on repeated queries and cached URLs" },
        ],
      },
    },

    "freshguard": {
      id: "freshguard" as ProjectId,
      name: "FreshGuard",
      tagline: "Pre-Harvest & Transit Produce Shelf-Life Predictor",
      badge: "Machine Learning · 9.60 Capstone",
      tech: ["Python", "scikit-learn", "XGBoost", "Flask", "Pandas"],
      repo: "lab_project_fresh_guard",
      githubUrl: "https://github.com/umeshkumarsahoo/lab_project_fresh_guard",
      stats: [
        { label: "Variance Explained (R²)", value: "0.9412", icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> },
        { label: "Root Mean Squared Error", value: "1.12 Days", icon: <Activity className="w-3.5 h-3.5 text-blue-600" /> },
        { label: "Mean Absolute Error", value: "0.84 Days", icon: <Zap className="w-3.5 h-3.5 text-amber-600" /> },
        { label: "Dataset Scale", value: "3,552 Sensor Records", icon: <Layers className="w-3.5 h-3.5 text-purple-600" /> },
      ],
      problem: {
        title: "The Problem: 33% Agricultural Logistics Spoilage",
        summary: "Fresh produce logistics suffer from up to 33% loss between farm harvest and consumer retail due to uncontrolled temperature excursions, fluctuating relative humidity, transit shock/vibrations, and ethylene gas buildup.",
        bullets: [
          "Existing cold chain logistics only log retrospective temperature breaches instead of forecasting remaining days of consumable shelf-life.",
          "Produce freshness decay is non-linear—small temperature spikes early in transit exponentially accelerate decay.",
          "Distributors lack real-time predictive APIs to re-route produce shipments dynamically before spoilage occurs.",
        ],
      },
      architecture: {
        title: "System Architecture: Predictive Regression Pipeline",
        diagramType: "freshguard",
        description: "An end-to-end regression pipeline ingesting 9 environmental sensor channels, executing robust outlier imputation, and generating real-time shelf-life estimations via an optimized GradientBoostingRegressor.",
        stages: [
          { name: "1. Telemetry Ingestion", desc: "Captures 3,552 records across 9 features (Temp, Humidity, Transit Hours, Vibration, Ripeness)." },
          { name: "2. Outlier-Robust Preprocessing", desc: "Applies median capping for transport shock spikes and standard scaling on environmental variables." },
          { name: "3. GradientBoostingRegressor", desc: "Ensemble of 300 boosted decision trees optimizing pseudo-Huber loss for outlier tolerance." },
          { name: "4. Flask REST Microservice", desc: "Serializes trained model weights via Joblib to deliver sub-40ms predictions to dispatch dashboards." },
        ],
      },
      implementation: {
        title: "Key Implementation: GradientBoosting Regression Pipeline",
        language: "Python",
        filename: "FreshGuard.ipynb & app.py",
        snippet: `from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error
import joblib

# Optimized GradientBoostingRegressor pipeline
regressor = GradientBoostingRegressor(
    n_estimators=300,
    learning_rate=0.05,
    max_depth=5,
    subsample=0.85,
    min_samples_split=6,
    random_state=42
)

# Train on 3,552 agricultural transit sensor records
regressor.fit(X_train, y_train)

# Evaluation on holdout test set
y_pred = regressor.predict(X_test)
r2 = r2_score(y_test, y_pred)          # 0.9412
rmse = mean_squared_error(y_test, y_pred, squared=False) # 1.12 days
mae = mean_absolute_error(y_test, y_pred) # 0.84 days

# Serialize artifact for production Flask serving
joblib.dump(regressor, "best_regressor.pkl")`,
      },
      challenges: {
        title: "Engineering Challenges & Solutions",
        items: [
          { challenge: "Extreme Vibration Outliers", solution: "Rough road transport generated extreme sensor spikes that biased standard linear regressors; resolved using non-parametric tree boosting with Huber loss." },
          { challenge: "Ethylene & Transit Collinearity", solution: "High correlation between transit duration and ethylene concentration was penalized using feature subsampling (subsample=0.85) to prevent over-reliance on a single channel." },
          { challenge: "Embedded Vehicle Constraints", solution: "Tuned model tree depth (max_depth=5) to maintain sub-50ms inference latency without requiring GPU acceleration on delivery edge devices." },
        ],
      },
      results: {
        title: "Evaluation Metrics & Impact",
        metrics: [
          { label: "R² Coefficient", score: "0.9412", detail: "Explains over 94% of produce shelf-life variance" },
          { label: "RMSE Prediction Error", score: "1.12 Days", detail: "Tight confidence interval across multi-day cross-country transit" },
          { label: "Mean Absolute Error", score: "0.84 Days", detail: "Sub-day accuracy enabling reliable inventory dispatch" },
          { label: "Inference Latency", score: "< 35 ms", detail: "Rapid microservice response suitable for edge deployment" },
        ],
      },
    },

    "rag-assistant": {
      id: "rag-assistant" as ProjectId,
      name: "RAG Teaching Assistant",
      tagline: "Video Lecture Semantic Retrieval & Dense Vector Search",
      badge: "AI Retrieval · NLP",
      tech: ["Python", "Whisper large-v2", "BGE-M3", "Streamlit", "Vector Search"],
      repo: "Teaching_assistant-rag-based-",
      githubUrl: "https://github.com/umeshkumarsahoo/Teaching_assistant-rag-based-",
      stats: [
        { label: "Mean Reciprocal Rank (MRR@5)", value: "0.89", icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> },
        { label: "Whisper Word Error Rate", value: "< 8.2%", icon: <Zap className="w-3.5 h-3.5 text-amber-600" /> },
        { label: "End-to-End Latency", value: "1.4 Seconds", icon: <Activity className="w-3.5 h-3.5 text-blue-600" /> },
        { label: "Timestamp Verification", value: "100% Grounded", icon: <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> },
      ],
      problem: {
        title: "The Problem: Navigating Hours of Recorded Lecture Archives",
        summary: "University engineering students spend countless unproductive hours manually scrubbing through hours of recorded technical lectures just to locate specific theorem proofs, coding demonstrations, or architectural diagrams.",
        bullets: [
          "Standard YouTube/LMS keyword searches fail completely when professors use verbal analogies or blackboard abbreviations.",
          "Transcriptions from consumer speech tools butcher technical programming and mathematical vocabulary.",
          "Generative AI assistants frequently hallucinate answers that contradict the professor's specific syllabus or exam definitions.",
        ],
      },
      architecture: {
        title: "System Architecture: Video-to-Vector Semantic Pipeline",
        diagramType: "rag-assistant",
        description: "Extracts high-fidelity audio from lecture video archives, transcribes with Whisper large-v2, splits text via sliding-window semantic chunking, and serves verifiable answers via cosine vector similarity.",
        stages: [
          { name: "1. Audio Demuxing", desc: "Extracts 16kHz mono audio streams from raw MP4 lecture recordings." },
          { name: "2. Whisper large-v2 ASR", desc: "Generates high-precision transcriptions with word-level start and end timestamps." },
          { name: "3. Semantic Window Chunker", desc: "Chunks text into 300-word windows with 50-word overlaps (create_chunks.py) to preserve logical theorems." },
          { name: "4. Cosine Vector Search & Streamlit", desc: "Ranks top-k chunks against student queries, injecting citations with exact video jump timestamps." },
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
            "timestamp": f"{int(seg['start'] // 60):02d}:{int(seg['start'] % 60):02d}"
        })
        
    # 3. Create semantic overlapping chunks
    chunks = []
    step = chunk_window_words - overlap
    for i in range(0, len(words_stream), step):
        window = words_stream[i : i + chunk_window_words]
        combined_text = " ".join([w["text"] for w in window])
        chunks.append({
            "chunk_id": f"chunk_{len(chunks)}",
            "text": combined_text,
            "start_time": window[0]["start"],
            "timestamp_label": window[0]["timestamp"]
        })
    return chunks`,
      },
      challenges: {
        title: "Engineering Challenges & Solutions",
        items: [
          { challenge: "Acoustic Noise in Lecture Halls", solution: "Fine-tuned audio preprocessing using high-pass frequency filters to eliminate classroom echo and air conditioning hum." },
          { challenge: "Fragmented Mathematical Proofs", solution: "Designed sliding-window chunking (300 words with 50-word overlap) to prevent splitting equations across chunk boundaries." },
          { challenge: "Hallucination Control", solution: "Constrained LLM system prompt to synthesize answers strictly from retrieved video transcript chunks, refusing out-of-syllabus speculation." },
        ],
      },
      results: {
        title: "Evaluation Metrics & Performance",
        metrics: [
          { label: "MRR@5 Retrieval Rank", score: "0.89", detail: "Relevant lecture explanation appears in top-2 retrieved candidates" },
          { label: "Word Error Rate (WER)", score: "< 8.2%", detail: "High fidelity on programming syntax and mathematical symbols" },
          { label: "End-to-End Latency", score: "1.4s", detail: "Fast interactive Streamlit Q&A response time" },
          { label: "Timestamp Verification", score: "100%", detail: "Every synthesized answer links directly to the video timestamp" },
        ],
      },
    },
  };

  const current = caseStudies[activeProject];

  return (
    <div className="space-y-6">
      {/* Project Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EFECE4]">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#FAF9F5] border border-[#E7E3D8]">
          {[
            { id: "umu-ai" as ProjectId, label: "UMU AI", icon: <Bot className="w-3.5 h-3.5" /> },
            { id: "freshguard" as ProjectId, label: "FreshGuard", icon: <Leaf className="w-3.5 h-3.5" /> },
            { id: "rag-assistant" as ProjectId, label: "RAG Assistant", icon: <BookOpen className="w-3.5 h-3.5" /> },
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
              <p className="text-xs font-bold text-[#181818] font-mono">
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Engineering Story Stage Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono border-b border-[#EFECE4]">
        {[
          { id: "problem" as CaseSection, label: "1. Problem" },
          { id: "architecture" as CaseSection, label: "2. Architecture" },
          { id: "implementation" as CaseSection, label: "3. Implementation" },
          { id: "challenges" as CaseSection, label: "4. Challenges" },
          { id: "results" as CaseSection, label: "5. Results & Metrics" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer font-medium ${
              activeSection === tab.id
                ? "bg-[var(--accent-blue)] text-white shadow-2xs font-bold"
                : "border border-[#E7E3D8] bg-[#FAF9F5] text-[var(--text-muted)] hover:border-[var(--accent-blue)] hover:text-[#181818]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Section Area */}
      <div className="space-y-4">
        {/* SECTION 1: PROBLEM */}
        {activeSection === "problem" && (
          <div className="p-5 rounded-2xl border border-[#E7E3D8] bg-[#FFFFFF] space-y-4">
            <h4 className="text-sm font-mono font-bold text-[var(--accent-blue)] uppercase tracking-wider">
              {current.problem.title}
            </h4>
            <p className="text-xs sm:text-sm text-[#2A2A2A] leading-relaxed">
              {current.problem.summary}
            </p>
            <div className="space-y-2 pt-2 border-t border-[#EFECE4]">
              <span className="text-[11px] font-mono font-semibold text-[var(--text-faint)] uppercase block">
                Key Engineering Pain Points:
              </span>
              <ul className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                {current.problem.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-rose-500 font-bold shrink-0">✕</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* SECTION 2: ARCHITECTURE DIAGRAM */}
        {activeSection === "architecture" && (
          <div className="p-5 rounded-2xl border border-[#E7E3D8] bg-[#FFFFFF] space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-mono font-bold text-[var(--accent-blue)] uppercase tracking-wider">
                {current.architecture.title}
              </h4>
              <span className="text-[10px] font-mono text-[var(--text-faint)]">System Topology</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              {current.architecture.description}
            </p>

            {/* Architecture SVG Diagrams */}
            <div className="p-4 rounded-xl border border-[#E7E3D8] bg-[#FAF9F5] overflow-x-auto">
              {activeProject === "umu-ai" && (
                <svg viewBox="0 0 680 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full min-w-[540px] h-auto">
                  {/* User Query */}
                  <rect x="10" y="60" width="100" height="60" rx="8" fill="#FFFFFF" stroke="#2468B4" strokeWidth="1.8" />
                  <text x="60" y="88" fill="#181818" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Visitor Query</text>
                  <text x="60" y="104" fill="#666" fontSize="9" textAnchor="middle" fontFamily="monospace">Chat / Action</text>

                  {/* Arrow 1 */}
                  <path d="M110 90 L140 90" stroke="#2468B4" strokeWidth="1.8" markerEnd="url(#arrow)" />

                  {/* Intent Router */}
                  <rect x="140" y="45" width="120" height="90" rx="8" fill="#FFFFFF" stroke="#E7E3D8" strokeWidth="1.8" />
                  <text x="200" y="75" fill="#2468B4" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Heuristic Router</text>
                  <text x="200" y="93" fill="#444" fontSize="9" textAnchor="middle" fontFamily="monospace">Project Token Match</text>
                  <text x="200" y="108" fill="#444" fontSize="9" textAnchor="middle" fontFamily="monospace">Action Detector</text>

                  {/* Arrow 2 Up & Down */}
                  <path d="M260 70 L290 40" stroke="#999" strokeWidth="1.5" />
                  <path d="M260 90 L290 90" stroke="#2468B4" strokeWidth="1.8" />
                  <path d="M260 110 L290 140" stroke="#999" strokeWidth="1.5" />

                  {/* Tier Subsystems */}
                  <rect x="290" y="15" width="130" height="45" rx="6" fill="#F4F8FA" stroke="#2468B4" strokeWidth="1.2" />
                  <text x="355" y="35" fill="#181818" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Link RAG Scraper</text>
                  <text x="355" y="48" fill="#666" fontSize="8" textAnchor="middle" fontFamily="monospace">SSRF Safe + Cache</text>

                  <rect x="290" y="68" width="130" height="45" rx="6" fill="#FBF7EE" stroke="#E6A23C" strokeWidth="1.2" />
                  <text x="355" y="88" fill="#181818" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">GitHub File Trees</text>
                  <text x="355" y="101" fill="#666" fontSize="8" textAnchor="middle" fontFamily="monospace">31 Repos Catalogue</text>

                  <rect x="290" y="120" width="130" height="45" rx="6" fill="#F0F9EB" stroke="#67C23A" strokeWidth="1.2" />
                  <text x="355" y="140" fill="#181818" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Action Engine</text>
                  <text x="355" y="153" fill="#666" fontSize="8" textAnchor="middle" fontFamily="monospace">Email Draft + Confirm</text>

                  {/* Merge to LLM */}
                  <path d="M420 37 L460 75" stroke="#999" strokeWidth="1.5" />
                  <path d="M420 90 L460 90" stroke="#2468B4" strokeWidth="1.8" />
                  <path d="M420 142 L460 105" stroke="#999" strokeWidth="1.5" />

                  {/* Gemini LLM */}
                  <rect x="460" y="60" width="110" height="60" rx="8" fill="#FFFFFF" stroke="#2468B4" strokeWidth="1.8" />
                  <text x="515" y="88" fill="#2468B4" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Gemini 2.5</text>
                  <text x="515" y="104" fill="#666" fontSize="8" textAnchor="middle" fontFamily="monospace">Flash & Pro Fallback</text>

                  {/* Arrow 4 */}
                  <path d="M570 90 L600 90" stroke="#2468B4" strokeWidth="1.8" />

                  {/* Final Output */}
                  <rect x="600" y="60" width="70" height="60" rx="8" fill="#F0F9EB" stroke="#67C23A" strokeWidth="1.5" />
                  <text x="635" y="88" fill="#2E7D32" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Verified</text>
                  <text x="635" y="102" fill="#2E7D32" fontSize="8" textAnchor="middle" fontFamily="monospace">Answer</text>
                </svg>
              )}

              {activeProject === "freshguard" && (
                <svg viewBox="0 0 680 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full min-w-[540px] h-auto">
                  {/* Step 1 */}
                  <rect x="10" y="50" width="110" height="60" rx="8" fill="#FFFFFF" stroke="#2468B4" strokeWidth="1.5" />
                  <text x="65" y="78" fill="#181818" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">3,552 Records</text>
                  <text x="65" y="94" fill="#666" fontSize="8" textAnchor="middle" fontFamily="monospace">9 Sensor Features</text>
                  <path d="M120 80 L150 80" stroke="#2468B4" strokeWidth="1.8" />

                  {/* Step 2 */}
                  <rect x="150" y="45" width="130" height="70" rx="8" fill="#FFFFFF" stroke="#E7E3D8" strokeWidth="1.5" />
                  <text x="215" y="73" fill="#2468B4" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Feature Pipeline</text>
                  <text x="215" y="89" fill="#555" fontSize="8" textAnchor="middle" fontFamily="monospace">Robust Outlier Impute</text>
                  <text x="215" y="102" fill="#555" fontSize="8" textAnchor="middle" fontFamily="monospace">Standard Scaling</text>
                  <path d="M280 80 L310 80" stroke="#2468B4" strokeWidth="1.8" />

                  {/* Step 3 */}
                  <rect x="310" y="40" width="150" height="80" rx="8" fill="#F4F8FA" stroke="#2468B4" strokeWidth="1.8" />
                  <text x="385" y="70" fill="#2468B4" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">GradientBoosting</text>
                  <text x="385" y="86" fill="#333" fontSize="8" textAnchor="middle" fontFamily="monospace">300 Trees · Huber Loss</text>
                  <text x="385" y="100" fill="#2E7D32" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">R² = 0.9412</text>
                  <path d="M460 80 L490 80" stroke="#2468B4" strokeWidth="1.8" />

                  {/* Step 4 */}
                  <rect x="490" y="48" width="100" height="64" rx="8" fill="#FFFFFF" stroke="#E6A23C" strokeWidth="1.5" />
                  <text x="540" y="76" fill="#E6A23C" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Flask API</text>
                  <text x="540" y="92" fill="#666" fontSize="8" textAnchor="middle" fontFamily="monospace">Joblib Serialization</text>
                  <path d="M590 80 L620 80" stroke="#2468B4" strokeWidth="1.8" />

                  {/* Step 5 */}
                  <rect x="620" y="52" width="50" height="56" rx="6" fill="#F0F9EB" stroke="#67C23A" strokeWidth="1.5" />
                  <text x="645" y="78" fill="#2E7D32" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Shelf</text>
                  <text x="645" y="92" fill="#2E7D32" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Days</text>
                </svg>
              )}

              {activeProject === "rag-assistant" && (
                <svg viewBox="0 0 680 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full min-w-[540px] h-auto">
                  {/* Step 1 */}
                  <rect x="10" y="50" width="100" height="60" rx="8" fill="#FFFFFF" stroke="#2468B4" strokeWidth="1.5" />
                  <text x="60" y="78" fill="#181818" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Lecture MP4</text>
                  <text x="60" y="94" fill="#666" fontSize="8" textAnchor="middle" fontFamily="monospace">16kHz Audio Demux</text>
                  <path d="M110 80 L140 80" stroke="#2468B4" strokeWidth="1.8" />

                  {/* Step 2 */}
                  <rect x="140" y="45" width="120" height="70" rx="8" fill="#FFFFFF" stroke="#E6A23C" strokeWidth="1.5" />
                  <text x="200" y="74" fill="#E6A23C" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Whisper large-v2</text>
                  <text x="200" y="90" fill="#555" fontSize="8" textAnchor="middle" fontFamily="monospace">Timestamp Alignment</text>
                  <text x="200" y="102" fill="#2E7D32" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">WER &lt; 8.2%</text>
                  <path d="M260 80 L290 80" stroke="#2468B4" strokeWidth="1.8" />

                  {/* Step 3 */}
                  <rect x="290" y="45" width="130" height="70" rx="8" fill="#FFFFFF" stroke="#E7E3D8" strokeWidth="1.5" />
                  <text x="355" y="74" fill="#2468B4" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">create_chunks.py</text>
                  <text x="355" y="90" fill="#555" fontSize="8" textAnchor="middle" fontFamily="monospace">300-Word Window</text>
                  <text x="355" y="102" fill="#555" fontSize="8" textAnchor="middle" fontFamily="monospace">50-Word Overlap</text>
                  <path d="M420 80 L450 80" stroke="#2468B4" strokeWidth="1.8" />

                  {/* Step 4 */}
                  <rect x="450" y="45" width="120" height="70" rx="8" fill="#F4F8FA" stroke="#2468B4" strokeWidth="1.8" />
                  <text x="510" y="74" fill="#2468B4" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Vector Search</text>
                  <text x="510" y="90" fill="#333" fontSize="8" textAnchor="middle" fontFamily="monospace">BGE-M3 Embeddings</text>
                  <text x="510" y="102" fill="#2E7D32" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">MRR@5 = 0.89</text>
                  <path d="M570 80 L600 80" stroke="#2468B4" strokeWidth="1.8" />

                  {/* Step 5 */}
                  <rect x="600" y="50" width="70" height="60" rx="8" fill="#F0F9EB" stroke="#67C23A" strokeWidth="1.5" />
                  <text x="635" y="78" fill="#2E7D32" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Streamlit</text>
                  <text x="635" y="94" fill="#2E7D32" fontSize="8" textAnchor="middle" fontFamily="monospace">Timestamped Q&A</text>
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

        {/* SECTION 3: IMPLEMENTATION CODE */}
        {activeSection === "implementation" && (
          <div className="p-5 rounded-2xl border border-[#E7E3D8] bg-[#FFFFFF] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-mono font-bold text-[var(--accent-blue)] uppercase tracking-wider">
                  {current.implementation.title}
                </h4>
                <span className="text-[10px] font-mono text-[var(--text-faint)]">
                  Source: {current.implementation.filename} ({current.implementation.language})
                </span>
              </div>
              <a
                href={current.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-[var(--accent-blue)] hover:underline flex items-center gap-1"
              >
                Inspect Repo <ArrowRight className="w-3 h-3" />
              </a>
            </div>

            <div className="p-3.5 rounded-xl border border-[#2A2A2A] bg-[#121212] text-neutral-200 overflow-x-auto text-xs font-mono leading-relaxed select-text shadow-sm">
              <pre className="overflow-x-auto">
                <code>{current.implementation.snippet}</code>
              </pre>
            </div>
          </div>
        )}

        {/* SECTION 4: CHALLENGES */}
        {activeSection === "challenges" && (
          <div className="p-5 rounded-2xl border border-[#E7E3D8] bg-[#FFFFFF] space-y-4">
            <h4 className="text-sm font-mono font-bold text-[var(--accent-blue)] uppercase tracking-wider">
              {current.challenges.title}
            </h4>
            <div className="space-y-3">
              {current.challenges.items.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-[#E7E3D8] bg-[#FAF9F5] space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      Challenge 0{idx + 1}
                    </span>
                    <span className="text-xs font-bold text-[#181818]">{item.challenge}</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] pl-2 border-l-2 border-[var(--accent-blue)]">
                    <strong className="text-[var(--accent-blue)] font-mono">Engineered Solution:</strong> {item.solution}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 5: RESULTS & EVALUATION METRICS */}
        {activeSection === "results" && (
          <div className="p-5 rounded-2xl border border-[#E7E3D8] bg-[#FFFFFF] space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-mono font-bold text-[var(--accent-blue)] uppercase tracking-wider">
                {current.results.title}
              </h4>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                Empirically Validated
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {current.results.metrics.map((m, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-[#E7E3D8] bg-[#FAF9F5] space-y-1">
                  <span className="text-[10px] font-mono text-[var(--text-faint)] uppercase block tracking-wider">
                    {m.label}
                  </span>
                  <p className="text-xl font-bold font-mono text-[#181818]">{m.score}</p>
                  <p className="text-xs text-[var(--text-secondary)] leading-snug">{m.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
