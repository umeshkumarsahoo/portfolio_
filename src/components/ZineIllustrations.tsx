import React from "react";

// Signature Palette from the user's reference image:
// - Slate Petrol Blue: #385D73 / #2E5066
// - Charcoal Ink: #181818
// - White: #FFFFFF
// - Soft Sea Tint: #8DA2AF
// - Muted Paper: #F4F1EA

interface IllustrationProps {
  className?: string;
  inverted?: boolean;
}

/**
 * Panel 1: Cozy Desk Scene (Character at desk with computer, screen, plant, books, lamp, stool)
 * Matching Panel 1 (top-left) from the user's reference image.
 */
export function DeskSceneIllustration({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Floor line */}
      <line x1="20" y1="180" x2="260" y2="180" stroke="#181818" strokeWidth="2.2" strokeLinecap="round" />

      {/* Desk */}
      <path d="M70 140 L210 140" stroke="#181818" strokeWidth="3" strokeLinecap="round" />
      <line x1="85" y1="140" x2="85" y2="180" stroke="#181818" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="195" y1="140" x2="195" y2="180" stroke="#181818" strokeWidth="2.5" strokeLinecap="round" />

      {/* Desk drawers under right side */}
      <rect x="165" y="142" width="30" height="35" rx="2" stroke="#181818" strokeWidth="2" fill="#FFFFFF" />
      <line x1="165" y1="154" x2="195" y2="154" stroke="#181818" strokeWidth="1.8" />
      <line x1="165" y1="166" x2="195" y2="166" stroke="#181818" strokeWidth="1.8" />
      <circle cx="180" cy="148" r="1.5" fill="#181818" />
      <circle cx="180" cy="160" r="1.5" fill="#181818" />
      <circle cx="180" cy="172" r="1.5" fill="#181818" />

      {/* Computer monitor */}
      <rect x="110" y="85" width="55" height="42" rx="3" stroke="#181818" strokeWidth="2.4" fill="#FFFFFF" />
      <line x1="137" y1="127" x2="137" y2="140" stroke="#181818" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="126" y1="140" x2="148" y2="140" stroke="#181818" strokeWidth="2.5" strokeLinecap="round" />
      {/* Code / window lines on screen */}
      <line x1="117" y1="96" x2="135" y2="96" stroke="#385D73" strokeWidth="2" strokeLinecap="round" />
      <line x1="117" y1="103" x2="152" y2="103" stroke="#181818" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
      <line x1="117" y1="110" x2="145" y2="110" stroke="#181818" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
      <line x1="117" y1="117" x2="138" y2="117" stroke="#181818" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />

      {/* Desk lamp on left */}
      <path d="M78 140 C75 110 82 85 96 75" stroke="#181818" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M93 72 L105 82 L98 87 Z" fill="#385D73" stroke="#181818" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Warm lamp glow rays */}
      <line x1="99" y1="88" x2="104" y2="98" stroke="#385D73" strokeWidth="1.2" strokeDasharray="2 3" opacity="0.6" />
      <line x1="104" y1="87" x2="114" y2="95" stroke="#385D73" strokeWidth="1.2" strokeDasharray="2 3" opacity="0.6" />

      {/* Coffee mug with gentle steam */}
      <rect x="98" y="128" width="8" height="11" rx="1.5" stroke="#181818" strokeWidth="1.8" fill="#FFFFFF" />
      <path d="M106 131 C108 131 109 133 109 135 C109 137 108 138 106 138" stroke="#181818" strokeWidth="1.5" fill="none" />
      <path d="M101 124 C100 120 103 118 102 115" stroke="#8DA2AF" strokeWidth="1.2" strokeLinecap="round" fill="none" />

      {/* Books stack on desk */}
      <rect x="172" y="128" width="22" height="4" rx="1" stroke="#181818" strokeWidth="1.5" fill="#385D73" fillOpacity="0.3" />
      <rect x="174" y="124" width="19" height="4" rx="1" stroke="#181818" strokeWidth="1.5" fill="#FFFFFF" />
      <rect x="175" y="120" width="16" height="4" rx="1" stroke="#181818" strokeWidth="1.5" fill="#385D73" />

      {/* Potted plant beside desk on right */}
      <path d="M216 180 L219 162 L231 162 L234 180 Z" stroke="#181818" strokeWidth="2" fill="#FFFFFF" />
      <path d="M225 162 C223 150 220 142 215 136" stroke="#181818" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M225 162 C227 148 232 142 238 138" stroke="#181818" strokeWidth="1.8" strokeLinecap="round" />
      {/* Leaves */}
      <path d="M215 136 C210 134 210 140 215 140 Z" fill="#385D73" stroke="#181818" strokeWidth="1.2" />
      <path d="M238 138 C243 136 243 142 238 142 Z" fill="#385D73" stroke="#181818" strokeWidth="1.2" />
      <circle cx="225" cy="148" r="4" fill="#385D73" fillOpacity="0.2" />

      {/* Stool / chair */}
      <ellipse cx="137" cy="155" rx="14" ry="4" stroke="#181818" strokeWidth="2" fill="#FFFFFF" />
      <line x1="131" y1="158" x2="126" y2="180" stroke="#181818" strokeWidth="2" strokeLinecap="round" />
      <line x1="143" y1="158" x2="148" y2="180" stroke="#181818" strokeWidth="2" strokeLinecap="round" />
      <line x1="128" y1="172" x2="146" y2="172" stroke="#181818" strokeWidth="1.5" />

      {/* Floating cozy stars/dust */}
      <circle cx="65" cy="95" r="1.5" fill="#385D73" />
      <circle cx="205" cy="90" r="1.5" fill="#385D73" />
      <path d="M152 70 L154 74 L158 74 L155 77 L156 81 L152 78 L148 81 L149 77 L146 74 L150 74 Z" fill="#385D73" opacity="0.3" transform="scale(0.8) translate(30, 20)" />
    </svg>
  );
}

