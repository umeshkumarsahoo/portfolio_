/**
 * Hand-drawn doodle character for UMU AI assistant.
 * Directly crafted to match the user's reference image (Image 1):
 * Chunky organic marker strokes, wobbly egg-shaped bodies,
 * hand-propped sitting poses, finger pointing up, and cute facial expressions.
 */

interface DoodleProps {
  className?: string;
}

const STROKE = "#171717";
const STROKE_WIDTH = "2.8";

// ── 1. IDLE: Relaxed doodle sitting with hands propped on floor (like Character 3 in reference) ──
export function DoodleIdle({ className = "" }: DoodleProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`doodle-idle ${className}`}>
      {/* Head - wobbly organic egg shape */}
      <path
        d="M42 22 C52 20 60 26 59 36 C58 46 50 49 41 48 C31 47 27 38 29 28 C30 21 35 22 42 22 Z"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Eyes - two authentic hand-drawn ink dots */}
      <circle cx="39" cy="33" r="2.2" fill={STROKE} />
      <circle cx="48" cy="33" r="2.2" fill={STROKE} />
      {/* Mouth - cute slight smile */}
      <path
        d="M41 40 C43 42 47 42 49 40"
        stroke={STROKE}
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Body - pear/egg shaped sitting torso */}
      <path
        d="M36 48 C28 52 27 64 30 75 C34 82 54 82 60 75 C64 63 62 51 54 48 C48 46 41 46 36 48 Z"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Left arm propped outward to ground */}
      <path
        d="M32 58 L18 78 L12 80"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
      <polygon points="12,80 8,83 15,84" fill={STROKE} />

      {/* Right arm propped outward to ground */}
      <path
        d="M58 58 L72 78 L78 80"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
      <polygon points="78,80 82,83 75,84" fill={STROKE} />

      {/* Sitting legs on ground */}
      <path
        d="M33 78 L26 84 M57 78 L64 84"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── 2. THINKING: Hand raised high with finger pointing straight up (like Character 2 in reference) ──
export function DoodleThinking({ className = "" }: DoodleProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`doodle-think ${className}`}>
      {/* Head tilted upward */}
      <path
        d="M44 20 C54 18 62 24 61 34 C60 44 51 47 43 46 C33 45 29 36 31 26 C33 19 37 20 44 20 Z"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Eyes looking up */}
      <circle cx="42" cy="29" r="2.2" fill={STROKE} />
      <circle cx="51" cy="29" r="2.2" fill={STROKE} />
      {/* Curious 'hmm' mouth */}
      <path
        d="M44 38 C47 37 50 39 52 38"
        stroke={STROKE}
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Body */}
      <path
        d="M37 46 C29 50 28 62 31 73 C35 80 55 80 61 73 C65 61 63 49 55 46 C49 44 42 44 37 46 Z"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Arm pointing straight up with one finger! (Character #2 signature) */}
      <path
        d="M55 54 C60 44 62 32 63 18 L63 10"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
      {/* Pointing index finger tip */}
      <path
        d="M61 10 C61 6 65 6 65 10 L65 15 C66 16 67 18 65 20"
        stroke={STROKE}
        strokeWidth="2.2"
        strokeLinecap="round"
        fill={STROKE}
      />

      {/* Left arm resting on floor */}
      <path
        d="M33 56 L20 76 L14 78"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
      <polygon points="14,78 10,81 17,82" fill={STROKE} />

      {/* Sitting legs */}
      <path
        d="M34 76 L27 82 M58 76 L65 82"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />

      {/* Subtle thought spark dots */}
      <circle cx="73" cy="12" r="1.5" fill={STROKE} opacity="0.6" />
      <circle cx="78" cy="8" r="2.2" fill={STROKE} opacity="0.4" />
    </svg>
  );
}

// ── 3. SPEAKING: Explaining with animated gesturing hand ──
export function DoodleSpeaking({ className = "" }: DoodleProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`doodle-talk ${className}`}>
      {/* Head */}
      <path
        d="M42 22 C52 20 60 26 59 36 C58 46 50 49 41 48 C31 47 27 38 29 28 C30 21 35 22 42 22 Z"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Expressive eyes */}
      <circle cx="39" cy="32" r="2.2" fill={STROKE} />
      <circle cx="48" cy="32" r="2.2" fill={STROKE} />
      {/* Open animated speaking mouth */}
      <path
        d="M42 39 C42 44 48 44 48 39 Z"
        stroke={STROKE}
        strokeWidth="2"
        fill={STROKE}
      />

      {/* Body */}
      <path
        d="M36 48 C28 52 27 64 30 75 C34 82 54 82 60 75 C64 63 62 51 54 48 C48 46 41 46 36 48 Z"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right arm gesturing forward passionately */}
      <path
        d="M56 54 C66 50 74 42 72 35 L76 30"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
      {/* Open palm hand */}
      <path
        d="M74 32 L81 27 M76 34 L82 31"
        stroke={STROKE}
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Left arm resting on ground */}
      <path
        d="M32 58 L18 78 L12 80"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
      <polygon points="12,80 8,83 15,84" fill={STROKE} />

      {/* Sitting legs */}
      <path
        d="M33 78 L26 84 M57 78 L64 84"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── 4. SEARCHING: Examining with hand-drawn magnifying glass ──
