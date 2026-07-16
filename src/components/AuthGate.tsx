import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { findUserByEmail, registerUser, setCurrentUser } from '../lib/db';
import { ShieldCheck, User, Users, Lock, Mail, Eye, EyeOff } from 'lucide-react';

interface AuthGateProps {
  onAuthSuccess: (user: UserProfile) => void;
}

export default function AuthGate({ onAuthSuccess }: AuthGateProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<UserRole>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please provide a valid email address.');
      return;
    }

    if (isLogin) {
      const existing = findUserByEmail(email);
      if (!existing) {
        setError('No account found with this email. Please sign up first.');
        return;
      }
      setCurrentUser(existing);
      onAuthSuccess(existing);
    } else {
      if (!name || name.trim().length < 2) {
        setError('Please enter a display name (minimum 2 characters).');
        return;
      }
      const existing = findUserByEmail(email);
      if (existing) {
        setError('Account with this email already exists. Try signing in.');
        return;
      }

      const newUser: UserProfile = {
        userId: `${role}-${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        createdAt: new Date().toISOString()
      };

      registerUser(newUser);
      setCurrentUser(newUser);
      onAuthSuccess(newUser);
    }
  };

  const loadDemoAccount = (roleType: UserRole) => {
    const demoEmail = roleType === 'admin' ? 'keerthivasangkv77@gmail.com' : 'alex@student.com';
    const existing = findUserByEmail(demoEmail);
    if (existing) {
      setCurrentUser(existing);
      onAuthSuccess(existing);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-4 selection:bg-zinc-800">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 bg-[#121214] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        
        {/* Left Panel: Display/Brand details */}
        <div className="p-8 md:p-12 bg-gradient-to-br from-zinc-900 via-zinc-900 to-indigo-950/20 border-r border-zinc-850 flex flex-col justify-between relative overflow-hidden">
          {/* subtle background circular neon mask */}
          <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/20 text-white">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="font-display font-bold tracking-tight text-lg text-zinc-100">IntegrityIQ</span>
          </div>

          <div className="my-12 relative z-10 space-y-6">
            <h1 className="text-3xl font-display font-medium tracking-tight leading-snug text-zinc-100">
              The Intelligent Proctoring and Real-Time Assessment Platform.
            </h1>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-md">
              Combining advanced webcam gaze-tracking, focus constraints, and server-side Gemini 2.5 risk analysis to power secure, honest, and smart technical evaluations.
            </p>

            <div className="space-y-3 pt-4 border-t border-zinc-800">
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                Webcam & Canvas Eye-Gaze Detection HUD
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                Active Browser Blur & Paste Blocking Telemetry
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                Gemini-powered Structural Answer Review
              </div>
            </div>
          </div>

          <div className="text-xs text-zinc-500 font-mono relative z-10">
            Secure Session Ingress • Port 3000 Verified
          </div>
        </div>

        {/* Right Panel: Active Auth Forms */}
        <div className="p-8 md:p-12 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-medium tracking-tight text-zinc-100">
                {isLogin ? 'Sign in to Assessment' : 'Create examiner account'}
              </h2>
              <p className="text-sm text-zinc-400">
                {isLogin ? 'Provide your credentials or launch a demonstration workspace' : 'Create an administrative profile to define and proctor quizzes'}
              </p>
            </div>

            {/* Quick Demo Launchers */}
            <div className="grid grid-cols-2 gap-3 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
              <button 
                type="button"
                onClick={() => loadDemoAccount('student')}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60 transition-all font-mono"
              >
                <User className="w-3.5 h-3.5" />
                Demo Student
              </button>
              <button 
                type="button"
                onClick={() => loadDemoAccount('admin')}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60 transition-all font-mono"
              >
                <Users className="w-3.5 h-3.5" />
                Demo Examiner
              </button>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-zinc-800"></div>
              <span className="flex-shrink mx-4 text-[11px] font-mono uppercase text-zinc-500 tracking-widest">Or enter email</span>
              <div className="flex-grow border-t border-zinc-800"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-medium leading-relaxed">
                  {error}
                </div>
              )}

              {/* Role selection for signup */}
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">Workspace Role</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className={`py-2.5 px-4 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all ${role === 'student' ? 'border-indigo-500/80 bg-indigo-600/15 text-indigo-400 shadow-md shadow-indigo-600/5' : 'border-zinc-800 bg-[#18181b]/50 text-zinc-400 hover:border-zinc-700'}`}
                    >
                      <User className="w-3.5 h-3.5" />
                      Candidate
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('admin')}
                      className={`py-2.5 px-4 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all ${role === 'admin' ? 'border-indigo-500/80 bg-indigo-600/15 text-indigo-400 shadow-md shadow-indigo-600/5' : 'border-zinc-800 bg-[#18181b]/50 text-zinc-400 hover:border-zinc-700'}`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      Examiner
                    </button>
                  </div>
                </div>
              )}

              {/* Display Name for signup */}
              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold" htmlFor="nameInput">Display Name</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      id="nameInput"
                      type="text"
                      placeholder="e.g., Alex Mercer"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#18181b] border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold" htmlFor="emailInput">Academic Email</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    id="emailInput"
                    type="email"
                    placeholder="name@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
                  />
                </div>
              </div>

              {/* Password field - client-side placeholder style to look premium */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold" htmlFor="passwordInput">Secret Token / Password</label>
                  {isLogin && <button type="button" className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors font-mono">Verify Token?</button>}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="passwordInput"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    defaultValue="demo_password"
                    disabled
                    className="w-full bg-[#18181b]/50 border border-zinc-800/70 rounded-xl py-2.5 pl-10 pr-10 text-sm text-zinc-500 cursor-not-allowed font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 active:scale-[0.99] mt-2 cursor-pointer font-sans"
              >
                {isLogin ? 'Sign In to Dashboard' : 'Create Secure Profile'}
              </button>
            </form>
          </div>

          <div className="pt-8 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors font-mono"
            >
              {isLogin ? "Don't have an account? Create an examiner profile" : 'Already have an academic profile? Sign In'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
