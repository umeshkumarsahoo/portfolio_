/**
 * Minimalist line-art SVG illustrations for each portfolio section.
 * Inspired by the editorial reference image — thin strokes, geometric shapes,
 * occasional cobalt blue and burnt orange accents.
 */

const STROKE = "#171717";
const COBALT = "#2468B4";
const ORANGE = "#F07835";

// Home: minimal line-art silhouette with one orbital shape
export function HomeIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Head silhouette */}
      <path
        d="M90 110 C90 110 85 95 82 85 C78 72 78 58 85 48 C92 38 100 35 108 38 C116 41 120 50 120 60 C120 68 118 76 115 82 C112 88 108 95 108 100 L108 110"
        stroke={STROKE}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Hair detail */}
      <path
        d="M85 48 C88 42 95 36 105 36 C112 36 118 40 120 48"
        stroke={STROKE}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Orbit ellipse */}
      <ellipse
        cx="100"
        cy="70"
        rx="45"
        ry="20"
        stroke={STROKE}
        strokeWidth="0.8"
        strokeDasharray="4 3"
        transform="rotate(-15 100 70)"
        opacity="0.4"
      />
      {/* Orbital dot - cobalt */}
      <circle cx="140" cy="58" r="5" fill={COBALT} />
      {/* Small geometric dots */}
      <circle cx="58" cy="82" r="2.5" fill={STROKE} />
      <circle cx="145" cy="90" r="1.5" fill={STROKE} opacity="0.4" />
    </svg>
  );
}

// About: laptop, plant, books
export function AboutIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Desk line */}
      <line x1="30" y1="120" x2="170" y2="120" stroke={STROKE} strokeWidth="1" />
      {/* Laptop base */}
      <rect x="55" y="105" width="60" height="3" rx="1" stroke={STROKE} strokeWidth="1" />
      {/* Laptop screen */}
      <rect x="60" y="70" width="50" height="35" rx="2" stroke={STROKE} strokeWidth="1.2" />
      {/* Screen content lines */}
      <line x1="66" y1="80" x2="82" y2="80" stroke={STROKE} strokeWidth="0.8" opacity="0.3" />
      <line x1="66" y1="85" x2="100" y2="85" stroke={STROKE} strokeWidth="0.8" opacity="0.3" />
      <line x1="66" y1="90" x2="90" y2="90" stroke={STROKE} strokeWidth="0.8" opacity="0.3" />
      {/* Plant pot */}
      <path d="M135 120 L138 108 L148 108 L151 120" stroke={STROKE} strokeWidth="1" strokeLinecap="round" />
      {/* Plant stems and leaves */}
      <path d="M143 108 C143 98 140 90 138 84" stroke={STROKE} strokeWidth="1" strokeLinecap="round" />
      <path d="M143 108 C143 96 148 88 152 82" stroke={STROKE} strokeWidth="1" strokeLinecap="round" />
      <path d="M138 84 C134 80 130 82 132 86 C134 90 138 86 138 84" stroke={STROKE} strokeWidth="0.8" fill="none" />
      <path d="M152 82 C156 78 158 80 156 84 C154 88 152 84 152 82" stroke={STROKE} strokeWidth="0.8" fill="none" />
      <path d="M143 100 C143 96 146 92 150 90" stroke={STROKE} strokeWidth="0.8" strokeLinecap="round" />
      {/* Orange accent circle behind plant */}
      <circle cx="143" cy="85" r="8" fill={ORANGE} opacity="0.15" />
      {/* Small book stack on left */}
      <rect x="35" y="112" width="14" height="3" rx="0.5" stroke={STROKE} strokeWidth="0.8" />
      <rect x="37" y="108" width="12" height="3" rx="0.5" stroke={STROKE} strokeWidth="0.8" />
    </svg>
  );
}