/**
 * Panel 2: The Blue Botanical Flower with peaceful dreamer nestled inside.
 * Matching Panel 2 (top-right) from the user's reference image.
 */
export function BotanicalFlowerIllustration({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 200 280" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Tall curved main stem */}
      <path
        d="M102 260 C100 210 98 160 102 110 C104 85 106 65 108 45"
        stroke="#181818"
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Large iconic top petals in deep slate blue with rich ink linework */}
      {/* Center petal */}
      <path
        d="M108 45 C100 15 116 5 125 2 C132 15 122 35 112 55"
        fill="#385D73"
        stroke="#181818"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Left petal */}
      <path
        d="M106 50 C80 25 72 40 68 55 C78 72 95 68 106 62"
        fill="#2E5066"
        stroke="#181818"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Right petal */}
      <path
        d="M110 50 C135 25 145 38 148 55 C138 72 120 68 108 62"
        fill="#385D73"
        stroke="#181818"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Back petals */}
      <path
        d="M90 35 C82 12 98 8 108 22"
        fill="#2A4557"
        stroke="#181818"
        strokeWidth="1.8"
      />
      <path
        d="M125 35 C136 12 120 6 112 20"
        fill="#2A4557"
        stroke="#181818"
        strokeWidth="1.8"
      />

      {/* Petal ink ribs / lines */}
      <path d="M104 45 C90 35 80 48 76 56" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.4" strokeLinecap="round" />
      <path d="M108 42 C115 25 120 18 122 10" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.4" strokeLinecap="round" />
      <path d="M110 45 C125 35 135 46 140 56" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.4" strokeLinecap="round" />

      {/* Character curled up peacefully inside the stem/leaf */}
      <g transform="translate(100, 115)">
        {/* Curled back & black hair */}
        <path
          d="M12 -8 C22 -8 28 0 28 12 C28 24 20 30 10 30 C2 30 -2 24 -2 14 C-2 0 4 -8 12 -8 Z"
          fill="#181818"
        />
        {/* Sweet sleeping face silhouette */}
        <circle cx="20" cy="8" r="7" fill="#FFFFFF" stroke="#181818" strokeWidth="1.5" />
        {/* Black hair cap */}
        <path d="M14 6 C15 1 20 1 26 5 C25 10 22 13 18 13 Z" fill="#181818" />
        {/* Sleeping peaceful eye line */}
        <path d="M21 9 C22 10 24 10 25 9" stroke="#181818" strokeWidth="1.2" strokeLinecap="round" />
        {/* Knees pulled to chest */}
        <path d="M12 22 C16 16 22 18 20 25" stroke="#181818" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </g>

      {/* Lower leaves framing character */}
      <path
        d="M98 160 C70 145 60 165 58 185 C75 195 90 185 100 170"
        fill="#FFFFFF"
        stroke="#181818"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Leaf ribs */}
      <path d="M98 160 C80 172 70 180 62 184" stroke="#181818" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M85 168 C76 165 72 168 70 172" stroke="#181818" strokeWidth="1" strokeLinecap="round" />

      {/* Right lower leaf */}
      <path
        d="M102 185 C125 170 138 185 142 205 C126 215 112 205 104 195"
        fill="#FFFFFF"
        stroke="#181818"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M104 188 C120 196 130 202 138 204" stroke="#181818" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Panel 3: Window View (Character looking out of a clean square window)
 * Matching Panel 3 (second row, left) from the user's reference image.
 */
