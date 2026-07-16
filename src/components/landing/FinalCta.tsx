import React from 'react';
import { motion } from 'motion/react';
import { AegisLogo } from '../AegisLogo';

const FinalCta: React.FC<{ onGetStarted: () => void; onLogin: () => void }> = ({ onGetStarted, onLogin }) => (
  <section className="py-32 relative overflow-hidden border-t border-slate-900">
    {/* Massive shield backdrop */}
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="opacity-[0.03]">
        <AegisLogo size={600} />
      </div>
    </div>
    {/* Aurora */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-blue-600/8 blur-[120px] animate-aurora pointer-events-none" />

    <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <div className="flex justify-center mb-6">
          <AegisLogo size={56} animated />
        </div>
        <h2 className="font-display text-5xl xl:text-6xl font-bold text-slate-100 tracking-tight mb-6 leading-tight">
          Ready for Cryptographic<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Certainty?</span>
        </h2>
        <p className="text-slate-400 text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
          Deploy Aegis in minutes. No plugins. No server video storage. Just continuous, silent, browser-native biometric verification at scale.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onGetStarted}
            className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-lg font-semibold transition-all shadow-2xl shadow-blue-600/30 cursor-pointer glow-blue"
          >
            Launch Interactive Demo →
          </button>
          <button
            onClick={onLogin}
            className="px-8 py-4 rounded-xl border border-slate-700 text-slate-300 hover:border-blue-500/40 hover:text-slate-100 text-lg font-semibold transition-all cursor-pointer"
          >
            Log In to Dashboard
          </button>
        </div>
        <div className="mt-10 flex items-center justify-center gap-6 text-xs font-mono text-slate-600">
          {['No credit card required','GDPR compliant','Zero installation'].map((t,i)=>(
            <React.Fragment key={t}>
              {i > 0 && <span>·</span>}
              <span>{t}</span>
            </React.Fragment>
          ))}
        </div>
      </motion.div>
    </div>
  </section>
);

export default FinalCta;
