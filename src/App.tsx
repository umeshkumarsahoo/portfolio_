import { lazy, Suspense, useState, useEffect } from "react";
import { Eye, Download, Menu, X, ArrowLeft, ArrowRight, Sparkles, BookOpen } from "lucide-react";
import resumePdf from "./assets/Umesh_Kumar_Sahoo_Resume.pdf?url";
import { secureFetch } from "./lib/api";
import {
  DeskSceneIllustration,
  BotanicalFlowerIllustration,
  WindowGazerIllustration,
  TrioFriendsIllustration,
  TwilightSeaIllustration,
  CoffeeAndPillsIllustration,
  CurledSilhouetteIllustration,
  GazingProfileIllustration,
} from "./components/ZineIllustrations";
import TechNewsFeed from "./components/TechNewsFeed";

const TabContent = lazy(() => import("./components/TabContent"));

const chapters = [
  { id: "home", num: "01", label: "Home", subtitle: "Introduction", desc: "Introduction & Overview" },
  { id: "about", num: "02", label: "About", subtitle: "Profile", desc: "Background & Education" },
  { id: "experience", num: "03", label: "Experience", subtitle: "Experience", desc: "Industry Internships" },
  { id: "projects", num: "04", label: "Projects", subtitle: "Projects", desc: "Core Systems & Repos" },
  { id: "skills", num: "05", label: "Skills", subtitle: "Skills", desc: "Technical Matrix" },
  { id: "achievements", num: "06", label: "Honors", subtitle: "Honors", desc: "Awards & Ranks" },
  { id: "contact", num: "07", label: "Contact", subtitle: "Contact", desc: "Direct Inquiry" },
  { id: "agent", num: "08", label: "UMU AI", subtitle: "UMU AI", desc: "Companion & News" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initialAgentQuery, setInitialAgentQuery] = useState("");
  const [visitorCount, setVisitorCount] = useState<number | null>(null);

  // Fetch real visitor count from server on mount
  useEffect(() => {
    fetch("/api/visitors", { credentials: "same-origin", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.totalViews === "number") {
          setVisitorCount(data.totalViews);
        }
      })
      .catch(() => {});
  }, []);

  const handleDownloadResume = () => {
    const link = document.createElement("a");
    link.href = resumePdf;
    link.download = "Umesh_Kumar_Sahoo_Resume.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBriefNews = (topic?: string) => {
    setActiveTab("agent");
    const query = topic && topic !== "top-news"
      ? `Give me a technical briefing on: "${topic}"`
      : "Brief me on the latest top trending tech news headlines.";
    setInitialAgentQuery(query);
  };

  const currentChapterIndex = chapters.findIndex((c) => c.id === activeTab);
  const currentChapter = chapters[currentChapterIndex] || chapters[0];

  const handlePrevChapter = () => {
    if (currentChapterIndex > 0) {
      setActiveTab(chapters[currentChapterIndex - 1].id);
    }
  };

  const handleNextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      setActiveTab(chapters[currentChapterIndex + 1].id);
    }
  };

  return (
    <div id="portfolio-root" className="w-full min-h-[100dvh] h-[100dvh] bg-[#F8F7F4] text-[#181818] flex flex-col overflow-hidden select-none">
      
      {/* ── Top Publication Navigation Bar ── */}
      <header id="portfolio-header" className="w-full shrink-0 border-b border-[#E7E3D8] bg-[#F8F7F4]/95 backdrop-blur-md z-30">
        <div className="flex items-center justify-between px-4 sm:px-8 py-3">
          {/* Logo / Monogram */}
          <div id="header-brand" className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("home")}>
            <div className="w-8 h-8 rounded-lg border border-[#181818] bg-white flex items-center justify-center shadow-2xs">
              <span className="text-xs font-mono font-bold text-[#181818]">U</span>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-[#181818] leading-tight">
                Umesh Kumar Sahoo
              </h1>
              <p className="text-[11px] font-hand text-[var(--accent-blue)] tracking-wider">
                Stories & Systems · AI/ML Engineering Portfolio
              </p>
            </div>
          </div>

          {/* Center Book Chapter Folio Index */}
          <nav id="desktop-nav" className="hidden lg:flex items-center gap-1 bg-[#EFECE4]/60 p-1 rounded-xl border border-[#E7E3D8]">
            {chapters.map((ch) => {
              const isActive = activeTab === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveTab(ch.id)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? "bg-white text-[#181818] font-semibold shadow-xs"
                      : "text-[var(--text-muted)] hover:text-[#181818] hover:bg-white/40"
                  }`}
                >
                  <span className="font-mono text-[10px] text-[var(--accent-blue)] font-bold">{ch.num}</span>
                  <span>{ch.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Page tracker */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-faint)] bg-white px-2.5 py-1 rounded-md border border-[#E7E3D8]">
              <span className="text-[var(--accent-blue)] font-bold">Spread {currentChapter.num}</span>
              <span>/ 08</span>
            </div>

            {/* Visitor count */}
            <div className="hidden md:flex items-center gap-1 text-[11px] text-[var(--text-faint)]">
              <Eye className="w-3.5 h-3.5" />
              <span className="font-mono tabular-nums">
                {visitorCount !== null ? visitorCount.toLocaleString() : "···"}
              </span>
            </div>

            {/* Resume download button */}
            <button
              onClick={handleDownloadResume}
              className="flex items-center gap-1.5 text-xs text-[#181818] border border-[#181818] bg-white px-3 py-1.5 rounded-lg hover:bg-[#181818] hover:text-white transition-all cursor-pointer font-medium shadow-2xs"
            >
              <Download className="w-3 h-3" />
              <span>Resume</span>
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-1.5 text-[#181818] cursor-pointer rounded-lg hover:bg-black/5"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Navigation Drawer ── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-[#F8F7F4] flex flex-col p-6 animate-fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-[#E7E3D8]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg border border-[#181818] bg-white flex items-center justify-center font-bold text-xs">
                U
              </div>
              <span className="text-sm font-bold text-[#181818]">Table of Contents</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 text-[#181818] cursor-pointer rounded-lg hover:bg-black/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto py-6 flex flex-col gap-2">
            {chapters.map((ch) => {
              const isActive = activeTab === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => {
                    setActiveTab(ch.id);
                    setSidebarOpen(false);
                  }}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all cursor-pointer ${
                    isActive
                      ? "bg-white text-[#181818] font-bold border border-[#E7E3D8] shadow-xs"
                      : "text-[var(--text-muted)] hover:text-[#181818] hover:bg-white/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-[var(--accent-blue)]">{ch.num}</span>
                    <span>{ch.label}</span>
                  </div>
                  <span className="font-hand text-sm text-[var(--text-faint)]">{ch.subtitle}</span>
                </button>
              );
            })}
          </nav>
          <div className="pt-4 border-t border-[#E7E3D8]">
            <button
              onClick={handleDownloadResume}
              className="w-full flex items-center justify-center gap-2 text-xs bg-[#181818] text-white py-3 rounded-xl font-medium cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download Resume (PDF)
            </button>
          </div>
        </div>
      )}

      {/* ── Main Book Folio Workspace ── */}
      <main className="flex-1 overflow-y-auto overscroll-y-contain px-3 sm:px-6 md:px-10 py-4 sm:py-6 flex flex-col justify-between">
        <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col justify-start">
          
          {activeTab === "home" ? (
            /* ── CHAPTER 01: HOME SPREAD (Panel 1 & Panel 5 Reference) ── */
            <div className="space-y-8 animate-fade-in">
              <div className="w-full bg-[#FFFFFF] rounded-2xl sm:rounded-3xl border border-[#E7E3D8] zine-spread-card p-6 sm:p-10 md:p-12">
                {/* Spread Header */}
                <div className="flex items-center justify-between pb-6 mb-8 border-b border-[#EFECE4]">
                  <div>
                    <span className="text-[11px] font-mono tracking-widest uppercase text-[var(--accent-blue)] font-bold">
                      Chapter 01 · Introduction
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-hand font-bold text-[#181818] tracking-tight mt-1">
                      Stories and Code from a Quiet Room
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-[var(--text-faint)]">
                    p. 01 / 08
                  </span>
                </div>

                {/* Two-Page Spread Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                  {/* Left Page (7 cols): Editorial Intro & Action Links */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* Status Pill */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#E7E3D8] bg-[#FAF9F5] text-[11px] font-mono text-[#181818]">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>B.Tech CSE · Silicon University (9.60 CGPA)</span>
                    </div>

                    {/* Headline */}
                    <div className="space-y-1">
                      <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#181818] leading-[1.08]">
                        Umesh Kumar
                        <br />
                        <span className="text-[var(--text-muted)] font-bold">Sahoo</span>
                      </h2>
                      <p className="text-xs sm:text-sm font-mono text-[var(--accent-blue)] font-semibold pt-1">
                        AI/ML Engineer · RAG & Vector Search · Cloud DevOps
                      </p>
                    </div>

                    {/* Poetic & Technically Sharp Bio */}
                    <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed font-literary italic max-w-xl">
                      "I build machine learning APIs, RAG semantic retrieval pipelines, and automated cloud workflows. Focused on turning complex data science models into fast, dependable production systems."
                    </p>

                    {/* Interactive Chapter Quick Jumps */}
                    <div className="flex flex-wrap items-center gap-2.5 pt-2">
                      <button
                        onClick={() => setActiveTab("projects")}
                        className="text-xs font-medium bg-[#181818] text-white px-4 py-2 rounded-xl hover:bg-[var(--accent-blue)] transition-colors cursor-pointer shadow-xs"
                      >
                        Explore Projects →
                      </button>
                      <button
                        onClick={() => setActiveTab("contact")}
                        className="text-xs font-medium border border-[#E7E3D8] bg-[#FAF9F5] text-[#181818] px-4 py-2 rounded-xl hover:bg-[#181818] hover:text-white transition-colors cursor-pointer"
                      >
                        Get in Touch
                      </button>
                      <button
                        onClick={() => setActiveTab("agent")}
                        className="text-xs font-medium text-[var(--accent-blue)] px-3 py-2 cursor-pointer hover:underline flex items-center gap-1"
                      >
                        <span>Talk with UMU AI</span>
                        <span>→</span>
                      </button>
                      <button
                        onClick={handleDownloadResume}
                        className="text-xs font-mono text-[var(--text-faint)] hover:text-[#181818] px-2 py-2 cursor-pointer flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>Resume (PDF)</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Page (5 cols): Cozy Desk Scene Illustration (Panel 1) + 4 Quick Foundations */}
                  <div className="lg:col-span-5 space-y-5 lg:border-l lg:border-[#EFECE4] lg:pl-10">
                    <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#FAF9F5] border border-[#E7E3D8]">
                      <DeskSceneIllustration className="w-full max-w-[260px] h-auto animate-float" />
                      <span className="text-[10px] font-hand text-[var(--text-faint)] mt-2">
                        Quiet Desk Vignette · Focus & Work
                      </span>
                    </div>

                    {/* 4 Foundation Pillars */}
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      {[
                        { num: "01", val: "9.60", label: "CGPA", sub: "Silicon Univ" },
                        { num: "02", val: "2", label: "Internships", sub: "DevOps & MERN" },
                        { num: "03", val: "3", label: "Core Projects", sub: "RAG & ML APIs" },
                        { num: "04", val: "4", label: "Honors", sub: "Competitions" },
                      ].map((item, idx) => (
                        <div key={idx} className="p-3 rounded-xl border border-[#E7E3D8] bg-[#FAF9F5] text-center">
                          <span className="text-[10px] font-mono text-[var(--accent-blue)] block font-bold">{item.num} · {item.label}</span>
                          <span className="text-base font-bold text-[#181818]">{item.val}</span>
                          <span className="text-[10px] text-[var(--text-faint)] block truncate">{item.sub}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Table of Contents Chapter Cards ── */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[var(--accent-blue)] font-bold">INDEX</span>
                    <span className="w-6 h-px bg-[#E7E3D8]" />
                    <h3 className="text-sm font-bold text-[#181818] uppercase tracking-wider">
                      Portfolio Chapters
                    </h3>
                  </div>
                  <span className="text-xs font-hand text-[var(--text-faint)]">
                    8 Illustrated Sections
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {chapters.slice(1).map((ch) => (
                    <div
                      key={ch.id}
                      onClick={() => setActiveTab(ch.id)}
                      className="p-4 rounded-xl border border-[#E7E3D8] bg-white hover:border-[var(--accent-blue)] hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[var(--accent-blue)]">{ch.num}</span>
                        <span className="font-hand text-xs text-[var(--text-faint)] group-hover:text-[#181818] transition-colors">{ch.subtitle}</span>
                      </div>
                      <h4 className="text-sm font-bold text-[#181818] mt-2 group-hover:text-[var(--accent-blue)] transition-colors">
                        {ch.label}
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 mt-0.5">
                        {ch.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Live Tech News Stream ── */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[var(--accent-blue)] font-bold">PULSE</span>
                    <span className="w-6 h-px bg-[#E7E3D8]" />
                    <h3 className="text-sm font-bold text-[#181818] uppercase tracking-wider">
                      Hacker News Intelligence
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-700 font-medium">● Real-time Cache</span>
                </div>
                <TechNewsFeed onBriefNews={handleBriefNews} />
              </div>
            </div>
          ) : (
            /* ── ALL OTHER CHAPTERS RENDERED IN TABCONTENT ── */
            <Suspense
              fallback={
                <div className="py-20 text-center font-mono text-xs text-[var(--text-faint)]">
                  Turning the page...
                </div>
              }
            >
              <TabContent
                activeTab={activeTab}
                onActionClick={(tab) => setActiveTab(tab)}
                initialAgentQuery={initialAgentQuery}
                clearInitialAgentQuery={() => setInitialAgentQuery("")}
              />
            </Suspense>
          )}

        </div>

        {/* ── Bottom Page Turning Footer ── */}
        <footer className="mt-8 pt-4 pb-2 border-t border-[#E7E3D8] flex items-center justify-between text-xs font-mono text-[var(--text-faint)] max-w-6xl w-full mx-auto">
          <button
            onClick={handlePrevChapter}
            disabled={currentChapterIndex === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E7E3D8] bg-white hover:text-[#181818] hover:border-[#181818] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Prev Chapter</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-[11px]">
            <span>Umesh Kumar Sahoo</span>
            <span>·</span>
            <span className="font-hand text-sm text-[#181818]">Stories & Systems</span>
            <span>·</span>
            <span>Silicon University (9.60 CGPA)</span>
          </div>

          <button
            onClick={handleNextChapter}
            disabled={currentChapterIndex === chapters.length - 1}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E7E3D8] bg-white hover:text-[#181818] hover:border-[#181818] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          >
            <span>Next Chapter</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </footer>
      </main>
    </div>
  );
}
