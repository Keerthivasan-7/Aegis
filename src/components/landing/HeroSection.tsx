import React from 'react';
import { motion } from 'motion/react';

// ── CyberGuardian radar widget ──────────────────────────────────────────────
const CyberGuardian: React.FC = () => (
  <div className="relative w-full max-w-[420px] mx-auto aspect-square">
    {/* Ambient glow */}
    <div className="absolute inset-0 rounded-full bg-blue-600/10 blur-3xl" />
    <svg viewBox="0 0 400 400" className="w-full h-full relative z-10">
      <defs>
        <radialGradient id="radar-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#0f2044" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#020617" stopOpacity="1" />
        </radialGradient>
        <radialGradient id="sweep-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(59,130,246,0.35)" />
          <stop offset="100%" stopColor="rgba(59,130,246,0)" />
        </radialGradient>
        <filter id="radar-glow">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* Outer frame */}
      <circle cx="200" cy="200" r="195" fill="url(#radar-bg)" stroke="rgba(59,130,246,0.25)" strokeWidth="1" />
      {/* Concentric rings */}
      {[160,120,80,40].map(r => (
        <circle key={r} cx="200" cy="200" r={r} fill="none"
          stroke="rgba(59,130,246,0.12)" strokeWidth="1"
          strokeDasharray={r > 80 ? '4 10' : '2 6'} />
      ))}
      {/* Cross-hair */}
      <line x1="10"  y1="200" x2="390" y2="200" stroke="rgba(59,130,246,0.07)" strokeWidth="1" />
      <line x1="200" y1="10"  x2="200" y2="390" stroke="rgba(59,130,246,0.07)" strokeWidth="1" />
      {/* Diagonal dividers */}
      {[45,135,225,315].map(a => {
        const rad = (a * Math.PI) / 180;
        return <line key={a} x1={200} y1={200} x2={200+185*Math.cos(rad)} y2={200+185*Math.sin(rad)}
          stroke="rgba(59,130,246,0.05)" strokeWidth="1" />;
      })}
      {/* Rotating sweep */}
      <g style={{ transformOrigin: '200px 200px' }} className="animate-radar-sweep">
        <path d="M200 200 L200 40 A160 160 0 0 1 240 48 Z" fill="url(#sweep-grad)" opacity="0.7" />
        <line x1="200" y1="200" x2="200" y2="40" stroke="rgba(59,130,246,0.9)" strokeWidth="1.5" filter="url(#radar-glow)" />
      </g>
      {/* Slow ring */}
      <circle cx="200" cy="200" r="170" fill="none" stroke="rgba(45,212,191,0.08)" strokeWidth="1.5" strokeDasharray="12 20"
        style={{ transformOrigin:'200px 200px', animation:'radar-sweep 12s linear infinite' }} />
      {/* Data blips */}
      {[[270,130],[160,250],[300,280],[130,150],[240,310]].map(([x,y],i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="4" fill={i===2 ? '#ef4444' : i===1 ? '#f59e0b' : '#2dd4bf'}
            opacity="0.9" filter="url(#radar-glow)" className="animate-pulse" style={{ animationDelay:`${i*0.4}s` }} />
          <circle cx={x} cy={y} r="8" fill="none" stroke={i===2 ? '#ef4444' : '#2dd4bf'} strokeWidth="0.5" opacity="0.3" />
        </g>
      ))}
      {/* Head silhouette */}
      <ellipse cx="200" cy="190" rx="28" ry="34" fill="rgba(45,212,191,0.08)" stroke="rgba(45,212,191,0.35)" strokeWidth="1" />
      <path d="M175 215 Q200 235 225 215" fill="none" stroke="rgba(45,212,191,0.25)" strokeWidth="1" />
      <circle cx="190" cy="183" r="5" fill="rgba(45,212,191,0.25)" />
      <circle cx="210" cy="183" r="5" fill="rgba(45,212,191,0.25)" />
      {/* Gaze lines */}
      <line x1="185" y1="183" x2="160" y2="175" stroke="rgba(59,130,246,0.5)" strokeWidth="1" />
      <line x1="215" y1="183" x2="240" y2="175" stroke="rgba(59,130,246,0.5)" strokeWidth="1" />
      {/* Coordinate labels */}
      {[['10',  200, 12],['190', 10, 200],['350', 200, 395],['190', 390, 200]].map(([t,x,y],i)=>(
        <text key={i} x={x} y={y} fill="rgba(59,130,246,0.4)" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">{t}</text>
      ))}
      {/* Telemetry callouts */}
      <g>
        <rect x="268" y="100" width="100" height="20" rx="3" fill="rgba(5,11,24,0.9)" stroke="rgba(45,212,191,0.3)" strokeWidth="0.5" />
        <text x="273" y="114" fill="rgba(45,212,191,0.8)" fontSize="8" fontFamily="JetBrains Mono">GAZE OK — FORWARD</text>
      </g>
      <g>
        <rect x="20" y="240" width="110" height="20" rx="3" fill="rgba(5,11,24,0.9)" stroke="rgba(239,68,68,0.5)" strokeWidth="0.5" />
        <text x="25" y="254" fill="rgba(239,68,68,0.9)" fontSize="8" fontFamily="JetBrains Mono">⚠ GAZE DEFLECT 18°</text>
      </g>
      <g>
        <rect x="240" y="298" width="120" height="20" rx="3" fill="rgba(5,11,24,0.9)" stroke="rgba(245,158,11,0.4)" strokeWidth="0.5" />
        <text x="245" y="312" fill="rgba(245,158,11,0.9)" fontSize="8" fontFamily="JetBrains Mono">SND: 22dB — ALERT</text>
      </g>
    </svg>
    {/* Status chips */}
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
      {['4 ACTIVE','TRUST 94.2%','SECURE'].map((t,i)=>(
        <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-full glass border border-blue-500/20 text-blue-400">{t}</span>
      ))}
    </div>
  </div>
);

