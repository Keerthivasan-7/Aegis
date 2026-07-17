import React, { useEffect, useState } from 'react';
import { Assessment, CodingQuestion, ProctoringLog, Question, Submission, UserProfile } from '../types';
import ProctoringHud from './ProctoringHud';
import ViolationWarningModal from './ViolationWarningModal';
import { Clock, ShieldAlert, FileText, CheckCircle, Play, Loader, Code, FileCheck, ArrowRight, CornerDownLeft, AlertTriangle, Volume2, VolumeX } from 'lucide-react';
import { auth } from '../lib/firebase';
import { AegisLogo } from './AegisLogo';

interface AssessmentRunnerProps {
  user: UserProfile;
  assessment: Assessment;
  onFinish: () => void;
}

export default function AssessmentRunner({ user, assessment, onFinish }: AssessmentRunnerProps) {
  const getAuthHeaders = async () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    try {
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['Authorization'] = `Bearer local-${user.userId}`;
      }
    } catch (err) {
      console.warn("Auth token fetching failed, relying on local userId fallback:", err);
      headers['Authorization'] = `Bearer local-${user.userId}`;
    }
    return headers;
  };

  const [submissionId, setSubmissionId] = useState('');
  const [started, setStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [proctoringLogs, setProctoringLogs] = useState<ProctoringLog[]>([]);
  const [timeLeft, setTimeLeft] = useState(assessment.timeLimit * 60); // seconds
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runOutputs, setRunOutputs] = useState<Record<string, { status: 'idle' | 'success' | 'error', message: string }>>({});
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState('');
  
  // Multiple-face warning and termination states
  const [strikeCount, setStrikeCount] = useState<number>(0);
  const [warningModalOpen, setWarningModalOpen] = useState<boolean>(false);
  const [isTerminated, setIsTerminated] = useState<boolean>(false);
  const [isTerminating, setIsTerminating] = useState<boolean>(false);

  // Full screen enforcement status
  const [isFullScreenActive, setIsFullScreenActive] = useState<boolean>(true);
  const [fullscreenBypassed, setFullscreenBypassed] = useState<boolean>(false);

  // Track if user has started the test (for reload warning)
  const [hasStartedTest, setHasStartedTest] = useState(false);

  // Tab switch, blur, and fullscreen loss siren alarm states
  const [alarmActive, setAlarmActive] = useState<boolean>(false);
  const [alarmTimeLeft, setAlarmTimeLeft] = useState<number>(30);

  // Web Audio API refs for synthesized siren sound
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const osc1Ref = React.useRef<OscillatorNode | null>(null);
  const osc2Ref = React.useRef<OscillatorNode | null>(null);
  const gainNodeRef = React.useRef<GainNode | null>(null);
  const sirenIntervalRef = React.useRef<any>(null);

  const startSiren = () => {
    try {
      if (audioContextRef.current) return; // Already running
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;
      
      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gainNode.connect(audioCtx.destination);
      gainNodeRef.current = gainNode;
      
      const osc1 = audioCtx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(600, audioCtx.currentTime);
      osc1.connect(gainNode);
      osc1Ref.current = osc1;
      
      const osc2 = audioCtx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(600, audioCtx.currentTime);
      osc2.connect(gainNode);
      osc2Ref.current = osc2;
      
      osc1.start();
      osc2.start();
      
      let goingUp = true;
      let currentFreq = 600;
      sirenIntervalRef.current = setInterval(() => {
        if (!audioContextRef.current || !osc1Ref.current || !osc2Ref.current) return;
        if (goingUp) {
          currentFreq += 25;
          if (currentFreq >= 1100) goingUp = false;
        } else {
          currentFreq -= 25;
          if (currentFreq <= 600) goingUp = true;
        }
        osc1Ref.current.frequency.setValueAtTime(currentFreq, audioContextRef.current.currentTime);
        osc2Ref.current.frequency.setValueAtTime(currentFreq * 1.15, audioContextRef.current.currentTime);
      }, 15);
    } catch (err) {
      console.warn("Failed to initialize siren:", err);
    }
  };

  const stopSiren = () => {
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
    if (osc1Ref.current) {
      try { osc1Ref.current.stop(); } catch (e) {}
      osc1Ref.current = null;
    }
    if (osc2Ref.current) {
      try { osc2Ref.current.stop(); } catch (e) {}
      osc2Ref.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
    gainNodeRef.current = null;
  };

  // Trigger high security alarm
  const triggerAlarm = () => {
    if (isSubmitting || isTerminated || fullscreenBypassed || alarmActive) return;
    setAlarmActive(true);
    setAlarmTimeLeft(30);
    startSiren();

    handleViolationLogged({
      timestamp: new Date().toISOString(),
      type: 'tab-switch',
      details: 'SECURITY ALERT: Candidate switched tabs, minimized, or blurred window focus!'
    });
  };

  // Secure automatic disqualification termination on countdown expiry
  const triggerSecureTerminationDueToAlarm = async () => {
    setIsTerminated(true);
    setIsTerminating(true);

    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch (err) {}
    }

    try {
      const finalLogs = [
        ...proctoringLogs,
        {
          timestamp: new Date().toISOString(),
          type: 'tab-switch',
          details: 'ASSESSMENT AUTOMATICALLY TERMINATED — Security alarm countdown expired (30 seconds out of bounds).'
        }
      ];
      setProctoringLogs(finalLogs);

      const authHeaders = await getAuthHeaders();
      await fetch('/api/terminate-exam', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          submissionId,
          proctoringLogs: finalLogs,
          reason: 'tab-switch-timeout'
        })
      });
    } catch (err: any) {
      console.error('Termination network error:', err);
      setError('Aegis Secure Gateway could not sync termination event: ' + err.message);
    } finally {
      setIsTerminating(false);
    }
  };

  // Manual Exit option clicked by user on alarm
  const handleExitFromAlarm = async () => {
    stopSiren();
    setAlarmActive(false);
    setIsTerminated(true);
    setIsTerminating(true);

    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch (err) {}
    }

    try {
      const finalLogs = [
        ...proctoringLogs,
        {
          timestamp: new Date().toISOString(),
          type: 'tab-switch',
          details: 'ASSESSMENT TERMINATED — Candidate manually selected Exit option during security alarm.'
        }
      ];
      setProctoringLogs(finalLogs);

      const authHeaders = await getAuthHeaders();
      await fetch('/api/terminate-exam', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          submissionId,
          proctoringLogs: finalLogs,
          reason: 'candidate-selected-exit'
        })
      });
    } catch (err: any) {
      console.error('Termination network error:', err);
      setError('Aegis Secure Gateway could not sync termination event: ' + err.message);
    } finally {
      setIsTerminating(false);
    }
  };

  // Full Screen Recovery
  const handleRestoreFullScreen = async () => {
    const docEl = document.documentElement;
    if (docEl.requestFullscreen) {
      try {
        await docEl.requestFullscreen();
        stopSiren();
        setAlarmActive(false);
        setIsFullScreenActive(true);
      } catch (err) {
        console.warn("Fullscreen restore failed:", err);
      }
    } else {
      stopSiren();
      setAlarmActive(false);
      setIsFullScreenActive(true);
    }
  };

  // Stop siren on component unmount
  useEffect(() => {
    return () => {
      stopSiren();
    };
  }, []);

  // Sync event listeners for proctoring checks (visibility hidden, window blur, fullscreen exit)
  useEffect(() => {
    if (!started || isSubmitting || isTerminated) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        triggerAlarm();
      }
    };

    const handleWindowBlur = () => {
      triggerAlarm();
    };

    const handleFullscreenChange = () => {
      const isFS = !!document.fullscreenElement;
      setIsFullScreenActive(isFS);
      if (!isFS && !fullscreenBypassed) {
        triggerAlarm();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Initial check for fullscreen
    const isFS = !!document.fullscreenElement;
    setIsFullScreenActive(isFS);
    if (!isFS && !fullscreenBypassed) {
      triggerAlarm();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [started, isSubmitting, isTerminated, fullscreenBypassed, alarmActive, proctoringLogs, submissionId]);

  // Prevent accidental reload/close during active test
  useEffect(() => {
    if (!started || !hasStartedTest || isSubmitting || isTerminated) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You have an active assessment in progress. Leaving this page will reset your progress and answers. Are you sure you want to exit?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [started, hasStartedTest, isSubmitting, isTerminated]);

  // Block keyboard shortcuts that exit fullscreen during test
  useEffect(() => {
    if (!started || isSubmitting || isTerminated) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Keys that can exit fullscreen: F11, Escape, Alt+F4 (Windows), Ctrl+W, Ctrl+F4, Cmd+W (Mac)
      const isFullscreenExitKey =
        e.key === 'F11' ||
        e.key === 'Escape' ||
        (e.key === 'F4' && e.altKey) ||
        (e.key === 'w' && (e.ctrlKey || e.metaKey)) ||
        (e.key === 'F4' && (e.ctrlKey || e.metaKey)) ||
        (e.key === 'Tab' && e.altKey); // Alt+Tab

      if (isFullscreenExitKey) {
        e.preventDefault();
        e.stopPropagation();
        
        // Log violation
        handleViolationLogged({
          timestamp: new Date().toISOString(),
          type: 'tab-switch',
          details: `Blocked fullscreen exit attempt via keyboard: ${e.key}${e.altKey ? ' + Alt' : ''}${e.ctrlKey ? ' + Ctrl' : ''}${e.metaKey ? ' + Cmd' : ''}`
        });
        
        // Trigger alarm if fullscreen is active
        if (isFullScreenActive) {
          triggerAlarm();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [started, isSubmitting, isTerminated, isFullScreenActive]);

  // Alarm countdown timer loop
  useEffect(() => {
    if (!alarmActive || isSubmitting || isTerminated) {
      stopSiren();
      return;
    }

    if (alarmTimeLeft <= 0) {
      stopSiren();
      setAlarmActive(false);
      triggerSecureTerminationDueToAlarm();
      return;
    }

    const interval = setInterval(() => {
      setAlarmTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [alarmActive, alarmTimeLeft, isSubmitting, isTerminated, proctoringLogs, submissionId]);

  // 1. Establish server-authoritative exam session
  const requestFullScreenAndStart = async () => {
    setError('');
    setInitializing(true);

    try {
      // Call backend to authorize and record start-time securely in Firestore
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/start-exam', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          assessmentId: assessment.assessmentId,
          studentId: user.userId,
          studentName: user.name,
          studentEmail: user.email
        })
      });

      if (!res.ok) {
        throw new Error('Failed to register starting time with secure assessment registry.');
      }

      const startPayload = await res.json();
      setSubmissionId(startPayload.submissionId);

      // Lock full-screen for high security proctoring
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      }

      setStarted(true);
      setHasStartedTest(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Server time synchronization handshake failed. Please reload and try again.');
    } finally {
      setInitializing(false);
    }
  };

  // Log a proctoring violation dynamically
  const handleViolationLogged = (log: ProctoringLog) => {
    setProctoringLogs(prev => [...prev, log]);
  };

  // Callback called when a multiple-faces strike event fires
  const handleMultipleFacesStrike = async (count: number) => {
    setStrikeCount(count);
    if (count < 3) {
      setWarningModalOpen(true);
    } else if (count >= 3 && !isTerminated) {
      // Strike 3 - Disqualify and terminate immediately without candidate interaction
      setIsTerminated(true);
      setWarningModalOpen(false);
      await triggerTermination();
    }
  };

  const triggerTermination = async () => {
    setIsTerminating(true);

    // Force unlock fullscreen
    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch (err) {}
    }

    try {
      // Call the secure terminate endpoint
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/terminate-exam', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          submissionId,
          proctoringLogs: [
            ...proctoringLogs,
            {
              timestamp: new Date().toISOString(),
              type: 'multiple-faces',
              details: 'ASSESSMENT AUTOMATICALLY TERMINATED — 3/3 Multiple Faces Strikes Exceeded.'
            }
          ],
          reason: 'multiple-faces-exceeded'
        })
      });

      if (!res.ok) {
        throw new Error('Termination registration rejected by secure gateway.');
      }
    } catch (err: any) {
      console.error('Termination network error:', err);
      setError('Aegis Secure Gateway could not sync termination event: ' + err.message);
    } finally {
      setIsTerminating(false);
    }
  };

  // Countdown timer (synced locally but verified server-side during submit)
  useEffect(() => {
    if (!started || isSubmitting || isTerminated) return;

    if (timeLeft <= 0) {
      triggerSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [started, timeLeft, isSubmitting, isTerminated]);



  const handleMCSelect = (questionId: string, optionIdx: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: String(optionIdx) }));
  };

  const handleCodeChange = (questionId: string, code: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: code }));
  };

  // 2. Sandboxed compiler pipeline (delegates securely to backend /api/execute-code)
  const runTestCases = async (question: CodingQuestion) => {
    const code = answers[question.id] !== undefined ? answers[question.id] : question.starterCode;
    const lang = question.language || 'javascript';

    setRunOutputs(prev => ({
      ...prev,
      [question.id]: {
        status: 'idle',
        message: 'Aegis Sandboxed Compiler: Initiating compilation sequence...'
      }
    }));

    try {
      // Parse the target function name
      const funcNameMatch = code.match(/function\s+(\w+)\s*\(/) || code.match(/def\s+(\w+)\s*\(/);
      const funcName = funcNameMatch ? funcNameMatch[1] : null;

      if (!funcName) {
        setRunOutputs(prev => ({
          ...prev,
          [question.id]: {
            status: 'error',
            message: `Compilation Failure: Failed to locate function declaration matching the exercise layout.`
          }
        }));
        return;
      }

      const testCaseResults = [];
      let allPassed = true;

      // Run each test case sequentially on our secure backend sandbox
      const authHeaders = await getAuthHeaders();
      for (let idx = 0; idx < question.testCases.length; idx++) {
        const tc = question.testCases[idx];
        const res = await fetch('/api/execute-code', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            code,
            language: lang,
            funcName,
            inputString: tc.input,
            submissionId
          })
        });

        if (!res.ok) {
          throw new Error('Sandbox connection lost.');
        }

        const runResult = await res.json();

        if (runResult.success) {
          const expectedNormalized = tc.expectedOutput.replace(/\s+/g, '');
          const actualNormalized = JSON.stringify(runResult.result).replace(/\s+/g, '');
          const passed = expectedNormalized === actualNormalized;
          if (!passed) allPassed = false;

          testCaseResults.push({
            passed,
            detail: passed
              ? `✓ Test Case ${idx + 1} Passed (Input: ${tc.input} -> Expected: ${tc.expectedOutput})`
              : `✕ Test Case ${idx + 1} Failed (Input: ${tc.input} -> Expected: ${tc.expectedOutput}, Got: ${JSON.stringify(runResult.result)})`
          });
        } else {
          allPassed = false;
          testCaseResults.push({
            passed: false,
            detail: `✕ Test Case ${idx + 1} Error: ${runResult.error}`
          });
        }
      }

      const detailedReport = testCaseResults.map(r => r.detail).join('\n');

      setRunOutputs(prev => ({
        ...prev,
        [question.id]: {
          status: allPassed ? 'success' : 'error',
          message: allPassed
            ? `🚀 ALL TEST CASES PASSED SECURELY IN ISOLATED SANDBOX!\n\n${detailedReport}`
            : `❌ COMPILER COMPLETED WITH FAILING ASSERTIONS:\n\n${detailedReport}`
        }
      }));

    } catch (err: any) {
      setRunOutputs(prev => ({
        ...prev,
        [question.id]: {
          status: 'error',
          message: `Sandbox Execution Connection Error: ${err.message}. Please check network link.`
        }
      }));
    }
  };

  // 3. Server-Authoritative Exam Submission & AI Grading
  const triggerSubmit = async () => {
    setIsSubmitting(true);
    
    // Unlock fullscreen view
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }

    // Build finalized submission mapping
    const submissionAnswers: Record<string, string> = {};
    assessment.questions.forEach(q => {
      submissionAnswers[q.id] = answers[q.id] !== undefined ? answers[q.id] : (q.type === 'coding' ? q.starterCode : '');
    });

    try {
      // Call secure full-stack backend endpoint which:
      // - checks the server clock against startedAt
      // - runs and grades test cases on the server
      // - invokes Gemini safely for proctoring & behavior analysis
      // - saves the finalized graded document in Firestore
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/submit-assessment', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          submissionId,
          answers: submissionAnswers,
          proctoringLogs
        })
      });

      if (!res.ok) {
        throw new Error('Secure grading submission rejected.');
      }

      setIsSubmitting(false);
      onFinish();
    } catch (err: any) {
      console.error(err);
      setError('Aegis Secure Gateway could not verify grading. Forcing local cache backup... ' + err.message);
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!started) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-6 selection:bg-zinc-800">
        <div className="w-full max-w-2xl bg-[#121214] border border-zinc-800 rounded-2xl p-8 md:p-10 space-y-8 text-center shadow-2xl relative">
          <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-200">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Initiate Secure Proctor Ingress</h1>
            <p className="text-zinc-400 text-sm max-w-lg mx-auto leading-relaxed">
              You are about to enter the active evaluation stage for <span className="text-zinc-200 font-semibold">{assessment.title}</span>.
              This workspace enforces standard strict exam guidelines.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-medium text-left flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-left space-y-3.5 text-xs text-zinc-400 max-w-md mx-auto">
            <h3 className="font-semibold text-zinc-300 font-mono text-[11px] uppercase tracking-wider">Before launching the session:</h3>
            <ul className="space-y-2 list-disc list-inside">
              <li>Ensure your face is clearly visible and centered in the webcam stream.</li>
              <li>Ensure you have a reliable network connection.</li>
              <li>The exam will lock into full-screen. Exits will record violations.</li>
              <li>Keep keyboard inputs restricted to the exam window.</li>
            </ul>
          </div>

          <div className="pt-2">
            <button
              onClick={requestFullScreenAndStart}
              disabled={initializing}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-indigo-600/25 cursor-pointer active:scale-95 font-sans disabled:opacity-50 flex items-center justify-center mx-auto gap-2"
            >
              {initializing && <Loader className="w-4 h-4 animate-spin" />}
              {initializing ? 'Synchronizing clock...' : 'Start Exam'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isTerminated) {
    return (
      <div className="min-h-screen bg-[#09090b] text-rose-500 flex items-center justify-center p-6 font-mono">
        <div className="w-full max-w-3xl bg-[#121214] border border-rose-950/60 rounded-2xl p-8 md:p-10 space-y-8 shadow-2xl relative" id="termination-terminal">
          <div className="absolute top-[-10%] right-[-10%] w-[200px] h-[200px] rounded-full bg-rose-500/5 blur-[80px] pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-center gap-6 pb-6 border-b border-rose-950/40">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 flex-shrink-0 animate-pulse">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-1 text-center md:text-left">
              <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-rose-400">DISCIPLINARY PROTOCOL EXECUTED</span>
              <h1 className="text-xl md:text-2xl font-bold font-display text-zinc-100 tracking-tight">REMOVED FROM ASSESSMENT</h1>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-zinc-950 border border-rose-950/30 rounded-xl space-y-3 text-xs text-zinc-400 leading-relaxed font-sans">
              <p>
                This assessment session has been <span className="text-rose-400 font-semibold underline">automatically locked and terminated</span> because the Aegis proctoring system flagged consecutive violations of the dual-presence honor constraint.
              </p>
              <p className="font-mono text-[11px] text-zinc-500">
                SYSTEM_DECISION: AUTO_DISQUALIFICATION_STRIKE_OUT
                <br />
                REASON: MULTIPLE_FACES_LIMIT_EXCEEDED (3/3 strikes)
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] uppercase tracking-wider text-rose-400 font-bold flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                INTEGRITY VIOLATION TIMELINE
              </h3>
              <div className="border border-rose-950/30 bg-zinc-950 rounded-xl p-4 max-h-[180px] overflow-y-auto space-y-2 text-[11px]">
                {proctoringLogs.filter(log => log.type === 'multiple-faces').map((log, idx) => (
                  <div key={idx} className="p-2.5 bg-rose-950/10 border border-rose-500/10 rounded-lg space-y-0.5" id={`strike-log-${idx}`}>
                    <div className="flex justify-between text-rose-400 font-bold">
                      <span>STRIKE {idx + 1} - MULTIPLE FACES</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                    <p className="text-zinc-500 text-[10.5px] leading-relaxed">{log.details}</p>
                  </div>
                ))}
                <div className="p-2.5 bg-rose-950/20 border border-rose-500/25 rounded-lg text-rose-300 font-bold">
                  <div>FINAL EXAM TERMINATION HANDSHAKE</div>
                  <p className="text-zinc-400 text-[10.5px] font-normal leading-relaxed mt-1">
                    Candidate session closed securely and status set to <span className="font-mono text-rose-400 font-semibold text-[11px]">disqualified</span> on the examination evaluation database ledger.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={onFinish}
              id="close-terminal-btn"
              className="py-2.5 px-6 bg-rose-950/40 hover:bg-rose-950/60 text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded-xl text-xs font-semibold font-mono tracking-wider transition-all cursor-pointer flex items-center gap-2"
            >
              CLOSE SECURE GATEWAY
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion: Question = assessment.questions[currentQuestionIndex];
  const codeLang = (currentQuestion as CodingQuestion).language || 'javascript';

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col justify-between selection:bg-zinc-800">
      {/* Full-Screen / Focus Loss Siren Warning Blocker Overlay */}
      {started && (!isFullScreenActive || alarmActive) && !fullscreenBypassed && (
        <div className="fixed inset-0 z-[9999] bg-[#09090b]/98 flex items-center justify-center p-6 text-center backdrop-blur-md animate-fade-in">
          <div className="max-w-lg w-full bg-[#121214] border-2 border-rose-600 rounded-3xl p-8 space-y-6 shadow-[0_0_50px_rgba(225,29,72,0.15)] relative overflow-hidden">
            {/* Pulsing alarm warning glows */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 animate-pulse" />
            
            <div className="flex justify-center items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 animate-bounce">
                <Volume2 className="w-8 h-8" />
              </div>
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 animate-pulse">
                <ShieldAlert className="w-8 h-8" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-rose-500">AEGIS PROCTOR SYSTEM INTRUSION DETECTED</span>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100 font-display">SECURITY SIREN PROTOCOL ACTIVATED</h2>
              <p className="text-zinc-400 text-xs leading-relaxed max-w-md mx-auto">
                Swapping tabs, minimizing the browser, losing window focus, or exiting full-screen mode violates strict examination guidelines. Aegis has generated an active proctor incident alert.
              </p>
            </div>

            {/* Massive bomb-style countdown clock */}
            <div className="py-6 bg-zinc-950/80 border border-rose-950/40 rounded-2xl space-y-2">
              <div className="font-mono text-5xl md:text-6xl text-rose-500 font-bold tracking-widest drop-shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse">
                00:{alarmTimeLeft < 10 ? '0' : ''}{alarmTimeLeft}
              </div>
              <div className="text-[10px] uppercase tracking-widest font-mono text-zinc-500 font-semibold">
                Time Remaining Before Automatic Disqualification
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={handleRestoreFullScreen}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-xs transition-all cursor-pointer shadow-lg shadow-indigo-600/25 active:scale-95 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                Restore Full-Screen & Resume
              </button>

              <button
                onClick={handleExitFromAlarm}
                className="w-full py-3 bg-[#121214] hover:bg-rose-950/10 text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded-xl font-medium text-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                <VolumeX className="w-4 h-4" />
                Exit Assessment & Fail Attempt
              </button>

              <div className="text-[10px] text-zinc-500 font-mono pt-2">
                If full-screen fails or you are using the AI Studio iframe preview, click below:
                <button
                  type="button"
                  onClick={() => {
                    stopSiren();
                    setFullscreenBypassed(true);
                    setAlarmActive(false);
                    setIsFullScreenActive(true);
                  }}
                  className="block mx-auto mt-2 text-indigo-400 hover:text-indigo-300 font-semibold underline decoration-indigo-500/30 underline-offset-2 hover:decoration-indigo-400/50"
                >
                  Bypass Security Check (Developer/Reviewer Mode)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {warningModalOpen && (
        <ViolationWarningModal 
          strikeCount={strikeCount} 
          onDismiss={() => setWarningModalOpen(false)} 
        />
      )}
      
      {/* Top Bar Navigation */}
      <header className="border-b border-zinc-800 bg-zinc-950/70 h-16 px-6 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <AegisLogo size={28} />
            <span className="font-display font-semibold tracking-tight text-sm text-zinc-100">Aegis</span>
          </div>
          <span className="w-px h-4 bg-zinc-800" />
          <h2 className="text-xs font-semibold text-zinc-400 max-w-xs truncate">{assessment.title}</h2>
        </div>

        <div className="flex items-center gap-5">
          {/* Active Countdown Timer */}
          <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 border border-zinc-800 rounded-lg font-mono text-xs">
            <Clock className={`w-4 h-4 ${timeLeft < 180 ? 'text-rose-400 animate-pulse' : 'text-zinc-400'}`} />
            <span className={timeLeft < 180 ? 'text-rose-400 font-semibold' : 'text-zinc-200'}>
              {formatTime(timeLeft)}
            </span>
          </div>

          <button
            onClick={triggerSubmit}
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-white font-medium text-xs px-4 py-2 border border-emerald-500/30 rounded-lg flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/10 active:scale-95"
          >
            {isSubmitting ? (
              <>
                <Loader className="w-3.5 h-3.5 animate-spin" />
                Submitting to Aegis...
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                Final Submit
              </>
            )}
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-rose-500/15 border-b border-rose-500/25 px-6 py-3 flex items-center justify-between text-xs text-rose-400 gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button 
            onClick={() => setError('')} 
            className="text-zinc-400 hover:text-zinc-200 transition-colors font-semibold uppercase tracking-wider text-[10px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Sandbox Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 overflow-hidden">
        
        {/* Left Side: Dynamic Proctor HUD & Active Violation Feed */}
        <div className="lg:col-span-1 p-6 border-r border-zinc-800 bg-zinc-950/20 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
          {(import.meta as any).env.VITE_DISABLE_REALTIME_PROCTORING === 'true' ? (
            <div className="p-4 border border-indigo-500/10 bg-indigo-500/5 rounded-xl text-center space-y-1.5 shadow-sm">
              <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase font-mono text-indigo-400 font-bold tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                Proctor Bypass Active
              </div>
              <p className="text-zinc-400 text-[10px] leading-relaxed">
                Real-time webcam feed and eye metrics tracking have been disabled via environment configuration.
              </p>
            </div>
          ) : (
            <ProctoringHud 
              onViolationLogged={handleViolationLogged} 
              isActive={started && !isSubmitting && !isTerminated} 
              onMultipleFacesStrike={handleMultipleFacesStrike}
            />
          )}

          {/* Active Proctoring Incident Log */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">Incident Timeline</h3>
            
            <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-3 max-h-[140px] overflow-y-auto space-y-2">
              {proctoringLogs.length === 0 ? (
                <div className="text-[10px] text-zinc-500 font-mono italic text-center py-4">No violations logged. Environment is stable.</div>
              ) : (
                proctoringLogs.map((log, idx) => (
                  <div key={idx} className="text-[10px] p-2 bg-rose-500/5 border border-rose-500/10 rounded-lg space-y-0.5 animate-fade-in">
                    <div className="flex justify-between font-mono text-[9px] text-rose-400 font-semibold uppercase">
                      <span>{log.type.replace('-', ' ')}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                    <p className="text-zinc-400 text-[10px]">{log.details}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Assessment Sandbox Workspace (Takes 3 columns) */}
        <div className="lg:col-span-3 flex flex-col max-h-[calc(100vh-4rem)] bg-zinc-950/10">
          
          {/* Question Breadcrumb */}
          <div className="px-8 py-4 border-b border-zinc-800 bg-zinc-950/30 flex items-center justify-between">
            <div className="flex gap-2">
              {assessment.questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`w-8 h-8 rounded-lg border text-xs font-semibold font-mono transition-all ${currentQuestionIndex === idx ? 'bg-indigo-600 border-indigo-600 text-white shadow shadow-indigo-600/20' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            
            <div className="text-xs text-zinc-500 font-mono">
              Points: <span className="text-zinc-300 font-bold">{currentQuestion.points} pts</span>
            </div>
          </div>

          {/* Core Question Editor/Select panel */}
          <div className="flex-1 p-8 overflow-y-auto space-y-6">
            
            {/* Question Details */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold">
                Question {currentQuestionIndex + 1} • {currentQuestion.type === 'coding' ? 'Interactive Coding' : 'Theoretical Choice'}
              </span>
              <h1 className="text-lg font-medium text-zinc-100 leading-snug">
                {currentQuestion.questionText}
              </h1>
            </div>

            {/* Answer Layout */}
            {currentQuestion.type === 'multiple-choice' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-4">
                {currentQuestion.options.map((option, oIdx) => {
                  const isSelected = answers[currentQuestion.id] === String(oIdx);
                  return (
                    <button
                      key={oIdx}
                      onClick={() => handleMCSelect(currentQuestion.id, oIdx)}
                      className={`text-left p-4 rounded-xl border text-sm transition-all duration-200 cursor-pointer ${isSelected ? 'border-indigo-500/60 bg-indigo-600/5 text-zinc-100 shadow-lg' : 'border-zinc-800 bg-[#121214]/60 text-zinc-400 hover:border-zinc-700'}`}
                    >
                      <div className="flex gap-4 items-center">
                        <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-mono font-bold ${isSelected ? 'border-indigo-400 bg-indigo-600 text-white shadow-sm' : 'border-zinc-800 bg-zinc-900 text-zinc-500'}`}>
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <span className="flex-1">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              // Monaco-like Editor
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 pt-2">
                
                {/* Code Editor Column */}
                <div className="xl:col-span-2 space-y-3">
                  <div className="flex items-center justify-between bg-zinc-900/80 px-4 py-2 border border-zinc-800 rounded-t-xl text-xs font-mono text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <Code className="w-4 h-4 text-zinc-400" />
                      {codeLang === 'python' ? 'solution.py' : 'solution.js'}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-zinc-400">{codeLang === 'python' ? 'Python (v3.10)' : 'JavaScript (NodeJS v18)'}</span>
                  </div>

                  <div className="relative font-mono text-sm bg-zinc-950 border-x border-b border-zinc-800 rounded-b-xl flex overflow-hidden">
                    {/* Line numbers bar */}
                    <div className="p-4 bg-zinc-900/30 text-right select-none text-zinc-600 border-r border-zinc-800/60 min-w-[3rem] text-xs">
                      {Array.from({ length: 15 }).map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>

                    {/* Standard Monospace Input */}
                    <textarea
                      value={answers[currentQuestion.id] !== undefined ? answers[currentQuestion.id] : (currentQuestion as CodingQuestion).starterCode}
                      onChange={(e) => handleCodeChange(currentQuestion.id, e.target.value)}
                      className="w-full h-[280px] p-4 bg-transparent resize-none border-none outline-none focus:ring-0 text-zinc-200 font-mono text-xs leading-relaxed"
                      placeholder="Write your solution function here..."
                      spellCheck={false}
                      onKeyDown={(e) => {
                        // Standard Tab indentation handler
                        if (e.key === 'Tab') {
                          e.preventDefault();
                          const target = e.target as HTMLTextAreaElement;
                          const start = target.selectionStart;
                          const end = target.selectionEnd;
                          const val = target.value;
                          target.value = val.substring(0, start) + '  ' + val.substring(end);
                          target.selectionStart = target.selectionEnd = start + 2;
                        }
                      }}
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => runTestCases(currentQuestion as CodingQuestion)}
                      className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-mono text-xs border border-zinc-800 rounded-lg flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Test Solution
                    </button>
                  </div>
                </div>

                {/* Compiler Sandbox Output Column */}
                <div className="xl:col-span-1 space-y-3">
                  <div className="bg-zinc-900/80 px-4 py-2 border border-zinc-800 rounded-t-xl text-xs font-mono text-zinc-400">
                    Compiler Console Output
                  </div>

                  <div className="h-[280px] bg-[#0c0c0e] border-x border-b border-zinc-800 rounded-b-xl p-4 font-mono text-xs overflow-y-auto text-zinc-400 whitespace-pre-wrap">
                    {runOutputs[currentQuestion.id] ? (
                      <span className={runOutputs[currentQuestion.id].status === 'success' ? 'text-emerald-400' : 'text-zinc-300'}>
                        {runOutputs[currentQuestion.id].message}
                      </span>
                    ) : (
                      <span className="text-zinc-600">Waiting for compiler trigger... Click "Test Solution" to execute code inside the secure Aegis Sandbox environment.</span>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Bottom Bar Controls */}
          <footer className="border-t border-zinc-800 bg-zinc-950/40 h-16 px-8 flex items-center justify-between">
            <button
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 text-zinc-400 disabled:opacity-40 rounded-lg text-xs font-mono transition-colors cursor-pointer"
            >
              Previous
            </button>

            {currentQuestionIndex < assessment.questions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer shadow shadow-indigo-600/20 font-sans"
              >
                Next Question
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={triggerSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg active:scale-95"
              >
                Submit Assessment
                <CornerDownLeft className="w-3.5 h-3.5" />
              </button>
            )}
          </footer>

        </div>
      </div>

    </div>
  );
}