export function WindowGazerIllustration({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Outer thick window frame */}
      <rect x="35" y="30" width="90" height="95" rx="3" stroke="#181818" strokeWidth="3.2" fill="#FFFFFF" />
      
      {/* Inside dark room / night sky fill */}
      <rect x="42" y="37" width="76" height="81" fill="#181818" />

      {/* Crescent moon / star outside window */}
      <circle cx="98" cy="54" r="5" fill="#FFFFFF" opacity="0.9" />
      <circle cx="100" cy="53" r="4.2" fill="#181818" />
      <circle cx="56" cy="50" r="1.2" fill="#FFFFFF" opacity="0.8" />
      <circle cx="70" cy="45" r="1.2" fill="#FFFFFF" opacity="0.8" />

      {/* Character inside looking out */}
      <g transform="translate(62, 70)">
        {/* Head silhouette */}
        <circle cx="18" cy="15" r="12" fill="#FFFFFF" stroke="#181818" strokeWidth="2" />
        {/* Black hair */}
        <path d="M6 15 C6 5 14 3 24 6 C28 10 30 18 28 22 C22 18 16 16 6 15 Z" fill="#181818" />
        {/* Eye looking up to stars */}
        <circle cx="23" cy="15" r="1.5" fill="#181818" />
        {/* Small hand resting on window sill */}
        <rect x="12" y="27" width="16" height="6" rx="3" fill="#FFFFFF" stroke="#181818" strokeWidth="1.8" />
        {/* Shoulders */}
        <path d="M4 35 C10 28 26 28 32 35" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Window sill */}
      <rect x="30" y="125" width="100" height="6" rx="2" stroke="#181818" strokeWidth="2.5" fill="#FFFFFF" />
    </svg>
  );
}

/**
 * Panel 4: The Trio of Whimsical Friends on Deep Slate Blue
 * Matching Panel 4 (second row, right) from the user's reference image.
 */