export function DoodleSearching({ className = "" }: DoodleProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`doodle-think ${className}`}>
      {/* Head tilted forward */}
      <path
        d="M46 22 C56 20 64 26 63 36 C62 46 54 49 45 48 C35 47 31 38 33 28 C34 21 39 22 46 22 Z"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Curious wide eyes */}
      <circle cx="45" cy="33" r="2.5" fill={STROKE} />
      <circle cx="53" cy="33" r="2.5" fill={STROKE} />
      {/* Small focused mouth */}
      <circle cx="49" cy="41" r="1.5" fill={STROKE} />

      {/* Body leaning right */}
      <path
        d="M40 48 C32 52 31 64 34 75 C38 82 58 82 64 75 C68 63 66 51 58 48 Z"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right arm holding magnifying glass */}
      <path
        d="M58 54 C66 50 72 44 75 38"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
      {/* Hand-drawn magnifying glass */}
      <circle
        cx="82"
        cy="30"
        r="8"
        stroke={STROKE}
        strokeWidth="2.5"
      />
      <line
        x1="76"
        y1="36"
        x2="72"
        y2="42"
        stroke={STROKE}
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Left arm propped */}
      <path
        d="M34 58 L20 78 L14 80"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />

      {/* Sitting legs */}
      <path
        d="M35 78 L28 84 M59 78 L66 84"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── 5. SUCCESS: Celebratory pose with both arms up and happy eye crescents ──
export function DoodleSuccess({ className = "" }: DoodleProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Head */}
      <path
        d="M42 22 C52 20 60 26 59 36 C58 46 50 49 41 48 C31 47 27 38 29 28 C30 21 35 22 42 22 Z"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Happy eye crescents ^ ^ */}
      <path d="M36 32 C38 29 42 29 44 32" stroke={STROKE} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M46 32 C48 29 52 29 54 32" stroke={STROKE} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      {/* Big joyful smile */}
      <path
        d="M39 39 C43 45 49 45 52 39"
        stroke={STROKE}
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Body */}
      <path
        d="M36 48 C28 52 27 64 30 75 C34 82 54 82 60 75 C64 63 62 51 54 48 Z"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Both arms raised in joy! */}
      <path
        d="M34 52 C26 44 22 32 18 24"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
      <polygon points="18,24 14,20 22,20" fill={STROKE} />

      <path
        d="M56 52 C64 44 68 32 72 24"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
      <polygon points="72,24 76,20 68,20" fill={STROKE} />

      {/* Joy sparkles */}
      <path d="M12 18 L16 14 M10 24 L6 24" stroke="#F07835" strokeWidth="2" strokeLinecap="round" />
      <path d="M78 18 L82 14 M80 24 L85 24" stroke="#2468B4" strokeWidth="2" strokeLinecap="round" />

      {/* Sitting legs */}
      <path
        d="M33 78 L26 84 M57 78 L64 84"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── 6. ERROR: Worried look, head scratch, squiggle mouth ──
export function DoodleError({ className = "" }: DoodleProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Head */}
      <path
        d="M42 22 C52 20 60 26 59 36 C58 46 50 49 41 48 C31 47 27 38 29 28 C30 21 35 22 42 22 Z"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Worried eyes */}
      <circle cx="38" cy="33" r="2.5" fill={STROKE} />
      <circle cx="48" cy="33" r="2.5" fill={STROKE} />
      {/* Worried eyebrows */}
      <line x1="34" y1="27" x2="40" y2="29" stroke={STROKE} strokeWidth="2" strokeLinecap="round" />
      <line x1="46" y1="29" x2="52" y2="27" stroke={STROKE} strokeWidth="2" strokeLinecap="round" />
      {/* Wavy mouth */}
      <path
        d="M39 41 C41 39 43 42 45 40 C47 38 49 41 51 39"
        stroke={STROKE}
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Body */}
      <path
        d="M36 48 C28 52 27 64 30 75 C34 82 54 82 60 75 C64 63 62 51 54 48 Z"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right arm scratching head */}
      <path
        d="M56 54 C64 48 64 36 56 30"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />

      {/* Question mark */}
      <text x="68" y="24" fontFamily="serif" fontSize="16" fontWeight="bold" fill="#F07835">?</text>

      {/* Left arm propped */}
      <path
        d="M32 58 L18 78 L12 80"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />

      {/* Sitting legs */}
      <path
        d="M33 78 L26 84 M57 78 L64 84"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── 7. DOODLE GANG: The entire 5-character doodle row from Image 1! ──
