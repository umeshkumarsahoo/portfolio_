import { lazy, Suspense, useState, useEffect, FormEvent, useRef } from "react";
import { motion } from "motion/react";
import { 
  Send, Terminal, Cpu, Bot, Star, ExternalLink, RefreshCw, Sparkles, BookOpen, 
  Calendar, User, MapPin, Mail, GraduationCap, TrendingUp, Cloud, Trophy, 
  Brain, Leaf, Plane, Award, Code, Globe, Play, Github, Linkedin, Eye, ArrowRight,
  GitFork, Check, X, Edit2, AlertCircle, CheckCircle2, Activity
} from "lucide-react";
import { secureFetch } from "../lib/api";
import UmuDoodle from "./UmuDoodle";
import type { DoodleState } from "./UmuDoodle";
import {
  DeskSceneIllustration,
  BotanicalFlowerIllustration,
  WindowGazerIllustration,
  TrioFriendsIllustration,
  TwilightSeaIllustration,
  CoffeeAndPillsIllustration,
  CurledSilhouetteIllustration,
  GazingProfileIllustration,
} from "./ZineIllustrations";
import portraitImg from "../assets/images/umesh_portrait_1784052523060.png";
import MarkdownRenderer from "./MarkdownRenderer";
import TechNewsFeed from "./TechNewsFeed";
import ProjectCaseStudies from "./ProjectCaseStudies";
import GitHubStats from "./GitHubStats";

interface TabContentProps {
  activeTab: string;
  onActionClick?: (actionType: string) => void;
  initialAgentQuery?: string;
  clearInitialAgentQuery?: () => void;
}

export interface ActionDraft {
  type: "email_draft";
  name?: string;
  email?: string;
  message?: string;
  status: "idle" | "collecting" | "pending_confirmation" | "sent" | "cancelled" | "failed";
  provider?: "resend" | "smtp" | "local_persisted";
  error?: string;
  missingFields?: string[];
}

interface Message {
  role: "user" | "agent";
  content: string;
  timestamp: string;
  actionDraft?: ActionDraft;
}

interface GithubRepo {
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
}

