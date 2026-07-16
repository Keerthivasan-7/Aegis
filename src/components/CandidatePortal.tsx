import React from 'react';
import { Assessment, Submission, UserProfile } from '../types';
import { getAssessments, getSubmissionsForStudent } from '../lib/db';
import { BookOpen, Calendar, Clock, Award, ShieldAlert, CheckCircle, FileCode, Play } from 'lucide-react';

interface CandidatePortalProps {
  user: UserProfile;
  onSelectAssessment: (assessment: Assessment) => void;
  onLogout: () => void;
}

export default function CandidatePortal({ user, onSelectAssessment, onLogout }: CandidatePortalProps) {
  const assessments = getAssessments();
  const submissions = getSubmissionsForStudent(user.userId);

  const getSubmissionStatus = (assessmentId: string): Submission | undefined => {
    return submissions.find(s => s.assessmentId === assessmentId);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 selection:bg-indigo-500/30">
      
      {/* Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/20">
              <span className="text-sm font-display tracking-wider">IQ</span>
            </div>
            <span className="font-display font-semibold tracking-tight text-md text-zinc-100">IntegrityIQ</span>
            <span className="text-[10px] bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-zinc-400 font-mono font-medium">Candidate Portal</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-zinc-100">{user.name}</div>
              <div className="text-[10px] text-zinc-500 font-mono font-medium">{user.email}</div>
            </div>
            <button
              onClick={onLogout}
              className="text-xs bg-zinc-900 hover:bg-zinc-850 hover:text-zinc-100 text-zinc-300 px-3.5 py-1.5 border border-zinc-800 rounded-lg font-mono transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10 space-y-12">
        
        {/* Banner/Introduction */}
        <div className="p-8 md:p-10 bg-gradient-to-br from-zinc-900 via-zinc-900 to-indigo-950/30 border border-zinc-800/80 rounded-2xl relative overflow-hidden flex flex-col justify-between shadow-sm">
          <div className="absolute top-[-20%] right-[-10%] w-[350px] h-[350px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
          <div className="space-y-4 max-w-2xl relative z-10">
            <h1 className="text-3xl font-display font-medium tracking-tight text-zinc-100">
              Welcome back, <span className="text-indigo-400 underline decoration-indigo-500/30 underline-offset-4 font-semibold">{user.name}</span>.
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              IntegrityIQ uses intelligent proctoring systems to guarantee equal and fair conditions for every test taker.
              Before initiating any evaluation, please ensure your camera works and configure your workspace to prevent external disruptions.
            </p>
          </div>
        </div>

        {/* Two Columns: Left (Active Tests), Right (Previous logs & constraints) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Active Assessments List (Takes 2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-zinc-400" />
              <h2 className="text-md font-semibold text-zinc-100">Available Examinations</h2>
            </div>

            {assessments.length === 0 ? (
              <div className="border border-dashed border-zinc-800 rounded-xl p-8 text-center text-sm text-zinc-500 font-mono">
                No assessments scheduled currently.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {assessments.map(assessment => {
                  const submission = getSubmissionStatus(assessment.assessmentId);
                  const isSubmitted = submission !== undefined;

                  return (
                    <div 
                      key={assessment.assessmentId}
                      className="group bg-[#121214]/80 border border-zinc-800 hover:border-zinc-700 rounded-xl p-6 flex flex-col justify-between sm:flex-row sm:items-center gap-6 transition-all"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2.5">
                          <h3 className="font-semibold text-zinc-100 text-sm group-hover:text-zinc-200 transition-colors">
                            {assessment.title}
                          </h3>
                          {isSubmitted && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                              Completed
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
                          {assessment.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-zinc-500 font-mono pt-1">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {assessment.timeLimit} mins
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5" />
                            {assessment.questions.length} questions
                          </span>
                          <span className="flex items-center gap-1.5">
                            <FileCode className="w-3.5 h-3.5" />
                            {assessment.questions.filter(q => q.type === 'coding').length > 0 ? 'Code + Theory' : 'Theory Only'}
                          </span>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-stretch justify-center gap-2 sm:min-w-[140px]">
                        {isSubmitted ? (
                          <div className="w-full text-center py-2 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 font-mono">
                            {submission.status === 'graded' ? (
                              <div className="space-y-1">
                                <div className="text-[10px] text-zinc-500">Graded Result</div>
                                <div className="text-zinc-100 font-semibold">{submission.score} / {submission.totalPoints} pts</div>
                              </div>
                            ) : (
                              'Pending Review'
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => onSelectAssessment(assessment)}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 font-sans"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            Start Exam
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Secure Rules Panel (Takes 1 column) */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-zinc-400" />
              <h2 className="text-md font-semibold text-zinc-100">Honor Constraints</h2>
            </div>

            <div className="bg-[#121214]/60 border border-zinc-800 rounded-xl p-6 space-y-6">
              <div className="text-xs text-zinc-400 leading-relaxed space-y-4">
                <p>
                  IntegrityIQ acts as an autonomous digital proctor. The following events are logged in real-time and analyzed by Gemini for final grading validation:
                </p>

                <div className="space-y-3 font-mono text-[11px]">
                  <div className="flex gap-2.5 items-start p-2.5 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                    <span className="text-amber-500 font-semibold font-sans">01</span>
                    <div>
                      <strong className="text-zinc-200">Browser Focus Detection</strong>
                      <p className="text-zinc-500 mt-0.5">Leaving the exam tab generates a tab-switch alert immediately.</p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 items-start p-2.5 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                    <span className="text-amber-500 font-semibold font-sans">02</span>
                    <div>
                      <strong className="text-zinc-200">Full-Screen Requirement</strong>
                      <p className="text-zinc-500 mt-0.5">Exiting full-screen view is restricted and creates critical proctor alerts.</p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 items-start p-2.5 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                    <span className="text-amber-500 font-semibold font-sans">03</span>
                    <div>
                      <strong className="text-zinc-200">Copy-Paste Prevention</strong>
                      <p className="text-zinc-500 mt-0.5">Manual paste events within editor/textareas are actively blocked and flagged.</p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 items-start p-2.5 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                    <span className="text-amber-500 font-semibold font-sans">04</span>
                    <div>
                      <strong className="text-zinc-200">Eye-Gaze & Presence</strong>
                      <p className="text-zinc-500 mt-0.5">Webcam tracking registers look-away angles, multiple faces, and room absences.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-xs">
                  <h4 className="font-semibold text-emerald-400">Environment Ready</h4>
                  <p className="text-emerald-500/80 leading-relaxed font-sans">Camera and browser compatibility checks are fully compliant. You are ready to start.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

    </div>
  );
}
