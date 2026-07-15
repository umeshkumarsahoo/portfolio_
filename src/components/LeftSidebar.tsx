import { Download } from "lucide-react";

interface LeftSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onDownloadResume?: () => void;
}

export default function LeftSidebar({ activeTab, setActiveTab, onDownloadResume }: LeftSidebarProps) {
  const navItems = [
    { id: "home", label: "HOME" },
    { id: "about", label: "ABOUT" },
    { id: "experience", label: "EXPERIENCE" },
    { id: "projects", label: "PROJECTS" },
    { id: "skills", label: "SKILLS" },
    { id: "achievements", label: "ACHIEVEMENTS" },
    { id: "contact", label: "CONTACT" },
    { id: "agent", label: "UMU AI" },
  ];

  return (
    <div id="left-sidebar-container" className="h-full flex flex-col bg-black border-r border-white w-full md:w-64 select-none">
      {/* Brand Logo Section */}
      <div id="sidebar-logo-section" className="flex flex-col items-center justify-center p-6 border-b border-white">
        {/* Retro Styled Striped 'U' Logo */}
        <div id="brand-u-logo" className="mb-3 flex flex-col justify-center items-center">
          <svg
            className="w-16 h-16 text-white drop-shadow-[0_0_8px_rgba(239,68,68,0.35)]"
            viewBox="0 0 100 100"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Draw striped pixel letter U */}
            <g>
              <rect x="15" y="10" width="15" height="6" />
              <rect x="70" y="10" width="15" height="6" />
              
              <rect x="15" y="20" width="15" height="6" />
              <rect x="70" y="20" width="15" height="6" />
              
              <rect x="15" y="30" width="15" height="6" />
              <rect x="70" y="30" width="15" height="6" />
              
              <rect x="15" y="40" width="15" height="6" />
              <rect x="70" y="40" width="15" height="6" />
              
              <rect x="15" y="50" width="15" height="6" />
              <rect x="70" y="50" width="15" height="6" />
              
              <rect x="15" y="60" width="15" height="6" />
              <rect x="70" y="60" width="15" height="6" />
              
              <rect x="18" y="70" width="15" height="6" />
              <rect x="67" y="70" width="15" height="6" />

              <rect x="23" y="78" width="54" height="6" />
              <rect x="32" y="85" width="36" height="6" />
            </g>
          </svg>
        </div>
        <div id="brand-name" className="text-center">
          <h1 className="font-pixel text-2xl tracking-[0.25em] text-white leading-tight">
            UMESH
          </h1>
          <p className="font-mono text-[10px] tracking-[0.15em] text-gray-400 mt-0.5">
            KUMAR SAHOO
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav id="sidebar-nav-links" className="flex-1 py-4 px-3 flex flex-col gap-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center font-mono text-[13px] tracking-wider py-2 px-3 transition-all duration-150 text-left cursor-pointer group rounded-sm ${
                isActive
                  ? "bg-white text-black font-semibold border border-red-400 shadow-[inset_3px_0_0_#ef4444]"
                  : "text-gray-300 hover:text-red-100 hover:bg-red-500/10 hover:border-red-500/30 border border-transparent"
              }`}
            >
              <span className={`mr-2.5 transition-transform duration-150 ${
                isActive ? "text-red-600" : "text-gray-500 group-hover:text-red-300 group-hover:translate-x-0.5"
              }`}>
                &gt;_
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Download Resume Footer Section */}
      <div id="sidebar-footer" className="p-4 border-t border-white">
        <button
          id="btn-download-resume"
          onClick={onDownloadResume}
          className="w-full flex items-center justify-center gap-2 font-mono text-xs tracking-wider border border-white hover:border-red-400 hover:bg-red-500 hover:text-black py-2.5 transition-all duration-200 cursor-pointer text-white font-medium active:scale-[0.98]"
        >
          DOWNLOAD RESUME
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
