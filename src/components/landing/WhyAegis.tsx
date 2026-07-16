import React from 'react';
import { motion } from 'motion/react';
import { Eye, Lock, Brain, Zap, Fingerprint, Globe } from 'lucide-react';

const features = [
  { icon: Eye,         title: 'Gaze Tracking',          desc: 'Real-time left/right gaze deflection analysis with ±2° angular precision using WebGL.', color: 'blue' },
  { icon: Fingerprint, title: 'Biometric Baseline',      desc: 'Cryptographic biometric snapshot captured at session start. Any deviation triggers an alert.', color: 'cyan' },
  { icon: Lock,        title: 'Browser Lock Enforcement',desc: 'Full-screen mandatory mode with instant tab-switch detection and three-strike termination.', color: 'blue' },
  { icon: Brain,       title: 'Gemini AI Proctoring',    desc: 'Server-side Gemini 2.5 analyzes all proctoring telemetry for final risk score computation.', color: 'cyan' },
  { icon: Zap,         title: 'Zero-Latency Telemetry', desc: 'Sub-2ms local event capture with asynchronous Firestore sync — no exam performance impact.', color: 'blue' },
  { icon: Globe,       title: 'Client-Side Execution',   desc: 'All biometric capture runs entirely in the candidate\'s browser — zero server-side video storage.', color: 'cyan' },
];

const WhyAegis: React.FC = () => (
  <section id="features" className="py-24 relative">
    <div className="max-w-7xl mx-auto px-6">
      <div className="text-center mb-16">
        <p className="text-xs font-mono text-blue-400 tracking-widest mb-3">PLATFORM ARCHITECTURE</p>
        <h2 className="font-display text-4xl font-bold text-slate-100 tracking-tight mb-4">
          Military-Grade Proctoring.<br />Zero Compromise.
        </h2>
        <p className="text-slate-400 max-w-xl mx-auto">
          Every component of the Aegis stack is purpose-built for cryptographic certainty — not checkbox compliance.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map(({ icon: Icon, title, desc, color }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ y: -3 }}
            className="p-5 rounded-2xl border border-slate-800 bg-[#050b18] hover:border-blue-500/25 transition-all group"
          >
            <div className={`w-10 h-10 rounded-xl mb-4 flex items-center justify-center ${
              color === 'blue' ? 'bg-blue-600/15 border border-blue-500/20' : 'bg-cyan-500/15 border border-cyan-500/20'
            }`}>
              <Icon className={`w-5 h-5 ${color === 'blue' ? 'text-blue-400' : 'text-cyan-400'}`} />
            </div>
            <h3 className="font-display font-semibold text-slate-100 mb-2">{title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default WhyAegis;