export function TrioFriendsIllustration({ className = "", inverted = true }: IllustrationProps) {
  const lineCol = inverted ? "#FFFFFF" : "#181818";
  const bodyCol = "#FFFFFF";

  return (
    <svg viewBox="0 0 260 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Ground ledge */}
      <rect x="30" y="150" width="200" height="8" rx="2" fill={bodyCol} stroke={lineCol} strokeWidth="2.5" />

      {/* ── Friend 1 (Left): Character with water/bubbles floating above head ── */}
      <g transform="translate(42, 60)">
        {/* Head */}
        <circle cx="25" cy="30" r="15" fill={bodyCol} stroke="#181818" strokeWidth="2.4" />
        {/* Hair */}
        <path d="M12 25 C14 16 26 14 36 20 C38 28 34 35 28 35 C20 35 15 30 12 25 Z" fill="#181818" />
        {/* Eyes & smile */}
        <circle cx="21" cy="30" r="1.8" fill="#181818" />
        <circle cx="29" cy="30" r="1.8" fill="#181818" />
        <path d="M23 36 C25 38 27 38 29 36" stroke="#181818" strokeWidth="1.8" strokeLinecap="round" />
        {/* Torso in white tee */}
        <path d="M12 45 L38 45 L40 90 L10 90 Z" fill={bodyCol} stroke="#181818" strokeWidth="2.4" />
        {/* Bubbles floating above */}
        <circle cx="25" cy="-2" r="4.5" fill="none" stroke={lineCol} strokeWidth="1.8" />
        <circle cx="34" cy="5" r="3" fill="none" stroke={lineCol} strokeWidth="1.5" />
        <circle cx="16" cy="8" r="2.5" fill="none" stroke={lineCol} strokeWidth="1.5" />
      </g>

      {/* ── Friend 2 (Center): Glasses-wearing thinker/engineer ── */}
      <g transform="translate(105, 50)">
        {/* Head */}
        <circle cx="25" cy="30" r="16" fill={bodyCol} stroke="#181818" strokeWidth="2.4" />
        {/* Tousled wavy hair */}
        <path d="M10 25 C10 12 22 8 35 10 C42 16 42 28 38 32 C30 25 18 25 10 25 Z" fill="#181818" />
        {/* Big cute round glasses */}
        <circle cx="19" cy="30" r="5" stroke="#181818" strokeWidth="1.8" fill="none" />
        <circle cx="31" cy="30" r="5" stroke="#181818" strokeWidth="1.8" fill="none" />
        <line x1="24" y1="30" x2="26" y2="30" stroke="#181818" strokeWidth="1.8" />
        {/* Eyes behind glasses */}
        <circle cx="19" cy="30" r="1.5" fill="#181818" />
        <circle cx="31" cy="30" r="1.5" fill="#181818" />
        {/* Smile */}
        <path d="M22 38 C25 40 27 40 29 38" stroke="#181818" strokeWidth="1.8" strokeLinecap="round" />
        {/* Dark sweater */}
        <path d="M10 46 L40 46 L42 100 L8 100 Z" fill="#181818" stroke="#181818" strokeWidth="2.4" />
        <line x1="25" y1="46" x2="25" y2="100" stroke="#FFFFFF" strokeWidth="1" opacity="0.3" />
      </g>

      {/* ── Friend 3 (Right): Brushing teeth playfully ── */}
      <g transform="translate(165, 55)">
        {/* Head */}
        <circle cx="25" cy="30" r="15" fill={bodyCol} stroke="#181818" strokeWidth="2.4" />
        {/* Short bob hair */}
        <path d="M11 25 C12 14 24 12 36 15 C41 24 39 36 37 40 C34 32 20 28 11 25 Z" fill="#181818" />
        {/* Eye winking & smiling eye */}
        <path d="M18 29 L23 29" stroke="#181818" strokeWidth="2" strokeLinecap="round" />
        <circle cx="31" cy="29" r="1.8" fill="#181818" />
        {/* Toothbrush in mouth with frothy bubbles */}
        <line x1="12" y1="36" x2="35" y2="36" stroke="#385D73" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="25" cy="35" r="3" fill="#FFFFFF" stroke="#181818" strokeWidth="1.2" />
        <circle cx="28" cy="38" r="2.5" fill="#FFFFFF" stroke="#181818" strokeWidth="1.2" />
        {/* Torso in white tee */}
        <path d="M12 45 L38 45 L40 95 L10 95 Z" fill={bodyCol} stroke="#181818" strokeWidth="2.4" />
      </g>
    </svg>
  );
}

/**
 * Panel 5: Twilight Sea Horizon with calm contemplative character
 * Matching Panel 5 (third row, left) from the user's reference image.
 */
