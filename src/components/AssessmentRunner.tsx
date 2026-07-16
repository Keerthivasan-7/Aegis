import React, { useEffect, useState } from 'react';
import { Assessment, CodingQuestion, ProctoringLog, Question, Submission, UserProfile } from '../types';
import { saveSubmission } from '../lib/db';
import ProctoringHud from './ProctoringHud';
import { Clock, ShieldAlert, FileText, CheckCircle, Play, Loader2, Code, FileCheck, ArrowRight, CornerDownLeft } from 'lucide-react';

interface AssessmentRunnerProps {
  user: UserProfile;
  assessment: Assessment;
  onFinish: () => void;
}

export default function AssessmentRunner({ user, assessment, onFinish }: AssessmentRunnerProps) {
  const [submissionId] = useState(`sub-${Math.random().toString(36).substr(2, 9)}`);
  const [started, setStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [proctoringLogs, setProctoringLogs] = useState<ProctoringLog[]>([]);
  const [timeLeft, setTimeLeft] = useState(assessment.timeLimit * 60); // seconds
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runOutputs, setRunOutputs] = useState<Record<string, { status: 'idle' | 'success' | 'error', message: string }>>({});

  // Trigger full-screen on exam startup
  const requestFullScreenAndStart = () => {
    const docEl = document.documentElement;
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().catch(() => {});
    }
    setStarted(true);
  };

  // Log a proctoring violation locally
  const handleViolationLogged = (log: ProctoringLog) => {
    setProctoringLogs(prev => [...prev, log]);
  };

  // Countdown timer
  useEffect(() => {
    if (!started || isSubmitting) return;

    if (timeLeft <= 0) {
      triggerSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [started, timeLeft, isSubmitting]);

  const handleMCSelect = (questionId: string, optionIdx: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: String(optionIdx) }));
  };

  const handleCodeChange = (questionId: string, code: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: code }));
  };

  // Simulating actual running of coding test cases inside the candidate's browser!
  const runTestCases = (question: CodingQuestion) => {
    const code = answers[question.id] || question.starterCode;
    setRunOutputs(prev => ({ ...prev, [question.id]: { status: 'idle', message: 'Executing compiler...' } }));

    setTimeout(() => {
      try {
        // Safe evaluation of the written function string
        // We will define the written function using a Function constructor
        // e.g., Function("nums", "target", code + "; return twoSum(nums, target);")
        // To handle different function names or direct returns, we wrap inside an IIFE
        const cleanCode = code.trim();
        
        const testCaseResults = question.testCases.map((tc, index) => {
          try {
            // Find function name inside the code string
            const funcNameMatch = cleanCode.match(/function\s+(\w+)\s*\(/);
            const funcName = funcNameMatch ? funcNameMatch[1] : null;

            if (!funcName) {
              return { index, passed: false, detail: 'Failed to locate a valid JS function declaration.' };
            }

            // Create executable sandbox function
            const executor = new Function(`
              ${cleanCode};
              try {
                return ${funcName}(${tc.input});
              } catch(e) {
                return "execution_error: " + e.message;
              }
            `);

            const actualOutput = executor();
            const stringifiedActual = JSON.stringify(actualOutput);
            
            // Normalize expected and actual outputs for standard comparison
            const expectedNormalized = tc.expectedOutput.replace(/\s+/g, '');
            const actualNormalized = stringifiedActual.replace(/\s+/g, '');

            const passed = expectedNormalized === actualNormalized;
            return {
              index,
              passed,
              detail: passed 
                ? `Test Case ${index + 1} Passed (Input: ${tc.input} -> Expected: ${tc.expectedOutput})` 
                : `Test Case ${index + 1} Failed (Input: ${tc.input} -> Expected: ${tc.expectedOutput}, Got: ${stringifiedActual})`
            };
          } catch (err: any) {
            return { index, passed: false, detail: `Test Case ${index + 1} Error: ${err.message}` };
          }
        });

        const allPassed = testCaseResults.every(r => r.passed);
        const detailedReport = testCaseResults.map(r => r.detail).join('\n');

        setRunOutputs(prev => ({
          ...prev,
          [question.id]: {
            status: allPassed ? 'success' : 'error',
            message: allPassed 
              ? `🚀 ALL TEST CASES PASSED!\n\n${detailedReport}`
              : `❌ SOME TEST CASES FAILED:\n\n${detailedReport}`
          }
        }));

      } catch (compileError: any) {
        setRunOutputs(prev => ({
          ...prev,
          [question.id]: {
            status: 'error',
            message: `Compilation / Syntax Error: ${compileError.message}`
          }
        }));
      }
    }, 800);
  };

  // Submit assessment logic
  const triggerSubmit = async () => {
    setIsSubmitting(true);
    
    // Attempt exiting fullscreen gracefully on submit
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }

    // Prepare complete answers payload
    const submissionAnswers: Record<string, string> = {};
    assessment.questions.forEach(q => {
      submissionAnswers[q.id] = answers[q.id] || (q.type === 'coding' ? q.starterCode : '');
    });

    // Score Multiple Choice questions locally
    let totalScore = 0;
    let totalPossible = 0;

    assessment.questions.forEach(q => {
      totalPossible += q.points;
      if (q.type === 'multiple-choice') {
        const studentAns = submissionAnswers[q.id];
        if (studentAns !== undefined && parseInt(studentAns) === q.correctOptionIndex) {
          totalScore += q.points;
        }
      } else {
        // Coding questions are scored dynamically or initialized to partial default points based on test runs
        const output = runOutputs[q.id];
        if (output && output.status === 'success') {
          totalScore += q.points; // Give full points if all tests passed locally
        } else {
          totalScore += Math.floor(q.points * 0.4); // Partial credit for starter/edited solution
        }
      }
    });

    const activeSubmission: Submission = {
      submissionId,
      assessmentId: assessment.assessmentId,
      assessmentTitle: assessment.title,
      studentId: user.userId,
      studentName: user.name,
      studentEmail: user.email,
      answers: submissionAnswers,
      status: 'submitted',
      score: totalScore,
      totalPoints: totalPossible,
      proctoringLogs,
      startedAt: new Date(Date.now() - timeLeft * 1000).toISOString(),
    };

    try {
      // Call secure full-stack backend Gemini API for deep assessment risk calculation!
      const res = await fetch('/api/analyze-risk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          submission: activeSubmission,
          questions: assessment.questions
        })
      });

      if (res.ok) {
        const result = await res.json();
        activeSubmission.aiRiskScore = result.aiRiskScore;
        activeSubmission.aiProctoringSummary = result.aiProctoringSummary;
      }
    } catch (e) {
      console.error('Failed calling Gemini Risk Proxy:', e);
    }

    activeSubmission.status = 'graded';
    activeSubmission.submittedAt = new Date().toISOString();
    
    saveSubmission(activeSubmission);
    setIsSubmitting(false);
    onFinish();
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
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-indigo-600/25 cursor-pointer active:scale-95 font-sans"
            >
              Configure Webcam & Launch Exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion: Question = assessment.questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col justify-between selection:bg-zinc-800">
      
      {/* Top Bar Navigation */}
      <header className="border-b border-zinc-800 bg-zinc-950/70 h-16 px-6 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="font-bold text-sm tracking-wider text-zinc-300 font-mono uppercase">INTEGRITY•IQ</div>
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
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Analyzing Integrity...
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

      {/* Main Sandbox Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 overflow-hidden">
        
        {/* Left Side: Dynamic Proctor HUD & Active Violation Feed */}
        <div className="lg:col-span-1 p-6 border-r border-zinc-800 bg-zinc-950/20 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
          <ProctoringHud 
            onViolationLogged={handleViolationLogged} 
            isActive={started && !isSubmitting} 
          />

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
                      solution.js
                    </span>
                    <span className="text-[10px]">JavaScript (NodeJS v18)</span>
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
                      <span className="text-zinc-600">Waiting for compiler trigger... Click "Test Solution" to run local JavaScript test cases against inputs.</span>
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
