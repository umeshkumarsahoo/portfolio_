import { useState, useEffect, useRef, FormEvent } from "react";
import { Terminal } from "lucide-react";

interface BottomStatusBarProps {
  logs: string[];
  activeTab: string;
  onExecuteCommand: (command: string) => void;
}

export default function BottomStatusBar({ logs = [], activeTab, onExecuteCommand }: BottomStatusBarProps) {
  const [seconds, setSeconds] = useState(128 * 3600 + 47 * 60 + 19);
  const [commandInput, setCommandInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Tick Uptime
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format uptime clock
  const formatUptime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const pad = (num: number) => String(num).padStart(2, "0");
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  };

  // Scroll logs to bottom whenever they update
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Global event listener: Capture body keystrokes and redirect focus to the terminal input
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore special control combinations
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape") {
        inputRef.current?.blur();
        return;
      }

      const activeEl = document.activeElement;
      const isInputActive = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");
      
      if (!isInputActive) {
        // If it's a standard printable character or Backspace, redirect focus
        if (e.key.length === 1 || e.key === "Backspace") {
          inputRef.current?.focus();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Submit terminal command
  const handleCommandSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;

    onExecuteCommand(commandInput);
    setCommandInput("");
  };

  return (
    <div id="terminal-bottom-status-panel" className="w-full bg-black border-t border-white text-white font-mono text-xs select-none shrink-0">
      
      {/* System Message Log Panel & Command Input */}
      <div id="system-message-panel" className="p-3 border-b border-white min-h-[110px] md:h-[110px] h-auto flex flex-col md:flex-row gap-4 bg-black">
        
        {/* Left column: Dynamic Logs Console */}
        <div className="flex-1 flex flex-col gap-1 h-[80px]">
          <div className="flex">
            <span className="bg-red-600 text-white font-bold px-1.5 py-0.5 text-[9px] tracking-wider uppercase inline-block shadow-[0_0_10px_rgba(239,68,68,0.35)]">
              SYSTEM CONSOLE FEED
            </span>
          </div>
          
          <div 
            ref={logsContainerRef}
            className="flex-1 overflow-y-auto text-[11px] text-gray-300 mt-1 space-y-1 pl-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent pr-1"
          >
            {logs.length > 0 ? (
              logs.map((log, idx) => (
                <p key={idx} className="leading-relaxed font-semibold">
                  {log}
                </p>
              ))
            ) : (
              <>
                <p className="leading-relaxed">Welcome! Explore my work, projects and skills.</p>
                <p className="leading-relaxed text-gray-400">Type commands directly or press any key to focus terminal.</p>
              </>
            )}
          </div>
        </div>

        {/* Right column: Active Terminal Console Input Area */}
        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-white/20 pt-2 md:pt-0 md:pl-3 flex flex-col gap-1 shrink-0 justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-white font-bold text-[9px] tracking-wider flex items-center gap-1">
              <Terminal className="w-3 h-3 text-white" /> INTERACTIVE PORTAL_COM.EXE
            </span>
            <p className="text-[10px] text-gray-400">Type <span className="text-white font-semibold underline">help</span> to list secure directory commands.</p>
          </div>

          <form onSubmit={handleCommandSubmit} className="flex items-center gap-1 border border-white/35 bg-black p-1.5 mt-1 focus-within:border-red-400 focus-within:shadow-[0_0_12px_rgba(239,68,68,0.16)] transition-all">
            <span className="text-white font-bold text-[11px] shrink-0 select-none">
              visitor@umeshkumar:~$
            </span>
            <input
              ref={inputRef}
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              className="flex-1 bg-black text-white text-[11px] focus:outline-none border-none p-0 select-text"
              placeholder="help..."
              autoComplete="off"
              spellCheck="false"
            />
          </form>
        </div>

      </div>

      {/* Footer Navigation Bar */}
      <div id="bottom-status-bar-line" className="flex flex-col lg:flex-row justify-between items-center px-4 py-2 bg-black gap-2 lg:gap-4 text-[10px] tracking-widest text-gray-300 select-none">
        <div id="status-left" className="flex items-center gap-2 shrink-0">
          <span>SYSTEM_STATUS:</span>
          <span className="text-white font-bold flex items-center gap-1.5">
            ONLINE
            <span className="inline-block w-2 h-3 bg-red-500 animate-cursor-blink"></span>
          </span>
        </div>
        <div id="status-center" className="text-center text-[9px] text-gray-400 hover:text-white transition-colors uppercase max-w-full break-words leading-relaxed">
          [ DIRECTORY LEVEL: {activeTab.toUpperCase()} ] • GLOBAL KEYBOARD LISTENER ENGAGED
        </div>
        <div id="status-right" className="tabular-nums shrink-0">
          SYSTEM_UPTIME: <span className="text-white font-semibold">{formatUptime(seconds)}</span>
        </div>
      </div>
    </div>
  );
}
