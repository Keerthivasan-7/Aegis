import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

const rows = [
  ['Identification Method',         'One-time login',      'Continuous biometric baseline'],
  ['Gaze Monitoring',               'None / Manual review','Real-time ±2° angular tracking'],
  ['Audio Validation',              'None',                'Continuous zero-dB sweep mapping'],
  ['Posture Detection',             'None',                'Multi-dimensional torso analysis'],
  ['Tab-Switch Prevention',         'Browser flag only',   'Active full-screen lock + 3-strikes'],
  ['Video Storage',                 'Server-side cloud',   'Zero storage — client-side only'],
  ['Grading AI',                    'Manual examiner',     'Gemini 2.5 risk score engine'],
  ['Setup Complexity',              'Plugin install + IT', 'URL only — zero-install'],
  ['Scalability',                   'Hundreds (costly)',   'Unlimited (browser-native)'],
  ['Latency Impact on Candidate',   'High (video stream)', 'Sub-2ms (async telemetry)'],
];

const Comparison: React.FC = () => (
  <section className="py-24 border-t border-slate-900">
    <div className="max-w-6xl mx-auto px-6">
      <div className="text-center mb-14">
        <p className="text-xs font-mono text-blue-400 tracking-widest mb-3">COMPETITIVE ANALYSIS</p>
        <h2 className="font-display text-4xl font-bold text-slate-100 tracking-tight mb-4">
          Traditional vs. <span className="text-blue-400">Aegis</span>
        </h2>
        <p className="text-slate-400 max-w-lg mx-auto">Measure what actually matters for academic integrity — not vendor checkbox marketing.</p>
      </div>
      <div className="rounded-2xl border border-slate-800 overflow-hidden">
        <div className="grid grid-cols-3 bg-[#050b18] border-b border-slate-800">
          <div className="px-6 py-4 text-xs font-mono text-slate-500 uppercase tracking-wider">Capability</div>
          <div className="px-6 py-4 text-xs font-mono text-slate-500 uppercase tracking-wider border-l border-slate-800">Traditional Proctoring</div>
          <div className="px-6 py-4 text-xs font-mono text-blue-400 uppercase tracking-wider border-l border-blue-500/20 bg-blue-500/3">Aegis Platform</div>
        </div>
        {rows.map(([cap, trad, aegis], i) => (
          <div key={i} className={`grid grid-cols-3 border-b border-slate-900 ${i % 2 === 0 ? 'bg-[#020617]' : 'bg-[#030912]'} hover:bg-[#050b18] transition-colors`}>
            <div className="px-6 py-4 text-sm text-slate-300 font-medium">{cap}</div>
            <div className="px-6 py-4 text-sm text-slate-500 border-l border-slate-900 flex items-center gap-2">
              <XCircle className="w-3.5 h-3.5 text-rose-500/60 shrink-0" />
              {trad}
            </div>
            <div className="px-6 py-4 text-sm text-cyan-300 border-l border-blue-500/15 bg-blue-500/2 flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              {aegis}
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Comparison;
