import React from 'react';
import { AegisLogo } from '../AegisLogo';

const Navbar: React.FC<{ onGetStarted: () => void; onLogin: () => void }> = ({ onGetStarted, onLogin }) => (
  <nav className="glass border-b border-blue-500/10 sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <AegisLogo size={32} animated />
        <span className="font-display font-bold text-slate-100 text-lg tracking-tight">Aegis</span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-blue-500/25 text-blue-400 hidden sm:inline">v2.5</span>
      </div>
      <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
        {['Platform','Security','Enterprise'].map(l => (
          <a key={l} href="#" className="hover:text-slate-200 transition-colors">{l}</a>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button onClick={onLogin} className="text-sm text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5 cursor-pointer">
          Log In
        </button>
        <button
          onClick={onGetStarted}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-600/20 cursor-pointer glow-blue"
        >
          Get Started →
        </button>
      </div>
    </div>
  </nav>
);

export default Navbar;