export function DoodleGang({ className = "" }: DoodleProps) {
  return (
    <svg viewBox="0 0 420 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Person 1 (Far Left): Leaning back with smile */}
      <g transform="translate(10, 30)">
        <path d="M42 18 C52 16 60 22 59 32 C58 42 50 45 41 44 C31 43 27 34 29 24 C30 17 35 18 42 18 Z" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
        <circle cx="39" cy="28" r="2" fill={STROKE} />
        <circle cx="48" cy="28" r="2" fill={STROKE} />
        <path d="M41 35 C43 37 47 37 49 35" stroke={STROKE} strokeWidth="2" strokeLinecap="round" />
        <path d="M36 44 C28 48 27 60 30 71 C34 78 54 78 60 71 C64 59 62 47 54 44 Z" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
        <path d="M32 54 L14 74 L8 76" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
        <polygon points="8,76 4,79 11,80" fill={STROKE} />
        <path d="M58 54 L68 74" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      </g>

      {/* Person 2: Round torso with hand raised pointing index finger up! */}
      <g transform="translate(90, 15)">
        {/* Head */}
        <path d="M44 25 C52 23 58 29 57 37 C56 45 49 48 42 47 C34 46 31 39 33 31 C35 25 39 25 44 25 Z" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
        {/* Torso round egg */}
        <path d="M44 48 C32 48 24 60 24 74 C24 88 34 94 45 94 C56 94 65 88 65 74 C65 60 56 48 44 48 Z" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
        {/* Hand pointing finger straight up! */}
        <path d="M58 58 C68 46 72 30 72 14 L72 4" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
        <path d="M70 4 C70 0 74 0 74 4 L74 9 C75 11 77 12 75 14" stroke={STROKE} strokeWidth="2" strokeLinecap="round" fill={STROKE} />
      </g>

      {/* Person 3 (Center): Symmetrical sitting with arms propped out */}
      <g transform="translate(170, 32)">
        <path d="M42 16 C52 14 60 20 59 30 C58 40 50 43 41 42 C31 41 27 32 29 22 C30 15 35 16 42 16 Z" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
        <circle cx="39" cy="26" r="2" fill={STROKE} />
        <circle cx="48" cy="26" r="2" fill={STROKE} />
        <path d="M42 33 C44 35 47 35 49 33" stroke={STROKE} strokeWidth="2" strokeLinecap="round" />
        <path d="M36 42 C28 46 27 58 30 69 C34 76 54 76 60 69 C64 57 62 45 54 42 Z" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
        <path d="M30 52 L12 72 L6 74" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
        <polygon points="6,74 2,77 9,78" fill={STROKE} />
        <path d="M60 52 L78 72 L84 74" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
        <polygon points="84,74 88,77 81,78" fill={STROKE} />
      </g>

      {/* Person 4: Sitting cross-legged with slight puzzled look */}
      <g transform="translate(255, 30)">
        <path d="M42 18 C52 16 60 22 59 32 C58 42 50 45 41 44 C31 43 27 34 29 24 C30 17 35 18 42 18 Z" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
        <circle cx="39" cy="28" r="2" fill={STROKE} />
        <circle cx="48" cy="28" r="2" fill={STROKE} />
        <path d="M40 36 C43 35 47 37 49 35" stroke={STROKE} strokeWidth="2" strokeLinecap="round" />
        <path d="M36 44 C28 48 27 60 30 71 C34 78 54 78 60 71 C64 59 62 47 54 44 Z" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
        {/* Cross-legged knees */}
        <path d="M26 68 L36 78 L48 78 L58 68" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" fill="none" />
        <path d="M28 54 L20 68" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      </g>

      {/* Person 5 (Far Right): Looking sideways with arm forward */}
      <g transform="translate(325, 28)">
        <path d="M42 18 C52 16 60 22 59 32 C58 42 50 45 41 44 C31 43 27 34 29 24 C30 17 35 18 42 18 Z" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
        <circle cx="43" cy="28" r="2" fill={STROKE} />
        <circle cx="50" cy="28" r="2" fill={STROKE} />
        <path d="M44 35 C46 36 49 36 51 34" stroke={STROKE} strokeWidth="2" strokeLinecap="round" />
        <path d="M36 44 C28 48 27 60 30 71 C34 78 54 78 60 71 C64 59 62 47 54 44 Z" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
        <path d="M54 52 L62 72 L66 76" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
        <path d="M32 54 L24 72" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      </g>
    </svg>
  );
}

// ── MAIN DISPATCHER ──
export type DoodleState = "idle" | "thinking" | "processing" | "searching" | "speaking" | "success" | "error" | "waiting";

interface UmuDoodleProps {
  state: DoodleState;
  className?: string;
}

export default function UmuDoodle({ state, className = "" }: UmuDoodleProps) {
  const size = `w-16 h-16 md:w-20 md:h-20 ${className}`;

  switch (state) {
    case "thinking":
    case "processing":
      return <DoodleThinking className={size} />;
    case "searching":
      return <DoodleSearching className={size} />;
    case "speaking":
      return <DoodleSpeaking className={size} />;
    case "success":
      return <DoodleSuccess className={size} />;
    case "error":
      return <DoodleError className={size} />;
    case "idle":
    case "waiting":
    default:
      return <DoodleIdle className={size} />;
  }
}