// Experience: winding path with milestone markers
export function ExperienceIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Winding path */}
      <path
        d="M30 130 C50 130 60 100 80 100 C100 100 100 70 120 70 C140 70 140 40 160 40 L175 40"
        stroke={STROKE}
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Milestone dots */}
      <circle cx="30" cy="130" r="4" fill={COBALT} />
      <circle cx="80" cy="100" r="3" stroke={STROKE} strokeWidth="1" fill="white" />
      <circle cx="120" cy="70" r="3" stroke={STROKE} strokeWidth="1" fill="white" />
      {/* Flag at end */}
      <line x1="175" y1="40" x2="175" y2="25" stroke={STROKE} strokeWidth="1" />
      <path d="M175 25 L188 29 L175 33" fill={ORANGE} opacity="0.7" />
      {/* Small geometric markers */}
      <rect x="77" y="110" width="6" height="6" transform="rotate(45 80 113)" stroke={STROKE} strokeWidth="0.6" fill="none" opacity="0.3" />
    </svg>
  );
}

// Projects: minimal code window/laptop
export function ProjectsIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Browser window */}
      <rect x="40" y="35" width="120" height="90" rx="4" stroke={STROKE} strokeWidth="1.2" />
      {/* Title bar */}
      <line x1="40" y1="50" x2="160" y2="50" stroke={STROKE} strokeWidth="0.8" />
      {/* Traffic lights */}
      <circle cx="52" cy="42.5" r="2.5" fill="#D94040" opacity="0.6" />
      <circle cx="60" cy="42.5" r="2.5" fill={ORANGE} opacity="0.6" />
      <circle cx="68" cy="42.5" r="2.5" fill="#2A9D5C" opacity="0.6" />
      {/* Code lines */}
      <line x1="52" y1="62" x2="72" y2="62" stroke={COBALT} strokeWidth="1" opacity="0.5" />
      <line x1="52" y1="70" x2="100" y2="70" stroke={STROKE} strokeWidth="0.8" opacity="0.25" />
      <line x1="58" y1="78" x2="90" y2="78" stroke={STROKE} strokeWidth="0.8" opacity="0.25" />
      <line x1="58" y1="86" x2="110" y2="86" stroke={STROKE} strokeWidth="0.8" opacity="0.25" />
      <line x1="52" y1="94" x2="82" y2="94" stroke={STROKE} strokeWidth="0.8" opacity="0.25" />
      <line x1="52" y1="102" x2="68" y2="102" stroke={ORANGE} strokeWidth="1" opacity="0.5" />
      {/* Accent tab */}
      <rect x="148" y="35" width="12" height="15" rx="0" fill={ORANGE} opacity="0.12" />
      {/* Corner dots */}
      <circle cx="155" cy="130" r="1.5" fill={STROKE} opacity="0.2" />
    </svg>
  );
}

// Skills: geometric layered diagram with blue accents
export function SkillsIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Stacked diamond layers */}
      <polygon
        points="100,40 140,65 100,90 60,65"
        stroke={STROKE}
        strokeWidth="1.2"
        fill="none"
      />
      <polygon
        points="100,55 130,73 100,91 70,73"
        stroke={STROKE}
        strokeWidth="0.8"
        fill={COBALT}
        fillOpacity="0.08"
      />
      <polygon
        points="100,70 120,80 100,90 80,80"
        stroke={STROKE}
        strokeWidth="0.8"
        fill={COBALT}
        fillOpacity="0.15"
      />
      {/* Corner dots */}
      <circle cx="100" cy="40" r="2" fill={STROKE} />
      <circle cx="140" cy="65" r="2" fill={STROKE} opacity="0.4" />
      <circle cx="60" cy="65" r="2" fill={STROKE} opacity="0.4" />
      <circle cx="100" cy="90" r="2" fill={STROKE} />
      {/* Thin connecting lines */}
      <line x1="100" y1="95" x2="100" y2="130" stroke={STROKE} strokeWidth="0.5" strokeDasharray="2 3" />
      <line x1="85" y1="100" x2="70" y2="120" stroke={STROKE} strokeWidth="0.5" strokeDasharray="2 3" />
      <line x1="115" y1="100" x2="130" y2="120" stroke={STROKE} strokeWidth="0.5" strokeDasharray="2 3" />
      {/* Small dots at ends */}
      <circle cx="100" cy="130" r="1.5" fill={COBALT} />
      <circle cx="70" cy="120" r="1.5" fill={STROKE} opacity="0.3" />
      <circle cx="130" cy="120" r="1.5" fill={STROKE} opacity="0.3" />
    </svg>
  );
}

