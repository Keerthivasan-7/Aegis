import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, Shield, ArrowLeft } from 'lucide-react';
import { AegisLogo } from '../AegisLogo';
import StudentWorkspace from './StudentWorkspace';
import ProctorConsole from './ProctorConsole';

type Tab = 'student' | 'proctor';

interface ConsoleDemoProps {
  onBack: () => void;
}

const ConsoleDemo: React.FC<ConsoleDemoProps> = ({ onBack }) => {
  const [tab, setTab] = useState<Tab>('student');

  return (
    <div className="min-h-screen bg-[#020617] cyber-grid flex flex-col">
      {/* Header */}
      <header className="glass border-b border-blue-500/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors text-xs font-mono cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> BACK TO SITE
          </button>
          <div className="w-px h-4 bg-slate-800" />
          <div className="flex items-center gap-2">
            <AegisLogo size={24} animated />
            <span className="font-display font-semibold text-slate-100 text-sm">Aegis</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-blue-500/20 text-blue-400">SANDBOX DEMO</span>
          </div>
          <div className="ml-auto flex items-center gap-1 bg-slate-900/60 p-1 rounded-lg border border-slate-800">
            {([
              { id: 'student', label: 'Student View', Icon: GraduationCap },
              { id: 'proctor', label: 'Proctor Console', Icon: Shield },
            ] as const).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold font-mono transition-all cursor-pointer ${
                  tab === id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Console body */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-5">
        {/* Status bar */}
        <div className="flex items-center gap-4 mb-4 px-3 py-2 rounded-lg bg-[#050b18] border border-slate-800">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-400">AEGIS CORE ONLINE</span>
          </div>
          <div className="w-px h-3 bg-slate-800" />
          <span className="text-[10px] font-mono text-slate-500">SECURE SESSION — TLS 1.3 — AES-256-GCM</span>
          <div className="ml-auto text-[10px] font-mono text-slate-600">
            {tab === 'student' ? 'CANDIDATE WORKSPACE' : 'PROCTOR COMMAND CENTER'}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {tab === 'student' ? <StudentWorkspace /> : <ProctorConsole />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ConsoleDemo;
