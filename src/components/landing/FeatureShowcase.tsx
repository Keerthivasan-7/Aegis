import React, { useState } from 'react';
import { CheckCircle, Eye, Volume2, User } from 'lucide-react';

// Animated face mesh SVG fallback
const FaceMeshCamera: React.FC = () => (
  <div className="relative w-full h-full bg-[#020f1f] overflow-hidden">
    <svg viewBox="0 0 300 360" className="w-full h-full opacity-85">
      <defs>
        <radialGradient id="cam-bg" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#0a2040" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#020617" />
        </radialGradient>
        <filter id="cam-glow"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="300" height="360" fill="url(#cam-bg)" />
      {/* Face outline */}
      <ellipse cx="150" cy="168" rx="80" ry="100" fill="none" stroke="rgba(45,212,191,0.3)" strokeWidth="1" />
      {/* Jaw */}
      <path d="M85 230 Q150 280 215 230" fill="none" stroke="rgba(45,212,191,0.2)" strokeWidth="1" />
      {/* Eyebrows */}
      <path d="M98 120 Q120 112 140 116" fill="none" stroke="rgba(59,130,246,0.5)" strokeWidth="1.5" />
      <path d="M160 116 Q180 112 202 120" fill="none" stroke="rgba(59,130,246,0.5)" strokeWidth="1.5" />
      {/* Left eye */}
      <ellipse cx="118" cy="148" rx="20" ry="12" fill="rgba(45,212,191,0.08)" stroke="rgba(45,212,191,0.55)" strokeWidth="1.2" />
      <circle cx="118" cy="148" r="6" fill="rgba(45,212,191,0.2)" />
      <circle cx="118" cy="148" r="2.5" fill="#2dd4bf" filter="url(#cam-glow)" />
      {/* Right eye */}
      <ellipse cx="182" cy="148" rx="20" ry="12" fill="rgba(45,212,191,0.08)" stroke="rgba(45,212,191,0.55)" strokeWidth="1.2" />
      <circle cx="182" cy="148" r="6" fill="rgba(45,212,191,0.2)" />
      <circle cx="182" cy="148" r="2.5" fill="#2dd4bf" filter="url(#cam-glow)" />
      {/* Nose */}
      <path d="M150 162 L140 196 Q150 202 160 196 Z" fill="none" stroke="rgba(59,130,246,0.35)" strokeWidth="1" />
      {/* Mouth */}
      <path d="M122 222 Q150 238 178 222" fill="none" stroke="rgba(45,212,191,0.4)" strokeWidth="1.5" />
      {/* Mesh landmark dots */}
      {[[150,75],[100,100],[200,100],[82,135],[218,135],[80,168],[220,168],[82,200],[218,200],[90,230],[210,230],[118,148],[182,148],[150,180],[140,196],[160,196],[122,222],[178,222],[150,240]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="2" fill="rgba(45,212,191,0.65)" />
      ))}
      {/* Mesh lines */}
      {[[[100,100],[82,135]],[[200,100],[218,135]],[[82,135],[80,168]],[[218,135],[220,168]],[[80,168],[82,200]],[[220,168],[218,200]],[[82,200],[90,230]],[[218,200],[210,230]],[[118,148],[140,196]],[[182,148],[160,196]],[[150,180],[150,240]]].map(([[x1,y1],[x2,y2]],i)=>(
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(59,130,246,0.18)" strokeWidth="0.8" />
      ))}
      {/* Gaze vectors */}
      <line x1="118" y1="148" x2="82" y2="135" stroke="rgba(59,130,246,0.7)" strokeWidth="1.5" filter="url(#cam-glow)" />
      <line x1="182" y1="148" x2="218" y2="135" stroke="rgba(59,130,246,0.7)" strokeWidth="1.5" filter="url(#cam-glow)" />
      {/* Scan beam */}
      <rect x="70" y="0" width="160" height="4" rx="2" fill="rgba(45,212,191,0.6)" filter="url(#cam-glow)" className="animate-scan-beam" />
      {/* Corner HUD brackets */}
      <path d="M18 30 L18 10 L38 10" fill="none" stroke="#2dd4bf" strokeWidth="2" />
      <path d="M282 30 L282 10 L262 10" fill="none" stroke="#2dd4bf" strokeWidth="2" />
      <path d="M18 330 L18 350 L38 350" fill="none" stroke="#2dd4bf" strokeWidth="2" />
      <path d="M282 330 L282 350 L262 350" fill="none" stroke="#2dd4bf" strokeWidth="2" />
      {/* Status */}
      <text x="150" y="358" textAnchor="middle" fill="rgba(45,212,191,0.7)" fontSize="8" fontFamily="JetBrains Mono">FACE_LOCK ■ 68PT MESH ■ GAZE ACTIVE</text>
    </svg>
    {/* Overlay badges */}
    <div className="absolute top-3 left-3 flex flex-col gap-1">
      <div className="flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-black/50 px-2 py-0.5 rounded">
        <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" /> LIVE FEED
      </div>
    </div>
    <div className="absolute bottom-10 left-3 right-3 grid grid-cols-3 gap-1">
      {[['GAZE','CENTERED'],['POSTURE','UPRIGHT'],['FACES','1 LOCKED']].map(([k,v])=>(
        <div key={k} className="text-center bg-black/50 rounded p-1">
          <div className="text-[8px] font-mono text-slate-500">{k}</div>
          <div className="text-[8px] font-mono text-cyan-400">{v}</div>
        </div>
      ))}
    </div>
  </div>
);

const FeatureShowcase: React.FC = () => {
  const [imgError, setImgError] = useState(false);

  const metrics = [
    { icon: Eye,      label: 'Left-Eye Focus Tracking', desc: 'Real-time gaze deflection analysis with angular precision ±2° — every blink and micro-saccade logged.' },
    { icon: Volume2,  label: 'Zero-dB Acoustic Mapping', desc: 'Authorized silence ambient validation — continuous audio frequency sweep with instant spike alerting.' },
    { icon: User,     label: 'Posture Spine Validation', desc: 'Multi-dimensional torso straightness detection — forward lean, slouch, and absence all trigger incident flags.' },
  ];

  return (
    <section className="py-24 relative border-t border-slate-900">
      <div className="absolute inset-0 cyber-grid opacity-50 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-xs font-mono text-cyan-400 tracking-widest mb-3">CONTINUOUS VERIFICATION ENGINE</p>
          <h2 className="font-display text-4xl font-bold text-slate-100 tracking-tight mb-4">
            See Every Micro-Deviation. <span className="text-cyan-400">In Real Time.</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Aegis captures and cross-validates three simultaneous biometric signals without interrupting the candidate's exam flow.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left — metrics */}
          <div className="space-y-6">
            {metrics.map(({ icon: Icon, label, desc }, i) => (
              <div key={label} className="flex gap-4 p-4 rounded-xl border border-slate-800 bg-[#050b18] hover:border-cyan-500/20 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-100 text-sm">{label}</h3>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Right — camera viewport */}
          <div className="rounded-2xl overflow-hidden border border-blue-500/20 shadow-2xl shadow-blue-600/10" style={{ aspectRatio:'3/4', maxHeight:480 }}>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#050b18] border-b border-slate-800">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500/60" />
                <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
              </div>
              <span className="text-[10px] font-mono text-slate-500 ml-2">aegis://proctor-cam/candidate-01</span>
            </div>
            <div className="h-full">
              {!imgError ? (
                <img src="/images.jpeg" alt="Candidate feed" className="w-full h-full object-cover" onError={() => setImgError(true)} />
              ) : (
                <FaceMeshCamera />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureShowcase;
