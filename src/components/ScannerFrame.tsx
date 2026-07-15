import { motion } from "motion/react";
import portraitImg from "../assets/images/umesh_portrait_1784052523060.png";

export default function ScannerFrame() {
  return (
    <div id="scanner-frame-wrapper" className="flex flex-col items-center justify-center p-4 border border-white bg-black/40 relative min-h-[350px] md:min-h-[420px] select-none h-full">
      {/* Scanner Outer Corner Brackets */}
      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-white"></div>
      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-white"></div>
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-white"></div>
      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-white"></div>

      {/* Frame Status Details */}
      <div className="absolute top-3 left-8 right-8 flex justify-between font-mono text-[9px] text-gray-400 tracking-wider">
        <span>[ SCAN_RADAR_v2.1 ]</span>
        <span className="animate-pulse text-red-400">● LIVE FEED</span>
      </div>

      {/* Main Image Container */}
      <div className="relative w-64 h-64 md:w-72 md:h-72 border border-white/20 bg-black overflow-hidden mt-6 flex items-center justify-center">
        {/* Animated Scanning Laser Line */}
        <div className="absolute inset-x-0 h-0.5 bg-red-400/80 shadow-[0_0_12px_rgba(248,113,113,0.85)] z-10 animate-scanline"></div>

        {/* Floating Portrait Image */}
        <motion.div
          animate={{
            y: [-4, 4, -4],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="w-full h-full relative"
        >
          {/* Subtle grid pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none z-10 opacity-70"></div>
          
          <img
            src={portraitImg}
            alt="Umesh Kumar Sahoo Halftone Portrait"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover grayscale brightness-110 contrast-125"
          />
        </motion.div>

        {/* Target overlay overlay marks */}
        <div className="absolute top-4 left-4 w-2 h-2 border-t border-l border-white/60"></div>
        <div className="absolute top-4 right-4 w-2 h-2 border-t border-r border-white/60"></div>
        <div className="absolute bottom-4 left-4 w-2 h-2 border-b border-l border-white/60"></div>
        <div className="absolute bottom-4 right-4 w-2 h-2 border-b border-r border-white/60"></div>
        
        {/* Centered crosshair */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
          <div className="w-8 h-8 border border-white rounded-full"></div>
          <div className="absolute w-12 h-px bg-white"></div>
          <div className="absolute h-12 w-px bg-white"></div>
        </div>
      </div>

      {/* Calibration metrics below image */}
      <div className="w-full max-w-[280px] mt-4 font-mono text-[10px] text-gray-300 flex flex-col gap-1">
        <div className="flex justify-between border-b border-white/10 pb-1">
          <span>TARGET ACQUIRED:</span>
          <span className="text-white font-bold">UMESH KUMAR SAHOO</span>
        </div>
        <div className="flex justify-between">
          <span>PATTERN MATCH:</span>
          <span className="text-white">100.0% SECURE</span>
        </div>
        <div className="flex justify-between">
          <span>COORDINATES:</span>
          <span className="text-white tabular-nums">20.3503° N, 85.8063° E</span>
        </div>
      </div>
    </div>
  );
}
