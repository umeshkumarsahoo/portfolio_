import { lazy, Suspense, useState, useEffect, FormEvent, useRef } from "react";
import { motion } from "motion/react";
import { 
  Send, Terminal, Cpu, Bot, Star, ExternalLink, RefreshCw, Sparkles, BookOpen, 
  Calendar, User, MapPin, Mail, GraduationCap, TrendingUp, Cloud, Trophy, 
  Brain, Leaf, Plane, Award, Code, Globe, Play, Github, Linkedin, Eye 
} from "lucide-react";
import { secureFetch } from "../lib/api";
import UmuDoodle, { DoodleGang } from "./UmuDoodle";
import type { DoodleState } from "./UmuDoodle";
import {
  AboutIllustration,
  ExperienceIllustration,
  SkillsIllustration,
  AchievementsIllustration,
} from "./SectionIllustrations";
import portraitImg from "../assets/images/umesh_portrait_1784052523060.png";

const GitHubStats = lazy(() => import("./GitHubStats"));

interface TabContentProps {
  activeTab: string;
  onActionClick?: (actionType: string) => void;
  initialAgentQuery?: string;
  clearInitialAgentQuery?: () => void;
}

interface Message {
  role: "user" | "agent";
  content: string;
  timestamp: string;
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
      content: "Hey there! I'm umu — Umesh's terminal sidekick and digital twin 👋\n\nI'm here to give you an insider tour of Umesh's engineering world (and save you from another dry PDF resume!). Ask me anything about his 9.60 CGPA grind at Silicon University, his RAG Teaching Assistant, ML competitions, or say \"brief me on the news\" to get today's top Hacker News stories!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }
  ]);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryStatus, setQueryStatus] = useState("Thinking...");
  const [doodleState, setDoodleState] = useState<DoodleState>("idle");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch repos list on component mount / tab change
  const loadRepos = async () => {
    setIsLoadingRepos(true);
    try {
      const res = await fetch("/api/github/repos");
      if (res.ok) {
        const data = await res.json();
        setRepos(data);
      }
    } catch (err) {
      console.error("Error loading repositories:", err);
    } finally {
      setIsLoadingRepos(false);
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

  // Submit query to Gemini Agent
  const handleQuerySubmit = async (e?: FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const activeQuery = customQuery || query;
    if (!activeQuery.trim() || isQuerying) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newMsg: Message = { role: "user", content: activeQuery, timestamp };
    
    setMessages(prev => [...prev, newMsg]);
    if (!customQuery) setQuery("");
    setIsQuerying(true);
    setDoodleState("thinking");
    setQueryStatus("Thinking...");

    let statusTimer1: NodeJS.Timeout | undefined;
    let statusTimer2: NodeJS.Timeout | undefined;
    let statusTimer3: NodeJS.Timeout | undefined;

    try {
      statusTimer1 = setTimeout(() => {
        setQueryStatus("Searching repositories...");
        setDoodleState("searching");
      }, 700);

      statusTimer2 = setTimeout(() => {
        setQueryStatus("Composing response...");
        setDoodleState("processing");
      }, 1600);

      statusTimer3 = setTimeout(() => {
        setQueryStatus("Almost there...");
      }, 2500);

      const chatHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      })).slice(-10);

      const response = await secureFetch("/api/agent/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: activeQuery, history: chatHistory })
      });

      const responseTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      if (response.ok) {
        const data = await response.json();
        setDoodleState("speaking");
        setMessages(prev => [...prev, {
          role: "agent",
          content: data.reply,
          timestamp: responseTimestamp
        }]);
        setTimeout(() => setDoodleState("success"), 500);
        setTimeout(() => setDoodleState("idle"), 2000);
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
      if (statusTimer1) clearTimeout(statusTimer1);
      if (statusTimer2) clearTimeout(statusTimer2);
      if (statusTimer3) clearTimeout(statusTimer3);
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
    let dataEng = 50;
    let cloudDevops = 45;
    let webBackend = 50;
    let toolsPlatforms = 55;

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
        r.name.toLowerCase().includes("express") || 
        r.description?.toLowerCase().includes("web")
      ).length;

      const mlRepos = repos.filter(r => 
        r.name.toLowerCase().includes("ml") || 
        r.name.toLowerCase().includes("learning") || 
        r.name.toLowerCase().includes("prediction") || 
        r.name.toLowerCase().includes("rag") || 
        r.name.toLowerCase().includes("model") || 
        r.description?.toLowerCase().includes("ai") ||
        r.description?.toLowerCase().includes("regression")
      ).length;

      const devopsRepos = repos.filter(r => 
        r.name.toLowerCase().includes("actions") || 
        r.name.toLowerCase().includes("terraform") || 
        r.name.toLowerCase().includes("deploy") || 
        r.description?.toLowerCase().includes("ci") || 
        r.description?.toLowerCase().includes("devops")
      ).length;

      languages = Math.min(95, 60 + (pythonRepos * 5) + (webRepos * 4));
      aiMl = Math.min(90, 50 + (mlRepos * 10));
      dataEng = Math.min(90, 50 + (pythonRepos * 8));
      cloudDevops = Math.min(85, 45 + (devopsRepos * 12));
      webBackend = Math.min(85, 50 + (webRepos * 8));
      toolsPlatforms = Math.min(90, 55 + (repos.length * 3));
    }

    return [
      { id: "programming", title: "Programming", items: "Python, C, SQL", rating: languages },
      { id: "aiml", title: "Machine Learning / AI", items: "Scikit-learn, XGBoost, Gradient Boosting, Random Forest, Keras, RAG Pipelines, LLM Integration, Embeddings, Vector Similarity Search, Feature Engineering, Model Evaluation", rating: aiMl },
      { id: "frameworks", title: "Frameworks / Libraries", items: "FastAPI, Flask, React.js, Node.js, Pandas, NumPy, Matplotlib, Seaborn", rating: webBackend },
      { id: "tools", title: "Tools / DevOps", items: "Git, GitHub, GitHub Actions, Terraform, Linux, Postman, Jupyter Notebook, VS Code", rating: cloudDevops },
    ];
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  // ── ABOUT TAB ──
  if (activeTab === "about") {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        id="about-tab-content"
        className="space-y-8"
      >
        {/* Bio section with portrait */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-5">
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              Computer Science undergraduate with hands-on experience building web applications, ML APIs, and RAG-based AI systems. Skilled in Python, Basic JavaScript, SQL, REST APIs, machine learning, embeddings, vector search, and LLM integration, with a strong interest in software development and AI engineering.
            </p>

            {/* Profile Info */}
            <div className="space-y-3 pt-2">
              {[
                { icon: <User className="w-4 h-4" />, label: "Name", value: "Umesh Kumar Sahoo" },
                { icon: <MapPin className="w-4 h-4" />, label: "Location", value: "Bhubaneswar, Odisha, India" },
                { icon: <Mail className="w-4 h-4" />, label: "Email", value: "sahooumesh2003@gmail.com" },
                { icon: <GraduationCap className="w-4 h-4" />, label: "Degree", value: "B.Tech in Computer Science & Engineering (CGPA: 9.60 / 10.0)" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 group">
                  <span className="text-[var(--text-faint)] mt-0.5 group-hover:text-[var(--accent-blue)] transition-colors">{item.icon}</span>
                  <div className="flex-1">
                    <span className="text-[11px] font-mono text-[var(--text-faint)] uppercase tracking-wider">{item.label}</span>
                    <p className="text-sm text-[var(--text-primary)] select-all">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Portrait + Illustration */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden border border-[var(--color-border)]">
              <img
                src={portraitImg}
                alt="Umesh Kumar Sahoo"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover portrait-editorial"
              />
            </div>
            <AboutIllustration className="w-24 h-24 opacity-30" />
          </div>
        </div>

        {/* Education Timeline */}
        <div className="pt-6 border-t border-[var(--color-border)]">
          <h3 className="text-xs font-mono text-[var(--text-faint)] tracking-wider uppercase mb-5">
            Education
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                degree: "B.Tech in Computer Science & Engineering",
                institution: "Silicon University, Bhubaneswar",
                period: "2023 – 2027",
                grade: "CGPA: 9.60 / 10.0",
                badge: "Current · 9.60 CGPA",
              },
              {
                degree: "Senior Secondary (Class XII)",
                institution: "JNV Panikoili",
                period: "2021",
                grade: "Percentage: 91.2%",
                badge: "91.2%",
              },
              {
                degree: "Secondary (Class X)",
                institution: "JNV Panikoili",
                period: "2019",
                grade: "Percentage: 95.8%",
                badge: "95.8%",
              },
            ].map((edu, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--bg-primary)] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[var(--accent-blue)]">{edu.period}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-border)] text-[var(--text-primary)] font-medium">
                    {edu.badge}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] leading-snug">
                  {edu.degree}
                </h4>
                <p className="text-xs text-[var(--text-muted)]">
                  {edu.institution}
                </p>
                <p className="text-xs font-mono text-[var(--text-secondary)] font-medium pt-1">
                  {edu.grade}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* At a Glance */}
        <div className="pt-4 border-t border-[var(--color-border)]">
          <h3 className="text-xs font-mono text-[var(--text-faint)] tracking-wider uppercase mb-4">At a Glance</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {[
              { val: "9.60", label: "CGPA" },
              { val: "2", label: "Internships" },
              { val: "3", label: "Core Projects" },
              { val: "4", label: "Awards & Honors" },
              { val: "3", label: "Certifications" },
            ].map((stat, idx) => (
              <div key={idx} className="text-center py-3 rounded-lg bg-[var(--color-border)] bg-opacity-30">
                <p className="text-xl font-bold text-[var(--text-primary)]">{stat.val}</p>
                <p className="text-[10px] font-mono text-[var(--text-faint)] uppercase tracking-wider mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  // ── EXPERIENCE TAB ──
  if (activeTab === "experience") {
    const experiences = [
      {
        year: "June 2025 – July 2025",
        role: "DevOps Engineer Intern",
        company: "Ingenious Tech World",
        details: [
          "Worked with GitHub Actions and Terraform on CI/CD and Infrastructure-as-Code workflows."
        ]
      },
      {
        year: "June 2024 – July 2024",
        role: "MERN Stack Developer Intern",
        company: "Syllogistick",
        details: [
          "Worked on a MERN-based application involving React, REST APIs, authentication, and MongoDB."
        ]
      }
    ];

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        id="experience-tab-content"
        className="space-y-8"
      >
        <div className="flex items-start gap-8">
          <div className="flex-1 space-y-8">
            {experiences.map((exp, idx) => (
              <div key={idx} className="relative pl-6 border-l-2 border-[var(--color-border)] group">
                {/* Timeline dot */}
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-[var(--accent-blue)] bg-[var(--bg-primary)]" />
                
                <div className="space-y-2">
                  <span className="text-[11px] font-mono text-[var(--accent-blue)] tracking-wider">
                    {exp.year}
                  </span>
                  <h4 className="text-lg font-semibold text-[var(--text-primary)]">
                    {exp.role}
                  </h4>
                  <p className="text-sm text-[var(--text-muted)] font-medium">
                    {exp.company}
                  </p>
                  <ul className="space-y-2 pt-2">
                    {exp.details.map((detail, dIdx) => (
                      <li key={dIdx} className="text-sm text-[var(--text-secondary)] leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-[var(--color-border-strong)]">
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
          
          <ExperienceIllustration className="hidden lg:block w-32 h-32 opacity-20 shrink-0" />
        </div>
      </motion.div>
    );
  }

  // ── PROJECTS TAB ──
  if (activeTab === "projects") {
    const getImpactScore = (repo: GithubRepo) => {
      let score = (repo.stargazers_count * 100) + (repo.forks_count * 50);
      
      const name = repo.name.toLowerCase();
      const desc = (repo.description || "").toLowerCase();
      const combined = name + " " + desc;

      if (
        name.includes("assingment") || 
        name.includes("assignment") || 
        name === "small-projects" || 
        name === "python" ||
        name.includes("leet-code") || 
        name.includes("mern-stack") ||
        name.includes("bday") || 
        name.includes("hlo-resh") ||
        name.includes("git1") ||
        name.includes("first-web") ||
        name.includes("calculator") ||
        name.includes("awesome-github") ||
        name.includes("docs") ||
        name.includes("portfolio") ||
        name === "tata" ||
        name === "aws" ||
        name === "water-borne"
      ) {
        return -9999;
      }

      if (name.includes("rag") || name.includes("teaching")) score += 500;
      if (name.includes("fresh_guard") || name.includes("freshguard")) score += 500;
      if (name.includes("time_series") || name.includes("nifty")) score += 500;
      if (name.includes("ml-projects") || name.includes("classifier")) score += 400;
      if (name.includes("spec2model")) score += 300;

      if (combined.includes("prediction") || combined.includes("system") || combined.includes("classifier") || combined.includes("forecasting") || combined.includes("pipeline") || combined.includes("model")) {
        score += 50;
      }

      if (desc.length > 20) score += 20;

      return score;
    };

    const rankedRepos = [...repos]
      .filter(repo => getImpactScore(repo) > -100)
      .sort((a, b) => getImpactScore(b) - getImpactScore(a));

    const topRepos = rankedRepos.slice(0, 4);

    const getLanguageColor = (lang: string | null) => {
      const colors: Record<string, string> = {
        python: "#3572A5",
        javascript: "#F1E05A",
        typescript: "#3178C6",
        html: "#E34C26",
        java: "#B07219",
      };
      return colors[(lang || "").toLowerCase()] || "#6B6B6B";
    };

    const resumeProjects = [
      {
        title: "AI-Powered Terminal Portfolio",
        tags: ["React", "FastAPI", "Gemini", "REST APIs", "Security"],
        highlights: [
          "Built a React + FastAPI terminal-style portfolio with a backend, integrating GitHub and Hacker News APIs with server-side caching for dynamic content.",
          "Developed a Gemini-powered assistant using resume and public repository context to answer questions about projects, skills, and experience.",
          "Implemented API security controls including Helmet security headers, rate limiting, CSRF protection, input validation, and server-side secret management."
        ],
        github: "https://github.com/umeshkumarsahoo/portfolio_",
        live: "https://umesh-portfolio-4r6o.onrender.com/",
      },
      {
        title: "RAG-Based Teaching Assistant System",
        tags: ["Python", "RAG", "Embeddings", "Vector Search", "LLM Integration"],
        highlights: [
          "Built an end-to-end RAG pipeline covering document ingestion, chunking, embedding generation, vector similarity search, retrieval, and LLM-based response generation.",
          "Used semantic retrieval to provide relevant source context to the language model for context-aware question answering over educational content."
        ],
        github: "https://github.com/umeshkumarsahoo/RAG-Based-Teaching-Assistant-System",
        live: null,
      },
      {
        title: "Emotion Detection API",
        tags: ["Python", "Keras", "BiGRU", "FastAPI", "NLP"],
        highlights: [
          "Built a Keras Bidirectional GRU model for text emotion classification and exposed inference through a FastAPI REST service.",
          "Implemented inference preprocessing, tokenizer-based sequence conversion, padding, and prediction with emotion probabilities and confidence scores.",
          "Added health and prediction endpoints with validation and error handling for unavailable model or tokenizer artifacts."
        ],
        github: "https://github.com/umeshkumarsahoo/Emotion_detection_api",
        live: null,
      }
    ];

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        id="projects-tab-content"
        className="space-y-10"
      >
        {/* Core Resume Featured Projects */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono text-[var(--text-faint)] tracking-wider uppercase">
              Featured Resume Projects
            </h3>
            <span className="text-xs font-mono text-[var(--accent-blue)]">
              Production & Research
            </span>
          </div>

          <div className="space-y-5">
            {resumeProjects.map((project, idx) => (
              <div
                key={idx}
                className="p-6 rounded-xl border border-[var(--color-border)] hover:border-[var(--accent-blue)] bg-[var(--bg-primary)] transition-all duration-200 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-base md:text-lg font-semibold text-[var(--text-primary)]">
                    {project.title}
                  </h4>
                  <div className="flex items-center gap-3">
                    {project.github && (
                      <a
                        href={project.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--accent-blue)] flex items-center gap-1 transition-colors"
                      >
                        <Github className="w-3.5 h-3.5" />
                        Code
                      </a>
                    )}
                    {project.live && (
                      <a
                        href={project.live}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-[var(--accent-blue)] hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Live Demo
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {project.tags.map((tag, tidx) => (
                    <span
                      key={tidx}
                      className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[var(--color-border)] text-[var(--text-primary)] font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <ul className="space-y-2 pt-1">
                  {project.highlights.map((bullet, bidx) => (
                    <li
                      key={bidx}
                      className="text-sm text-[var(--text-secondary)] leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-[var(--accent-blue)]"
                    >
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* GitHub Stats & Repositories */}
        <div className="space-y-6 pt-6 border-t border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono text-[var(--text-faint)] tracking-wider uppercase">
              Live GitHub Repositories
            </h3>
            <span className="text-xs font-mono text-[var(--text-faint)]">
              Real-time Sync
            </span>
          </div>

          <Suspense
            fallback={
              <div className="py-8 text-center text-sm text-[var(--text-faint)]">
                Loading GitHub data...
              </div>
            }
          >
            <GitHubStats repos={repos} isLoading={isLoadingRepos} />
          </Suspense>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {topRepos.length > 0 ? (
              topRepos.map((repo, idx) => (
                <a
                  key={idx}
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block p-4 rounded-xl border border-[var(--color-border)] hover:border-[var(--accent-blue)] bg-[var(--bg-primary)] hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h5 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors">
                      {repo.name}
                    </h5>
                    <ExternalLink className="w-3.5 h-3.5 text-[var(--text-faint)] group-hover:text-[var(--accent-blue)] shrink-0 transition-colors" />
                  </div>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-3 line-clamp-2">
                    {repo.description || "No description provided."}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-faint)]">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ background: getLanguageColor(repo.language) }} />
                      {repo.language || "Mixed"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {repo.stargazers_count}
                    </span>
                  </div>
                </a>
              ))
            ) : (
              <div className="col-span-2 text-center py-6 text-sm text-[var(--text-faint)]">
                Loading synced repositories...
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <a 
              href="https://github.com/umeshkumarsahoo" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-xs text-[var(--accent-blue)] font-medium hover:underline flex items-center gap-1.5"
            >
              <Github className="w-3.5 h-3.5" />
              View all {repos.length || 15}+ repositories on GitHub →
            </a>
            <span className="text-[11px] font-mono text-[var(--text-faint)]">
              github.com/umeshkumarsahoo
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── SKILLS TAB ──
  if (activeTab === "skills") {
    const skillsList = getCalibratedSkills();

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        id="skills-tab-content"
        className="space-y-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {repos.length > 0 && (
              <p className="text-xs text-[var(--accent-blue)] font-mono mb-6">
                Auto-calibrated from {repos.length} synced repositories
              </p>
            )}

            <div className="space-y-6">
              {skillsList.map((skill) => (
                <div key={skill.id} className="space-y-2 group">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                      {skill.title}
                    </h4>
                    <span className="text-xs font-mono text-[var(--accent-blue)] tabular-nums font-medium">
                      {skill.rating}%
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    {skill.items}
                  </p>
                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--accent-blue)] skill-bar-fill"
                      style={{ width: `${skill.rating}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <SkillsIllustration className="hidden lg:block w-32 h-32 opacity-20 shrink-0 mt-8" />
        </div>

        <div className="text-center pt-4 border-t border-[var(--color-border)]">
          <p className="text-sm text-[var(--text-muted)] italic">
            Always learning. Always building.
          </p>
        </div>
      </motion.div>
    );
  }

  // ── ACHIEVEMENTS TAB ──
  if (activeTab === "achievements") {
    const achievements = [
      {
        title: "Runner-Up – SPEC2MODEL ML Challenge",
        desc: "Secured 2nd place in the Food Delivery Delay Prediction competition. Developed predictive regression models with feature engineering under strict competition criteria.",
        year: "2024",
        category: "ML Competition",
        color: "var(--accent-orange)",
      },
      {
        title: "Algo Arena 2.0 – 2nd Place",
        desc: "Secured 2nd Place at Silicon University. Demonstrated algorithmic problem-solving and rapid data structure implementation in competitive programming.",
        year: "2024",
        category: "Silicon University",
        color: "var(--accent-blue)",
      },
      {
        title: "PwC Launchpad Program",
        desc: "Selected for the PwC Launchpad program. Engaging in intensive corporate learning, power skills workshops, and consulting case simulations.",
        year: "Ongoing",
        category: "Program",
        color: "var(--accent-blue)",
      },
      {
        title: "Kaggle Agents Intensive Capstone",
        desc: "Participated in the Google x Kaggle Agents Intensive program and built an agent-based AI application using Google ADK and Gemini.",
        year: "2025",
        category: "Google x Kaggle",
        color: "var(--accent-orange)",
      }
    ];

    const certifications = [
      {
        title: "Generative AI Introduction",
        issuer: "Google",
        desc: "Foundational concepts of large language models, prompt engineering, generative architectures, and AI ethics.",
      },
      {
        title: "Introduction to Artificial Intelligence",
        issuer: "IBM",
        desc: "Comprehensive foundation in AI concepts, machine learning workflows, and practical applications.",
      },
      {
        title: "Job Ready Data Science",
        issuer: "CodeWithHarry",
        desc: "Extensive hands-on data science training covering Python, data analysis, feature engineering, and predictive modeling.",
      }
    ];

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        id="achievements-tab-content"
        className="space-y-10"
      >
        <div className="flex items-start gap-8">
          <div className="flex-1 space-y-10">
            {/* Honors & Achievements */}
            <div className="space-y-4">
              <h3 className="text-xs font-mono text-[var(--text-faint)] tracking-wider uppercase">
                Honors & Achievements
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {achievements.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="p-5 rounded-xl border border-[var(--color-border)] hover:border-[var(--accent-blue)] bg-[var(--bg-primary)] transition-all group space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2 h-2 rounded-full" 
                          style={{ background: item.color }}
                        />
                        <span className="font-mono text-[var(--text-faint)]">{item.category}</span>
                      </div>
                      <span className="font-mono text-[var(--accent-blue)] font-medium">{item.year}</span>
                    </div>
                    <h4 className="text-sm md:text-base font-semibold text-[var(--text-primary)]">
                      {item.title}
                    </h4>
                    <p className="text-xs md:text-sm text-[var(--text-muted)] leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Certifications */}
            <div className="space-y-4 pt-6 border-t border-[var(--color-border)]">
              <h3 className="text-xs font-mono text-[var(--text-faint)] tracking-wider uppercase">
                Certifications
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {certifications.map((cert, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--bg-primary)] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-border)] text-[var(--text-primary)] font-medium">
                        {cert.issuer}
                      </span>
                      <Award className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
                    </div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                      {cert.title}
                    </h4>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      {cert.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <AchievementsIllustration className="hidden lg:block w-28 h-28 opacity-20 shrink-0" />
        </div>
      </motion.div>
    );
  }

  // ── CONTACT TAB ──
  if (activeTab === "contact") {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        id="contact-tab-content"
        className="space-y-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Form */}
          <form onSubmit={handleContactSubmit} className="space-y-5">
            <p className="text-base text-[var(--text-secondary)] leading-relaxed">
              Have a project idea, question, or just want to say hello? I'd love to hear from you.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-[var(--text-faint)] block mb-1.5 tracking-wider uppercase">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  className="w-full bg-transparent border border-[var(--color-border-strong)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)] placeholder:text-[var(--text-faint)] transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-[var(--text-faint)] block mb-1.5 tracking-wider uppercase">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={formState.email}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                  className="w-full bg-transparent border border-[var(--color-border-strong)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)] placeholder:text-[var(--text-faint)] transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-mono text-[var(--text-faint)] block mb-1.5 tracking-wider uppercase">
                Message
              </label>
              <textarea
                placeholder="Tell me about your project or idea..."
                rows={4}
                value={formState.msg}
                onChange={(e) => setFormState({ ...formState, msg: e.target.value })}
                className="w-full bg-transparent border border-[var(--color-border-strong)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)] placeholder:text-[var(--text-faint)] resize-none transition-colors"
              />
            </div>
            
            <div className="flex items-center justify-between gap-4">
              {formStatus && (
                <p className={`text-xs ${formStatus.includes("success") ? "text-[var(--color-success)]" : formStatus.includes("Failed") || formStatus.includes("error") ? "text-[var(--color-error)]" : "text-[var(--accent-blue)]"}`}>
                  {formStatus}
                </p>
              )}
              <button
                type="submit"
                className="ml-auto text-sm font-medium bg-[var(--text-primary)] text-[var(--bg-primary)] px-6 py-2.5 rounded-lg hover:bg-[var(--accent-blue)] transition-colors cursor-pointer flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send Message
              </button>
            </div>
          </form>

          {/* Social Links */}
          <div className="space-y-5">
            <h3 className="text-xs font-mono text-[var(--text-faint)] tracking-wider uppercase">
              Connect
            </h3>
            <div className="space-y-3">
              {[
                { href: "https://github.com/umeshkumarsahoo", icon: <Github className="w-5 h-5" />, name: "GitHub", handle: "umeshkumarsahoo" },
                { href: "https://www.linkedin.com/in/umesh-kumar-sahoo-94626727a", icon: <Linkedin className="w-5 h-5" />, name: "LinkedIn", handle: "umesh-kumar-sahoo" },
                { href: "https://leetcode.com/u/phribbi39", icon: <Code className="w-5 h-5" />, name: "LeetCode", handle: "phribbi39" },
              ].map((social, idx) => (
                <a
                  key={idx}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-xl border border-[var(--color-border)] hover:border-[var(--accent-blue)] transition-all group"
                >
                  <span className="text-[var(--text-muted)] group-hover:text-[var(--accent-blue)] transition-colors">
                    {social.icon}
                  </span>
                  <div>
                    <span className="text-sm font-medium text-[var(--text-primary)] block">{social.name}</span>
                    <span className="text-xs text-[var(--text-faint)] font-mono">{social.handle}</span>
                  </div>
                  <ExternalLink className="w-4 h-4 ml-auto text-[var(--text-faint)] group-hover:text-[var(--accent-blue)] transition-colors" />
                </a>
              ))}
            </div>

            <div className="pt-4 border-t border-[var(--color-border)]">
              <p className="text-sm text-[var(--text-muted)]">
                <Mail className="w-4 h-4 inline mr-2" />
                sahooumesh2003@gmail.com
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── AI AGENT TAB ──
  if (activeTab === "agent") {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        id="agent-tab-content"
        className="h-full flex flex-col overflow-hidden"
      >
        <div className="flex-1 flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--bg-primary)] overflow-hidden">
          {/* Chat Header with Doodle */}
          <div className="shrink-0 px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-3">
            <UmuDoodle state={doodleState} className="" />
            <div>
              <span className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                umu
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] inline-block" />
              </span>
              <span className="text-[10px] text-[var(--text-faint)] font-mono">
                {isQuerying ? queryStatus : "Online · Ready to help"}
              </span>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.length <= 1 && (
              <div className="py-6 px-4 my-2 rounded-2xl border border-[var(--color-border)] bg-[var(--bg-secondary)]/50 text-center space-y-3">
                <DoodleGang className="w-full max-w-sm h-28 mx-auto" />
                <h4 className="text-xs font-mono uppercase tracking-widest text-[var(--accent-blue)] font-bold">
                  Meet umu · Umesh's AI Sidekick
                </h4>
                <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
                  Curious about Umesh's code, his machine learning pipelines, or want to dissect what's blowing up on Hacker News? Ask me anything — no corporate fluff, just real tech talk.
                </p>
              </div>
            )}
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  m.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[10px] text-[var(--text-faint)]">
                  <span>{m.role === "user" ? "You" : "umu"}</span>
                  <span>·</span>
                  <span className="font-mono">{m.timestamp}</span>
                </div>
                <div
                  className={`px-4 py-2.5 max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap select-text ${
                    m.role === "user"
                      ? "chat-bubble-user"
                      : "chat-bubble-agent"
                  }`}
                >
                  {m.content}
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
                <div className="chat-bubble-agent px-4 py-3 flex items-center gap-2 text-sm text-[var(--accent-blue)]">
                  <span className="inline-block animate-spin border-t-2 border-r-2 border-[var(--accent-blue)] rounded-full w-3.5 h-3.5 shrink-0" />
                  {queryStatus}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-4 py-2 border-t border-[var(--color-border)] overflow-x-auto flex gap-2 shrink-0">
            {[
              { label: "📡 Tech Pulse", prompt: "Brief me on the latest top trending tech news headlines." },
              { label: "🎓 Credentials", prompt: "Tell me about Umesh's education, CGPA, and background" },
              { label: "RAG Assistant", prompt: "Explain your RAG-Based Assistant" },
              { label: "DevOps", prompt: "Detail your DevOps and Terraform experience" },
              { label: "FreshGuard", prompt: "Explain the FreshGuard ML project" },
              { label: "MongoDB", prompt: "How did you optimize e-commerce queries?" },
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={(e) => handleQuerySubmit(e, item.prompt)}
                className="shrink-0 text-xs text-[var(--text-muted)] hover:text-[var(--accent-blue)] border border-[var(--color-border)] hover:border-[var(--accent-blue)] px-3 py-1 rounded-full transition-colors cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleQuerySubmit}
            className="border-t border-[var(--color-border)] flex items-center shrink-0"
          >
            <input
              type="text"
              placeholder="Ask umu about Umesh's background, projects, or repos..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] border-none focus:outline-none focus:ring-0 px-4 py-3 placeholder:text-[var(--text-faint)] select-text"
              disabled={isQuerying}
            />
            <button
              type="submit"
              disabled={isQuerying || !query.trim()}
              className="h-full px-4 text-[var(--accent-blue)] hover:bg-[var(--accent-blue)] hover:text-white transition-colors cursor-pointer flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--accent-blue)] rounded-r-xl"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </motion.div>
    );
  }

  return null;
}