const HeroSection: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => (
  <section className="relative min-h-screen flex items-center overflow-hidden">
    {/* Aurora blobs */}
    <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-600/8 blur-[120px] animate-aurora pointer-events-none" />
    <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-cyan-500/6 blur-[100px] animate-aurora pointer-events-none" style={{ animationDelay: '5s' }} />

    <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
      {/* Left copy */}
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-mono text-cyan-400 tracking-widest">CONTINUOUS VERIFICATION ENGINE</span>
        </div>
        <h1 className="font-display text-5xl xl:text-6xl font-bold text-slate-100 leading-[1.05] tracking-tight mb-6">
          The Future of{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 text-glow-blue">
            Secure
          </span>{' '}
          Technical Assessment
        </h1>
        <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-lg">
          Continuous browser-based biometric verification, real-time Gemini AI proctoring,
          and cryptographic evaluation — all running silently in the candidate's own browser.
        </p>
        <div className="flex flex-wrap gap-3 mb-10">
          <button
            onClick={onGetStarted}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all shadow-xl shadow-blue-600/25 cursor-pointer glow-blue"
          >
            Launch Demo Console →
          </button>
          <a href="#features" className="px-6 py-3 rounded-xl border border-slate-700 text-slate-300 hover:border-blue-500/40 hover:text-slate-100 font-semibold transition-all cursor-pointer">
            See How It Works
          </a>
        </div>
        {/* Trust stats */}
        <div className="flex gap-6 text-sm">
          {[['99.8%','Detection Accuracy'],['< 2ms','Telemetry Latency'],['Zero','External Dependencies']].map(([v,l])=>(
            <div key={l}>
              <div className="font-display font-bold text-blue-400 text-xl">{v}</div>
              <div className="text-slate-500 text-xs">{l}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Right — Radar widget */}
      <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }}>
        <CyberGuardian />
      </motion.div>
    </div>
  </section>
);

export default HeroSection;