export default function TabContent({ 
  activeTab, 
  onActionClick, 
  initialAgentQuery, 
  clearInitialAgentQuery 
}: TabContentProps) {
  
  // Contact Form State
  const [formState, setFormState] = useState({ name: "", email: "", msg: "" });
  const [formStatus, setFormStatus] = useState("");

  // AI Agent States
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "agent",
      content: "Hey there! I'm umu — Umesh's terminal sidekick and digital twin 👋\n\nI'm here to give you an authentic tour of Umesh's engineering world. Feel free to ask about his **9.60 CGPA grind at Silicon University**, his **RAG Assistant**, his **BiGRU ML models**, or say *\"brief me on the news\"* for trending Hacker News stories!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }
  ]);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryStatus, setQueryStatus] = useState("Thinking...");
  const [doodleState, setDoodleState] = useState<DoodleState>("idle");
  const [isRefreshingRepos, setIsRefreshingRepos] = useState(false);
  const [editingDraftIndex, setEditingDraftIndex] = useState<number | null>(null);
  const [editDraftForm, setEditDraftForm] = useState({ name: "", email: "", message: "" });
  const [projectSubTab, setProjectSubTab] = useState<"case-studies" | "github-activity" | "all-repos">("case-studies");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch repos list on component mount / tab change
  const loadRepos = async () => {
    setIsLoadingRepos(true);
    try {
      const res = await fetch("/api/github/repos");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRepos(data);
        }
      }
    } catch (err) {
      console.error("Error loading repositories:", err);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleRefreshRepos = async () => {
    setIsRefreshingRepos(true);
    try {
      const res = await secureFetch("/api/github/repos/refresh", { method: "POST" });
      if (res.ok) {
        await loadRepos();
      }
    } catch (err) {
      console.error("Failed to refresh repos:", err);
    } finally {
      setIsRefreshingRepos(false);
    }
  };

  useEffect(() => {
    if (activeTab === "agent" || activeTab === "skills" || activeTab === "projects") {
      loadRepos();
    }
  }, [activeTab]);

  useEffect(() => {
    const handleRefresh = () => {
      loadRepos();
    };
    const handleNewsBriefPrompt = (e: any) => {
      const topic = e?.detail?.topic;
      const prompt = topic && topic !== "top-news"
        ? `Give me a technical briefing on: "${topic}"`
        : "Brief me on the latest top trending tech news headlines.";
      handleQuerySubmit(undefined, prompt);
    };
    window.addEventListener("github-data-refreshed", handleRefresh);
    window.addEventListener("ask-news-brief", handleNewsBriefPrompt);
    return () => {
      window.removeEventListener("github-data-refreshed", handleRefresh);
      window.removeEventListener("ask-news-brief", handleNewsBriefPrompt);
    };
  }, []);

  useEffect(() => {
    if (activeTab === "agent") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  useEffect(() => {
    if (activeTab === "agent" && initialAgentQuery) {
      handleQuerySubmit(undefined, initialAgentQuery);
      if (clearInitialAgentQuery) {
        clearInitialAgentQuery();
      }
    }
  }, [activeTab, initialAgentQuery]);

  // Confirm and dispatch email action
  const handleConfirmEmailAction = async (draftToConfirm?: { name?: string; email?: string; message?: string }) => {
    const currentDraft = draftToConfirm || messages.slice().reverse().find(m => m.actionDraft?.status === "pending_confirmation")?.actionDraft;
    if (!currentDraft || !currentDraft.name || !currentDraft.email || !currentDraft.message || isQuerying) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const userMsg: Message = { role: "user", content: "Yes, confirm and send this message to Umesh.", timestamp };
    setMessages(prev => [...prev, userMsg]);

    setIsQuerying(true);
    setQueryStatus("Completing the action...");
    setDoodleState("processing");

    try {
      const chatHistory = messages.map(m => ({ role: m.role, content: m.content })).slice(-8);
      const response = await secureFetch("/api/agent/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Yes, confirm and send this message to Umesh.",
          history: chatHistory,
          confirmedDraft: {
            name: currentDraft.name,
            email: currentDraft.email,
            message: currentDraft.message,
          },
          actionIntent: "confirm"
        })
      });

      const responseTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (response.ok) {
        const data = await response.json();
        setDoodleState("success");
        setQueryStatus("Completing the action...");
        setMessages(prev => [...prev, {
          role: "agent",
          content: data.reply,
          timestamp: responseTimestamp,
          actionDraft: data.action
        }]);
        setTimeout(() => {
          setDoodleState("idle");
          setQueryStatus("Listening attentively · Ready to brief you");
        }, 3000);
      } else {
        const errData = await response.json();
        setDoodleState("error");
        setMessages(prev => [...prev, {
          role: "agent",
          content: `Sorry, unable to dispatch message: ${errData.error || "Server error"}`,
          timestamp: responseTimestamp
        }]);
        setTimeout(() => setDoodleState("idle"), 3000);
      }
    } catch (err: any) {
      const responseTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setDoodleState("error");
      setMessages(prev => [...prev, {
        role: "agent",
        content: "Connection error while confirming action. Please try again.",
        timestamp: responseTimestamp
      }]);
      setTimeout(() => setDoodleState("idle"), 3000);
    } finally {
      setIsQuerying(false);
    }
  };

  // Cancel email action
  const handleCancelEmailAction = async () => {
    if (isQuerying) return;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const userMsg: Message = { role: "user", content: "Cancel", timestamp };
    setMessages(prev => [...prev, userMsg]);

    setIsQuerying(true);
    setQueryStatus("Action cancelled");
    setDoodleState("idle");

    try {
      const chatHistory = messages.map(m => ({ role: m.role, content: m.content })).slice(-8);
      const response = await secureFetch("/api/agent/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Cancel",
          history: chatHistory,
          actionIntent: "cancel"
        })
      });
      const responseTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, {
          role: "agent",
          content: data.reply,
          timestamp: responseTimestamp,
          actionDraft: data.action
        }]);
        setTimeout(() => {
          setQueryStatus("Listening attentively · Ready to brief you");
        }, 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsQuerying(false);
    }
  };

  // Submit query to Gemini Agent with Simple Agent Mode for Action Tasks
  const handleQuerySubmit = async (e?: FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const activeQuery = customQuery || query;
    if (!activeQuery.trim() || isQuerying) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newMsg: Message = { role: "user", content: activeQuery, timestamp };
    
    setMessages(prev => [...prev, newMsg]);
    if (!customQuery) setQuery("");
    setIsQuerying(true);

    // Identify if this query requires action mode (email / contact / action task)
    const lastDraft = messages.slice().reverse().find(m => m.actionDraft)?.actionDraft;
    const hasPendingAction = lastDraft?.status === "pending_confirmation" || lastDraft?.status === "collecting";
    const lowerQ = activeQuery.toLowerCase().trim();
    const isActionTask =
      hasPendingAction ||
      lowerQ.includes("contact") ||
      lowerQ.includes("message") ||
      lowerQ.includes("email") ||
      lowerQ.includes("collaborat") ||
      lowerQ.includes("hire") ||
      lowerQ.includes("internship") ||
      /^(yes|confirm|send|cancel|stop|no|discard)\b/i.test(lowerQ);

    let actionStageTimer: NodeJS.Timeout | undefined;

    if (isActionTask) {
      // Meaningful Step 1: Understanding the request
      setQueryStatus("Understanding the request...");
      setDoodleState("thinking");

      // Meaningful Step 2: Preparing the action
      actionStageTimer = setTimeout(() => {
        setQueryStatus("Preparing the action...");
        setDoodleState("processing");
      }, 550);
    } else {
      // Ordinary question: respond normally without an elaborate process
      setQueryStatus("Thinking...");
      setDoodleState("thinking");
    }

    try {
      const chatHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      })).slice(-8);

      const response = await secureFetch("/api/agent/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: activeQuery, history: chatHistory })
      });

      const responseTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      if (response.ok) {
        const data = await response.json();
        
        if (data.action?.status === "pending_confirmation") {
          // Meaningful Step 3: Waiting for confirmation
          setDoodleState("waiting");
          setQueryStatus("Waiting for confirmation...");
        } else if (data.action?.status === "sent") {
          // Meaningful Step 4: Completing the action
          setDoodleState("success");
          setQueryStatus("Completing the action...");
          setTimeout(() => {
            setDoodleState("idle");
            setQueryStatus("Listening attentively · Ready to brief you");
          }, 3000);
        } else if (data.action?.status === "cancelled") {
          setDoodleState("idle");
          setQueryStatus("Action cancelled");
          setTimeout(() => {
            setQueryStatus("Listening attentively · Ready to brief you");
          }, 2000);
        } else if (data.action?.status === "failed") {
          setDoodleState("error");
          setQueryStatus("Delivery notice: Recorded locally");
          setTimeout(() => {
            setDoodleState("idle");
            setQueryStatus("Listening attentively · Ready to brief you");
          }, 3500);
        } else {
          // Normal inquiry response
          setDoodleState("speaking");
          setTimeout(() => setDoodleState("success"), 500);
          setTimeout(() => {
            setDoodleState("idle");
            setQueryStatus("Listening attentively · Ready to brief you");
          }, 2000);
        }

        setMessages(prev => [...prev, {
          role: "agent",
          content: data.reply,
          timestamp: responseTimestamp,
          actionDraft: data.action
        }]);
      } else {
        const errData = await response.json();
        setDoodleState("error");
        setMessages(prev => [...prev, {
          role: "agent",
          content: `Sorry, something went wrong: ${errData.error || "Unknown server error."}`,
          timestamp: responseTimestamp
        }]);
        setTimeout(() => setDoodleState("idle"), 3000);
      }
    } catch (err: any) {
      const responseTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setDoodleState("error");
      setMessages(prev => [...prev, {
        role: "agent",
        content: `Connection error. Please try again.`,
        timestamp: responseTimestamp
      }]);
      setTimeout(() => setDoodleState("idle"), 3000);
    } finally {
      if (actionStageTimer) clearTimeout(actionStageTimer);
      setIsQuerying(false);
    }
  };

  // Contact form submission
  const handleContactSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formState.name || !formState.email || !formState.msg) {
      setFormStatus("Please fill in all fields.");
      return;
    }
    setFormStatus("Sending your message...");
    try {
      const res = await secureFetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState)
      });
      if (res.ok) {
        setFormStatus("Message sent successfully! I'll get back to you soon.");
        setFormState({ name: "", email: "", msg: "" });
      } else {
        const data = await res.json();
        setFormStatus(`Failed to send: ${data.error || "Server error"}`);
      }
    } catch (err: any) {
      setFormStatus("Connection error. Please try again.");
    }
  };

  // Dynamically calibrate skill ratings based on GitHub Repos counts
  const getCalibratedSkills = () => {
    let languages = 60;
    let aiMl = 50;
    let webBackend = 50;
    let cloudDevops = 45;

    if (repos && repos.length > 0) {
      const pythonRepos = repos.filter(r => 
        r.language?.toLowerCase() === "python" || 
        r.name.toLowerCase().includes("python") || 
        r.description?.toLowerCase().includes("python")
      ).length;

      const webRepos = repos.filter(r => 
        ["javascript", "typescript", "html", "css"].includes(r.language?.toLowerCase() || "") || 
        r.name.toLowerCase().includes("react") || 
        r.name.toLowerCase().includes("node") || 
        r.name.toLowerCase().includes("express")
      ).length;

      const mlRepos = repos.filter(r => 
        r.name.toLowerCase().includes("ml") || 
        r.name.toLowerCase().includes("learning") || 
        r.name.toLowerCase().includes("rag") || 
        r.name.toLowerCase().includes("model")
      ).length;

      const devopsRepos = repos.filter(r => 
        r.name.toLowerCase().includes("actions") || 
        r.name.toLowerCase().includes("terraform") || 
        r.description?.toLowerCase().includes("devops")
      ).length;

      languages = Math.min(95, 65 + (pythonRepos * 5) + (webRepos * 4));
      aiMl = Math.min(92, 55 + (mlRepos * 10));
      cloudDevops = Math.min(88, 50 + (devopsRepos * 12));
      webBackend = Math.min(88, 55 + (webRepos * 7));
    }

    return [
      { id: "programming", title: "Programming Languages", items: "Python, C, SQL, TypeScript, JavaScript", rating: languages },
      { id: "aiml", title: "Machine Learning / AI", items: "Scikit-learn, XGBoost, Keras (BiGRU), RAG Pipelines, Vector Search, Embeddings, LLMs", rating: aiMl },
      { id: "frameworks", title: "Frameworks & Backend", items: "FastAPI, Flask, React.js, Node.js, Express, MongoDB, TailwindCSS", rating: webBackend },
      { id: "tools", title: "DevOps & Cloud Systems", items: "Git, GitHub Actions (CI/CD), Terraform, Linux, Postman, Docker", rating: cloudDevops },
    ];
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // ── CHAPTER 02: ABOUT (Light Paper Spread) ──
  // ══════════════════════════════════════════════════════════════════════════════
  if (activeTab === "about") {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full bg-[#FFFFFF] rounded-2xl sm:rounded-3xl border border-[#E7E3D8] zine-spread-card p-6 sm:p-10 md:p-12"
      >
        {/* Spread Header */}
        <div className="flex items-center justify-between pb-6 mb-8 border-b border-[#EFECE4]">
          <div>
            <span className="text-[11px] font-mono tracking-widest uppercase text-[var(--accent-blue)] font-bold">
              Chapter 02 · Author Profile
            </span>
            <h2 className="text-2xl sm:text-4xl font-hand font-bold text-[#181818] tracking-tight mt-1">
              Author Profile · The Engineer from Bhubaneswar
            </h2>
          </div>
          <span className="text-xs font-mono text-[var(--text-faint)]">
            p. 02 / 08
          </span>
        </div>

        {/* Two-Page Spread Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Page (6 cols): Bio, Philosophy & Coordinates */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-start gap-5">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-[#E7E3D8] shrink-0 shadow-xs">
                <img
                  src={portraitImg}
                  alt="Umesh Kumar Sahoo"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover portrait-editorial"
                />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#181818]">Umesh Kumar Sahoo</h3>
                <p className="text-xs font-mono text-[var(--accent-blue)] font-medium">B.Tech CSE (2023–2027) · 9.60 CGPA</p>
                <p className="text-xs text-[var(--text-muted)]">Silicon University, Bhubaneswar, India</p>
                <div className="inline-flex items-center gap-1.5 pt-1 text-[11px] text-emerald-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Available for 2026/2027 AI/ML Roles</span>
                </div>
              </div>
            </div>

            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed font-literary italic">
              "I believe computing systems should be built with quiet elegance: dependable, resilient, and grounded in solid mathematics. From tuning embedding vectors for RAG assistants to writing declarative Terraform configurations, I enjoy bridging machine intelligence with real-world developer workflows."
            </p>

            <div className="pt-4 border-t border-[#EFECE4] space-y-2.5">
              {[
                { icon: <Mail className="w-3.5 h-3.5" />, label: "Email", val: "sahooumesh2003@gmail.com", href: "mailto:sahooumesh2003@gmail.com" },
                { icon: <Github className="w-3.5 h-3.5" />, label: "GitHub", val: "github.com/umeshkumarsahoo", href: "https://github.com/umeshkumarsahoo" },
                { icon: <Linkedin className="w-3.5 h-3.5" />, label: "LinkedIn", val: "linkedin.com/in/umesh-kumar-sahoo-94626727a", href: "https://linkedin.com/in/umesh-kumar-sahoo-94626727a" },
                { icon: <MapPin className="w-3.5 h-3.5" />, label: "Location", val: "Bhubaneswar, Odisha, India", href: null },
              ].map((c, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs">
                  <span className="text-[var(--accent-blue)] shrink-0">{c.icon}</span>
                  <span className="font-mono text-[var(--text-faint)] w-16 uppercase text-[10px]">{c.label}</span>
                  {c.href ? (
                    <a href={c.href} target="_blank" rel="noopener noreferrer" className="text-[#181818] hover:text-[var(--accent-blue)] underline underline-offset-2 transition-colors truncate">
                      {c.val}
                    </a>
                  ) : (
                    <span className="text-[#181818] truncate">{c.val}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Page (6 cols): Botanical Flower (Panel 2), Window Gazer (Panel 3), Academic Milestones */}
          <div className="lg:col-span-6 space-y-6 lg:border-l lg:border-[#EFECE4] lg:pl-10">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-[var(--text-faint)] uppercase tracking-wider">
                  Academic Milestones
                </span>
                <h4 className="text-xl font-hand font-bold text-[#181818]">
                  Academic Foundations & Milestones
                </h4>
              </div>
              <WindowGazerIllustration className="w-16 h-16 shrink-0 opacity-80" />
            </div>

            {/* Education Cards */}
            <div className="space-y-3">
              {[
                {
                  deg: "B.Tech in Computer Science & Engineering",
                  school: "Silicon University, Bhubaneswar",
                  time: "2023 – 2027",
                  score: "CGPA: 9.60 / 10.0",
                  tag: "Top Academic Standing",
                },
                {
                  deg: "Senior Secondary (Class XII)",
                  school: "Jawahar Navodaya Vidyalaya (JNV) Panikoili",
                  time: "2021",
                  score: "Percentage: 91.2%",
                  tag: "Distinction",
                },
                {
                  deg: "Secondary (Class X)",
                  school: "Jawahar Navodaya Vidyalaya (JNV) Panikoili",
                  time: "2019",
                  score: "Percentage: 95.8%",
                  tag: "High Honors",
                },
              ].map((e, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-[#E7E3D8] bg-[#FAF9F5] flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[var(--accent-blue)] text-[11px] font-semibold">{e.time}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#FFFFFF] border border-[#E7E3D8] text-[#181818] font-bold">
                      {e.tag}
                    </span>
                  </div>
                  <h5 className="text-sm font-bold text-[#181818] mt-1">{e.deg}</h5>
                  <p className="text-xs text-[var(--text-muted)]">{e.school}</p>
                  <p className="text-xs font-mono font-semibold text-[var(--accent-blue)] mt-1">{e.score}</p>
                </div>
              ))}
            </div>

            {/* Botanical Illustration accent */}
            <div className="pt-4 border-t border-[#EFECE4] flex items-center justify-between text-xs text-[var(--text-faint)]">
              <span className="font-literary italic">"Growth blooms slowly through deliberate daily practice."</span>
              <BotanicalFlowerIllustration className="w-12 h-16 shrink-0" />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── CHAPTER 03: EXPERIENCE (SIGNATURE SOLID SLATE BLUE SPREAD, Panel 4) ──
  // ══════════════════════════════════════════════════════════════════════════════
  if (activeTab === "experience") {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full bg-[#375C73] text-[#FFFFFF] rounded-2xl sm:rounded-3xl border border-white/20 zine-spread-blue p-6 sm:p-10 md:p-12 shadow-2xl"
      >
        {/* Spread Header */}
        <div className="flex items-center justify-between pb-6 mb-8 border-b border-white/20">
          <div>
            <span className="text-[11px] font-mono tracking-widest uppercase text-white/70 font-bold">
              Chapter 03 · Industry Milestones
            </span>
            <h2 className="text-2xl sm:text-4xl font-hand font-bold text-white tracking-tight mt-1">
              The Working Landscape · Production Systems
            </h2>
          </div>
          <span className="text-xs font-mono text-white/60">
            p. 03 / 08
          </span>
        </div>

        {/* Two-Page Spread Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Page (7 cols): Internship Chronicles */}
          <div className="lg:col-span-7 space-y-6">
            <p className="text-sm text-white/85 leading-relaxed font-literary italic">
              Real systems aren't built in sterile vacuums. Here is where coursework was forged into production pipelines, automated infrastructure, and full-stack APIs.
            </p>

            <div className="space-y-4">
              {/* Internship 1: Ingenious Tech World */}
              <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-white/80 font-bold">Jun 2025 – Jul 2025</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white text-[#375C73] font-bold">
                    DevOps & Cloud
                  </span>
                </div>
                <h4 className="text-base font-bold text-white">DevOps Engineer Intern</h4>
                <p className="text-xs font-mono text-white/75 font-medium">Ingenious Tech World · Remote / Hybrid</p>
                <ul className="space-y-1.5 pt-2 text-xs text-white/90 leading-relaxed list-disc list-inside">
                  <li>Automated end-to-end CI/CD delivery pipelines using GitHub Actions for continuous build verification and test runs.</li>
                  <li>Drafted declarative Infrastructure-as-Code modules using HashiCorp Terraform for reproducible cloud provisioning.</li>
                  <li>Containerized microservices with Docker to eliminate environment drift across development and staging clusters.</li>
                </ul>
              </div>

              {/* Internship 2: Syllogistick */}
              <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-white/80 font-bold">Jun 2024 – Jul 2024</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white text-[#375C73] font-bold">
                    Full-Stack MERN
                  </span>
                </div>
                <h4 className="text-base font-bold text-white">MERN Stack Developer Intern</h4>
                <p className="text-xs font-mono text-white/75 font-medium">Syllogistick · Software Solutions</p>
                <ul className="space-y-1.5 pt-2 text-xs text-white/90 leading-relaxed list-disc list-inside">
                  <li>Engineered production REST APIs in Node.js and Express with secure authentication flows and validation.</li>
                  <li>Modeled and optimized MongoDB document schemas for rapid data aggregation and query latency reduction.</li>
                  <li>Delivered accessible, modular React interfaces aligned with clean UI design specifications.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right Page (5 cols): The Trio of Comic Friends (Panel 4) + Engineering Creed */}
          <div className="lg:col-span-5 space-y-6 lg:border-l lg:border-white/20 lg:pl-10 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono text-white/70 uppercase tracking-wider">
                Engineering In Good Spirits
              </span>
              <h4 className="text-lg font-hand font-bold text-white mt-1 mb-4">
                Teamwork, Systems & Craft
              </h4>
              <div className="bg-white/5 border border-white/15 rounded-2xl p-4 flex items-center justify-center">
                <TrioFriendsIllustration className="w-full max-w-[260px] h-auto" inverted={true} />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/10 border border-white/15 space-y-2">
              <p className="text-xs font-literary italic text-white/90 leading-relaxed">
                "Software engineering is inherently collaborative. The best code is built with empathy, tested with rigour, and deployed without drama."
              </p>
              <div className="flex flex-wrap gap-1.5 pt-2">
                {["GitHub Actions", "Terraform", "Docker", "Node.js", "Express", "MongoDB", "React", "Linux"].map((t, i) => (
                  <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/20 text-white font-medium">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── CHAPTER 04: PROJECTS (Light Paper Spread) ──
  // ══════════════════════════════════════════════════════════════════════════════
  if (activeTab === "projects") {
    const featuredProjects = [
      {
        title: "AI-Powered Terminal Portfolio",
        tech: "React, Vite, Express, Gemini 2.0, Rate-limiting, CSRF Security",
        desc: "Full-stack editorial web portfolio featuring an integrated Gemini digital twin, live Hacker News caching, real-time GitHub sync, and custom Markdown rendering.",
        link: "https://github.com/umeshkumarsahoo/portfolio_",
        badge: "Production Stack"
      },
      {
        title: "RAG-Based Teaching Assistant System",
        tech: "Python, Vector Embeddings, Cosine Similarity, LLM Orchestration",
        desc: "Semantic retrieval pipeline chunking high-dimensional academic corpora and querying vector spaces to provide verifiable, hallucination-free student answers.",
        link: "https://github.com/umeshkumarsahoo",
        badge: "AI Retrieval"
      },
      {
        title: "BiGRU Text Emotion Classifier",
        tech: "Python, Keras, TensorFlow, FastAPI, NLP Tokenization",
        desc: "Bidirectional Recurrent Neural Network (GRU) analyzing nuanced textual sentiments, deployed as an asynchronous FastAPI inference service.",
        link: "https://github.com/umeshkumarsahoo",
        badge: "Deep Learning"
      }
    ];

    const filteredRepos = repos.filter(r => 
      r.name.toLowerCase().includes(repoSearch.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(repoSearch.toLowerCase()))
    );

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full bg-[#FFFFFF] rounded-2xl sm:rounded-3xl border border-[#E7E3D8] zine-spread-card p-6 sm:p-10 md:p-12"
      >
        {/* Spread Header */}
        <div className="flex items-center justify-between pb-6 mb-8 border-b border-[#EFECE4]">
          <div>
            <span className="text-[11px] font-mono tracking-widest uppercase text-[var(--accent-blue)] font-bold">
              Chapter 04 · Featured Chronicles
            </span>
            <h2 className="text-2xl sm:text-4xl font-hand font-bold text-[#181818] tracking-tight mt-1">
              Selected Works · Core Systems & Repositories
            </h2>
          </div>
          <span className="text-xs font-mono text-[var(--text-faint)]">
            p. 04 / 08
          </span>
        </div>

        {/* Chapter 04 Sub-Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-[#EFECE4]">
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#FAF9F5] border border-[#E7E3D8]">
            <button
              onClick={() => setProjectSubTab("case-studies")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                projectSubTab === "case-studies"
                  ? "bg-white text-[var(--accent-blue)] border border-[var(--accent-blue)]/30 shadow-2xs font-bold"
                  : "text-[var(--text-muted)] hover:text-[#181818]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Interactive Case Studies</span>
            </button>
            <button
              onClick={() => setProjectSubTab("github-activity")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                projectSubTab === "github-activity"
                  ? "bg-white text-[var(--accent-blue)] border border-[var(--accent-blue)]/30 shadow-2xs font-bold"
                  : "text-[var(--text-muted)] hover:text-[#181818]"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Live GitHub Activity & Heatmap</span>
            </button>
            <button
              onClick={() => setProjectSubTab("all-repos")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                projectSubTab === "all-repos"
                  ? "bg-white text-[var(--accent-blue)] border border-[var(--accent-blue)]/30 shadow-2xs font-bold"
                  : "text-[var(--text-muted)] hover:text-[#181818]"
              }`}
            >
              <Github className="w-3.5 h-3.5" />
              <span>Repositories Catalogue ({repos.length || 31})</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[11px] font-mono text-[var(--text-faint)]">
              {projectSubTab === "case-studies" ? "UMU AI · FreshGuard · RAG" : "@umeshkumarsahoo"}
            </span>
          </div>
        </div>

        {/* View 1: Interactive Case Studies */}
        {projectSubTab === "case-studies" && (
          <ProjectCaseStudies />
        )}

        {/* View 2: Live Engineering Activity & GitHub Graph Card */}
        {projectSubTab === "github-activity" && (
          <GitHubStats 
            repos={repos} 
            isLoading={isLoadingRepos} 
            onRefresh={handleRefreshRepos} 
            isRefreshing={isRefreshingRepos} 
          />
        )}

        {/* View 3: Two-Page Spread Layout (Featured Projects + All Repos Search) */}
        {projectSubTab === "all-repos" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Page (6 cols): 3 Core Featured Projects */}
            <div className="lg:col-span-6 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[var(--text-faint)] uppercase tracking-wider">
                  Flagship Implementations
                </span>
                <TwilightSeaIllustration className="w-20 h-14 shrink-0 rounded-lg overflow-hidden border border-[#E7E3D8]" />
              </div>

              <div className="space-y-4">
                {featuredProjects.map((p, idx) => (
                  <div key={idx} className="p-4 rounded-2xl border border-[#E7E3D8] bg-[#FAF9F5] hover:border-[var(--accent-blue)] transition-all flex flex-col justify-between group">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-mono text-[10px] font-bold text-[var(--accent-blue)]">0{idx + 1} · {p.badge}</span>
                        <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-[var(--text-faint)] group-hover:text-[var(--accent-blue)] transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <h4 className="text-base font-bold text-[#181818] group-hover:text-[var(--accent-blue)] transition-colors">
                        {p.title}
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                        {p.desc}
                      </p>
                    </div>
                    <div className="pt-3 mt-3 border-t border-[#E7E3D8]/60 flex items-center justify-between text-[11px] font-mono text-[var(--text-faint)]">
                      <span className="truncate pr-2">{p.tech}</span>
                      <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-blue)] font-semibold shrink-0 flex items-center gap-1 hover:underline">
                        Code <ArrowRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Page (6 cols): Live Synchronized GitHub Repositories */}
            <div className="lg:col-span-6 space-y-4 lg:border-l lg:border-[#EFECE4] lg:pl-10">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-[var(--text-faint)] uppercase tracking-wider">
                    Live GitHub Index
                  </span>
                  <h4 className="text-lg font-hand font-bold text-[#181818]">
                    Real-time Public Repositories
                  </h4>
                </div>
                <button
                  onClick={handleRefreshRepos}
                  disabled={isRefreshingRepos}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--accent-blue)] border border-[var(--accent-blue)]/30 px-2.5 py-1 rounded-md hover:bg-[var(--accent-blue)] hover:text-white transition-all cursor-pointer"
                  title="Sync with GitHub API"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshingRepos ? "animate-spin" : ""}`} />
                  <span>Sync</span>
                </button>
              </div>

              {/* Filter Input */}
              <input
                type="text"
                placeholder="Search repositories by name or tech..."
                value={repoSearch}
                onChange={(e) => setRepoSearch(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#E7E3D8] bg-[#FAF9F5] focus:outline-none focus:border-[var(--accent-blue)]"
              />

              {/* Repos List */}
              <div className="max-h-[380px] overflow-y-auto space-y-2.5 pr-1">
                {isLoadingRepos ? (
                  <div className="py-12 text-center text-xs font-mono text-[var(--text-faint)]">
                    Connecting to GitHub API...
                  </div>
                ) : filteredRepos.length > 0 ? (
                  filteredRepos.slice(0, 10).map((r, i) => (
                    <a
                      key={i}
                      href={r.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 rounded-xl border border-[#E7E3D8] bg-[#FAF9F5] hover:bg-white hover:border-[var(--accent-blue)] transition-all group"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-[#181818] group-hover:text-[var(--accent-blue)] transition-colors truncate pr-2">
                          {r.name}
                        </span>
                        <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--text-faint)] shrink-0">
                          <span className="flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                            {r.stargazers_count}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <GitFork className="w-2.5 h-2.5" />
                            {r.forks_count}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 mt-1">
                        {r.description || "Open source repository by Umesh Kumar Sahoo"}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-[var(--text-faint)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-blue)]" />
                        <span>{r.language || "Code"}</span>
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-[var(--text-faint)]">
                    No repositories matched your filter.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── CHAPTER 05: SKILLS (Light Paper Spread, Panel 6) ──
  // ══════════════════════════════════════════════════════════════════════════════
  if (activeTab === "skills") {
    const calibrated = getCalibratedSkills();

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full bg-[#FFFFFF] rounded-2xl sm:rounded-3xl border border-[#E7E3D8] zine-spread-card p-6 sm:p-10 md:p-12"
      >
        {/* Spread Header */}
        <div className="flex items-center justify-between pb-6 mb-8 border-b border-[#EFECE4]">
          <div>
            <span className="text-[11px] font-mono tracking-widest uppercase text-[var(--accent-blue)] font-bold">
              Chapter 05 · Tools & Craft
            </span>
            <h2 className="text-2xl sm:text-4xl font-hand font-bold text-[#181818] tracking-tight mt-1">
              Tools of the Craft · Daily Engineering Stack
            </h2>
          </div>
          <span className="text-xs font-mono text-[var(--text-faint)]">
            p. 05 / 08
          </span>
        </div>

        {/* Two-Page Spread Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Page (6 cols): Daily Objects Illustration (Panel 6) + ML & Core Disciplines */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-[var(--text-faint)] uppercase tracking-wider">
                  The Morning Routine
                </span>
                <h4 className="text-base font-hand font-bold text-[#181818]">
                  Coffee, Focus & Daily Practice
                </h4>
              </div>
              <CoffeeAndPillsIllustration className="w-36 h-20 shrink-0" />
            </div>

            <p className="text-sm text-[var(--text-secondary)] font-literary italic leading-relaxed">
              "A good engineer cultivates their craft through daily repetition: writing tests, validating shapes in tensor arrays, refactoring messy branches, and drinking hot coffee."
            </p>

            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl border border-[#E7E3D8] bg-[#FAF9F5] space-y-2">
                <span className="text-[10px] font-mono text-[var(--accent-blue)] uppercase font-bold">Domain 01</span>
                <h5 className="text-sm font-bold text-[#181818]">Machine Learning & AI Engineering</h5>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Scikit-learn, XGBoost, Gradient Boosting, Random Forest, Keras, RAG Pipelines, LLM Orchestration, Embeddings, Vector Similarity Search, Feature Engineering, Model Calibration.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[#E7E3D8] bg-[#FAF9F5] space-y-2">
                <span className="text-[10px] font-mono text-[var(--accent-blue)] uppercase font-bold">Domain 02</span>
                <h5 className="text-sm font-bold text-[#181818]">Programming Languages</h5>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Python (Advanced/Production), TypeScript, JavaScript (ES6+), C (Systems/Data Structures), SQL (PostgreSQL, SQLite).
                </p>
              </div>
            </div>
          </div>

          {/* Right Page (6 cols): Calibrated Proficiency Meters & Cloud Systems */}
          <div className="lg:col-span-6 space-y-5 lg:border-l lg:border-[#EFECE4] lg:pl-10">
            <div>
              <span className="text-[10px] font-mono text-[var(--text-faint)] uppercase tracking-wider">
                Automated Metric Calibration
              </span>
              <h4 className="text-lg font-hand font-bold text-[#181818]">
                Calibrated Competency Matrix
              </h4>
            </div>

            <div className="space-y-4">
              {calibrated.map((skill) => (
                <div key={skill.id} className="space-y-1.5 p-3 rounded-xl border border-[#E7E3D8] bg-[#FAF9F5]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#181818]">{skill.title}</span>
                    <span className="font-mono text-[11px] font-bold text-[var(--accent-blue)]">{skill.rating}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#EFECE4] overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent-blue)] rounded-full skill-bar-fill"
                      style={{ width: `${skill.rating}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 pt-0.5">
                    {skill.items}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-xl border border-[#E7E3D8] bg-[#FAF9F5] space-y-1.5">
              <span className="text-[10px] font-mono text-[var(--accent-blue)] uppercase font-bold">Domain 03 · Cloud & Infrastructure</span>
              <p className="text-xs text-[var(--text-secondary)]">
                HashiCorp Terraform, GitHub Actions (CI/CD), Docker, Linux administration, RESTful API architecture, Postman, Vite.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── CHAPTER 06: ACHIEVEMENTS (SIGNATURE SOLID SLATE BLUE SPREAD, Panel 8) ──
  // ══════════════════════════════════════════════════════════════════════════════
  if (activeTab === "achievements") {
    const achievements = [
      {
        title: "Runner-Up (2nd Place) · SPEC2MODEL ML Challenge",
        badge: "Silver / 2nd Place",
        desc: "Forecasted food delivery delays under strict competition evaluation using advanced tabular feature engineering and tuned XGBoost ensembles."
      },
      {
        title: "2nd Place · Algo Arena 2.0 Contest",
        badge: "2nd Place Podium",
        desc: "Algorithmic problem solving and data structures sprint against top engineering peers at Silicon University."
      },
      {
        title: "Selected Candidate · PwC Launchpad Program",
        badge: "Corporate Selection",
        desc: "Rigorous technical vetting recognizing emerging software talent and domain competence in enterprise software."
      },
      {
        title: "Google x Kaggle Agents Intensive Capstone",
        badge: "AI Agent Capstone",
        desc: "Built custom multi-tool agent systems using the Google ADK and Gemini API, solving real-world agent orchestration problems."
      }
    ];

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full bg-[#375C73] text-[#FFFFFF] rounded-2xl sm:rounded-3xl border border-white/20 zine-spread-blue p-6 sm:p-10 md:p-12 shadow-2xl"
      >
        {/* Spread Header */}
        <div className="flex items-center justify-between pb-6 mb-8 border-b border-white/20">
          <div>
            <span className="text-[11px] font-mono tracking-widest uppercase text-white/70 font-bold">
              Chapter 06 · Honors & Honors
            </span>
            <h2 className="text-2xl sm:text-4xl font-hand font-bold text-white tracking-tight mt-1">
              Towards the Light · Honors & Competitions
            </h2>
          </div>
          <span className="text-xs font-mono text-white/60">
            p. 06 / 08
          </span>
        </div>

        {/* Two-Page Spread Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Page (7 cols): 4 Competitive Honors */}
          <div className="lg:col-span-7 space-y-4">
            <p className="text-sm text-white/85 font-literary italic leading-relaxed">
              "Under competitive crunch time, real engineering skill is proven. Simple, robust models beat brittle, over-engineered architectures."
            </p>

            <div className="space-y-3.5">
              {achievements.map((ach, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white text-[#375C73] font-bold">
                      {ach.badge}
                    </span>
                    <span className="font-mono text-white/60 text-[10px]">#0{idx + 1}</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-white pt-1">
                    {ach.title}
                  </h4>
                  <p className="text-xs text-white/85 leading-relaxed">
                    {ach.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Page (5 cols): The Gazing Profile Illustration (Panel 8) + Reflection */}
          <div className="lg:col-span-5 space-y-6 lg:border-l lg:border-white/20 lg:pl-10 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono text-white/70 uppercase tracking-wider">
                Aspiring Upward
              </span>
              <h4 className="text-lg font-hand font-bold text-white mt-1 mb-4">
                Looking Beyond the Horizon
              </h4>
              <div className="bg-white/5 border border-white/15 rounded-2xl p-4 flex items-center justify-center">
                <GazingProfileIllustration className="w-full max-w-[220px] h-auto" inverted={true} />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/10 border border-white/15 space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/75 font-bold">Academic Distinction</span>
              <p className="text-xs text-white/90 leading-relaxed font-literary italic">
                Ranked in top academic standing at Silicon University with a 9.60 CGPA, balancing algorithmic rigour with real-world machine learning systems.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── CHAPTER 07: CONTACT (Light Paper Spread, Panel 7) ──
  // ══════════════════════════════════════════════════════════════════════════════
  if (activeTab === "contact") {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full bg-[#FFFFFF] rounded-2xl sm:rounded-3xl border border-[#E7E3D8] zine-spread-card p-6 sm:p-10 md:p-12"
      >
        {/* Spread Header */}
        <div className="flex items-center justify-between pb-6 mb-8 border-b border-[#EFECE4]">
          <div>
            <span className="text-[11px] font-mono tracking-widest uppercase text-[var(--accent-blue)] font-bold">
              Chapter 07 · Dispatching a Note
            </span>
            <h2 className="text-2xl sm:text-4xl font-hand font-bold text-[#181818] tracking-tight mt-1">
              Dispatching a Note · Send a Direct Inquiry
            </h2>
          </div>
          <span className="text-xs font-mono text-[var(--text-faint)]">
            p. 07 / 08
          </span>
        </div>

        {/* Two-Page Spread Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Page (7 cols): Direct Inquiry Form */}
          <div className="lg:col-span-7 space-y-4">
            <p className="text-sm text-[var(--text-secondary)] font-literary italic leading-relaxed">
              "Whether you want to discuss full-time AI/ML engineering roles, discuss a project, or just talk tech news over a virtual coffee, my inbox is open."
            </p>

            <form onSubmit={handleContactSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[var(--text-faint)] mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Connor"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E7E3D8] bg-[#FAF9F5] focus:outline-none focus:border-[var(--accent-blue)] text-[#181818]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[var(--text-faint)] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="sarah@example.com"
                  value={formState.email}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E7E3D8] bg-[#FAF9F5] focus:outline-none focus:border-[var(--accent-blue)] text-[#181818]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[var(--text-faint)] mb-1">
                  Message
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Share your thoughts, engineering roles, or collaboration ideas..."
                  value={formState.msg}
                  onChange={(e) => setFormState({ ...formState, msg: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E7E3D8] bg-[#FAF9F5] focus:outline-none focus:border-[var(--accent-blue)] text-[#181818] resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 text-xs font-medium px-5 py-2.5 rounded-xl bg-[var(--accent-blue)] text-white hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Letter</span>
                </button>
                {formStatus && (
                  <span className="text-xs font-mono text-[var(--accent-blue)] font-medium">
                    {formStatus}
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Right Page (5 cols): Curled Silhouette Illustration (Panel 7) + Direct Channels */}
          <div className="lg:col-span-5 space-y-6 lg:border-l lg:border-[#EFECE4] lg:pl-10">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-[var(--text-faint)] uppercase tracking-wider">
                  Quiet Workspace
                </span>
                <h4 className="text-lg font-hand font-bold text-[#181818]">
                  Quiet Workspace · Direct Lines
                </h4>
              </div>
              <CurledSilhouetteIllustration className="w-24 h-28 shrink-0" />
            </div>

            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-xl border border-[#E7E3D8] bg-[#FAF9F5] space-y-1">
                <span className="text-[10px] font-mono text-[var(--accent-blue)] uppercase font-bold">Email Inbox</span>
                <p className="text-xs font-mono text-[#181818]">sahooumesh2003@gmail.com</p>
                <p className="text-[10px] text-[var(--text-faint)]">Responds within 24 hours</p>
              </div>

              <div className="p-3.5 rounded-xl border border-[#E7E3D8] bg-[#FAF9F5] space-y-1">
                <span className="text-[10px] font-mono text-[var(--accent-blue)] uppercase font-bold">LinkedIn Connection</span>
                <a href="https://linkedin.com/in/umesh-kumar-sahoo-94626727a" target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-[#181818] hover:text-[var(--accent-blue)] underline block truncate">
                  linkedin.com/in/umesh-kumar-sahoo-94626727a
                </a>
              </div>

              <div className="p-3.5 rounded-xl border border-[#E7E3D8] bg-[#FAF9F5] space-y-1">
                <span className="text-[10px] font-mono text-[var(--accent-blue)] uppercase font-bold">GitHub Profile</span>
                <a href="https://github.com/umeshkumarsahoo" target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-[#181818] hover:text-[var(--accent-blue)] underline block truncate">
                  github.com/umeshkumarsahoo
                </a>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── CHAPTER 08: UMU AI & TECH PULSE (Light Paper Spread) ──
  // ══════════════════════════════════════════════════════════════════════════════
  if (activeTab === "agent") {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full bg-[#FFFFFF] rounded-2xl sm:rounded-3xl border border-[#E7E3D8] zine-spread-card p-4 sm:p-8 md:p-10 flex flex-col h-[calc(100vh-140px)] min-h-[550px]"
      >
        {/* Spread Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#EFECE4] shrink-0">
          <div>
            <span className="text-[11px] font-mono tracking-widest uppercase text-[var(--accent-blue)] font-bold">
              Chapter 08 · Cognitive Companion
            </span>
            <h2 className="text-xl sm:text-3xl font-hand font-bold text-[#181818] tracking-tight">
              Digital Twin · UMU AI & Live Tech Pulse
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-mono font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Gemini 2.0 Active
            </span>
            <span className="text-xs font-mono text-[var(--text-faint)] hidden sm:inline">
              p. 08 / 08
            </span>
          </div>
        </div>

        {/* Two-Page Spread Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1 min-h-0">
          {/* Left Page (7 cols): Interactive Chat Console */}
          <div className="lg:col-span-7 flex flex-col h-full min-h-0 rounded-2xl border border-[#E7E3D8] bg-[#FAF9F5] overflow-hidden">
            {/* Conversation Log */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 min-h-0">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    m.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] text-[var(--text-faint)]">
                    <span className="font-semibold">{m.role === "user" ? "You" : "umu"}</span>
                    <span>·</span>
                    <span className="font-mono">{m.timestamp}</span>
                  </div>
                  <div
                    className={`px-4 py-2.5 max-w-[85%] text-xs sm:text-sm leading-relaxed select-text shadow-2xs ${
                      m.role === "user"
                        ? "chat-bubble-user"
                        : "chat-bubble-agent"
                    }`}
                  >
                    <MarkdownRenderer content={m.content} role={m.role} />

                    {/* Email Action Draft Card */}
                    {m.actionDraft && m.actionDraft.status === "pending_confirmation" && (
                      <div className="mt-3.5 p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 shadow-2xs space-y-2.5 text-left text-xs text-[#181818]">
                        <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/80">
                          <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                            <Mail className="w-3.5 h-3.5 text-amber-700" />
                            <span>Email Action Draft</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-100 text-amber-800 border border-amber-300">
                            Waiting for Confirmation
                          </span>
                        </div>

                        {editingDraftIndex === idx ? (
                          <div className="space-y-2 pt-1 text-xs">
                            <div>
                              <label className="text-[10px] font-mono text-[var(--text-faint)] uppercase block mb-1">Your Name</label>
                              <input
                                type="text"
                                value={editDraftForm.name}
                                onChange={(e) => setEditDraftForm({ ...editDraftForm, name: e.target.value })}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-[#E7E3D8] bg-white text-xs focus:outline-none focus:border-[var(--accent-blue)]"
                                placeholder="e.g. Jane Doe"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-mono text-[var(--text-faint)] uppercase block mb-1">Your Email</label>
                              <input
                                type="email"
                                value={editDraftForm.email}
                                onChange={(e) => setEditDraftForm({ ...editDraftForm, email: e.target.value })}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-[#E7E3D8] bg-white text-xs focus:outline-none focus:border-[var(--accent-blue)]"
                                placeholder="e.g. jane@example.com"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-mono text-[var(--text-faint)] uppercase block mb-1">Message</label>
                              <textarea
                                rows={3}
                                value={editDraftForm.message}
                                onChange={(e) => setEditDraftForm({ ...editDraftForm, message: e.target.value })}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-[#E7E3D8] bg-white text-xs focus:outline-none focus:border-[var(--accent-blue)] resize-none"
                                placeholder="Your collaboration or inquiry details..."
                              />
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDraftIndex(null);
                                  handleConfirmEmailAction(editDraftForm);
                                }}
                                disabled={!editDraftForm.name || !editDraftForm.email || !editDraftForm.message || isQuerying}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Save & Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingDraftIndex(null)}
                                className="px-3 py-1.5 rounded-lg border border-[#E7E3D8] bg-white hover:bg-neutral-50 text-neutral-700 font-mono text-xs transition-colors cursor-pointer"
                              >
                                Cancel Edit
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-1.5 text-xs text-[#2A2A2A] pt-0.5">
                              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                                <span className="font-mono text-[10px] text-[var(--text-faint)] uppercase w-16 shrink-0">Recipient:</span>
                                <span className="font-semibold text-[#181818]">Umesh Kumar Sahoo</span>
                                <span className="text-[10px] font-mono text-[var(--text-muted)]">(sahooumesh2003@gmail.com)</span>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                                <span className="font-mono text-[10px] text-[var(--text-faint)] uppercase w-16 shrink-0">From:</span>
                                <span className="font-semibold text-[#181818]">{m.actionDraft.name}</span>
                                <span className="text-[10px] font-mono text-[var(--text-muted)]">({m.actionDraft.email})</span>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 pt-0.5">
                                <span className="font-mono text-[10px] text-[var(--text-faint)] uppercase w-16 shrink-0">Message:</span>
                                <span className="italic text-[#333333]">"{m.actionDraft.message}"</span>
                              </div>
                            </div>

                            {/* Action buttons (only interactive if it's the latest pending draft) */}
                            {idx === (() => {
                              for (let i = messages.length - 1; i >= 0; i--) {
                                if (messages[i].actionDraft?.status === "pending_confirmation") return i;
                              }
                              return -1;
                            })() && (
                              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200/60">
                                <button
                                  type="button"
                                  onClick={() => handleConfirmEmailAction(m.actionDraft)}
                                  disabled={isQuerying}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-40"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Confirm & Send
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingDraftIndex(idx);
                                    setEditDraftForm({
                                      name: m.actionDraft?.name || "",
                                      email: m.actionDraft?.email || "",
                                      message: m.actionDraft?.message || "",
                                    });
                                  }}
                                  disabled={isQuerying}
                                  className="px-3 py-1.5 rounded-lg border border-[#E7E3D8] bg-white hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)] font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEmailAction}
                                  disabled={isQuerying}
                                  className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-100/70 font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Cancel
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {m.actionDraft && m.actionDraft.status === "sent" && (
                      <div className="mt-2.5 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-mono text-left">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Email accepted & dispatched to Umesh ({m.actionDraft.provider === "smtp" ? "SMTP" : m.actionDraft.provider === "resend" ? "Resend" : "Persisted locally"}).</span>
                      </div>
                    )}

                    {m.actionDraft && m.actionDraft.status === "failed" && (
                      <div className="mt-2.5 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-mono text-left">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Delivery notice: {m.actionDraft.error || "Email provider rejected delivery"} (Safely saved to local inbox).</span>
                      </div>
                    )}

                    {m.actionDraft && m.actionDraft.status === "cancelled" && (
                      <div className="mt-2.5 px-3 py-2 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-600 text-xs flex items-center gap-2 font-mono text-left">
                        <X className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                        <span>Email action draft cancelled. No email was sent to Umesh.</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isQuerying && (
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] text-[var(--text-faint)]">
                    <span>umu</span>
                    <span>·</span>
                    <span className="font-mono">thinking</span>
                  </div>
                  <div className="chat-bubble-agent px-4 py-2.5 flex items-center gap-2 text-xs sm:text-sm text-[var(--accent-blue)]">
                    <span className="inline-block animate-spin border-t-2 border-r-2 border-[var(--accent-blue)] rounded-full w-3.5 h-3.5 shrink-0" />
                    <span>{queryStatus}</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts Bar */}
            <div className="px-3 py-2 border-t border-[#E7E3D8] overflow-x-auto flex gap-1.5 shrink-0 bg-white/70">
              {[
                { label: "✉️ Message Umesh", prompt: "I want to send a message to Umesh" },
                { label: "📡 Tech Pulse", prompt: "Brief me on the latest top trending tech news headlines." },
                { label: "🎓 Credentials", prompt: "Tell me about Umesh's education, CGPA, and background" },
                { label: "RAG Assistant", prompt: "Explain your RAG-Based Assistant" },
                { label: "DevOps", prompt: "What DevOps and cloud experience does Umesh have?" },
                { label: "FreshGuard", prompt: "Tell me about FreshGuard and your ML competitions" },
              ].map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuerySubmit(undefined, qp.prompt)}
                  className="px-2.5 py-1 text-[11px] font-mono rounded-lg border border-[#E7E3D8] bg-white hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)] whitespace-nowrap transition-colors cursor-pointer shrink-0"
                >
                  {qp.label}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form onSubmit={handleQuerySubmit} className="p-2.5 border-t border-[#E7E3D8] bg-white flex items-center gap-2 shrink-0">
              <input
                type="text"
                placeholder="Ask umu about Umesh's background, projects, or say 'brief me on the news'..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isQuerying}
                className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#E7E3D8] focus:outline-none focus:border-[var(--accent-blue)]"
              />
              <button
                type="submit"
                disabled={!query.trim() || isQuerying}
                className="p-2 rounded-lg bg-[var(--accent-blue)] text-white hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Right Page (5 cols): Animated Doodle + Tech News Feed */}
          <div className="lg:col-span-5 flex flex-col h-full min-h-0 space-y-4 lg:border-l lg:border-[#EFECE4] lg:pl-6 overflow-hidden">
            {/* Doodle Status Card */}
            <div className="p-3.5 rounded-2xl border border-[#E7E3D8] bg-[#FAF9F5] flex items-center gap-4 shrink-0">
              <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                <UmuDoodle state={doodleState} className="w-16 h-16" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[#181818]">umu · Companion</h4>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {isQuerying ? queryStatus : "Listening attentively · Ready to brief you"}
                </p>
              </div>
            </div>

            {/* Hacker News Live Intelligence Feed */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between pb-2 shrink-0">
                <span className="text-[10px] font-mono text-[var(--text-faint)] uppercase tracking-wider">
                  Trending Hacker News
                </span>
                <span className="text-[10px] font-mono text-[var(--accent-blue)] font-bold">
                  Live Stream
                </span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <TechNewsFeed onBriefNews={(topic) => {
                  const prompt = topic && topic !== "top-news"
                    ? `Give me a technical briefing on: "${topic}"`
                    : "Brief me on the latest top trending tech news headlines.";
                  handleQuerySubmit(undefined, prompt);
                }} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}