export function TwilightSeaIllustration({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Twilight cloudy sky */}
      <rect x="0" y="0" width="280" height="120" fill="#E2E7EA" />
      {/* Soft grey cloud layers */}
      <path d="M0 60 C40 50 80 65 140 55 C200 45 240 60 280 50 L280 120 L0 120 Z" fill="#C5D1D8" />
      <path d="M0 80 C60 75 110 85 170 78 C220 70 250 82 280 75 L280 120 L0 120 Z" fill="#A8BAC5" />

      {/* Sea Horizon in Deep Slate Petrol Blue */}
      <rect x="0" y="120" width="280" height="80" fill="#385D73" />
      {/* Distant islands on horizon */}
      <path d="M180 120 C195 110 220 110 240 120 Z" fill="#243C4A" />
      <path d="M230 120 C245 114 265 114 275 120 Z" fill="#243C4A" />

      {/* Glistening wave highlights */}
      <ellipse cx="60" cy="140" rx="10" ry="2" fill="#FFFFFF" opacity="0.8" />
      <ellipse cx="140" cy="135" rx="15" ry="2.5" fill="#FFFFFF" opacity="0.9" />
      <ellipse cx="190" cy="145" rx="8" ry="1.8" fill="#FFFFFF" opacity="0.7" />
      <ellipse cx="230" cy="138" rx="12" ry="2" fill="#FFFFFF" opacity="0.8" />
      <ellipse cx="110" cy="155" rx="14" ry="2.2" fill="#FFFFFF" opacity="0.85" />
      <ellipse cx="170" cy="165" rx="18" ry="2.5" fill="#FFFFFF" opacity="0.75" />

      {/* Character in foreground (left) with black hair and eyes closed */}
      <g transform="translate(10, 65)">
        {/* Black shirt / torso */}
        <path d="M15 135 L120 135 L110 80 L30 80 Z" fill="#181818" />
        {/* Cross-body bag strap */}
        <line x1="38" y1="80" x2="95" y2="135" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
        {/* Face */}
        <circle cx="65" cy="50" r="28" fill="#FFFFFF" stroke="#181818" strokeWidth="3" />
        {/* Jet-black anime hair */}
        <path
          d="M38 52 C35 30 50 15 72 15 C95 15 102 32 98 56 C88 40 76 38 64 42 C54 44 46 50 38 52 Z"
          fill="#181818"
        />
        {/* Bangs falling over forehead */}
        <path d="M62 25 L65 42 L68 28 Z" fill="#181818" />
        <path d="M72 26 L76 46 L80 29 Z" fill="#181818" />
        {/* Peaceful closed eyes (curved lines) */}
        <path d="M52 50 C55 53 60 53 63 50" stroke="#181818" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M72 50 C75 53 80 53 83 50" stroke="#181818" strokeWidth="2.2" strokeLinecap="round" />
        {/* Calm mouth */}
        <line x1="65" y1="62" x2="71" y2="62" stroke="#181818" strokeWidth="2" strokeLinecap="round" />
        {/* Earphone in ear */}
        <circle cx="94" cy="52" r="3" fill="#FFFFFF" stroke="#181818" strokeWidth="2" />
        <path d="M94 55 L94 72" stroke="#181818" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/**
 * Panel 6: Daily Objects (Coffee beans / egg + spoon & pill blister pack / calendar)
 * Matching Panel 6 (third row, right) from the user's reference image.
 */
export function CoffeeAndPillsIllustration({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 240 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* ── Left Object: Coffee Beans / Boiled Egg & Spoon ── */}
      <g transform="translate(15, 20)">
        {/* Two coffee beans / egg halves */}
        <ellipse cx="25" cy="40" rx="14" ry="18" stroke="#181818" strokeWidth="2.2" fill="#FFFFFF" transform="rotate(-15 25 40)" />
        <path d="M21 26 C23 35 27 45 29 54" stroke="#181818" strokeWidth="1.8" strokeLinecap="round" />

        <ellipse cx="50" cy="42" rx="13" ry="17" stroke="#181818" strokeWidth="2.2" fill="#FFFFFF" transform="rotate(15 50 42)" />
        <path d="M52 28 C50 37 46 47 44 56" stroke="#181818" strokeWidth="1.8" strokeLinecap="round" />

        {/* Small spoon */}
        <path
          d="M75 25 C79 23 85 28 85 35 C85 42 79 47 75 45 L72 75 L70 75 Z"
          stroke="#181818"
          strokeWidth="2"
          fill="#FFFFFF"
          strokeLinejoin="round"
        />
      </g>

      {/* Divider */}
      <line x1="120" y1="15" x2="120" y2="105" stroke="#E5E0D5" strokeWidth="1" strokeDasharray="3 3" />

      {/* ── Right Object: Pill Blister Pack / Daily Tracker ── */}
      <g transform="translate(135, 20)">
        {/* Blister pack rectangle */}
        <rect x="10" y="15" width="75" height="55" rx="3" stroke="#181818" strokeWidth="2.4" fill="#FFFFFF" />
        {/* Grid lines */}
        <line x1="10" y1="33" x2="85" y2="33" stroke="#181818" strokeWidth="1.5" />
        <line x1="10" y1="51" x2="85" y2="51" stroke="#181818" strokeWidth="1.5" />
        <line x1="47" y1="15" x2="47" y2="70" stroke="#181818" strokeWidth="1.5" />

        {/* Labels & small blister domes */}
        <text x="22" y="27" fontSize="8" fontFamily="monospace" fontWeight="bold" fill="#385D73">AM</text>
        <text x="60" y="27" fontSize="8" fontFamily="monospace" fontWeight="bold" fill="#385D73">PM</text>

        <circle cx="28" cy="42" r="4.5" fill="#385D73" opacity="0.3" stroke="#181818" strokeWidth="1.2" />
        <circle cx="66" cy="42" r="4.5" fill="#385D73" opacity="0.3" stroke="#181818" strokeWidth="1.2" />

        <circle cx="28" cy="60" r="4.5" fill="#385D73" stroke="#181818" strokeWidth="1.2" />
        <circle cx="66" cy="60" r="4.5" fill="#385D73" stroke="#181818" strokeWidth="1.2" />
      </g>
    </svg>
  );
}

