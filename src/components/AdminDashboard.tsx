import React, { useState } from 'react';
import { Assessment, Question, Submission, UserProfile } from '../types';
import { getAssessments, getSubmissions, saveAssessment } from '../lib/db';
import { RiskDistributionChart, ViolationBreakdownChart } from './CustomCharts';
import { 
  Users, ShieldAlert, Award, FileSpreadsheet, Search, RefreshCw, 
  Plus, Eye, X, BookOpen, AlertCircle, FileText, Code, CheckCircle, Flame
} from 'lucide-react';

interface AdminDashboardProps {
  user: UserProfile;
  onLogout: () => void;
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [assessments, setAssessments] = useState<Assessment[]>(() => getAssessments());
  const [submissions, setSubmissions] = useState<Submission[]>(() => getSubmissions());
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'high' | 'low'>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  
  // Quiz creation modal states
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTime, setNewTime] = useState(30);
  const [newQuestions, setNewQuestions] = useState<Question[]>([]);

  // Individual question builder states
  const [qType, setQType] = useState<'multiple-choice' | 'coding'>('multiple-choice');
  const [qText, setQText] = useState('');
  const [qPoints, setQPoints] = useState(10);
  
  // MCQ specific
  const [mcOptions, setMcOptions] = useState<string[]>(['', '', '', '']);
  const [mcCorrectIdx, setMcCorrectIdx] = useState(0);

  // Coding specific
  const [codeStarter, setCodeStarter] = useState('function solve() {\n  // Write code\n}');
  const [testCases, setTestCases] = useState<{ input: string; expectedOutput: string }[]>([
    { input: '', expectedOutput: '' }
  ]);

  const handleRefresh = () => {
    setAssessments(getAssessments());
    setSubmissions(getSubmissions());
  };

  // Metric computations
  const totalSubmissionsCount = submissions.length;
  const averageRisk = Math.round(
    submissions.reduce((acc, s) => acc + (s.aiRiskScore || 0), 0) / (totalSubmissionsCount || 1)
  );
  const flaggedSubmissions = submissions.filter(s => (s.aiRiskScore || 0) >= 60).length;
  
  // All recorded violation log elements for donut breakdown
  const allViolationLogs = submissions.flatMap(s => s.proctoringLogs);

  // Filtered submissions
  const filteredSubmissions = submissions.filter(s => {
    const matchesSearch = s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.assessmentTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const risk = s.aiRiskScore || 0;
    if (riskFilter === 'high') return matchesSearch && risk >= 60;
    if (riskFilter === 'low') return matchesSearch && risk < 30;
    return matchesSearch;
  });

  const handleAddQuestion = () => {
    if (!qText.trim()) return;

    if (qType === 'multiple-choice') {
      const q: Question = {
        id: `q-${Date.now()}`,
        type: 'multiple-choice',
        points: qPoints,
        questionText: qText.trim(),
        options: mcOptions.map(o => o.trim() || 'Option'),
        correctOptionIndex: mcCorrectIdx
      };
      setNewQuestions(prev => [...prev, q]);
    } else {
      const q: Question = {
        id: `q-${Date.now()}`,
        type: 'coding',
        points: qPoints,
        questionText: qText.trim(),
        starterCode: codeStarter,
        testCases: testCases.filter(tc => tc.input.trim() !== '')
      };
      setNewQuestions(prev => [...prev, q]);
    }

    // Reset questions editor
    setQText('');
    setQPoints(10);
    setMcOptions(['', '', '', '']);
    setMcCorrectIdx(0);
    setCodeStarter('function solve() {\n  // Write code\n}');
    setTestCases([{ input: '', expectedOutput: '' }]);
  };

  const handleSaveQuiz = () => {
    if (!newTitle.trim() || newQuestions.length === 0) return;

    const newAssessment: Assessment = {
      assessmentId: `assess-${Date.now()}`,
      title: newTitle.trim(),
      description: newDescription.trim() || 'No description provided.',
      timeLimit: newTime,
      questions: newQuestions,
      createdBy: user.userId,
      createdAt: new Date().toISOString()
    };

    saveAssessment(newAssessment);
    setAssessments(getAssessments());
    
    // Clear quiz builder state
    setNewTitle('');
    setNewDescription('');
    setNewTime(30);
    setNewQuestions([]);
    setIsCreatingQuiz(false);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-zinc-800 pb-16">
      
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/20">
              <span className="text-sm font-display tracking-wider">IQ</span>
            </div>
            <span className="font-display font-semibold tracking-tight text-md text-zinc-100">IntegrityIQ</span>
            <span className="text-[10px] bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-zinc-400 font-mono font-medium">Examiner Dashboard</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              className="p-2 hover:bg-zinc-900 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Refresh ledger state"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-zinc-200">{user.name}</div>
              <div className="text-[10px] text-zinc-500 font-mono">Academic Proctor</div>
            </div>
            <button
              onClick={onLogout}
              className="text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-3.5 py-1.5 border border-zinc-800 rounded-lg font-mono transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        
        {/* Intro banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2">
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-zinc-100">AI Proctor Dashboard</h1>
            <p className="text-xs text-zinc-400">Review evaluation submissions, violation telemetry, and cloud risk reviews</p>
          </div>

          <button
            onClick={() => setIsCreatingQuiz(true)}
            className="bg-indigo-600 hover:bg-indigo-550 text-white font-medium text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-indigo-600/15 hover:shadow-indigo-600/30 active:scale-95 cursor-pointer font-sans"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Define New Assessment
          </button>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#121214]/60 border border-zinc-800 rounded-xl p-5 space-y-1">
            <div className="flex justify-between items-center text-zinc-500">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Active Templates</span>
              <BookOpen className="w-4 h-4 text-zinc-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-zinc-100">{assessments.length}</p>
          </div>

          <div className="bg-[#121214]/60 border border-zinc-800 rounded-xl p-5 space-y-1">
            <div className="flex justify-between items-center text-zinc-500">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Submissions</span>
              <Users className="w-4 h-4 text-zinc-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-zinc-100">{submissions.length}</p>
          </div>

          <div className="bg-[#121214]/60 border border-zinc-800 rounded-xl p-5 space-y-1">
            <div className="flex justify-between items-center text-zinc-500">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Avg Risk Score</span>
              <Flame className="w-4 h-4 text-zinc-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-amber-500">{averageRisk}%</p>
          </div>

          <div className="bg-[#121214]/60 border border-zinc-800 rounded-xl p-5 space-y-1">
            <div className="flex justify-between items-center text-zinc-500">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Highly Flagged</span>
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-rose-500">{flaggedSubmissions}</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RiskDistributionChart scores={submissions.map(s => s.aiRiskScore || 0)} />
          <ViolationBreakdownChart logs={allViolationLogs} />
        </div>

        {/* Student Submissions List */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-200">Evaluation Records Ledger</h2>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter candidate name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 rounded-lg py-1.5 pl-8 pr-4 focus:outline-none focus:border-zinc-700 w-44 font-sans"
                />
              </div>

              <div className="flex border border-zinc-800 rounded-lg p-0.5 bg-zinc-900 text-[11px] font-mono">
                <button
                  onClick={() => setRiskFilter('all')}
                  className={`px-2.5 py-1 rounded-md ${riskFilter === 'all' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setRiskFilter('high')}
                  className={`px-2.5 py-1 rounded-md ${riskFilter === 'high' ? 'bg-zinc-800 text-rose-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  High Risk
                </button>
                <button
                  onClick={() => setRiskFilter('low')}
                  className={`px-2.5 py-1 rounded-md ${riskFilter === 'low' ? 'bg-zinc-800 text-emerald-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-[#121214]/60 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/30 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                    <th className="py-3 px-5">Candidate</th>
                    <th className="py-3 px-5">Assessment</th>
                    <th className="py-3 px-5">Violations</th>
                    <th className="py-3 px-5">Correctness</th>
                    <th className="py-3 px-5">AI Risk Score</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-zinc-500 font-mono italic">
                        No submissions located matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map(sub => {
                      const risk = sub.aiRiskScore || 0;
                      let riskBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                      if (risk >= 60) riskBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                      else if (risk >= 30) riskBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/20';

                      return (
                        <tr key={sub.submissionId} className="hover:bg-zinc-900/20 transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="font-semibold text-zinc-200">{sub.studentName}</div>
                            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{sub.studentEmail}</div>
                          </td>
                          <td className="py-3.5 px-5 text-zinc-300">
                            {sub.assessmentTitle}
                          </td>
                          <td className="py-3.5 px-5 font-mono text-[11px] text-zinc-400">
                            {sub.proctoringLogs.length > 0 ? (
                              <span className="text-amber-500 font-semibold">{sub.proctoringLogs.length} flagged</span>
                            ) : (
                              <span className="text-zinc-500">0 events</span>
                            )}
                          </td>
                          <td className="py-3.5 px-5 font-mono text-[11px] text-zinc-300">
                            <span className="font-bold">{sub.score}</span> / {sub.totalPoints} pts
                          </td>
                          <td className="py-3.5 px-5">
                            <span className={`inline-block font-mono text-[11px] font-bold px-2 py-0.5 rounded border ${riskBadge}`}>
                              {risk}%
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <button
                              onClick={() => setSelectedSubmission(sub)}
                              className="px-2.5 py-1 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-[11px] text-zinc-300 rounded hover:text-zinc-100 transition-all cursor-pointer font-mono flex items-center gap-1.5 ml-auto"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </main>

      {/* QUIZ DEFINITION OVERLAY MODAL */}
      {isCreatingQuiz && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#121214] border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col justify-between">
            
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="text-md font-semibold text-zinc-100">Define Secure Assessment</h3>
              <button 
                onClick={() => setIsCreatingQuiz(false)}
                className="p-1 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left col: Basic Info */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">Title</label>
                  <input
                    type="text"
                    placeholder="e.g., Algorithms exam"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-800 rounded-xl p-2.5 text-sm focus:outline-none focus:border-zinc-700 text-zinc-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">Description</label>
                  <textarea
                    placeholder="Describe guidelines for candidates..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full h-16 bg-[#18181b] border border-zinc-800 rounded-xl p-2.5 text-sm focus:outline-none focus:border-zinc-700 text-zinc-200 resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">Duration Limit (Minutes)</label>
                  <input
                    type="number"
                    value={newTime}
                    onChange={(e) => setNewTime(parseInt(e.target.value) || 10)}
                    className="w-full bg-[#18181b] border border-zinc-800 rounded-xl p-2.5 text-sm focus:outline-none focus:border-zinc-700 text-zinc-200 font-mono"
                  />
                </div>

                {/* Question Queue */}
                <div className="space-y-2 pt-2">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">Defined Questions ({newQuestions.length})</label>
                  
                  <div className="border border-zinc-800 bg-zinc-950/40 rounded-xl p-3 max-h-[140px] overflow-y-auto space-y-2 text-xs">
                    {newQuestions.length === 0 ? (
                      <div className="text-zinc-600 font-mono text-[11px] italic text-center py-6">No questions compiled yet. Use question builder on right.</div>
                    ) : (
                      newQuestions.map((q, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 bg-[#18181b] border border-zinc-800/80 rounded-lg">
                          <span className="truncate flex-1 pr-4 text-zinc-300">Q{idx + 1}: {q.questionText}</span>
                          <span className="font-mono text-[10px] text-zinc-500 font-semibold uppercase">{q.type} • {q.points}pts</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right col: Question Builder Sandbox */}
              <div className="space-y-4 p-5 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-800/60">
                  <h4 className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wide">Question Builder</h4>
                  <div className="flex gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setQType('multiple-choice')}
                      className={`px-2 py-0.5 rounded font-semibold ${qType === 'multiple-choice' ? 'bg-zinc-800 text-zinc-100 border border-zinc-700' : 'text-zinc-500'}`}
                    >
                      Theory
                    </button>
                    <button
                      type="button"
                      onClick={() => setQType('coding')}
                      className={`px-2 py-0.5 rounded font-semibold ${qType === 'coding' ? 'bg-zinc-800 text-zinc-100 border border-zinc-700' : 'text-zinc-500'}`}
                    >
                      Coding
                    </button>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500">Question Content</label>
                    <input
                      type="text"
                      placeholder="Enter question text..."
                      value={qText}
                      onChange={(e) => setQText(e.target.value)}
                      className="w-full bg-[#18181b] border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500">Points Value</label>
                    <input
                      type="number"
                      value={qPoints}
                      onChange={(e) => setQPoints(parseInt(e.target.value) || 5)}
                      className="w-full bg-[#18181b] border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-mono"
                    />
                  </div>

                  {qType === 'multiple-choice' ? (
                    <div className="space-y-2">
                      <label className="text-[10px] text-zinc-500">Theoretical Options</label>
                      {mcOptions.map((opt, oIdx) => (
                        <div key={oIdx} className="flex gap-2 items-center">
                          <input
                            type="radio"
                            name="correctOpt"
                            checked={mcCorrectIdx === oIdx}
                            onChange={() => setMcCorrectIdx(oIdx)}
                            title="Mark as correct answer"
                          />
                          <input
                            type="text"
                            placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                            value={opt}
                            onChange={(e) => {
                              const copy = [...mcOptions];
                              copy[oIdx] = e.target.value;
                              setMcOptions(copy);
                            }}
                            className="w-full bg-[#18181b] border border-zinc-800 rounded-lg p-1.5 text-xs text-zinc-300"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-500">Starter Template</label>
                        <textarea
                          value={codeStarter}
                          onChange={(e) => setCodeStarter(e.target.value)}
                          className="w-full h-16 bg-[#18181b] border border-zinc-800 rounded-lg p-2 font-mono text-[10px] text-zinc-300"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500">Validation Test Cases (Starter)</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Input params (e.g., [2,7],9)"
                            value={testCases[0]?.input || ''}
                            onChange={(e) => {
                              const copy = [...testCases];
                              copy[0] = { ...copy[0], input: e.target.value };
                              setTestCases(copy);
                            }}
                            className="bg-[#18181b] border border-zinc-800 rounded p-1.5 font-mono text-[10px] text-zinc-300"
                          />
                          <input
                            type="text"
                            placeholder="Expected (e.g., [0,1])"
                            value={testCases[0]?.expectedOutput || ''}
                            onChange={(e) => {
                              const copy = [...testCases];
                              copy[0] = { ...copy[0], expectedOutput: e.target.value };
                              setTestCases(copy);
                            }}
                            className="bg-[#18181b] border border-zinc-800 rounded p-1.5 font-mono text-[10px] text-zinc-300"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs py-2 rounded-lg font-mono transition-colors active:scale-95 cursor-pointer"
                  >
                    Compile Question into Quiz
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-900/10">
              <button
                type="button"
                onClick={() => setIsCreatingQuiz(false)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 rounded-xl text-xs font-mono cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuiz}
                disabled={newQuestions.length === 0 || !newTitle.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-550 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow shadow-indigo-600/10 font-sans"
              >
                Assemble & Publish Quiz
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DETAIL SUBMISSION COMPLETED INSPECTOR */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#121214] border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col justify-between">
            
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/10">
              <div>
                <h3 className="text-md font-semibold text-zinc-100">Proctor Integrity Report</h3>
                <p className="text-[11px] text-zinc-500 font-mono mt-0.5">Session Ingress ID: {selectedSubmission.submissionId}</p>
              </div>
              <button 
                onClick={() => setSelectedSubmission(null)}
                className="p-1 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left 2 columns: Candidate Answers & Timeline */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Candidate Overview */}
                <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-zinc-500 font-mono block">CANDIDATE</span>
                    <strong className="text-zinc-200 block mt-0.5">{selectedSubmission.studentName}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-mono block">EVALUATION</span>
                    <strong className="text-zinc-200 block mt-0.5 truncate">{selectedSubmission.assessmentTitle}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-mono block">CORRECTNESS</span>
                    <strong className="text-zinc-200 block mt-0.5 font-mono">{selectedSubmission.score} / {selectedSubmission.totalPoints} pts</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-mono block">COMPLETED AT</span>
                    <strong className="text-zinc-200 block mt-0.5 font-mono">{new Date(selectedSubmission.submittedAt || '').toLocaleDateString()}</strong>
                  </div>
                </div>

                {/* Candidate Written Answers */}
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-zinc-200 font-mono uppercase tracking-wider">Submitted Answers</h4>
                  
                  <div className="space-y-3.5 max-h-[300px] overflow-y-auto">
                    {Object.entries(selectedSubmission.answers).map(([qId, ans]) => {
                      return (
                        <div key={qId} className="p-4 bg-[#18181b]/50 border border-zinc-800 rounded-xl space-y-2">
                          <span className="text-[9px] font-mono text-zinc-500 font-semibold uppercase block">Question ID: {qId}</span>
                          <div className="font-mono text-xs bg-zinc-950 p-3 rounded-lg border border-zinc-900 text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                            {String(ans).trim()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Proctor violation logs */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-zinc-200 font-mono uppercase tracking-wider">Proctor Incident Logs</h4>
                  
                  <div className="border border-zinc-800 bg-zinc-950/40 rounded-xl p-3.5 max-h-[160px] overflow-y-auto space-y-2 text-xs">
                    {selectedSubmission.proctoringLogs.length === 0 ? (
                      <div className="text-zinc-600 font-mono italic text-center py-6">All exam segments completed in perfect conformance.</div>
                    ) : (
                      selectedSubmission.proctoringLogs.map((log, idx) => (
                        <div key={idx} className="flex gap-4 p-2 bg-[#18181b] border border-zinc-800 rounded-lg">
                          <span className="text-rose-400 font-semibold font-mono text-[10px] uppercase w-24 flex-shrink-0">{log.type}</span>
                          <p className="text-zinc-400 flex-1 text-[11px]">{log.details}</p>
                          <span className="text-zinc-500 font-mono text-[10px] flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Right column: AI Analysis Overview */}
              <div className="space-y-6">
                
                {/* Score Dial Banner */}
                <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-center space-y-2.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold block">INTEGRITY RISK PROFILE</span>
                  
                  <div className="relative inline-flex items-center justify-center">
                    <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#27272a" strokeWidth="3" />
                      <circle
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="transparent"
                        stroke={(selectedSubmission.aiRiskScore || 0) >= 60 ? '#ef4444' : (selectedSubmission.aiRiskScore || 0) >= 30 ? '#f59e0b' : '#10b981'}
                        strokeWidth="3.5"
                        strokeDasharray={`${selectedSubmission.aiRiskScore || 0} ${100 - (selectedSubmission.aiRiskScore || 0)}`}
                        strokeDashoffset="25"
                      />
                    </svg>
                    <span className="absolute text-xl font-bold font-mono text-zinc-100">{selectedSubmission.aiRiskScore || 0}%</span>
                  </div>

                  <span className={`inline-block text-[11px] font-bold px-3 py-1 rounded-full border ${
                    (selectedSubmission.aiRiskScore || 0) >= 60 ? 'bg-rose-500/10 text-rose-400 border-rose-500/25' : 
                    (selectedSubmission.aiRiskScore || 0) >= 30 ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' : 
                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                  }`}>
                    {(selectedSubmission.aiRiskScore || 0) >= 60 ? 'CRITICAL DISHONESTY RISK' : 
                     (selectedSubmission.aiRiskScore || 0) >= 30 ? 'SUSPICIOUS CAUTION' : 
                     'TRUSTWORTHY PROFILE'}
                  </span>
                </div>

                {/* AI Proctor Summary (rendered beautifully) */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold text-zinc-200 font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-emerald-400" />
                    AI Intelligence Review
                  </h4>

                  <div className="p-4 bg-[#18181b] border border-zinc-800 rounded-xl max-h-[240px] overflow-y-auto text-zinc-300 text-[11px] leading-relaxed whitespace-pre-line font-sans prose prose-invert prose-sm">
                    {selectedSubmission.aiProctoringSummary || 'IntegrityIQ cloud risk engine has not finalized calculations for this submission profile.'}
                  </div>
                </div>

              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 flex justify-end bg-zinc-900/10">
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-550 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow shadow-indigo-600/10 font-sans"
              >
                Close Report
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
