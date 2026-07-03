import React from "react";
import { motion } from "framer-motion";

/**
 * SaafHisaabLogo
 *
 * Standalone, reusable balance-scale logo.
 * - Works as a static mark (animated={false}) for navbars, favicons, app icons, etc.
 * - Works as an animated draw-in + settle mark (animated={true}) for splash/loading screens.
 *
 * Props:
 *  size        - px size, renders a square (default 144)
 *  animated    - whether to play the draw-in + tilt-settle animation (default false)
 *  primary     - main stroke color, white parts (default "#FFFFFF")
 *  accent      - blue accent color, post + pans (default "#38bdf8")
 *  background  - fill behind the pivot ring, useful on dark/light bg (default "transparent")
 */
export default function SaafHisaabLogo({
  size = 144,
  animated = false,
  primary = "#FFFFFF",
  accent = "#38bdf8",
  background = "transparent",
}) {
  // Static (non-animated) version — plain SVG, zero motion overhead.
  if (!animated) {
    return (
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        role="img"
        aria-label="SaafHisaab logo"
      >
        <circle cx="100" cy="34" r="13" stroke={accent} strokeWidth="6" fill={background} />
        <circle cx="100" cy="34" r="5" fill={primary} />
        <line x1="100" y1="46" x2="100" y2="163" stroke={accent} strokeWidth="9" strokeLinecap="round" />
        <line x1="78" y1="172" x2="122" y2="172" stroke={primary} strokeWidth="7" strokeLinecap="round" />
        <line x1="64" y1="180" x2="136" y2="180" stroke={primary} strokeWidth="7" strokeLinecap="round" />
        <line x1="38" y1="68" x2="162" y2="68" stroke={primary} strokeWidth="8" strokeLinecap="round" />
        <path d="M55 68 L33 122 M55 68 L80 122" stroke={primary} strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M28 122 Q56 150 85 122" stroke={accent} strokeWidth="7" strokeLinecap="round" fill="none" />
        <path d="M145 68 L120 122 M145 68 L167 122" stroke={primary} strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M115 122 Q144 150 172 122" stroke={accent} strokeWidth="7" strokeLinecap="round" fill="none" />
      </svg>
    );
  }

  // Animated version — draws in, then the beam tilts and settles to balance.
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label="SaafHisaab logo"
    >
      {/* Pivot ring */}
      <motion.circle
        cx="100" cy="34" r="13"
        stroke={accent} strokeWidth="6" fill={background}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.45, type: "spring", bounce: 0.5 }}
        style={{ transformOrigin: "100px 34px" }}
      />
      <motion.circle
        cx="100" cy="34" r="5" fill={primary}
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.4, 1] }}
        transition={{ delay: 0.12, duration: 0.35 }}
        style={{ transformOrigin: "100px 34px" }}
      />

      {/* Central post */}
      <motion.line
        x1="100" y1="46" x2="100" y2="163"
        stroke={accent} strokeWidth="9" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.15, duration: 0.5, ease: "easeInOut" }}
      />

      {/* Base */}
      <motion.line
        x1="78" y1="172" x2="122" y2="172"
        stroke={primary} strokeWidth="7" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.6, duration: 0.25 }}
      />
      <motion.line
        x1="64" y1="180" x2="136" y2="180"
        stroke={primary} strokeWidth="7" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.68, duration: 0.25 }}
      />

      {/* Beam + arms tilt together, like a scale settling to balance */}
      <motion.g
        initial={{ rotate: -10 }}
        animate={{ rotate: [-10, 8, -4, 2, 0] }}
        transition={{ delay: 0.35, duration: 1.1, ease: "easeOut", times: [0, 0.35, 0.6, 0.8, 1] }}
        style={{ transformOrigin: "100px 68px" }}
      >
        <motion.line
          x1="38" y1="68" x2="162" y2="68"
          stroke={primary} strokeWidth="8" strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.2, duration: 0.4, ease: "easeInOut" }}
        />

        {/* Left arm + pan */}
        <motion.path
          d="M55 68 L33 122 M55 68 L80 122"
          stroke={primary} strokeWidth="5" strokeLinecap="round" fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.35, ease: "easeOut" }}
        />
        <motion.path
          d="M28 122 Q56 150 85 122"
          stroke={accent} strokeWidth="7" strokeLinecap="round" fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.65, duration: 0.3, ease: "easeOut" }}
        />

        {/* Right arm + pan */}
        <motion.path
          d="M145 68 L120 122 M145 68 L167 122"
          stroke={primary} strokeWidth="5" strokeLinecap="round" fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.35, ease: "easeOut" }}
        />
        <motion.path
          d="M115 122 Q144 150 172 122"
          stroke={accent} strokeWidth="7" strokeLinecap="round" fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.65, duration: 0.3, ease: "easeOut" }}
        />
      </motion.g>
    </svg>
  );
}