import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ShieldAlert, ArrowRight } from 'lucide-react';

interface ViolationWarningModalProps {
  strikeCount: number;
  onDismiss: () => void;
}

export default function ViolationWarningModal({ strikeCount, onDismiss }: ViolationWarningModalProps) {
  if (strikeCount <= 0 || strikeCount >= 3) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', duration: 0.4 }}
        className="w-full max-w-md bg-[#121214] border border-rose-500/30 rounded-xl p-6 shadow-2xl shadow-rose-950/20 text-zinc-100 font-sans"
        id="violation-warning-modal"
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-500 animate-pulse">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-rose-400 font-semibold flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Security Protocol Violation
            </span>
            <h3 className="text-lg font-bold font-display text-zinc-100 tracking-tight">
              MULTIPLE FACES DETECTED — WARNING {strikeCount}/3
            </h3>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed font-mono bg-[#18181b] border border-zinc-800 p-3 rounded-lg text-left w-full">
            The Aegis security system has identified more than one face within the active assessment frame. 
            <br /><br />
            <span className="text-rose-400 font-semibold">CRITICAL PROTOCOL:</span> Upon receiving <span className="font-bold underline text-rose-300">Strike 3</span>, the current session will be <span className="font-semibold text-rose-300">automatically terminated</span> and immediately disqualified without exception.
          </p>

          <button
            type="button"
            id="dismiss-warning-btn"
            onClick={onDismiss}
            className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-lg text-xs font-semibold font-mono tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-rose-600/10 hover:shadow-rose-600/20"
          >
            RETURN TO FRAME
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
