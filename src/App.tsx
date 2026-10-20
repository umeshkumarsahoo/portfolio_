import { lazy, Suspense, useState, useEffect } from "react";
import { Eye, Download, Menu, X, GraduationCap, Briefcase, Brain, Code2, Sparkles, ArrowRight } from "lucide-react";
import resumePdf from "./assets/Umesh_Kumar_Sahoo_Resume.pdf?url";
import { secureFetch } from "./lib/api";
import {
  HomeIllustration,
  AboutIllustration,
  ExperienceIllustration,
  ProjectsIllustration,
  SkillsIllustration,
  AchievementsIllustration,
  ContactIllustration,
  UmuAiIllustration,
} from "./components/SectionIllustrations";

import TechNewsFeed from "./components/TechNewsFeed";

const TabContent = lazy(() => import("./components/TabContent"));

const navItems = [
  { id: "home", label: "Home", num: "01" },
  { id: "about", label: "About", num: "02" },
  { id: "experience", label: "Experience", num: "03" },
  { id: "projects", label: "Projects", num: "04" },
  { id: "skills", label: "Skills", num: "05" },
  { id: "achievements", label: "Achievements", num: "06" },
  { id: "contact", label: "Contact", num: "07" },
  { id: "agent", label: "UMU AI", num: "08" },
];

