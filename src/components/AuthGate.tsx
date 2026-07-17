import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { getUserProfile, registerUserDoc } from '../lib/db';
import { 
  ShieldCheck, 
  User, 
  Users, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Loader, 
  AlertCircle, 
  HelpCircle,
  Check,
  X
} from 'lucide-react';

interface AuthGateProps {
  onAuthSuccess: (user: UserProfile) => void;
}

export default function AuthGate({ onAuthSuccess }: AuthGateProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<UserRole>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showConfigTroubleshooter, setShowConfigTroubleshooter] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Strength calculation
  const getPasswordRules = (pass: string) => {
    return [
      { label: 'Minimum 8 characters', met: pass.length >= 8 },
      { label: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(pass) },
      { label: 'One lowercase letter (a-z)', met: /[a-z]/.test(pass) },
      { label: 'One number (0-9)', met: /[0-9]/.test(pass) },
      { label: 'One symbol (e.g. !@#$)', met: /[^A-Za-z0-9]/.test(pass) },
    ];
  };

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-zinc-800', textColor: 'text-zinc-500' };
    const rules = getPasswordRules(pass);
    const score = rules.filter(r => r.met).length;

    if (score <= 2) {
      return { score, label: 'Weak', color: 'bg-rose-500', textColor: 'text-rose-400' };
    } else if (score <= 4) {
      return { score, label: 'Medium', color: 'bg-amber-500', textColor: 'text-amber-400' };
    } else {
      return { score, label: 'Strong (Secure)', color: 'bg-emerald-500', textColor: 'text-emerald-400' };
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setResetEmailSent(false);
    if (!email || !email.includes('@')) {
      setError('Please enter your academic email address above first to receive a password reset link.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetEmailSent(true);
    } catch (err: any) {
      console.error('Password Reset Error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('No registered account was found with this academic email.');
      } else {
        setError(err.message || 'Failed to send password reset email.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetEmailSent(false);
    setShowConfigTroubleshooter(false);
    setLoading(true);

    if (!email) {
      setError('Please provide a valid email address.');
      setLoading(false);
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        // Sign in with Firebase Auth
        const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const profile = await getUserProfile(credential.user.uid);
        if (profile) {
          onAuthSuccess(profile);
        } else {
          // Fallback if profile not found in DB
          const fallback: UserProfile = {
            userId: credential.user.uid,
            name: credential.user.displayName || 'Candidate',
            email: credential.user.email || email,
            role: 'student',
            createdAt: new Date().toISOString()
          };
          await registerUserDoc(fallback);
          onAuthSuccess(fallback);
        }
      } else {
        if (!name || name.trim().length < 2) {
          setError('Please enter a display name (minimum 2 characters).');
          setLoading(false);
          return;
        }

        // Real production password rules
        const passwordErrors: string[] = [];
        if (password.length < 8) {
          passwordErrors.push('at least 8 characters');
        }
        if (!/[A-Z]/.test(password)) {
          passwordErrors.push('one uppercase letter');
        }
        if (!/[a-z]/.test(password)) {
          passwordErrors.push('one lowercase letter');
        }
        if (!/[0-9]/.test(password)) {
          passwordErrors.push('one number');
        }
        if (!/[^A-Za-z0-9]/.test(password)) {
          passwordErrors.push('one symbol');
        }

        if (passwordErrors.length > 0) {
          setError(`Password does not meet Aegis rules. Requirements failed: ${passwordErrors.join(', ')}.`);
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match. Please ensure both fields are identical.');
          setLoading(false);
          return;
        }

        // Sign up with Firebase Auth
        const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
        await updateProfile(credential.user, { displayName: name.trim() });

        const newUser: UserProfile = {
          userId: credential.user.uid,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          createdAt: new Date().toISOString()
        };

        await registerUserDoc(newUser);
        onAuthSuccess(newUser);
      }
    } catch (err: any) {
      console.error('Authentication Error:', err);
      if (err.code === 'auth/api-key-not-valid') {
        setError('Firebase API key is not valid. Configure a valid Firebase project in your .env file.');
      } else if (err.code === 'auth/configuration-not-found' || err.message?.includes('configuration-not-found')) {
        setShowConfigTroubleshooter(true);
        setError('Email & Password Auth is not enabled in your Firebase project.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid academic email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This academic email is already registered.');
      } else {
        setError(err.message || 'An error occurred during authentication.');
      }
    } finally {
      setLoading(false);
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
            <span className="font-display font-bold tracking-tight text-lg text-zinc-100">Aegis</span>
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
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
                Webcam & Canvas Eye-Gaze Detection HUD
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
                Active Browser Blur & Paste Blocking Telemetry
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
                Gemini-powered Structural Answer Review
              </div>
            </div>
          </div>

          <div className="text-xs text-zinc-500 font-mono relative z-10 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Secure Session Ingress • Full-Stack Mode Active
          </div>
        </div>

        {/* Right Panel: Active Auth Forms */}
        <div className="p-8 md:p-12 flex flex-col justify-between overflow-y-auto max-h-[90vh] md:max-h-[unset]">
          <div className="space-y-5">
            <div className="space-y-2">
              <h2 className="text-2xl font-medium tracking-tight text-zinc-100">
                {isLogin ? 'Sign in to Assessment' : 'Create examiner account'}
              </h2>
              <p className="text-sm text-zinc-400">
                {isLogin ? 'Provide credentials to access your assessment session' : 'Create an administrative profile to define and proctor quizzes'}
              </p>
            </div>



            <form onSubmit={handleSubmit} className="space-y-3.5">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-medium leading-relaxed flex gap-2 items-start">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <div>{error}</div>
                </div>
              )}

              {resetEmailSent && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-medium leading-relaxed flex gap-2 items-start">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 animate-ping flex-shrink-0" />
                  <div>
                    Secure password reset link has been dispatched to <span className="font-mono text-zinc-200">{email}</span>. Please inspect your inbox and spam folders.
                  </div>
                </div>
              )}

              {/* Troubleshooting walkthrough for unconfigured Firebase Auth providers */}
              {showConfigTroubleshooter && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 leading-relaxed space-y-2.5">
                  <div className="font-semibold flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-amber-400" />
                    How to enable Email/Password Authentication:
                  </div>
                  <ol className="list-decimal pl-4 space-y-1 font-mono text-[11px] text-zinc-300">
                    <li>Open your <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-200">Firebase Console</a>.</li>
                    <li>Select project <span className="text-amber-200">aegis-c4cfc</span>.</li>
                    <li>Go to <span className="text-amber-200">Authentication</span> &rarr; <span className="text-amber-200">Sign-in method</span>.</li>
                    <li>Click <span className="text-amber-200">Add new provider</span> and choose <span className="text-amber-200">Email/Password</span>.</li>
                    <li>Enable it and hit <span className="text-amber-200">Save</span>.</li>
                  </ol>
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
                      className={`py-2.5 px-4 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${role === 'student' ? 'border-indigo-500/80 bg-indigo-600/15 text-indigo-400' : 'border-zinc-800 bg-[#18181b]/50 text-zinc-400 hover:border-zinc-750'}`}
                    >
                      <User className="w-3.5 h-3.5" />
                      Candidate
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('admin')}
                      className={`py-2.5 px-4 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${role === 'admin' ? 'border-indigo-500/80 bg-indigo-600/15 text-indigo-400' : 'border-zinc-800 bg-[#18181b]/50 text-zinc-400 hover:border-zinc-750'}`}
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
                      className="w-full bg-[#18181b] border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-750 transition-colors"
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
                    className="w-full bg-[#18181b] border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-750 transition-colors"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold" htmlFor="passwordInput">Password</label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-[10px] text-zinc-500 hover:text-indigo-400 font-mono transition-colors underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="passwordInput"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-800 rounded-xl py-2.5 pl-10 pr-10 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-750 transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {!isLogin && password && (
                  <div className="space-y-2 mt-1.5 p-3 bg-zinc-900/50 border border-zinc-850 rounded-xl">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-zinc-500 uppercase">Aegis Strength Profile:</span>
                      <span className={`${getPasswordStrength(password).textColor} font-semibold uppercase`}>
                        {getPasswordStrength(password).label}
                      </span>
                    </div>
                    <div className="h-1 w-full bg-zinc-950 rounded-full overflow-hidden flex gap-0.5">
                      <div className={`h-full flex-1 transition-all duration-300 ${getPasswordStrength(password).score >= 1 ? getPasswordStrength(password).color : 'bg-zinc-800'}`} />
                      <div className={`h-full flex-1 transition-all duration-300 ${getPasswordStrength(password).score >= 2 ? getPasswordStrength(password).color : 'bg-zinc-800'}`} />
                      <div className={`h-full flex-1 transition-all duration-300 ${getPasswordStrength(password).score >= 3 ? getPasswordStrength(password).color : 'bg-zinc-800'}`} />
                      <div className={`h-full flex-1 transition-all duration-300 ${getPasswordStrength(password).score >= 4 ? getPasswordStrength(password).color : 'bg-zinc-800'}`} />
                      <div className={`h-full flex-1 transition-all duration-300 ${getPasswordStrength(password).score >= 5 ? getPasswordStrength(password).color : 'bg-zinc-800'}`} />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 pt-1 border-t border-zinc-850/50">
                      {getPasswordRules(password).map((rule, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[10px] font-mono">
                          {rule.met ? (
                            <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <X className="w-3 h-3 text-rose-500/70 flex-shrink-0" />
                          )}
                          <span className={rule.met ? 'text-zinc-300' : 'text-zinc-500'}>
                            {rule.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password field for signup */}
              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold" htmlFor="confirmPasswordInput">Confirm Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      id="confirmPasswordInput"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-[#18181b] border border-zinc-800 rounded-xl py-2.5 pl-10 pr-10 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-750 transition-colors font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 active:scale-[0.99] mt-2 cursor-pointer font-sans disabled:opacity-55 flex items-center justify-center gap-2"
              >
                {loading && <Loader className="w-4 h-4 animate-spin" />}
                {isLogin ? 'Sign In to Dashboard' : 'Create Secure Profile'}
              </button>
            </form>
          </div>

          <div className="pt-6 text-center font-mono">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setShowConfigTroubleshooter(false);
              }}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              {isLogin ? "Don't have an account? Create an examiner profile" : 'Already have an academic profile? Sign In'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
