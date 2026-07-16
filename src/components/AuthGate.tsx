import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { getUserProfile, registerUserDoc, seedFirestoreDemoData, isUsingLocalSandbox } from '../lib/db';
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
  Chrome, 
  HelpCircle,
  Info 
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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfigTroubleshooter, setShowConfigTroubleshooter] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
        if (password.length < 6) {
          setError('Password must be at least 6 characters long.');
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
      if (err.code === 'auth/configuration-not-found' || err.message?.includes('configuration-not-found')) {
        setShowConfigTroubleshooter(true);
        setError('Email & Password Auth is not enabled in your Firebase project.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid academic email or password. For demo accounts, click a quick launcher above.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This academic email is already registered.');
      } else {
        setError(err.message || 'An error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDemoAccount = async (roleType: UserRole) => {
    setLoading(true);
    setError('');
    setShowConfigTroubleshooter(false);
    
    // Seed database securely via server-side admin credentials
    await seedFirestoreDemoData();

    const demoEmail = roleType === 'admin' ? 'keerthivasangkv77@gmail.com' : 'alex@student.com';
    const demoPassword = 'password123';
    const demoName = roleType === 'admin' ? 'Dr. Keerthivasan' : 'Alex Mercer';

    try {
      // Try signing in
      const credential = await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
      let profile = await getUserProfile(credential.user.uid);
      if (!profile) {
        profile = {
          userId: credential.user.uid,
          name: demoName,
          email: demoEmail,
          role: roleType,
          createdAt: new Date().toISOString()
        };
        await registerUserDoc(profile);
      }
      onAuthSuccess(profile);
    } catch (err: any) {
      console.warn("Real Firebase sign-in failed/unconfigured. Automatically launching Secure Local Sandbox mode:", err);
      
      // Automatic transparent fallback for unconfigured environments
      const sandboxUser: UserProfile = {
        userId: roleType === 'admin' ? 'admin-1' : 'student-alex',
        name: demoName,
        email: demoEmail,
        role: roleType,
        createdAt: new Date().toISOString()
      };
      
      await registerUserDoc(sandboxUser);
      onAuthSuccess(sandboxUser);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setShowConfigTroubleshooter(false);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      
      const userEmail = credential.user.email || '';
      // Default to administrator if matching the primary email
      const isDomainAdmin = userEmail.toLowerCase() === 'keerthivasangkv77@gmail.com';
      const roleType: UserRole = isDomainAdmin ? 'admin' : 'student';
      
      let profile = await getUserProfile(credential.user.uid);
      if (!profile) {
        profile = {
          userId: credential.user.uid,
          name: credential.user.displayName || 'Candidate',
          email: userEmail,
          role: roleType,
          createdAt: new Date().toISOString()
        };
        await registerUserDoc(profile);
      }
      onAuthSuccess(profile);
    } catch (err: any) {
      console.warn("Google Sign-In failed or unconfigured. Launching Local Sandbox:", err);
      // Fallback sandbox if auth configuration is not found
      const sandboxUser: UserProfile = {
        userId: 'student-google-sandbox',
        name: 'Google Scholar',
        email: 'scholar@university.edu',
        role: 'student',
        createdAt: new Date().toISOString()
      };
      await registerUserDoc(sandboxUser);
      onAuthSuccess(sandboxUser);
    } finally {
      setLoading(false);
    }
  };

  const launchDirectLocalSandbox = (roleType: UserRole) => {
    const sandboxUser: UserProfile = {
      userId: roleType === 'admin' ? 'admin-1' : 'student-alex',
      name: roleType === 'admin' ? 'Dr. Keerthivasan' : 'Alex Mercer',
      email: roleType === 'admin' ? 'keerthivasangkv77@gmail.com' : 'alex@student.com',
      role: roleType,
      createdAt: new Date().toISOString()
    };
    registerUserDoc(sandboxUser);
    onAuthSuccess(sandboxUser);
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
                {isLogin ? 'Provide credentials or launch a secure sandbox workspace' : 'Create an administrative profile to define and proctor quizzes'}
              </p>
            </div>

            {/* Quick Demo Launchers */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Quick Demo Launchers (With Auto-Sandbox Fallback)</div>
              <div className="grid grid-cols-2 gap-2.5 p-1 bg-zinc-900 border border-zinc-850 rounded-xl">
                <button 
                  type="button"
                  disabled={loading}
                  onClick={() => loadDemoAccount('student')}
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60 transition-all font-mono disabled:opacity-50 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  Student Demo
                </button>
                <button 
                  type="button"
                  disabled={loading}
                  onClick={() => loadDemoAccount('admin')}
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60 transition-all font-mono disabled:opacity-50 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  Examiner Demo
                </button>
              </div>
            </div>

            {/* Google Sign-In (Enabled by Default in standard set_up_firebase project) */}
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/60 rounded-xl text-xs font-medium text-zinc-200 transition-all font-sans cursor-pointer disabled:opacity-50"
            >
              <Chrome className="w-4 h-4 text-rose-500" />
              Sign in with Google Academic Account
            </button>

            <div className="relative flex py-0.5 items-center">
              <div className="flex-grow border-t border-zinc-850"></div>
              <span className="flex-shrink mx-3 text-[10px] font-mono uppercase text-zinc-500 tracking-widest">Or credentials</span>
              <div className="flex-grow border-t border-zinc-850"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-medium leading-relaxed flex gap-2 items-start">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <div>{error}</div>
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
                  <div className="pt-1.5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => launchDirectLocalSandbox('student')}
                      className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded text-[10px] font-semibold tracking-wide transition-all cursor-pointer uppercase font-mono"
                    >
                      Bypass to Student Sandbox
                    </button>
                    <button
                      type="button"
                      onClick={() => launchDirectLocalSandbox('admin')}
                      className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded text-[10px] font-semibold tracking-wide transition-all cursor-pointer uppercase font-mono"
                    >
                      Bypass to Examiner Sandbox
                    </button>
                  </div>
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
                  {isLogin && <span className="text-[10px] text-zinc-500 font-mono">Demo: password123</span>}
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
              </div>

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
