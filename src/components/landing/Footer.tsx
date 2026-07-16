import React from 'react';
import { AegisLogo } from '../AegisLogo';

const Footer: React.FC = () => (
  <footer className="border-t border-slate-900 py-10">
    <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <AegisLogo size={24} />
        <span className="font-display font-semibold text-slate-300">Aegis</span>
        <span className="text-slate-700 text-sm">— Secure Assessment Platform</span>
      </div>
      <div className="flex items-center gap-6 text-sm text-slate-600">
        {['Privacy','Security','Docs','Contact'].map(l=>(
          <a key={l} href="#" className="hover:text-slate-400 transition-colors">{l}</a>
        ))}
      </div>
      <div className="text-xs font-mono text-slate-700">
        © {new Date().getFullYear()} Aegis Systems · All rights reserved
      </div>
    </div>
  </footer>
);

export default Footer;
