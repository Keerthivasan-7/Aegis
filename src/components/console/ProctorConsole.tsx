import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Users, AlertTriangle, CheckCircle, Radio, Send, Bell, Eye, Activity } from 'lucide-react';
import { MOCK_CANDIDATES, MockCandidate, TelemetryLog } from './mockData';

const StatusChip: React.FC<{ status: MockCandidate['status'] }> = ({ status }) => (
  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${
    status === 'secure'  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
    status === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                           'bg-rose-500/10 border-rose-500/30 text-rose-400'
  }`}>
    {status.toUpperCase()}
  </span>
);

const TrustBar: React.FC<{ score: number }> = ({ score }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${score > 90 ? 'bg-emerald-500' : score > 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
        style={{ width: `${score}%` }}
      />
    </div>
    <span className="text-[10px] font-mono text-slate-300 w-10 text-right">{score}%</span>
  </div>
);

const ProctorConsole: React.FC = () => {
  const [selected, setSelected] = useState<MockCandidate | null>(null);
  const [broadcast, setBroadcast] = useState('');
  const [sentBroadcast, setSentBroadcast] = useState(false);
  const [candidates, setCandidates] = useState(MOCK_CANDIDATES);

  const secure  = candidates.filter(c => c.status === 'secure').length;
  const warning = candidates.filter(c => c.status === 'warning').length;
  const flagged = candidates.filter(c => c.status === 'flagged').length;
  const avgTrust = Math.round(candidates.reduce((s, c) => s + c.trustScore, 0) / candidates.length * 10) / 10;

  const sendWarning = (id: string) => {
    setCandidates(prev => prev.map(c =>
      c.id === id
        ? { ...c, trustScore: Math.max(0, c.trustScore - 8), status: c.status === 'secure' ? 'warning' : c.status,
            logs: [...c.logs, { timestamp: new Date().toLocaleTimeString('en-US',{hour12:false}), type: 'system', message: '⚠ Admin Override: Direct warning issued by proctor.', severity: 'warning' as const }] }
        : c
    ));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, trustScore: Math.max(0, prev.trustScore - 8) } : null);
  };

  const handleBroadcast = () => {
    if (!broadcast.trim()) return;
    setSentBroadcast(true);
    setTimeout(() => setSentBroadcast(false), 3000);
    setBroadcast('');
  };

  const logColor = (sev: TelemetryLog['severity']) =>
    sev === 'critical' ? 'text-rose-400' : sev === 'warning' ? 'text-amber-400' : 'text-slate-400';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 h-full">
      {/* Left — Candidate Monitor */}
      <div className="flex flex-col gap-4">
        {/* Metric badges */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'ACTIVE', value: candidates.length, color: 'text-blue-400', icon: Users },
            { label: 'SECURE',  value: secure,  color: 'text-emerald-400', icon: CheckCircle },
            { label: 'WARNING', value: warning, color: 'text-amber-400',   icon: AlertTriangle },
            { label: 'AVG TRUST', value: `${avgTrust}%`, color: 'text-cyan-400', icon: Activity },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="p-3 rounded-xl border border-slate-800 bg-[#050b18] text-center">
              <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
              <div className={`text-lg font-display font-bold ${color}`}>{value}</div>
              <div className="text-[10px] font-mono text-slate-500">{label}</div>
            </div>
          ))}
        </div>

        {/* Candidate rows */}
        <div className="flex-1 space-y-2 overflow-y-auto">
          {candidates.map(c => (
            <motion.button
              key={c.id}
              onClick={() => setSelected(c)}
              whileHover={{ x: 2 }}
              className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                selected?.id === c.id
                  ? 'border-blue-500/50 bg-blue-500/5'
                  : 'border-slate-800 bg-[#050b18] hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold font-mono shrink-0 ${
                  c.status === 'secure'  ? 'bg-emerald-500/15 text-emerald-400' :
                  c.status === 'warning' ? 'bg-amber-500/15 text-amber-400' :
                                           'bg-rose-500/15 text-rose-400'
                }`}>{c.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-slate-200">{c.name}</span>
                    <StatusChip status={c.status} />
                  </div>
                  <TrustBar score={c.trustScore} />
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <div className="text-[10px] font-mono text-slate-500">{c.gazeVector}</div>
                  <div className="text-[10px] font-mono text-slate-600">{c.posture}</div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Broadcast */}
        <div className="p-3 rounded-xl border border-slate-800 bg-[#050b18]">
          <div className="flex items-center gap-2 mb-2">
            <Radio className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] font-mono text-slate-400">BROADCAST TO ALL CANDIDATES</span>
          </div>
          <div className="flex gap-2">
            <input
              value={broadcast}
              onChange={e => setBroadcast(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleBroadcast()}
              placeholder="Type announcement..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
            />
            <button
              onClick={handleBroadcast}
              className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <AnimatePresence>
            {sentBroadcast && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-[10px] font-mono text-emerald-400 mt-2">
                ✓ Broadcast transmitted to {candidates.length} active candidates.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right — Selected Candidate Detail */}
      <AnimatePresence mode="wait">
        {selected ? (
          <motion.div key={selected.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="flex flex-col gap-3">
            <div className="p-4 rounded-xl border border-blue-500/20 bg-[#050b18]">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-display font-semibold text-slate-100">{selected.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">{selected.email}</p>
                  <p className="text-xs text-slate-600 font-mono">{selected.institution}</p>
                </div>
                <StatusChip status={selected.status} />
              </div>
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-500">Trust Score</span>
                  <span className={selected.trustScore > 90 ? 'text-emerald-400' : selected.trustScore > 70 ? 'text-amber-400' : 'text-rose-400'}>
                    {selected.trustScore}%
                  </span>
                </div>
                <TrustBar score={selected.trustScore} />
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-500">Gaze</span><span className="text-slate-300">{selected.gazeVector}</span>
                </div>
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-500">Posture</span><span className="text-slate-300">{selected.posture}</span>
                </div>
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-500">Sound</span><span className="text-slate-300">{selected.soundLevel} dB</span>
                </div>
              </div>
              <button
                onClick={() => sendWarning(selected.id)}
                className="w-full py-2 rounded-lg border border-amber-500/30 text-amber-400 text-xs font-mono hover:bg-amber-500/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" /> SEND DIRECT WARNING
              </button>
            </div>

            {/* Log feed */}
            <div className="flex-1 rounded-xl border border-slate-800 bg-[#020617] flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800">
                <Eye className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] font-mono text-slate-400">BIOMETRIC EVENT LOG</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-72">
                {selected.logs.map((log, i) => (
                  <div key={i} className="text-[10px] font-mono">
                    <span className="text-slate-600">{log.timestamp} </span>
                    <span className={logColor(log.severity)}>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 0.4 }}
            className="flex flex-col items-center justify-center text-center text-slate-500">
            <Shield className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-mono">Select a candidate to view<br />their biometric telemetry</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProctorConsole;