/**
 * Panel 7: The Introspective Silhouette (Curled on floor with knees to chest)
 * Matching Panel 7 (bottom-left) from the user's reference image.
 */
export function CurledSilhouetteIllustration({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 180 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Floor line */}
      <line x1="20" y1="175" x2="160" y2="175" stroke="#181818" strokeWidth="1.8" strokeDasharray="3 3" opacity="0.4" />

      {/* Introspective character curled sitting */}
      <g transform="translate(45, 40)">
        {/* Head with delicate hair */}
        <circle cx="40" cy="30" r="14" fill="#FFFFFF" stroke="#181818" strokeWidth="2.4" />
        {/* Short messy bob hair falling forward */}
        <path
          d="M26 30 C26 15 36 12 48 14 C56 18 56 30 52 38 C45 32 35 32 26 30 Z"
          fill="#181818"
        />
        {/* Profile looking down at folded arms */}
        <path d="M42 34 L45 34" stroke="#181818" strokeWidth="1.5" strokeLinecap="round" />

        {/* Black sweater / torso curled forward */}
        <path
          d="M30 44 C20 50 15 65 20 85 L35 120 L58 120 L50 80 C50 60 45 48 30 44 Z"
          fill="#181818"
        />

        {/* Arms wrapped around pulled-up knees */}
        <path
          d="M32 58 C45 62 65 75 70 95 C65 105 45 110 35 110"
          stroke="#181818"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />

        {/* Legs / knees pulled tightly to chest */}
        <path
          d="M48 118 L70 92 C74 92 78 98 75 106 L55 125 Z"
          fill="#181818"
        />

        {/* Bare feet on the floor */}
        <ellipse cx="62" cy="126" rx="8" ry="3.5" fill="#FFFFFF" stroke="#181818" strokeWidth="1.8" />
      </g>
    </svg>
  );
}

/**
 * Panel 8: The Striking Profile Looking Upward on Solid Slate Blue
 * Matching Panel 8 (bottom-right) from the user's reference image.
 */
export function GazingProfileIllustration({ className = "", inverted = true }: IllustrationProps) {
  const lineCol = inverted ? "#FFFFFF" : "#181818";

  return (
    <svg viewBox="0 0 240 260" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Striking white silhouette of girl's face in profile looking up */}
      <g transform="translate(30, 20)">
        {/* Face profile mask in pure white */}
        <path
          d="M95 50 C90 40 80 42 75 48 C70 56 65 65 65 78 C65 92 72 105 82 115 C75 120 72 135 78 150 C85 168 105 185 125 200 L170 200 L170 40 Z"
          fill="#FFFFFF"
        />

        {/* Jet-black hair flowing behind and down */}
        <path
          d="M85 45 C70 30 50 45 42 70 C34 95 30 130 35 170 C40 200 55 220 70 230 L170 230 L170 200 C140 200 110 180 95 155 C90 145 92 135 96 125 C102 110 98 90 85 45 Z"
          fill="#181818"
        />

        {/* Clean, gentle profile line: forehead, nose tilted upward, lips, chin */}
        <path
          d="M75 50 C70 60 67 68 65 75 C64 78 61 80 60 84 C62 86 64 87 64 89 C63 92 62 94 65 96 C67 98 67 102 65 106 C63 112 70 120 78 126 C86 132 92 145 95 160"
          stroke={lineCol}
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Eye looking upward into the light */}
        <path d="M72 76 C74 72 78 72 80 76" stroke="#181818" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="76" cy="74" r="1.5" fill="#181818" />

        {/* Delicate eyebrow tilted with wonder */}
        <path d="M70 68 C74 65 80 66 84 70" stroke="#181818" strokeWidth="1.6" strokeLinecap="round" />

        {/* Soft parted mouth looking upward */}
        <path d="M64 92 C67 94 70 94 72 92" stroke="#181818" strokeWidth="1.8" strokeLinecap="round" />

        {/* Star / ray of inspiration glowing above */}
        <circle cx="60" cy="25" r="3" fill="#FFFFFF" />
        <line x1="60" y1="12" x2="60" y2="38" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        <line x1="47" y1="25" x2="73" y2="25" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        <circle cx="95" cy="18" r="1.5" fill="#FFFFFF" opacity="0.7" />
        <circle cx="40" cy="40" r="1.5" fill="#FFFFFF" opacity="0.7" />
      </g>
    </svg>
  );
}
