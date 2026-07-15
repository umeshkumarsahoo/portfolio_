import { useState, useEffect, useRef } from "react";

export default function TerminalLogs() {
  const [lines, setLines] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fullLogs = [
    "> initializing_profile.exe",
    "> loading_modules.................... [ OK ]",
    "> fetching_data....................... [ OK ]",
    "> system_ready."
  ];

  useEffect(() => {
    if (currentIndex >= fullLogs.length) return;

    const delay = currentIndex === 0 ? 300 : currentIndex === 1 ? 800 : currentIndex === 2 ? 800 : 500;
    
    const timer = setTimeout(() => {
      setLines((prev) => [...prev, fullLogs[currentIndex]]);
      setCurrentIndex((prev) => prev + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [currentIndex]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [lines]);

  return (
    <div id="terminal-boot-logs" className="font-mono text-xs md:text-[13px] text-white/90 max-h-[120px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent leading-relaxed select-none">
      <div className="flex flex-col gap-1.5">
        {lines.map((line, idx) => (
          <p key={idx} className="tracking-wide">
            {line}
          </p>
        ))}
        {currentIndex < fullLogs.length && (
          <p className="tracking-wide text-white">
            &gt; <span className="inline-block w-2 h-3.5 bg-white/80 animate-pulse"></span>
          </p>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
