import { lazy, Suspense, useState, useEffect, FormEvent, useRef } from "react";
import { motion } from "motion/react";
import { 
  Send, Terminal, Cpu, Bot, Star, ExternalLink, RefreshCw, Sparkles, BookOpen, 
  Calendar, User, MapPin, Mail, Phone, GraduationCap, TrendingUp, Cloud, Trophy, 
  Brain, Leaf, Plane, Award, Code, Globe, Play 
} from "lucide-react";
import { secureFetch } from "../lib/api";

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
      content: "SYSTEM ENCRYPTED AGENT ONLINE. Welcome, I am 'umu' — Umesh's personalized AI assistant. I have indexed Umesh's complete resume, project details, and public GitHub repositories. Ask me any question, and I will keep responses highly concise unless you ask me to describe or explain in detail!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }
  ]);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryStatus, setQueryStatus] = useState("SCANNING DIRECTORIES & RESUME CONTEXT...");
  
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
    const handleNewsBriefPrompt = () => {
      setMessages(prev => [...prev, {
        role: "agent",
        content: "I have the top daily tech news loaded in my cache! Which specific news item or topic would you like me to brief you on?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }]);
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
    setQueryStatus("SCANNING DIRECTORIES & RESUME CONTEXT...");

    let statusTimer1: NodeJS.Timeout | undefined;
    let statusTimer2: NodeJS.Timeout | undefined;
    let statusTimer3: NodeJS.Timeout | undefined;

    try {
      statusTimer1 = setTimeout(() => {
        setQueryStatus("SEARCHING REPOSITORY INDEX...");
      }, 700);

      statusTimer2 = setTimeout(() => {
        setQueryStatus("SYNTHESIZING RESPONSE...");
      }, 1600);

      statusTimer3 = setTimeout(() => {
        setQueryStatus("ENCRYPTING DOWNLINK PACKETS...");
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
        setMessages(prev => [...prev, {
          role: "agent",
          content: data.reply,
          timestamp: responseTimestamp
        }]);
      } else {
        const errData = await response.json();
        setMessages(prev => [...prev, {
          role: "agent",
          content: `ERROR: Failed to establish secure connection. [REASON: ${errData.error || "Unknown server error."}]`,
          timestamp: responseTimestamp
        }]);
      }
    } catch (err: any) {
      const responseTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setMessages(prev => [...prev, {
        role: "agent",
        content: `SYS_ERR: Packet transmission aborted. Please verify server integrity.`,
        timestamp: responseTimestamp
      }]);
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
      setFormStatus("ERROR: All fields must be populated.");
      return;
    }
    setFormStatus("ESTABLISHING SECURE CONNECTION & TRANSMITTING PAYLOAD...");
    try {
      const res = await secureFetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState)
      });
      if (res.ok) {
        setFormStatus("SUCCESS: Direct message securely delivered!");
        setFormState({ name: "", email: "", msg: "" });
      } else {
        const data = await res.json();
        setFormStatus(`ERROR: Transmission failed [${data.error || "Server rejection"}]`);
      }
    } catch (err: any) {
      setFormStatus("SYS_ERR: Packet drop. Direct connection failed.");
    }
  };

  // Dynamically calibrate skill ratings based on GitHub Repos counts
  const getCalibratedSkills = () => {
    // Humble honest baselines reflecting actual starting/internship level
    let languages = 60;
    let aiMl = 50;
    let dataEng = 50;
    let cloudDevops = 45;
    let webBackend = 50;
    let toolsPlatforms = 55;

    if (repos && repos.length > 0) {
      // Dynamic adjustments based on repository technologies & metadata
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
      {
        id: "languages",
        title: "Languages",
        items: "Python, Java, JavaScript (ES6+), SQL, C",
        rating: languages,
        icon: <Code className="w-4 h-4 text-white" />
      },
      {
        id: "aiml",
        title: "AI / ML / Gen AI",
        items: "Machine Learning, NLP, RAG, LLM Integration, Vector Embeddings, Whisper, Scikit-learn, XGBoost, Gradient Boosting, LSTM, RNN, ARIMA",
        rating: aiMl,
        icon: <Brain className="w-4 h-4 text-white" />
      },
      {
        id: "dataeng",
        title: "Data Engineering",
        items: "Pandas, NumPy, Feature Engineering, Data Preprocessing, Regression, Classification, Clustering, Statistical Modeling",
        rating: dataEng,
        icon: <BookOpen className="w-4 h-4 text-white" />
      },
      {
        id: "cloud",
        title: "Cloud & DevOps",
        items: "GitHub Actions (CI/CD), Terraform, Infrastructure as Code (IaC), Linux",
        rating: cloudDevops,
        icon: <Cloud className="w-4 h-4 text-white" />
      },
      {
        id: "web",
        title: "Web & Backend",
        items: "React.js, Node.js, Express.js, MongoDB, Flask, REST APIs",
        rating: webBackend,
        icon: <Globe className="w-4 h-4 text-white" />
      },
      {
        id: "tools",
        title: "Tools & Platforms",
        items: "TensorFlow, Keras, Jupyter Notebook, Postman, Matplotlib, Seaborn, Plotly, Git, GitHub",
        rating: toolsPlatforms,
        icon: <Terminal className="w-4 h-4 text-white" />
      }
    ];
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  // 1. ABOUT TAB (Matches Screenshot 1 perfectly)
  if (activeTab === "about") {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        id="about-tab-content"
        className="h-full min-h-0 flex flex-col gap-4 font-mono select-none overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
      >
        {/* Main Bio Card */}
        <div className="border border-white/20 p-4 bg-white/5 space-y-3">
          <p className="text-white font-bold text-xs flex items-center gap-1.5 uppercase">
            [ ABOUT ME ]
          </p>
          <p className="text-gray-300 text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed">
            I'm Umesh Kumar Sahoo, an AI/ML enthusiast and Computer Science undergraduate who loves building intelligent systems that solve real-world problems. I enjoy turning ideas into products using data, code and a deep curiosity to learn more every day.
          </p>

          {/* Profile Meta Table Grid */}
          <div className="border border-white/30 bg-black mt-3 p-3 text-xs space-y-2.5 font-mono">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 items-center">
              <span className="sm:col-span-3 text-gray-400 font-bold flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> NAME
              </span>
              <span className="sm:col-span-1 text-gray-400 max-sm:hidden">:</span>
              <span className="sm:col-span-8 text-white font-semibold">Umesh Kumar Sahoo</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 items-center border-t border-white/10 pt-2">
              <span className="sm:col-span-3 text-gray-400 font-bold flex items-center gap-2">
                <User className="w-3.5 h-3.5" /> ROLE
              </span>
              <span className="sm:col-span-1 text-gray-400 max-sm:hidden">:</span>
              <span className="sm:col-span-8 text-white">AI/ML Portfolio Engineer</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 items-center border-t border-white/10 pt-2">
              <span className="sm:col-span-3 text-gray-400 font-bold flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" /> LOCATION
              </span>
              <span className="sm:col-span-1 text-gray-400 max-sm:hidden">:</span>
              <span className="sm:col-span-8 text-white">Bhubaneswar, Odisha, India</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 items-center border-t border-white/10 pt-2">
              <span className="sm:col-span-3 text-gray-400 font-bold flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" /> EMAIL
              </span>
              <span className="sm:col-span-1 text-gray-400 max-sm:hidden">:</span>
              <span className="sm:col-span-8 text-white select-all">sahooumesh2003@gmail.com</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 items-center border-t border-white/10 pt-2">
              <span className="sm:col-span-3 text-gray-400 font-bold flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" /> PHONE
              </span>
              <span className="sm:col-span-1 text-gray-400 max-sm:hidden">:</span>
              <span className="sm:col-span-8 text-white select-all">+91-7735203945</span>
            </div>
          </div>
        </div>

        {/* At a Glance Bento Boxes Row */}
        <div className="space-y-2">
          <p className="text-white font-bold text-xs uppercase">[ AT A GLANCE ]</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            
            {/* Box 1 */}
            <div className="border border-white/20 bg-white/5 p-3 flex flex-col justify-center items-start gap-1">
              <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                <span className="text-white/60 font-mono text-[10px]">&lt;/&gt;</span>
                <span>15+</span>
              </div>
              <p className="text-[8px] text-gray-400 font-bold tracking-wider leading-tight uppercase">PROJECTS BUILT</p>
            </div>

            {/* Box 2 */}
            <div className="border border-white/20 bg-white/5 p-3 flex flex-col justify-center items-start gap-1">
              <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                <GraduationCap className="w-4 h-4 text-white/70" />
                <span>4th</span>
              </div>
              <p className="text-[8px] text-gray-400 font-bold tracking-wider leading-tight uppercase">YEAR B.TECH CSE</p>
            </div>

            {/* Box 3 */}
            <div className="border border-white/20 bg-white/5 p-3 flex flex-col justify-center items-start gap-1">
              <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                <TrendingUp className="w-4 h-4 text-white/70" />
                <span>6+</span>
              </div>
              <p className="text-[8px] text-gray-400 font-bold tracking-wider leading-tight uppercase">ML MODELS TRAINED</p>
            </div>

            {/* Box 4 */}
            <div className="border border-white/20 bg-white/5 p-3 flex flex-col justify-center items-start gap-1">
              <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                <Cloud className="w-4 h-4 text-white/70" />
                <span>2</span>
              </div>
              <p className="text-[8px] text-gray-400 font-bold tracking-wider leading-tight uppercase">INTERNSHIPS</p>
            </div>

            {/* Box 5 */}
            <div className="border border-white/20 bg-white/5 p-3 flex flex-col justify-center items-start gap-1 max-md:col-span-2">
              <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                <Trophy className="w-4 h-4 text-white/70" />
                <span>3+</span>
              </div>
              <p className="text-[8px] text-gray-400 font-bold tracking-wider leading-tight uppercase">AWARDS & CERTS</p>
            </div>

          </div>
        </div>

      </motion.div>
    );
  }

  // 2. EXPERIENCE TAB (Matches Screenshot 4 perfectly)
  if (activeTab === "experience") {
    const experiences = [
      {
        year: "Jun 2025 – Jul 2025",
        role: "DevOps Engineer Intern · Ingenious Tech World",
        details: [
          "Engineered CI/CD pipelines via GitHub Actions — automated build, test & deploy workflows, cutting manual deployment effort by 40%.",
          "Provisioned scalable cloud infrastructure using Terraform (IaC), ensuring environment consistency across dev and staging; applied distributed-systems principles for multi-region reliability."
        ]
      },
      {
        year: "Jun 2024 – Jul 2024",
        role: "MERN Stack Developer Intern · Syllogistick",
        details: [
          "Built production e-commerce platform: MongoDB + Express.js + React.js + Node.js with JWT auth and 10+ REST API endpoints.",
          "Improved frontend responsiveness via React code-splitting; optimized MongoDB schema design to reduce query latency."
        ]
      }
    ];

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        id="experience-tab-content"
        className="h-full min-h-0 flex flex-col gap-4 font-mono overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent select-none"
      >
        <div className="border border-white/20 p-4 bg-white/5 space-y-4">
          <p className="text-white font-bold text-xs uppercase mb-1">
            [ EXPERIENCE ]
          </p>

          <div className="relative pl-5 border-l border-dashed border-white/30 space-y-6">
            {experiences.map((exp, idx) => (
              <div key={idx} className="relative group">
                {/* Node Square Dot */}
                <span className="absolute -left-[25px] top-1 w-2.5 h-2.5 border border-white bg-black flex items-center justify-center font-bold text-[10px]">
                  <span className="w-1 h-1 bg-white"></span>
                </span>
                
                {/* Content block */}
                <div className="space-y-1">
                  <span className="text-[10px] bg-white text-black px-1 font-bold inline-block select-none mb-1">
                    {exp.year}
                  </span>
                  <h4 className="text-white font-bold text-xs sm:text-sm md:text-base tracking-wide">
                    {exp.role}
                  </h4>
                  <ul className="text-xs sm:text-sm md:text-base text-gray-300 space-y-1 pl-1 mt-1.5">
                    {exp.details.map((detail, dIdx) => (
                      <li key={dIdx} className="leading-relaxed">
                        &gt; {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  // 3. PROJECTS TAB (Matches Screenshot 2 perfectly)
  if (activeTab === "projects") {
    // Dynamically calculate value and rank projects based on impact
    const getImpactScore = (repo: GithubRepo) => {
      let score = (repo.stargazers_count * 100) + (repo.forks_count * 50);
      
      const name = repo.name.toLowerCase();
      const desc = (repo.description || "").toLowerCase();
      const combined = name + " " + desc;

      // Heavy penalty for obvious junk/assignments
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

      // Massive bonus for recognized flagship projects so they stay featured 
      // unless organically surpassed by a new repo with many stars (e.g., > 5 stars)
      if (name.includes("rag") || name.includes("teaching")) score += 500;
      if (name.includes("fresh_guard") || name.includes("freshguard")) score += 500;
      if (name.includes("time_series") || name.includes("nifty")) score += 500;
      if (name.includes("ml-projects") || name.includes("classifier")) score += 400;
      if (name.includes("spec2model")) score += 300;

      // Organic bonuses for good descriptions and ML keywords
      if (combined.includes("prediction") || combined.includes("system") || combined.includes("classifier") || combined.includes("forecasting") || combined.includes("pipeline") || combined.includes("model")) {
        score += 50;
      }

      if (desc.length > 20) score += 20;

      return score;
    };

    const rankedRepos = [...repos]
      .filter(repo => getImpactScore(repo) > -100) // Drop penalized repos
      .sort((a, b) => getImpactScore(b) - getImpactScore(a));

    const topRepos = rankedRepos.slice(0, 4);

    const getDynamicIcon = (repo: GithubRepo) => {
      const name = repo.name.toLowerCase();
      const lang = repo.language?.toLowerCase() || "";
      const desc = repo.description?.toLowerCase() || "";

      if (name.includes("ml") || name.includes("ai") || name.includes("rag") || desc.includes("learning") || desc.includes("prediction") || desc.includes("model")) return <Brain className="w-5 h-5 text-white" />;
      if (name.includes("flight") || name.includes("plane")) return <Plane className="w-5 h-5 text-white" />;
      if (name.includes("guard") || name.includes("eco") || name.includes("leaf")) return <Leaf className="w-5 h-5 text-white" />;
      if (name.includes("stock") || name.includes("trade") || name.includes("finance") || name.includes("forecast")) return <TrendingUp className="w-5 h-5 text-white" />;
      if (lang === "python") return <Code className="w-5 h-5 text-white" />;
      if (lang === "javascript" || lang === "typescript" || lang === "html") return <Globe className="w-5 h-5 text-white" />;
      
      return <Terminal className="w-5 h-5 text-white" />;
    };

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        id="projects-tab-content"
        className="h-full min-h-0 flex flex-col gap-4 overflow-y-auto font-mono pr-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent select-none"
      >
        <Suspense
          fallback={
            <div className="border border-white/20 p-4 bg-white/5 font-mono text-xs text-gray-400 animate-pulse">
              CALIBRATING REAL-TIME REGISTRY DATASETS...
            </div>
          }
        >
          <GitHubStats repos={repos} isLoading={isLoadingRepos} />
        </Suspense>

        <div className="border border-white/20 p-4 bg-white/5 space-y-4">
          <p className="text-white font-bold text-xs uppercase">
            [ FEATURED PROJECTS ]
          </p>

          <div className="space-y-4">
            {topRepos.length > 0 ? (
              topRepos.map((repo, idx) => (
                <div key={idx} className="border-b border-dashed border-white/10 pb-4 last:border-b-0 last:pb-0 flex flex-col sm:flex-row gap-3.5 items-start">
                  
                  {/* Left Side square icon */}
                  <div className="border border-white/30 p-2.5 bg-black rounded-sm flex items-center justify-center shrink-0">
                    {getDynamicIcon(repo)}
                  </div>

                  {/* Right Side Content details */}
                  <div className="flex-1 space-y-1.5 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <h4 className="text-white font-bold text-xs sm:text-sm md:text-base tracking-wide">
                        {repo.name}
                      </h4>
                      <span className="text-[10px] sm:text-xs md:text-sm text-gray-400 font-mono">
                        [ {repo.language || "Mixed"} | ⭐ {repo.stargazers_count} | ⑂ {repo.forks_count} ]
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm md:text-base text-gray-300 space-y-1 pl-1">
                      <p className="leading-relaxed whitespace-pre-wrap">
                        &gt; {repo.description || "No description provided for this repository."}
                      </p>
                    </div>
                    
                    {/* Active GitHub Link Button for each project */}
                    <div className="pt-1.5 pl-1">
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-white hover:text-black hover:bg-white border border-white/30 hover:border-white px-2.5 py-1 font-bold transition-all"
                      >
                        <Globe className="w-3 h-3" />
                        &gt; VIEW REPO ON GITHUB
                      </a>
                    </div>
                  </div>

                </div>
              ))
            ) : (
              <div className="text-xs text-gray-400 font-mono p-4 animate-pulse">
                &gt; NO REPOSITORIES FOUND. FETCHING FROM UPSTREAM...
              </div>
            )}
          </div>

          {/* Bottom link element matching Screenshot 2 */}
          <div className="flex flex-col sm:flex-row justify-between items-center border border-white/30 p-2.5 bg-black gap-2 mt-2">
            <a 
              href="https://github.com/umeshkumarsahoo" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-white hover:bg-white hover:text-black border border-white/40 px-3 py-1.5 text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              &gt; VIEW ALL PROJECTS ON GITHUB
            </a>
            <span className="text-gray-400 font-mono text-[10px] tracking-wider uppercase select-all">
              [ github.com/umeshkumarsahoo ]
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  // 4. SKILLS TAB (Matches Screenshot 3 perfectly)
  if (activeTab === "skills") {
    const skillsList = getCalibratedSkills();

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        id="skills-tab-content"
        className="h-full min-h-0 flex flex-col gap-4 font-mono overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent select-none"
      >
        <div className="border border-white/20 p-4 bg-white/5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-1 min-w-0">
            <p className="text-white font-bold text-xs uppercase">
              [ TECHNICAL SKILLS ]
            </p>
            {repos.length > 0 && (
              <span className="text-[9px] text-red-300 border border-red-500/40 bg-red-950/20 px-1.5 py-0.5 rounded-sm animate-pulse tracking-wide font-semibold sm:text-right leading-relaxed max-w-full break-words">
                AUTOCALIBRATION ACTIVE: {repos.length} REPOS SYNCED
              </span>
            )}
          </div>

          <div className="space-y-4">
            {skillsList.map((skill) => {
              // Calculate blocks (20 total blocks)
              const totalBlocks = 20;
              const filledCount = Math.round((skill.rating / 100) * totalBlocks);
              const emptyCount = totalBlocks - filledCount;

              return (
                <div key={skill.id} className="flex flex-col sm:flex-row gap-3 items-start border-b border-dashed border-white/10 pb-3 last:border-b-0 last:pb-0 min-w-0">
                  {/* Icon Frame */}
                  <div className="border border-white/30 p-2 bg-black rounded-sm shrink-0 flex items-center justify-center">
                    {skill.icon}
                  </div>

                  {/* Skills description & bars */}
                  <div className="flex-1 w-full min-w-0 grid grid-cols-1 xl:grid-cols-12 gap-2 xl:items-center">
                    <div className="xl:col-span-7 space-y-1 min-w-0">
                      <h4 className="text-white font-bold text-xs sm:text-sm md:text-base tracking-wide">
                        {skill.title}
                      </h4>
                      <p className="text-[10px] sm:text-xs md:text-sm text-gray-400 leading-normal">
                        {skill.items}
                      </p>
                    </div>

                    {/* Progress Bar & Percentage */}
                    <div className="xl:col-span-5 flex items-center justify-between gap-3 w-full min-w-0">
                      {/* Responsive Grid block loader */}
                      <div className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-0.5 select-none font-mono flex-1 min-w-0 max-w-[220px] xl:max-w-none">
                        {Array.from({ length: filledCount }).map((_, i) => (
                          <div key={`f-${i}`} className="h-3.5 bg-white border border-white/30 min-w-0"></div>
                        ))}
                        {Array.from({ length: emptyCount }).map((_, i) => (
                          <div key={`e-${i}`} className="h-3.5 border border-white/20 bg-white/5 opacity-40 min-w-0"></div>
                        ))}
                      </div>
                      
                      <span className="text-xs font-bold text-white tracking-wider tabular-nums min-w-[32px] text-right">
                        {skill.rating}%
                      </span>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

          {/* Bottom Banner */}
          <div className="border border-white/25 bg-black p-2.5 text-center">
            <span className="text-white text-[10px] font-bold tracking-[0.2em] uppercase">
              &gt; ALWAYS LEARNING. ALWAYS BUILDING.
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  // 5. ACHIEVEMENTS TAB (Matches Screenshot 5 perfectly)
  if (activeTab === "achievements") {
    const certs = [
      {
        title: "Runner-Up",
        desc: "SPEC2MODEL ML Challenge (Food Delivery Delay Prediction). Engineered top performing regression model with high accuracy under strict time constraint.",
        year: "2024",
        icon: <Trophy className="w-5 h-5 text-white" />
      },
      {
        title: "2nd Place",
        desc: "Algo Arena 2.0, Silicon University. Excelled in competitive programming, algorithms design, and rapid prototyping hackathon.",
        year: "2024",
        icon: <Award className="w-5 h-5 text-white" />
      },
      {
        title: "PwC Launchpad Program",
        desc: "Selected for the prestigious ongoing program. Gaining power skills, direct professional exposure, and strategic consulting simulations.",
        year: "Ongoing",
        icon: <Sparkles className="w-5 h-5 text-white" />
      },
      {
        title: "Active LeetCode Solver",
        desc: "Solved 150+ complex algorithms on LeetCode focusing on DSA & design thinking logic. (leetcode.com/u/phribbi39)",
        year: "Active",
        icon: <Code className="w-5 h-5 text-white" />
      }
    ];

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        id="achievements-tab-content"
        className="h-full min-h-0 flex flex-col gap-4 font-mono overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent select-none"
      >
        <div className="border border-white/20 p-4 bg-white/5 space-y-4">
          <p className="text-white font-bold text-xs uppercase">
            [ ACHIEVEMENTS & CERTIFICATIONS ]
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {certs.map((cert, idx) => (
              <div key={idx} className="border border-white/20 p-3 bg-black flex gap-3 items-start flex-col sm:flex-row min-h-[110px] hover:border-white/50 transition-all">
                
                {/* Left Side Icon */}
                <div className="border border-white/30 p-2.5 bg-black rounded-sm shrink-0 flex items-center justify-center">
                  {cert.icon}
                </div>

                {/* Right Side Content text */}
                <div className="flex-1 flex flex-col justify-between h-full space-y-1.5">
                  <div className="space-y-1">
                    <span className="text-white font-bold text-xs block uppercase tracking-wide leading-tight">
                      {cert.title}
                    </span>
                    <p className="text-gray-300 text-[10px] sm:text-[11px] leading-relaxed">
                      {cert.desc}
                    </p>
                  </div>
                  <span className="text-[9px] text-gray-400 font-bold block border border-white/10 px-1 py-0.5 rounded-sm bg-white/5 w-fit mt-1">
                    [ {cert.year} ]
                  </span>
                </div>

              </div>
            ))}
          </div>

          <p className="text-white/60 font-mono text-[10px] tracking-widest uppercase pl-1 pt-1.5">
            &gt; More achievements coming soon...
          </p>
        </div>
      </motion.div>
    );
  }

  // 6. CONTACT TAB (Contact form)
  if (activeTab === "contact") {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        id="contact-tab-content"
        className="h-full min-h-0 flex flex-col gap-3 font-mono overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
      >
        <form onSubmit={handleContactSubmit} className="flex flex-col gap-2.5 border border-white/20 p-4 bg-white/5">
          <p className="text-white font-bold text-xs uppercase mb-1">
            [ SECURE CONTACT TERMINAL ]
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">USER_NAME.EXE</label>
              <input
                type="text"
                placeholder="Name"
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                className="w-full bg-black border border-white/30 focus:border-white px-2 py-2 text-xs text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">USER_EMAIL.CFG</label>
              <input
                type="email"
                placeholder="Email Address"
                value={formState.email}
                onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                className="w-full bg-black border border-white/30 focus:border-white px-2 py-2 text-xs text-white focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 block mb-1">MESSAGE_PAYLOAD.TXT</label>
            <textarea
              placeholder="Provide message details..."
              rows={3}
              value={formState.msg}
              onChange={(e) => setFormState({ ...formState, msg: e.target.value })}
              className="w-full bg-black border border-white/30 focus:border-white px-2 py-2 text-xs text-white focus:outline-none resize-none"
            ></textarea>
          </div>
          
          <div className="flex justify-between items-center mt-1 flex-wrap gap-2">
            <span className="text-[10px] text-yellow-400 tracking-wider">
              {formStatus}
            </span>
            <button
              type="submit"
              className="border border-white hover:bg-white hover:text-black px-4 py-2 text-xs text-white cursor-pointer transition-colors active:scale-[0.98]"
            >
              TRANSMIT_DATA &gt;
            </button>
          </div>
        </form>
      </motion.div>
    );
  }

  // 7. AI AGENT TAB (Named 'umu', full width, clean, concise chat)
  if (activeTab === "agent") {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        id="agent-tab-content"
        className="h-full min-h-0 font-mono text-xs overflow-hidden"
      >
        {/* Full Width: Dynamic Chat Console (takes up full 100% space) */}
        <div className="w-full flex flex-col border border-white/20 bg-black/60 h-full overflow-hidden">
          {/* Chat Header */}
          <div className="bg-white/5 border-b border-white/20 px-3 py-2 flex justify-between items-center shrink-0 select-none">
            <span className="text-white font-bold flex items-center gap-2">
              <Bot className="w-4 h-4 text-white" /> umu.EXE
            </span>
            <span className="text-[10px] text-gray-500 flex items-center gap-1 font-semibold">
              <span className="w-1.5 h-1.5 bg-red-500 inline-block animate-pulse"></span> SECURE_DOWNLINK
            </span>
          </div>

          {/* Messages readout area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3.5 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  m.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[9px] text-gray-500 font-bold tracking-wider select-none">
                  <span>{m.role === "user" ? "USER_PROMPT" : "umu_RESP"}</span>
                  <span>•</span>
                  <span>{m.timestamp}</span>
                </div>
                <div
                  className={`p-2.5 max-w-[90%] leading-relaxed whitespace-pre-wrap select-text selection:bg-white selection:text-black ${
                    m.role === "user"
                      ? "bg-white text-black font-semibold"
                      : "bg-white/5 border border-white/10 text-gray-300"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            
            {isQuerying && (
              <div className="flex flex-col items-start select-none">
                <div className="flex items-center gap-1.5 mb-1 text-[9px] text-gray-500 font-bold">
                  <span>umu_THINKING</span>
                  <span className="animate-pulse">...</span>
                </div>
                <div className="p-2.5 bg-white/5 border border-white/10 text-yellow-400 italic flex items-center gap-2">
                  <span className="inline-block animate-spin border-t border-r border-yellow-400 rounded-full w-3.5 h-3.5 shrink-0"></span>
                  {queryStatus}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Clickable Quick Prompts (Tags) */}
          <div className="px-3 py-1.5 bg-white/5 border-t border-white/10 overflow-x-auto whitespace-nowrap flex gap-2 shrink-0 select-none scrollbar-none">
            <button
              onClick={(e) => handleQuerySubmit(e, "Explain your RAG-Based Assistant")}
              className="border border-white/20 hover:border-white text-[9px] text-gray-300 hover:text-white px-2 py-0.5 rounded bg-black cursor-pointer transition-colors"
            >
              # RAG-Assistant
            </button>
            <button
              onClick={(e) => handleQuerySubmit(e, "Detail your DevOps and Terraform experience")}
              className="border border-white/20 hover:border-white text-[9px] text-gray-300 hover:text-white px-2 py-0.5 rounded bg-black cursor-pointer transition-colors"
            >
              # Terraform-DevOps
            </button>
            <button
              onClick={(e) => handleQuerySubmit(e, "Explain the FreshGuard ML project")}
              className="border border-white/20 hover:border-white text-[9px] text-gray-300 hover:text-white px-2 py-0.5 rounded bg-black cursor-pointer transition-colors"
            >
              # FreshGuard-ML
            </button>
            <button
              onClick={(e) => handleQuerySubmit(e, "How did you optimize e-commerce queries?")}
              className="border border-white/20 hover:border-white text-[9px] text-gray-300 hover:text-white px-2 py-0.5 rounded bg-black cursor-pointer transition-colors"
            >
              # MongoDB-Optimization
            </button>
          </div>

          {/* Form input */}
          <form
            onSubmit={handleQuerySubmit}
            className="border-t border-white/20 flex items-center bg-black shrink-0"
          >
            <input
              type="text"
              placeholder="Ask umu about Umesh's background, projects, or github repos..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-black text-xs text-white border-none focus:outline-none focus:ring-0 px-3 py-3 select-text"
              disabled={isQuerying}
            />
            <button
              type="submit"
              disabled={isQuerying || !query.trim()}
              className="h-full px-4 border-l border-white/20 bg-white/5 hover:bg-white hover:text-black text-white transition-colors cursor-pointer flex items-center justify-center disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-white"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </motion.div>
    );
  }

  return null;
}
