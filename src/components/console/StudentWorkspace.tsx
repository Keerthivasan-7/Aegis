import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, AlertTriangle, ChevronRight, Terminal, Activity, Eye, Volume2, Send, Clock } from 'lucide-react';
import { EXAM_QUESTIONS } from './mockData';

// ── FaceMesh SVG fallback ──────────────────────────────────────────────────
const FaceMeshSVG: React.FC = () => (
  <svg viewBox="0 0 200 240" width="100%" height="100%" className="opacity-80">
    <defs>
      <radialGradient id="face-bg" cx="50%" cy="45%" r="55%">
        <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#020617" stopOpacity="0.9" />
      </radialGradient>
    </defs>
    <rect width="200" height="240" fill="url(#face-bg)" />
    {/* Face outline */}
    <ellipse cx="100" cy="110" rx="62" ry="80" fill="none" stroke="rgba(45,212,191,0.4)" strokeWidth="1" />
    {/* Jaw */}
    <path d="M55 150 Q100 185 145 150" fill="none" stroke="rgba(45,212,191,0.3)" strokeWidth="0.8" />
    {/* Forehead mesh */}
    <path d="M65 65 L100 55 L135 65 L140 90 L100 85 L60 90 Z" fill="none" stroke="rgba(59,130,246,0.3)" strokeWidth="0.6" />
    {/* Left eye region */}
    <ellipse cx="75" cy="100" rx="16" ry="9" fill="none" stroke="rgba(45,212,191,0.5)" strokeWidth="1" />
    <circle cx="75" cy="100" r="4" fill="rgba(45,212,191,0.3)" />
    <circle cx="75" cy="100" r="1.5" fill="#2dd4bf" />
    {/* Right eye region */}
    <ellipse cx="125" cy="100" rx="16" ry="9" fill="none" stroke="rgba(45,212,191,0.5)" strokeWidth="1" />
    <circle cx="125" cy="100" r="4" fill="rgba(45,212,191,0.3)" />
    <circle cx="125" cy="100" r="1.5" fill="#2dd4bf" />
    {/* Nose */}
    <path d="M100 108 L93 130 Q100 134 107 130 Z" fill="none" stroke="rgba(59,130,246,0.4)" strokeWidth="0.8" />
    {/* Mouth */}
    <path d="M83 145 Q100 155 117 145" fill="none" stroke="rgba(45,212,191,0.4)" strokeWidth="1" />
    <path d="M88 145 Q100 152 112 145" fill="none" stroke="rgba(59,130,246,0.3)" strokeWidth="0.5" />
    {/* Landmark dots */}
    {[
      [100,55],[65,65],[135,65],[60,90],[140,90],[60,110],[140,110],
      [75,100],[125,100],[100,120],[93,130],[107,130],[83,145],[117,145],
      [100,155],[70,140],[130,140],[55,90],[145,90],[80,70],[120,70],
    ].map(([x,y],i) => (
      <circle key={i} cx={x} cy={y} r="1.5" fill="rgba(45,212,191,0.7)" />
    ))}
    {/* Mesh connection lines */}
    <line x1="75" y1="100" x2="100" y2="120" stroke="rgba(59,130,246,0.2)" strokeWidth="0.5" />
    <line x1="125" y1="100" x2="100" y2="120" stroke="rgba(59,130,246,0.2)" strokeWidth="0.5" />
    <line x1="60" y1="90" x2="75" y2="100" stroke="rgba(59,130,246,0.2)" strokeWidth="0.5" />
    <line x1="140" y1="90" x2="125" y2="100" stroke="rgba(59,130,246,0.2)" strokeWidth="0.5" />
    <line x1="65" y1="65" x2="75" y2="100" stroke="rgba(59,130,246,0.15)" strokeWidth="0.5" />
    <line x1="135" y1="65" x2="125" y2="100" stroke="rgba(59,130,246,0.15)" strokeWidth="0.5" />
    {/* Animated scan line */}
    <rect x="38" y="0" width="124" height="3" rx="1" fill="rgba(45,212,191,0.6)" className="animate-scan-beam" />
    {/* Corner brackets */}
    <path d="M30 30 L30 15 L45 15" fill="none" stroke="#2dd4bf" strokeWidth="1.5" />
    <path d="M170 30 L170 15 L155 15" fill="none" stroke="#2dd4bf" strokeWidth="1.5" />
    <path d="M30 210 L30 225 L45 225" fill="none" stroke="#2dd4bf" strokeWidth="1.5" />
    <path d="M170 210 L170 225 L155 225" fill="none" stroke="#2dd4bf" strokeWidth="1.5" />
    {/* Gaze vector indicator */}
    <line x1="75" y1="100" x2="55" y2="90" stroke="rgba(59,130,246,0.7)" strokeWidth="1" markerEnd="url(#arrow)" />
    <line x1="125" y1="100" x2="145" y2="90" stroke="rgba(59,130,246,0.7)" strokeWidth="1" />
    {/* Status text */}
    <text x="100" y="238" textAnchor="middle" fill="rgba(45,212,191,0.8)" fontSize="7" fontFamily="JetBrains Mono">
      FACE_LOCK ■ TRACKING ■ 68 PTS
    </text>
  </svg>
);

