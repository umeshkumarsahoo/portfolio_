import { lazy, Suspense, useState, useEffect } from "react";
import HeaderBar from "./components/HeaderBar";
import LeftSidebar from "./components/LeftSidebar";
import TerminalLogs from "./components/TerminalLogs";
import ScannerFrame from "./components/ScannerFrame";
import StatsPanel from "./components/StatsPanel";
import TechNewsFeed from "./components/TechNewsFeed";
import type { HackerNewsStory } from "./components/TechNewsFeed";
import BottomStatusBar from "./components/BottomStatusBar";
import resumePdf from "./assets/Umesh_Kumar_Sahoo_Resume.pdf?url";
import { secureFetch } from "./lib/api";

const TabContent = lazy(() => import("./components/TabContent"));

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [systemLogs, setSystemLogs] = useState<string[]>([
    "Welcome! Explore my work, projects and skills.",
    "Let's build the future with data and intelligence."
  ]);
  const [initialAgentQuery, setInitialAgentQuery] = useState("");

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

  // Log updater utility
  const updateLogsForTab = (tabId: string) => {
    setActiveTab(tabId);
    setSidebarOpen(false); // Close sidebar on mobile after clicking

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

    // Echo user's typed command in the system console
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

  const handleBriefNews = (stories: HackerNewsStory[]) => {
    const storyLines = stories.slice(0, 7).map((story, index) => {
      const title = story.title.length > 76 ? `${story.title.slice(0, 73)}...` : story.title;
      return `${index + 1}. ${title} (${story.score || 0} pts by ${story.by || "unknown"})`;
    }).join("\n");

    updateLogsForTab("agent");
    setInitialAgentQuery(
      `Brief these top 7 live tech news items in one short line each. Keep it concise and terminal-style.\n${storyLines}`
    );
  };

  const centerPanelGridClass =
    activeTab === "about"
      ? "lg:col-span-7 lg:border-r"
      : activeTab === "home"
        ? "lg:col-span-12 xl:col-span-7 xl:border-r"
        : "lg:col-span-12";

  return (
    <div id="terminal-root" className="terminal-red-shell w-screen h-screen p-0 select-none font-mono overflow-hidden">
      {/* Outer Retro Framing Box */}
      <div id="terminal-frame" className="terminal-red-frame w-full h-full border-2 border-white bg-black flex flex-col overflow-hidden relative">
        
        {/* Top Header Information & Menu Bar */}
        <HeaderBar />

        {/* Mobile Header Bar & Toggle (Only visible on small devices) */}
        <div id="mobile-navigation-header" className="md:hidden flex justify-between items-center px-4 py-2 bg-black border-b border-white text-xs text-white">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 bg-red-500 animate-ping"></span>
            <span className="tracking-widest">TAB: {activeTab.toUpperCase()}</span>
          </div>
          <button
            id="mobile-menu-toggle-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="border border-white/80 hover:border-red-400 hover:bg-red-500 hover:text-black px-2 py-1 transition-all uppercase cursor-pointer text-[10px]"
          >
            {sidebarOpen ? "[ CLOSE MENU ]" : "[ ||| MENU ]"}
          </button>
        </div>

        {/* Core Layout Panel */}
        <div id="terminal-workspace-body" className="flex flex-col md:flex-row flex-1 relative overflow-hidden min-h-0">
          
          {/* Left Sidebar (Desktop fixed, Mobile collapsible) */}
          <div
            id="sidebar-wrapper"
            className={`${
              sidebarOpen ? "block absolute inset-y-0 left-0 z-40 w-full" : "hidden"
            } md:block md:relative md:w-64`}
          >
            <LeftSidebar
              activeTab={activeTab}
              setActiveTab={updateLogsForTab}
              onDownloadResume={handleDownloadResume}
            />
          </div>

          {/* Right Main workspace panel */}
          <div
            id="main-content-workspace"
            className={`flex-1 flex flex-col bg-black min-h-0 ${
              activeTab === "home" ? "overflow-y-auto xl:overflow-hidden" : "overflow-hidden"
            }`}
          >
            
            {/* Top Workspace Section (Hero content on Left, Scanner Portrait on Right) */}
            <div
              id="workspace-top-split"
              className={`grid grid-cols-1 lg:grid-cols-12 border-b border-white min-h-0 ${
                activeTab === "home" ? "flex-none xl:flex-1 overflow-visible xl:overflow-hidden" : "flex-1 overflow-hidden"
              }`}
            >
              
              {/* Left Column: Variable Content / Hero Information */}
              <div 
                id="center-left-hero" 
                className={`${
                  centerPanelGridClass
                } p-4 sm:p-6 flex flex-col justify-start gap-4 ${
                  activeTab === "home" ? "border-b xl:border-b-0" : "border-b lg:border-b-0"
                } border-white ${
                  activeTab === "home"
                    ? "overflow-visible xl:overflow-y-auto h-auto xl:h-full min-h-fit xl:min-h-0"
                    : "overflow-y-auto h-full min-h-0"
                } scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent`}
              >
                
                {activeTab === "home" ? (
                  <div className="space-y-4 w-full max-w-3xl py-2 xl:my-auto xl:py-0">
                    {/* Terminal booting visual logs */}
                    <TerminalLogs />

                    {/* Developer Name */}
                    <div id="hero-name-block" className="space-y-1">
                      <h2 className="font-pixel text-4xl sm:text-5xl md:text-5xl lg:text-6xl font-extrabold tracking-wider text-white leading-none">
                        UMESH KUMAR SAHOO
                      </h2>
                    </div>

                    {/* Role Badge */}
                    <div id="hero-role-badge">
                      <span className="border border-white/60 text-white font-mono text-[10px] sm:text-xs tracking-[0.2em] px-3.5 py-1.5 bg-white/5 inline-block font-semibold">
                        AI/ML PORTFOLIO ENGINEER
                      </span>
                    </div>

                    {/* Professional Description */}
                    <p id="hero-description" className="text-gray-300 font-mono text-xs sm:text-sm tracking-wide leading-relaxed max-w-xl italic">
                      "Building intelligent systems that learn, adapt and create real-world impact using data, code and curiosity."
                    </p>

                    {/* Interactive CTAs */}
                    <div id="hero-cta-buttons" className="flex flex-wrap gap-4 pt-1">
                      <button
                        id="cta-view-projects"
                        onClick={() => updateLogsForTab("projects")}
                        className="font-mono text-xs tracking-wider border border-white hover:border-red-400 hover:bg-red-500 hover:text-black px-5 py-2.5 transition-all duration-200 cursor-pointer text-white font-medium flex items-center gap-1.5 active:scale-[0.98]"
                      >
                        &gt; VIEW PROJECTS
                      </button>
                      <button
                        id="cta-get-in-touch"
                        onClick={() => updateLogsForTab("contact")}
                        className="font-mono text-xs tracking-wider border border-white/40 hover:border-red-400 px-5 py-2.5 transition-all duration-200 cursor-pointer text-gray-300 hover:text-red-100 font-medium flex items-center gap-1.5 active:scale-[0.98]"
                      >
                        &gt; GET IN TOUCH
                      </button>
                      <button
                        id="cta-download-resume"
                        onClick={handleDownloadResume}
                        className="font-mono text-xs tracking-wider border border-white/40 hover:border-red-400 px-5 py-2.5 transition-all duration-200 cursor-pointer text-gray-300 hover:text-red-100 font-medium flex items-center gap-1.5 active:scale-[0.98]"
                      >
                        &gt; DOWNLOAD RESUME
                      </button>
                    </div>
                  </div>
                ) : (
                  // Variable dynamic Tab content (About, Experience, Projects, etc.)
                  <div id="tab-wrapper-section" className="flex flex-col gap-3 h-full">
                    <div className="flex items-center gap-2 border-b border-white/20 pb-2.5 shrink-0">
                      <span className="text-white font-bold tracking-widest uppercase text-xs">
                        // {activeTab === "agent" ? "umu AI" : activeTab}
                      </span>
                      <span className="text-[9px] text-gray-500 font-mono">
                        DIRECTORY_INDEX
                      </span>
                    </div>
                    <div className="flex-1 min-h-0">
                      <Suspense
                        fallback={
                          <div className="border border-white/20 bg-white/5 p-4 font-mono text-xs text-gray-300 animate-pulse">
                            [ SYS_LOAD ] Mounting directory module...
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
                )}
              </div>

              {activeTab === "home" && <TechNewsFeed onBriefNews={handleBriefNews} />}

              {/* Right Column: Character Portrait Radar Scanner */}
              {activeTab === "about" && (
                <div id="center-right-scanner" className="lg:col-span-5 bg-black h-full overflow-y-auto overflow-x-hidden scrollbar-none">
                  <ScannerFrame />
                </div>
              )}

            </div>

            {/* Bottom Workspace Section (Structured Stats Columns) */}
            {activeTab === "home" && <StatsPanel />}

          </div>

        </div>

        {/* Terminal status message area and uptime info */}
        <BottomStatusBar
          logs={systemLogs}
          activeTab={activeTab}
          onExecuteCommand={handleExecuteCommand}
        />

      </div>
    </div>
  );
}