// Achievements: mountain outline with a small flag
export function AchievementsIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Mountains */}
      <path
        d="M20 130 L70 55 L90 85 L120 35 L165 130"
        stroke={STROKE}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Ground line */}
      <line x1="10" y1="130" x2="190" y2="130" stroke={STROKE} strokeWidth="0.8" />
      {/* Flag pole */}
      <line x1="120" y1="35" x2="120" y2="18" stroke={STROKE} strokeWidth="1" />
      {/* Flag */}
      <path d="M120 18 L135 23 L120 28" fill={ORANGE} opacity="0.7" />
      {/* Sun/circle */}
      <circle cx="160" cy="45" r="10" stroke={STROKE} strokeWidth="0.8" fill="none" opacity="0.3" />
      <circle cx="160" cy="45" r="2" fill={COBALT} opacity="0.5" />
      {/* Birds */}
      <path d="M42 40 C44 38 46 40 48 38" stroke={STROKE} strokeWidth="0.6" fill="none" />
      <path d="M52 35 C54 33 56 35 58 33" stroke={STROKE} strokeWidth="0.6" fill="none" />
    </svg>
  );
}

// Contact: paper airplane with curved flight path
export function ContactIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Paper airplane */}
      <g transform="translate(120, 45) rotate(-15)">
        <path
          d="M0 0 L35 12 L8 8 Z"
          stroke={STROKE}
          strokeWidth="1.2"
          fill="none"
          strokeLinejoin="round"
        />
        <path
          d="M0 0 L8 8 L6 20 Z"
          stroke={STROKE}
          strokeWidth="1"
          fill="none"
          strokeLinejoin="round"
        />
      </g>
      {/* Flight path */}
      <path
        d="M40 120 C60 110 70 90 85 85 C100 80 110 75 120 60"
        stroke={STROKE}
        strokeWidth="0.8"
        strokeDasharray="4 4"
        fill="none"
      />
      {/* Trail dots */}
      <circle cx="40" cy="120" r="2" fill={STROKE} opacity="0.3" />
      <circle cx="65" cy="100" r="1.5" fill={STROKE} opacity="0.2" />
      {/* Blue accent dot */}
      <circle cx="150" cy="50" r="4" fill={COBALT} />
    </svg>
  );
}

// UMU AI: abstract human profile with connected orbital nodes
export function UmuAiIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Head profile outline */}
      <path
        d="M70 120 C70 120 65 105 65 90 C65 75 68 65 75 55 C82 45 92 40 100 40 C108 40 115 45 120 52 C125 59 127 68 127 78 C127 88 125 100 120 108 L120 120"
        stroke={STROKE}
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Neural connection lines */}
      <line x1="100" y1="60" x2="150" y2="45" stroke={STROKE} strokeWidth="0.6" opacity="0.3" />
      <line x1="115" y1="70" x2="160" y2="65" stroke={STROKE} strokeWidth="0.6" opacity="0.3" />
      <line x1="110" y1="85" x2="155" y2="95" stroke={STROKE} strokeWidth="0.6" opacity="0.3" />
      {/* Orbital nodes */}
      <circle cx="150" cy="45" r="5" fill={COBALT} />
      <circle cx="160" cy="65" r="3" stroke={STROKE} strokeWidth="0.8" fill="white" />
      <circle cx="155" cy="95" r="4" fill={ORANGE} opacity="0.7" />
      {/* Orbit ring */}
      <ellipse
        cx="130"
        cy="70"
        rx="35"
        ry="30"
        stroke={STROKE}
        strokeWidth="0.5"
        strokeDasharray="3 4"
        fill="none"
        opacity="0.2"
      />
      {/* Small dots */}
      <circle cx="85" cy="55" r="1.5" fill={STROKE} opacity="0.3" />
    </svg>
  );
}