// ── Decibel Meter ─────────────────────────────────────────────────────────
const DecibelMeter: React.FC<{ level: number }> = ({ level }) => {
  const bars = 12;
  return (
    <div className="flex items-end gap-0.5 h-5">
      {Array.from({ length: bars }, (_, i) => {
        const threshold = (i / bars) * 100;
        const active = level > threshold;
        const color = i < 7 ? '#2dd4bf' : i < 10 ? '#f59e0b' : '#ef4444';
        return (
          <div
            key={i}
            className="w-1.5 rounded-sm transition-all duration-100"
            style={{
              height: `${40 + i * 5}%`,
              background: active ? color : 'rgba(255,255,255,0.08)',
              boxShadow: active ? `0 0 4px ${color}60` : 'none',
            }}
          />
        );
      })}
    </div>
  );
};

// ── Student Workspace ─────────────────────────────────────────────────────
const StudentWorkspace: React.FC = () => {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [soundLevel, setSoundLevel] = useState(5);
  const [logs, setLogs] = useState<{ time: string; msg: string; sev: 'info' | 'warn' | 'crit' }[]>([
    { time: now(), msg: 'Session initialized — Biometric baseline captured.', sev: 'info' },
    { time: now(), msg: 'Full-screen lock active. Browser telemetry online.', sev: 'info' },
  ]);
  const logRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function now() {
    return new Date().toLocaleTimeString('en-US', { hour12: false });
  }

  function addLog(msg: string, sev: 'info' | 'warn' | 'crit') {
    setLogs(prev => [...prev.slice(-40), { time: now(), msg, sev }]);
  }

  // Telemetry simulation
  useEffect(() => {
    const events = [
      { msg: 'Gaze vector: Forward centered (±2°) — PASS.', sev: 'info' as const, delay: 4000 },
      { msg: 'Posture analysis: Upright — Spine within tolerance.', sev: 'info' as const, delay: 8000 },
      { msg: 'WARNING: Gaze deflection right — 14° deviation detected.', sev: 'warn' as const, delay: 14000 },
      { msg: 'Acoustic environment: 3 dB — Within authorized silence zone.', sev: 'info' as const, delay: 18000 },
      { msg: 'Gaze restored — Forward centered. Trust score maintained.', sev: 'info' as const, delay: 22000 },
      { msg: 'WARNING: Slouched torso — Forward lean 11° exceeds threshold.', sev: 'warn' as const, delay: 30000 },
    ];
    const timers = events.map(e => setTimeout(() => addLog(e.msg, e.sev), e.delay));
    const soundTimer = setInterval(() => {
      setSoundLevel(Math.floor(Math.random() * 18) + 2);
    }, 1800);
    return () => { timers.forEach(clearTimeout); clearInterval(soundTimer); };
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [logs]);

  const toggleCamera = async () => {
    if (cameraActive) {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setCameraActive(false);
      addLog('Webcam feed deactivated — SVG mesh overlay restored.', 'info');
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraActive(true);
        addLog('Webcam feed activated — Live biometric capture online.', 'info');
      } catch {
        addLog('Webcam access denied — Fallback mesh overlay active.', 'warn');
      }
    }
  };

  const score = submitted
    ? EXAM_QUESTIONS.reduce((acc, q) => acc + (answers[q.id] === q.correctIndex ? 1 : 0), 0)
    : 0;

  const totalAnswered = Object.keys(answers).length;
  const progress = (totalAnswered / EXAM_QUESTIONS.length) * 100;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 h-full">
      {/* ── Exam Panel ── */}
      <div className="flex flex-col gap-4 overflow-y-auto pr-1">
        {/* Progress */}
        <div className="flex items-center gap-3 p-3 rounded-xl border border-blue-500/10 bg-[#050b18]">
          <div className="flex-1">
            <div className="flex justify-between text-xs font-mono text-slate-400 mb-1.5">
              <span>ASSESSMENT PROGRESS</span>
              <span className="text-blue-400">{totalAnswered}/{EXAM_QUESTIONS.length} ANSWERED</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-sm text-blue-400 font-semibold">{Math.round(progress)}%</div>
          </div>
        </div>

        {/* Questions */}
        {!submitted ? (
          <div className="space-y-4">
            {EXAM_QUESTIONS.map((q, qi) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: qi * 0.06 }}
                className="p-4 rounded-xl border border-slate-800 bg-[#050b18] hover:border-blue-500/25 transition-colors"
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="shrink-0 w-6 h-6 rounded-md bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-xs font-mono text-blue-400 font-semibold">
                    {qi + 1}
                  </span>
                  <div>
                    <div className="flex gap-2 mb-1">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{q.topic}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        q.difficulty === 'hard' ? 'bg-rose-500/10 text-rose-400' :
                        q.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-emerald-500/10 text-emerald-400'
                      }`}>{q.difficulty.toUpperCase()}</span>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">{q.question}</p>
                  </div>
                </div>
                <div className="space-y-2 ml-9">
                  {q.options.map((opt, oi) => (
                    <button
                      key={oi}
                      onClick={() => setAnswers(p => ({ ...p, [q.id]: oi }))}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-all cursor-pointer ${
                        answers[q.id] === oi
                          ? 'border-blue-500/60 bg-blue-500/10 text-blue-200'
                          : 'border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                      }`}
                    >
                      <span className="font-mono text-xs text-slate-500 mr-2">{String.fromCharCode(65+oi)}.</span>
                      {opt}
                    </button>
                  ))}
                </div>
              </motion.div>
            ))}
            <button
              onClick={() => { setSubmitted(true); addLog('Assessment submitted — Cryptographic grading initiated.', 'info'); }}
              disabled={totalAnswered < EXAM_QUESTIONS.length}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Submit to Aegis Grading Engine
            </button>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Score card */}
            <div className="p-5 rounded-xl border border-cyan-500/30 bg-cyan-500/5 text-center">
              <div className="text-4xl font-display font-bold text-cyan-400 mb-1">
                {score}/{EXAM_QUESTIONS.length}
              </div>
              <div className="text-slate-400 text-sm mb-3">Cryptographic Score — {Math.round((score/EXAM_QUESTIONS.length)*100)}% Accuracy</div>
              <div className="flex justify-center gap-4 text-xs font-mono">
                <span className="text-emerald-400">✓ {score} CORRECT</span>
                <span className="text-rose-400">✗ {EXAM_QUESTIONS.length - score} INCORRECT</span>
              </div>
            </div>
            {/* Review */}
            {EXAM_QUESTIONS.map((q, qi) => {
              const userAns = answers[q.id];
              const correct = userAns === q.correctIndex;
              return (
                <div key={q.id} className={`p-4 rounded-xl border ${correct ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
                  <div className="flex items-start gap-2 mb-2">
                    {correct ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                    <p className="text-sm text-slate-200">{qi+1}. {q.question}</p>
                  </div>
                  {!correct && <p className="text-xs text-slate-400 ml-6 mb-1">Your answer: <span className="text-rose-300">{q.options[userAns]}</span></p>}
                  <p className="text-xs text-slate-400 ml-6 mb-2">Correct: <span className={correct ? 'text-emerald-300' : 'text-emerald-300'}>{q.options[q.correctIndex]}</span></p>
                  <p className="text-xs text-slate-500 ml-6 leading-relaxed border-l border-slate-700 pl-2">{q.explanation}</p>
                </div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* ── Proctoring HUD ── */}
      <div className="flex flex-col gap-3">
        {/* Camera feed */}
        <div className="rounded-xl border border-blue-500/20 bg-[#020617] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono text-slate-400">BIOMETRIC FEED</span>
            </div>
            <button
              onClick={toggleCamera}
              className="text-[10px] font-mono px-2 py-0.5 rounded border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
            >
              {cameraActive ? 'DISABLE' : 'ENABLE'} CAM
            </button>
          </div>
          <div className="relative aspect-[3/4] bg-[#050b18]">
            {cameraActive ? (
              <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
            ) : (
              <FaceMeshSVG />
            )}
            {/* Overlay HUD */}
            <div className="absolute bottom-2 left-2 right-2">
              <div className="text-[9px] font-mono text-cyan-400/80 space-y-0.5">
                <div className="flex justify-between"><span>GAZE</span><span>CENTERED ±2°</span></div>
                <div className="flex justify-between"><span>POSTURE</span><span>UPRIGHT</span></div>
                <div className="flex justify-between"><span>FACES</span><span>1 DETECTED</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Sound meter */}
        <div className="p-3 rounded-xl border border-slate-800 bg-[#050b18]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Volume2 className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] font-mono text-slate-400">ACOUSTIC LEVEL</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400">{soundLevel} dB</span>
          </div>
          <DecibelMeter level={soundLevel} />
          <div className="flex justify-between text-[9px] font-mono text-slate-600 mt-1">
            <span>0 dB</span><span>SILENCE ZONE</span><span>100 dB</span>
          </div>
        </div>

        {/* Telemetry log */}
        <div className="flex-1 rounded-xl border border-slate-800 bg-[#020617] flex flex-col min-h-0">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800">
            <Terminal className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] font-mono text-slate-400">PROCTORING EVENT LOG</span>
          </div>
          <div ref={logRef} className="flex-1 overflow-y-auto p-2 space-y-1 max-h-56">
            <AnimatePresence initial={false}>
              {logs.map((log, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-2 text-[10px] font-mono"
                >
                  <span className="text-slate-600 shrink-0">{log.time}</span>
                  <span className={
                    log.sev === 'crit' ? 'text-rose-400' :
                    log.sev === 'warn' ? 'text-amber-400' :
                    'text-slate-400'
                  }>{log.msg}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentWorkspace;
