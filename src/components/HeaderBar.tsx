import { useState, useEffect } from "react";

export default function HeaderBar() {
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      
      // Format Date as MM-DD-YY
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const yy = String(now.getFullYear()).slice(-2);
      setDateStr(`${mm}-${dd}-${yy}`);

      // Format Time as HH:mm:ss
      const hh = String(now.getHours()).padStart(2, "0");
      const min = String(now.getMinutes()).padStart(2, "0");
      const sec = String(now.getSeconds()).padStart(2, "0");
      setTimeStr(`${hh}:${min}:${sec}`);
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div id="terminal-header-container" className="w-full text-white font-mono text-xs select-none">
      {/* System Status Top Line */}
      <div id="terminal-system-status" className="terminal-red-rule flex justify-between items-center px-4 py-2 bg-black border-b border-white">
        <div id="system-title" className="tracking-widest font-semibold flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.85)]"></span>
          UMESH.PORTFOLIO v1.0.0 - AI/ML PORTFOLIO ENGINEER
        </div>
        <div id="system-time" className="flex items-center gap-4 text-[11px] sm:text-xs">
          <span id="header-date" className="tracking-wider">{dateStr || "07-14-26"}</span>
          <span id="header-time" className="font-bold tracking-widest tabular-nums bg-red-500/15 text-red-100 px-1">{timeStr || "11:07:08"}</span>
        </div>
      </div>
    </div>
  );
}