const sectionCards = [
  { id: "home", num: "01", label: "HOME", desc: "Overview & summary", component: HomeIllustration },
  { id: "about", num: "02", label: "ABOUT", desc: "Background & education", component: AboutIllustration },
  { id: "experience", num: "03", label: "EXPERIENCE", desc: "Internships & milestones", component: ExperienceIllustration },
  { id: "projects", num: "04", label: "PROJECTS", desc: "Featured AI & systems", component: ProjectsIllustration },
  { id: "skills", num: "05", label: "SKILLS", desc: "Capabilities matrix", component: SkillsIllustration },
  { id: "achievements", num: "06", label: "ACHIEVEMENTS", desc: "Academic honors & ranks", component: AchievementsIllustration },
  { id: "contact", num: "07", label: "CONTACT", desc: "Direct inquiry & message", component: ContactIllustration },
  { id: "agent", num: "08", label: "UMU AI", desc: "Interactive cognitive agent", component: UmuAiIllustration },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  const [initialAgentQuery, setInitialAgentQuery] = useState("");
  const [visitorCount, setVisitorCount] = useState<number | null>(null);

  // Fetch real visitor count from server on mount
  useEffect(() => {
    fetch("/api/visitors", { credentials: "same-origin", cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data && typeof data.totalViews === "number") {
          setVisitorCount(data.totalViews);
        }
      })
      .catch(() => {});
  }, []);

  // Event listener to append system logs from sub-components
  useEffect(() => {
    const handleAddSystemLog = (e: Event) => {
      const logMessage = (e as CustomEvent).detail;
      if (logMessage) {
        setSystemLogs((prev) => [...prev, logMessage]);
      }
    };
    window.addEventListener("add-system-log", handleAddSystemLog);
    return () => window.removeEventListener("add-system-log", handleAddSystemLog);
  }, []);

  // Tab switcher utility - preserves all original log behavior
  const updateLogsForTab = (tabId: string) => {
    setActiveTab(tabId);
    setSidebarOpen(false);

    switch (tabId) {
      case "home":
        setSystemLogs([
          "Welcome! Explore my work, projects and skills.",
          "Let's build the future with data and intelligence."
        ]);
        break;
      case "about":
        setSystemLogs([
          "[SYS_LOG] Initializing WHO_AM_I.CFG ... SUCCESS",
          "[SYS_LOG] Loaded profile metadata. Displaying bio."
        ]);
        break;
      case "experience":
        setSystemLogs([
          "[SYS_LOG] Accessing experience.db registry ... SECURE",
          "[SYS_LOG] Loaded 2 internships and academic milestones."
        ]);
        break;
      case "projects":
        setSystemLogs([
          "[SYS_LOG] Pulling active repositories from local tree ... DONE",
          "[SYS_LOG] Discovered 3 core production-ready projects."
        ]);
        break;
      case "skills":
        setSystemLogs([
          "[SYS_LOG] Loading skill_matrix.json ... 100% COMPILED",
          "[SYS_LOG] Classified into 4 key high-performance domains."
        ]);
        break;
      case "achievements":
        setSystemLogs([
          "[SYS_LOG] Fetching academic_honors.xml ... COMPLETED",
          "[SYS_LOG] Verified CGPA 9.60 and achievement registry."
        ]);
        break;
      case "contact":
        setSystemLogs([
          "[SYS_LOG] Connecting to communication port COM3 ... READY",
          "[SYS_LOG] Form socket listening for incoming message packets."
        ]);
        break;
      case "agent":
        setSystemLogs([
          "[SYS_LOG] Initiating Cognitive Agent Core down-link ... SUCCESS",
          "[SYS_LOG] Interface connected to secure Gemini reasoning engine."
        ]);
        break;
      default:
        break;
    }
  };

  const handleDownloadResume = () => {
    setSystemLogs([
      "[SYS_LOG] Initializing resume_download_request.sh ...",
      "[SYS_LOG] Serving verified PDF asset from secure local bundle..."
    ]);

    const link = document.createElement("a");
    link.href = resumePdf;
    link.download = "Umesh_Kumar_Sahoo_Resume.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => {
      setSystemLogs([
        "[SYS_LOG] resume_download_request.sh: Process finished with exit code 0.",
        "[SYS_LOG] Resume download dispatched successfully."
      ]);
    }, 1200);
  };

  const handleExecuteCommand = (rawCommand: string) => {
    const cmd = rawCommand.trim();
    if (!cmd) return;

    setSystemLogs((prev) => [...prev, `visitor@umeshkumar:~$ ${cmd}`]);

    const args = cmd.split(" ");
    const baseCmd = args[0].toLowerCase();

    if (baseCmd === "clear") {
      setSystemLogs([]);
      return;
    }

    if (baseCmd === "refresh-data") {
      setSystemLogs((prev) => [
        ...prev,
        "[SYS_INFO] Initializing live GitHub API synchronization with forced cache override...",
        "[SYS_INFO] Querying updated repositories and scanning README data for 'umeshkumarsahoo'..."
      ]);
      secureFetch("/api/github/repos/refresh", { method: "POST" })
        .then((res) => {
          if (res.ok) {
            setSystemLogs((prev) => [
              ...prev,
              "[SYS_SUCCESS] GitHub indices synced successfully!",
              "[SYS_SUCCESS] Updated projects directory and calibrated skill metrics in real-time."
            ]);
            window.dispatchEvent(new CustomEvent("github-data-refreshed"));
          } else {
            setSystemLogs((prev) => [
              ...prev,
              "[SYS_ERR] Failed to sync GitHub index. API limit reached or token invalid."
            ]);
          }
        })
        .catch((err) => {
          setSystemLogs((prev) => [
            ...prev,
            `[SYS_ERR] Connection failed: ${err.message || err}`
          ]);
        });
      return;
    }

    if (baseCmd === "help") {
      setSystemLogs((prev) => [
        ...prev,
        "Available commands:",
        "  help         - Show this help menu",
        "  clear        - Clear console logs",
        "  home         - Navigate to Home screen",
        "  about        - Navigate to About section",
        "  experience   - Navigate to Experience section",
        "  projects     - Navigate to Projects section",
        "  agent        - Navigate to AI Agent console",
        "  agent <q>    - Navigate and query AI Agent about Umesh",
        "  skills       - Navigate to Skills matrix",
        "  achievements - Navigate to Achievements directory",
        "  contact      - Navigate to Contact terminal",
        "  resume       - Trigger download of Umesh's Resume"
      ]);
      return;
    }

    if (baseCmd === "resume" || baseCmd === "download") {
      handleDownloadResume();
      return;
    }

    const validTabs = ["home", "about", "experience", "projects", "skills", "achievements", "contact", "agent"];
    if (validTabs.includes(baseCmd)) {
      updateLogsForTab(baseCmd);
      if (baseCmd === "agent" && args.length > 1) {
        const question = args.slice(1).join(" ");
        setInitialAgentQuery(question);
      }
      return;
    }

    if (baseCmd === "agent" && args.length > 1) {
      const question = args.slice(1).join(" ");
      updateLogsForTab("agent");
      setInitialAgentQuery(question);
      return;
    }

    setSystemLogs((prev) => [
      ...prev,
      `[SYS_ERR] Command '${baseCmd}' not found. Type 'help' to see active instructions.`
    ]);
  };

  const handleBriefNews = (topic?: string) => {
    setActiveTab("agent");
    updateLogsForTab("agent");
    const query = topic && topic !== "top-news"
      ? `Give me a technical briefing on: "${topic}"`
      : "Brief me on the latest top trending tech news headlines.";
    setInitialAgentQuery(query);
  };

  const getNavIllustration = (id: string) => {
    const cls = "w-6 h-6 opacity-40 group-hover:opacity-70 transition-opacity";
    switch (id) {
      case "home": return <HomeIllustration className={cls} />;
      case "about": return <AboutIllustration className={cls} />;
      case "experience": return <ExperienceIllustration className={cls} />;
      case "projects": return <ProjectsIllustration className={cls} />;
      case "skills": return <SkillsIllustration className={cls} />;
      case "achievements": return <AchievementsIllustration className={cls} />;
      case "contact": return <ContactIllustration className={cls} />;
      case "agent": return <UmuAiIllustration className={cls} />;
      default: return null;
    }
  };

  return (
    <div id="portfolio-root" className="w-full min-h-[100dvh] h-[100dvh] bg-[var(--bg-primary)] flex flex-col overflow-hidden select-none">
      
      {/* ── Top Navigation Bar ── */}
      <header id="portfolio-header" className="w-full shrink-0 border-b border-[var(--color-border)] bg-[var(--bg-primary)]/90 backdrop-blur-md z-30">
        <div className="flex items-center justify-between px-4 sm:px-6 md:px-10 py-3 sm:py-4">
          {/* Logo / Name */}
          <div id="header-brand" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border border-[var(--color-border-strong)] bg-white/70 flex items-center justify-center shadow-xs">
              <span className="text-sm font-bold text-[var(--text-primary)]">U</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide text-[var(--text-primary)] leading-tight">
                Umesh Kumar Sahoo
              </h1>
              <p className="text-[10px] font-mono text-[var(--text-faint)] tracking-wider">
                AI/ML Engineer · Silicon University
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav id="desktop-nav" className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => updateLogsForTab(item.id)}
                  className={`relative px-3 py-1.5 text-[13px] transition-all duration-200 cursor-pointer rounded-md group ${
                    isActive
                      ? "text-[var(--text-primary)] font-medium"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-px bg-[var(--text-primary)]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Visitor count */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[var(--text-faint)]">
              <Eye className="w-3.5 h-3.5" />
              <span className="font-mono tabular-nums">
                {visitorCount !== null ? visitorCount.toLocaleString() : "···"}
              </span>
            </div>

            {/* Resume download button */}
            <button
              id="cta-download-resume"
              onClick={handleDownloadResume}
              className="hidden sm:flex items-center gap-1.5 text-xs text-[var(--text-primary)] border border-[var(--color-border-strong)] bg-white/60 px-3 py-1.5 rounded-md hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] transition-all duration-200 cursor-pointer font-medium shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Resume
            </button>

            {/* Mobile menu toggle */}
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-[var(--text-primary)] cursor-pointer rounded-md hover:bg-black/5"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Navigation Overlay ── */}
      {sidebarOpen && (
        <div
          id="mobile-nav-overlay"
          className="lg:hidden fixed inset-0 z-50 bg-[var(--bg-primary)] flex flex-col p-6 animate-fade-in"
        >
          <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border border-[var(--color-border-strong)] flex items-center justify-center font-bold text-sm">
                U
              </div>
              <span className="text-sm font-semibold text-[var(--text-primary)]">Umesh Kumar Sahoo</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-[var(--text-primary)] cursor-pointer rounded-lg hover:bg-black/5"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto py-6 flex flex-col gap-2 stagger-children">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => updateLogsForTab(item.id)}
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl text-base transition-all cursor-pointer group ${
                    isActive
                      ? "bg-white/80 text-[var(--text-primary)] font-semibold shadow-xs"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5"
                  }`}
                >
                  <span className="font-mono text-xs font-bold text-[var(--accent-blue)]">{item.num}</span>
                  {getNavIllustration(item.id)}
                  <span className="flex-1 text-left">{item.label}</span>
                  <span className="text-xs text-[var(--text-faint)] font-mono">→</span>
                </button>
              );
            })}
          </nav>
          <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
            <button
              onClick={handleDownloadResume}
              className="flex-1 flex items-center justify-center gap-2 text-sm bg-[var(--text-primary)] text-[var(--bg-primary)] py-3 rounded-xl font-medium cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4" />
              Download Resume (PDF)
            </button>
          </div>
        </div>
      )}

      {/* ── Main Content Area ── */}
      <main
        id="main-content-workspace"
        className="flex-1 overflow-hidden"
      >
        {activeTab === "home" ? (
          /* ── HOME SECTION ── */
          <div
            id="home-section"
            className="h-full overflow-y-auto overscroll-y-contain"
          >
            <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-12 md:py-16 space-y-12 sm:space-y-16">
              
              {/* ── Hero Spotlight Area ── */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                {/* Left: Text Content (7 cols on lg) */}
                <div className="lg:col-span-7 space-y-6 animate-fade-in-up">
                  {/* Status Pill */}
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-white/70 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
                    <span className="text-[11px] font-mono text-[var(--text-secondary)] font-medium">
                      Open to AI/ML & Software Roles · 2026/2027
                    </span>
                  </div>

                  {/* Main Headline */}
                  <div id="hero-name-block" className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="section-number">01</span>
                      <span className="editorial-divider w-8" />
                      <span className="text-xs font-mono text-[var(--text-faint)] uppercase tracking-widest">
                        Portfolio Introduction
                      </span>
                    </div>
                    <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] leading-[1.08]">
                      Umesh Kumar
                      <br />
                      <span className="text-[var(--text-muted)] font-bold">Sahoo</span>
                    </h2>
                  </div>

                  {/* Role subtitle */}
                  <div id="hero-role-badge" className="flex items-center gap-2 text-xs sm:text-sm font-mono text-[var(--accent-blue)] font-semibold">
                    <Sparkles className="w-4 h-4 text-[var(--accent-orange)]" />
                    <span>AI/ML & Software Engineer · Silicon University (9.60 CGPA)</span>
                  </div>

                  {/* Punchy Bio */}
                  <p id="hero-description" className="text-sm sm:text-base md:text-lg text-[var(--text-secondary)] leading-relaxed max-w-xl">
                    Computer Science undergraduate with hands-on experience building web applications, ML APIs, and RAG-based AI systems. Skilled in Python, SQL, REST APIs, embeddings, vector search, and automated cloud workflows.
                  </p>

                  {/* Call-to-action buttons */}
                  <div id="hero-cta-buttons" className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-2">
                    <button
                      id="cta-view-projects"
                      onClick={() => updateLogsForTab("projects")}
                      className="text-xs sm:text-sm font-medium bg-[var(--text-primary)] text-[var(--bg-primary)] px-5 py-2.5 rounded-lg hover:bg-[var(--accent-blue)] transition-all cursor-pointer shadow-xs"
                    >
                      View Projects
                    </button>
                    <button
                      id="cta-get-in-touch"
                      onClick={() => updateLogsForTab("contact")}
                      className="text-xs sm:text-sm font-medium border border-[var(--color-border-strong)] bg-white/60 text-[var(--text-primary)] px-5 py-2.5 rounded-lg hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] transition-all cursor-pointer"
                    >
                      Get in Touch
                    </button>
                    <button
                      onClick={handleDownloadResume}
                      className="text-xs sm:text-sm font-medium border border-[var(--color-border-strong)] bg-white/60 text-[var(--text-primary)] px-4 py-2.5 rounded-lg hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)] transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Resume
                    </button>
                    <button
                      onClick={() => updateLogsForTab("agent")}
                      className="text-xs sm:text-sm font-medium text-[var(--accent-blue)] px-3 py-2.5 cursor-pointer btn-underline flex items-center gap-1 group"
                    >
                      Talk to UMU AI <span className="transition-transform group-hover:translate-x-1">→</span>
                    </button>
                  </div>
                </div>

                {/* Right: Editorial Profile Showcase Card (5 cols on lg) */}
                <div className="lg:col-span-5 animate-fade-in" style={{ animationDelay: "0.2s" }}>
                  <div className="rounded-3xl border border-[var(--color-border)] bg-white/80 p-6 sm:p-8 shadow-xs flex flex-col items-center gap-5 sm:gap-6">
                    <div className="relative">
                      <HomeIllustration className="w-36 h-36 sm:w-48 sm:h-48 animate-float" />
                      <div className="absolute -bottom-2 -right-2 px-3 py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--color-border)] text-[10px] font-mono text-[var(--text-secondary)] font-medium shadow-xs">
                        ✦ AI/ML Explorer
                      </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full pt-4 border-t border-[var(--color-border)]">
                      {[
                        { val: "9.60", label: "CGPA", sub: "Silicon Univ" },
                        { val: "2", label: "Internships", sub: "DevOps & MERN" },
                        { val: "3", label: "Core Projects", sub: "AI Systems" },
                        { val: "4", label: "Awards", sub: "Honors" },
                      ].map((s, i) => (
                        <div key={i} className="text-center p-2.5 rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--color-border)]/40">
                          <p className="text-base sm:text-lg font-bold text-[var(--text-primary)]">{s.val}</p>
                          <p className="text-[10px] font-mono font-semibold uppercase text-[var(--accent-blue)]">{s.label}</p>
                          <p className="text-[9px] text-[var(--text-faint)] truncate">{s.sub}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 4 Dimensions of Umesh's Engineering Profile ── */}
              <div className="pt-4">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="section-number">HIGHLIGHTS</span>
                    <span className="editorial-divider w-8" />
                    <h3 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
                      Engineering Foundations
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-[var(--text-faint)] hidden sm:inline">
                    Verified Profile Registry
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {/* Card 1: Education */}
                  <div className="rounded-2xl border border-[var(--color-border)] bg-white/70 p-5 sm:p-6 hover:border-[var(--accent-blue)] hover:shadow-md transition-all flex flex-col justify-between group">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[var(--accent-blue)] group-hover:scale-110 transition-transform">
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-mono tracking-wider text-[var(--accent-blue)] font-semibold uppercase">
                          9.60 CGPA
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-[var(--text-faint)] uppercase tracking-wider">
                          01 · Education
                        </span>
                        <h4 className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
                          Silicon University
                        </h4>
                        <p className="text-xs text-[var(--text-muted)]">
                          B.Tech CSE (2023–2027)
                        </p>
                      </div>
                    </div>
                    <div className="pt-4 mt-4 border-t border-[var(--color-border)] space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--text-secondary)]">Undergraduate</span>
                        <span className="font-mono font-semibold text-[var(--accent-blue)]">9.60 / 10</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span>JNV Panikoili</span>
                        <span className="font-mono">91.2% / 95.8%</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Experience */}
                  <div className="rounded-2xl border border-[var(--color-border)] bg-white/70 p-5 sm:p-6 hover:border-[var(--accent-orange)] hover:shadow-md transition-all flex flex-col justify-between group">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[var(--accent-orange)] group-hover:scale-110 transition-transform">
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-mono tracking-wider text-[var(--accent-orange)] font-semibold uppercase">
                          2 Internships
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-[var(--text-faint)] uppercase tracking-wider">
                          02 · Industry
                        </span>
                        <h4 className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
                          DevOps & MERN
                        </h4>
                        <p className="text-xs text-[var(--text-muted)]">
                          Production deployments
                        </p>
                      </div>
                    </div>
                    <div className="pt-4 mt-4 border-t border-[var(--color-border)] space-y-1.5">
                      <div className="text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Ingenious Tech</span>
                        <span className="text-[var(--text-faint)]"> · DevOps & Actions</span>
                      </div>
                      <div className="text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Syllogistick</span>
                        <span className="text-[var(--text-faint)]"> · Full-stack MERN</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Focus Areas */}
                  <div className="rounded-2xl border border-[var(--color-border)] bg-white/70 p-5 sm:p-6 hover:border-emerald-600 hover:shadow-md transition-all flex flex-col justify-between group">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                          <Brain className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-mono tracking-wider text-emerald-600 font-semibold uppercase">
                          AI Core
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-[var(--text-faint)] uppercase tracking-wider">
                          03 · Focus
                        </span>
                        <h4 className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
                          RAG & ML Systems
                        </h4>
                        <p className="text-xs text-[var(--text-muted)]">
                          Vector search & Embeddings
                        </p>
                      </div>
                    </div>
                    <div className="pt-4 mt-4 border-t border-[var(--color-border)] flex flex-wrap gap-1.5">
                      {["RAG Pipelines", "LLM APIs", "Embeddings", "Scikit-Learn"].map((tag, tIdx) => (
                        <span key={tIdx} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card 4: Tech Stack */}
                  <div className="rounded-2xl border border-[var(--color-border)] bg-white/70 p-5 sm:p-6 hover:border-indigo-600 hover:shadow-md transition-all flex flex-col justify-between group">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                          <Code2 className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-mono tracking-wider text-indigo-600 font-semibold uppercase">
                          Tooling
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-[var(--text-faint)] uppercase tracking-wider">
                          04 · Stack
                        </span>
                        <h4 className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
                          Full-Stack & Cloud
                        </h4>
                        <p className="text-xs text-[var(--text-muted)]">
                          Modern automated stack
                        </p>
                      </div>
                    </div>
                    <div className="pt-4 mt-4 border-t border-[var(--color-border)] flex flex-wrap gap-1.5">
                      {["Python", "FastAPI", "React", "SQL", "Terraform", "Actions"].map((tag, tIdx) => (
                        <span key={tIdx} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Section Directory Grid (Matching Image 2 Reference) ── */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="section-number">INDEX</span>
                    <span className="editorial-divider w-8" />
                    <h3 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
                      Explore Portfolio
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-[var(--text-faint)]">
                    8 Interactive Sections
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                  {sectionCards.map((card) => {
                    const CardIcon = card.component;
                    return (
                      <div
                        key={card.id}
                        onClick={() => updateLogsForTab(card.id)}
                        className="group p-5 rounded-2xl border border-[var(--color-border)] bg-white/80 hover:border-[var(--accent-blue)] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-[var(--accent-blue)]">
                            {card.num}
                          </span>
                          <span className="font-mono text-[11px] tracking-wider text-[var(--text-faint)] group-hover:text-[var(--text-primary)] transition-colors uppercase font-medium">
                            {card.label}
                          </span>
                        </div>

                        <div className="py-4 sm:py-6 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <CardIcon className="w-16 h-16 sm:w-20 sm:h-20 opacity-80 group-hover:opacity-100 transition-opacity" />
                        </div>

                        <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs">
                          <span className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors truncate">
                            {card.desc}
                          </span>
                          <span className="text-[var(--text-faint)] group-hover:text-[var(--accent-blue)] transition-colors pl-2 font-mono group-hover:translate-x-0.5 transform">
                            →
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Live Tech News Stream (Hacker News API) ── */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="section-number">PULSE</span>
                    <span className="editorial-divider w-8" />
                    <h3 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
                      Live Tech Intelligence Feed
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-[var(--text-faint)] hidden sm:inline">
                    Real-time Hacker News Stream
                  </span>
                </div>

                <TechNewsFeed onBriefNews={handleBriefNews} />
              </div>
            </div>
          </div>
        ) : (
          /* ── ALL OTHER SECTIONS ── */
          <div className="h-full flex flex-col overflow-hidden">
            {/* Section header with illustration */}
            <div className="shrink-0 px-6 md:px-10 pt-6 pb-4 border-b border-[var(--color-border)]">
              <div className="max-w-5xl mx-auto flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="section-number">
                    {navItems.find(n => n.id === activeTab)?.num}
                  </span>
                  <span className="editorial-divider w-6" />
                </div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">
                  {activeTab === "agent" ? "UMU AI" : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </h2>
                {/* Small section illustration */}
                <div className="ml-auto opacity-30 hidden sm:block">
                  {activeTab === "about" && <AboutIllustration className="w-12 h-12" />}
                  {activeTab === "experience" && <ExperienceIllustration className="w-12 h-12" />}
                  {activeTab === "projects" && <ProjectsIllustration className="w-12 h-12" />}
                  {activeTab === "skills" && <SkillsIllustration className="w-12 h-12" />}
                  {activeTab === "achievements" && <AchievementsIllustration className="w-12 h-12" />}
                  {activeTab === "contact" && <ContactIllustration className="w-12 h-12" />}
                  {activeTab === "agent" && <UmuAiIllustration className="w-12 h-12" />}
                </div>
              </div>
            </div>

            {/* Section content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className={`max-w-5xl mx-auto px-6 md:px-10 py-6 ${activeTab === "agent" ? "h-full" : ""}`}>
                <Suspense
                  fallback={
                    <div className="py-12 text-center text-sm text-[var(--text-faint)]">
                      Loading...
                    </div>
                  }
                >
                  <TabContent
                    activeTab={activeTab}
                    onActionClick={updateLogsForTab}
                    initialAgentQuery={initialAgentQuery}
                    clearInitialAgentQuery={() => setInitialAgentQuery("")}
                  />
                </Suspense>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
