import React from 'react';

interface AegisLogoProps {
  size?: number;
  className?: string;
  animated?: boolean;
}


/**
 * AegisLogo — Custom SVG shield logo component.
 * Layered hexagonal-backed shield with glowing neon teal sword core.
 * Military-grade futuristic aesthetic for the Aegis proctoring platform.
 */
export const AegisLogo: React.FC<AegisLogoProps> = ({ size = 32, className = '', animated = false }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${animated ? 'animate-aegis-pulse' : ''} ${className}`}
      aria-label="Aegis Logo"
    >
      <defs>
        {/* Outer shield glow gradient */}
        <linearGradient id="aegis-shield-grad" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#312e81" />
        </linearGradient>

        {/* Inner fill gradient */}
        <linearGradient id="aegis-inner-grad" x1="16" y1="4" x2="16" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#0d0d1f" />
        </linearGradient>

        {/* Sword/blade glow gradient */}
        <linearGradient id="aegis-sword-grad" x1="16" y1="7" x2="16" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="50%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0891b2" stopOpacity="0.4" />
        </linearGradient>

        {/* Teal glow filter for sword */}
        <filter id="aegis-glow" x="-50%" y="-20%" width="200%" height="140%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Shield edge glow */}
        <filter id="aegis-shield-glow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Outer shield path (hex-backed shield shape) ── */}
      <path
        d="M16 2L4 7v9c0 6.5 5.2 10.8 12 13 6.8-2.2 12-6.5 12-13V7L16 2Z"
        fill="url(#aegis-shield-grad)"
        filter="url(#aegis-shield-glow)"
        opacity="0.95"
      />

      {/* Thin border highlight on shield */}
      <path
        d="M16 3.2L5 7.8v8.2c0 5.9 4.8 9.9 11 12 6.2-2.1 11-6.1 11-12V7.8L16 3.2Z"
        fill="none"
        stroke="#818cf8"
        strokeWidth="0.5"
        opacity="0.6"
      />

      {/* ── Inner shield fill ── */}
      <path
        d="M16 5L6 9.5V16c0 5 3.8 8.3 10 10.5C22.2 24.3 26 21 26 16V9.5L16 5Z"
        fill="url(#aegis-inner-grad)"
      />

      {/* ── Wing marks (left) ── */}
      <path
        d="M10 14 L8 12.5 L9 16.5 L11 15.5Z"
        fill="#6366f1"
        opacity="0.5"
      />
      <path
        d="M10.5 17 L8.5 16 L9.5 19.5 L11 18.5Z"
        fill="#4f46e5"
        opacity="0.35"
      />

      {/* ── Wing marks (right) ── */}
      <path
        d="M22 14 L24 12.5 L23 16.5 L21 15.5Z"
        fill="#6366f1"
        opacity="0.5"
      />
      <path
        d="M21.5 17 L23.5 16 L22.5 19.5 L21 18.5Z"
        fill="#4f46e5"
        opacity="0.35"
      />

      {/* ── Horizontal cross-guard ── */}
      <rect
        x="13"
        y="15"
        width="6"
        height="1"
        rx="0.5"
        fill="#22d3ee"
        filter="url(#aegis-glow)"
        opacity="0.9"
      />

      {/* ── Central sword blade ── */}
      <rect
        x="15.3"
        y="8"
        width="1.4"
        height="12"
        rx="0.7"
        fill="url(#aegis-sword-grad)"
        filter="url(#aegis-glow)"
      />

      {/* ── Sword tip (diamond point) ── */}
      <polygon
        points="16,7 15,8.8 16,8.4 17,8.8"
        fill="#67e8f9"
        filter="url(#aegis-glow)"
      />

      {/* ── Pommel ── */}
      <rect
        x="14.5"
        y="20"
        width="3"
        height="1.2"
        rx="0.6"
        fill="#22d3ee"
        filter="url(#aegis-glow)"
        opacity="0.8"
      />

      {/* ── Center glow dot (active state indicator) ── */}
      <circle
        cx="16"
        cy="15.5"
        r="0.6"
        fill="#67e8f9"
        filter="url(#aegis-glow)"
        opacity="0.95"
      />
    </svg>
  );
};

export default AegisLogo;
