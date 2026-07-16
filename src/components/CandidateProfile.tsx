import React, { useState } from 'react';
import { UserProfile } from '../types';
import { registerUserDoc } from '../lib/db';
import { updatePassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  GraduationCap, 
  Award, 
  ExternalLink, 
  Lock, 
  CheckCircle, 
  AlertCircle, 
  Save, 
  Trophy, 
  Code,
  Check,
  Eye,
  EyeOff,
  Percent,
  BookOpen,
  ArrowLeft
} from 'lucide-react';

interface CandidateProfileProps {
  user: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onBack: () => void;
}

export default function CandidateProfile({ user, onUpdateProfile, onBack }: CandidateProfileProps) {
  // Personal Details
  const [name, setName] = useState(user.name || '');
  const [mobile, setMobile] = useState(user.mobile || '');
  const [age, setAge] = useState(user.age || '');

  // Academic Details
  const [educationDegree, setEducationDegree] = useState(user.educationDegree || '');
  const [educationInstitution, setEducationInstitution] = useState(user.educationInstitution || '');
  const [educationYear, setEducationYear] = useState(user.educationYear || '');
  const [educationGpa, setEducationGpa] = useState(user.educationGpa || '');

  // Competitive Coding Details
  const [leetcodeRank, setLeetcodeRank] = useState(user.leetcodeRank || '');
  const [leetcodeUrl, setLeetcodeUrl] = useState(user.leetcodeUrl || '');
  const [hackerrankRank, setHackerrankRank] = useState(user.hackerrankRank || '');
  const [hackerrankUrl, setHackerrankUrl] = useState(user.hackerrankUrl || '');

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status message states
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Password validation rules
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
    if (!pass) return { score: 0, label: 'None', color: 'bg-zinc-850', textColor: 'text-zinc-500' };
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

  // Calculate profile completion percentage
  const calculateCompletion = () => {
    const fields = [
      name,
      mobile,
      age,
      educationDegree,
      educationInstitution,
      educationYear,
      educationGpa,
      leetcodeRank,
      leetcodeUrl,
      hackerrankRank,
      hackerrankUrl
    ];
    const filled = fields.filter(f => f.trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  };

  const profileCompletion = calculateCompletion();

  // Save profile updates handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess('');
    setSaveError('');
    setSaveLoading(true);

    if (!name.trim()) {
      setSaveError('Full Name is required for authentication records.');
      setSaveLoading(false);
      return;
    }

    const updatedProfile: UserProfile = {
      ...user,
      name: name.trim(),
      mobile: mobile.trim(),
      age: age.trim(),
      educationDegree: educationDegree.trim(),
      educationInstitution: educationInstitution.trim(),
      educationYear: educationYear.trim(),
      educationGpa: educationGpa.trim(),
      leetcodeRank: leetcodeRank.trim(),
      leetcodeUrl: leetcodeUrl.trim(),
      hackerrankRank: hackerrankRank.trim(),
      hackerrankUrl: hackerrankUrl.trim()
    };

    try {
      await registerUserDoc(updatedProfile);
      onUpdateProfile(updatedProfile);
      setSaveSuccess('Your candidate profile details have been securely synchronized and updated.');
    } catch (err: any) {
      console.error('Save Profile Error:', err);
      setSaveError(err.message || 'Failed to update credentials in the distributed cloud database.');
    } finally {
      setSaveLoading(false);
    }
  };

  // Password change handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');

    if (!newPassword) {
      setPasswordError('Please provide a new password.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    // Rules check
    const rules = getPasswordRules(newPassword);
    const metAll = rules.every(r => r.met);
    if (!metAll) {
      setPasswordError('Your new password does not meet the necessary Aegis cryptographic requirements.');
      return;
    }

    setPasswordLoading(true);

    try {
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        await updatePassword(firebaseUser, newPassword);
        setPasswordSuccess('Password successfully updated and key hashes rotated across the identity grid.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        // Fallback local sandbox update
        const updatedProfile: UserProfile = {
          ...user,
          password: newPassword
        };
        await registerUserDoc(updatedProfile);
        onUpdateProfile(updatedProfile);
        setPasswordSuccess('Sandbox profile password updated successfully (Offline Environment).');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err: any) {
      console.error('Password Update Error:', err);
      if (err.code === 'auth/requires-recent-login') {
        setPasswordError('For security, this operation requires recent authentication. Please sign out, log back in, and try again.');
      } else {
        setPasswordError(err.message || 'Failed to complete key rotation on the authorization server.');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header Banner */}
      <div className="p-6 md:p-8 bg-zinc-900/60 border border-zinc-900 rounded-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-[-20%] right-[-10%] w-[300px] h-[300px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-display font-semibold text-lg shadow-sm">
            {name.split(' ').map(n => n[0]).join('').toUpperCase() || 'C'}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">{name || 'Aegis Candidate'}</h1>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">{user.email}</p>
            <span className="inline-block mt-2 text-[9px] font-mono uppercase bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded">
              Academic ID Verified
            </span>
          </div>
        </div>

        {/* Profile Completion Dial */}
        <div className="flex items-center gap-4 bg-zinc-950/50 p-4 rounded-xl border border-zinc-900 md:min-w-[220px]">
          <div className="relative w-12 h-12 flex items-center justify-center">
            {/* SVG Progress Circle */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-zinc-800"
                strokeWidth="2.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-indigo-500 transition-all duration-500"
                strokeDasharray={`${profileCompletion}, 100`}
                strokeWidth="2.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-xs font-mono font-semibold text-zinc-300">{profileCompletion}%</span>
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-200">Profile Completion</div>
            <p className="text-[10px] text-zinc-500 mt-0.5">Please fill in details for test verification.</p>
          </div>
        </div>
      </div>

      {/* Main Two Column Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns - Details Forms */}
        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={handleSaveProfile} className="space-y-8">
            
            {/* Personal Details Panel */}
            <div className="bg-[#121214]/60 border border-zinc-900 rounded-xl p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
                <User className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-zinc-100">Personal Information</h2>
              </div>

              {saveSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{saveSuccess}</span>
                </div>
              )}

              {saveError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-medium flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-zinc-950/80 border border-zinc-850 focus:border-indigo-500/50 rounded-lg pl-9 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-zinc-600" />
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full bg-zinc-900/40 border border-zinc-900 rounded-lg pl-9 pr-4 py-2 text-xs text-zinc-500 focus:outline-none cursor-not-allowed font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-zinc-600 leading-normal block">Primary login key. To change email, contact admin.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="e.g. +1 (555) 019-2834"
                      className="w-full bg-zinc-950/80 border border-zinc-850 focus:border-indigo-500/50 rounded-lg pl-9 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Age (Years)</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 21"
                      className="w-full bg-zinc-950/80 border border-zinc-850 focus:border-indigo-500/50 rounded-lg pl-9 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Educational Details Panel */}
            <div className="bg-[#121214]/60 border border-zinc-900 rounded-xl p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
                <GraduationCap className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-zinc-100">Educational Background</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Degree / Course of Study</label>
                  <input
                    type="text"
                    value={educationDegree}
                    onChange={(e) => setEducationDegree(e.target.value)}
                    placeholder="e.g. B.S. in Computer Science"
                    className="w-full bg-zinc-950/80 border border-zinc-850 focus:border-indigo-500/50 rounded-lg px-4 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Institution / University</label>
                  <input
                    type="text"
                    value={educationInstitution}
                    onChange={(e) => setEducationInstitution(e.target.value)}
                    placeholder="e.g. Massachusetts Institute of Technology"
                    className="w-full bg-zinc-950/80 border border-zinc-850 focus:border-indigo-500/50 rounded-lg px-4 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Graduation Year</label>
                  <input
                    type="text"
                    value={educationYear}
                    onChange={(e) => setEducationYear(e.target.value)}
                    placeholder="e.g. 2027"
                    className="w-full bg-zinc-950/80 border border-zinc-850 focus:border-indigo-500/50 rounded-lg px-4 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Grade / CGPA</label>
                  <input
                    type="text"
                    value={educationGpa}
                    onChange={(e) => setEducationGpa(e.target.value)}
                    placeholder="e.g. 3.95 / 4.0"
                    className="w-full bg-zinc-950/80 border border-zinc-850 focus:border-indigo-500/50 rounded-lg px-4 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Competitive Programming Handles Panel */}
            <div className="bg-[#121214]/60 border border-zinc-900 rounded-xl p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
                <Code className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-zinc-100">Coding Profile Credentials</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* LeetCode Block */}
                <div className="space-y-3.5 p-4 bg-zinc-950/40 rounded-xl border border-zinc-900">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      LeetCode
                    </span>
                    {leetcodeUrl && (
                      <a
                        href={leetcodeUrl.startsWith('http') ? leetcodeUrl : `https://${leetcodeUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono"
                      >
                        Visit <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-zinc-400">LeetCode Profile Link / Handle</span>
                      <input
                        type="text"
                        value={leetcodeUrl}
                        onChange={(e) => setLeetcodeUrl(e.target.value)}
                        placeholder="e.g. leetcode.com/u/alex"
                        className="w-full bg-zinc-950 border border-zinc-850 focus:border-indigo-500/50 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-zinc-400">LeetCode Global Rank</span>
                      <div className="relative">
                        <Trophy className="absolute left-2.5 top-2 w-3.5 h-3.5 text-amber-500/80" />
                        <input
                          type="text"
                          value={leetcodeRank}
                          onChange={(e) => setLeetcodeRank(e.target.value)}
                          placeholder="e.g. 12,450"
                          className="w-full bg-zinc-950 border border-zinc-850 focus:border-indigo-500/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* HackerRank Block */}
                <div className="space-y-3.5 p-4 bg-zinc-950/40 rounded-xl border border-zinc-900">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      HackerRank
                    </span>
                    {hackerrankUrl && (
                      <a
                        href={hackerrankUrl.startsWith('http') ? hackerrankUrl : `https://${hackerrankUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono"
                      >
                        Visit <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-zinc-400">HackerRank Profile Link / Handle</span>
                      <input
                        type="text"
                        value={hackerrankUrl}
                        onChange={(e) => setHackerrankUrl(e.target.value)}
                        placeholder="e.g. hackerrank.com/alex"
                        className="w-full bg-zinc-950 border border-zinc-850 focus:border-indigo-500/50 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-zinc-400">HackerRank Rank</span>
                      <div className="relative">
                        <Trophy className="absolute left-2.5 top-2 w-3.5 h-3.5 text-emerald-500/80" />
                        <input
                          type="text"
                          value={hackerrankRank}
                          onChange={(e) => setHackerrankRank(e.target.value)}
                          placeholder="e.g. Top 1% (500 pts)"
                          className="w-full bg-zinc-950 border border-zinc-850 focus:border-indigo-500/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Master Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-zinc-900/30 border border-zinc-900 rounded-xl">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-zinc-500" />
                <span className="text-[11px] text-zinc-500 font-mono">Changes sync seamlessly instantly.</span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onBack}
                  className="flex-1 sm:flex-none text-center bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 px-4 py-2 rounded-lg text-xs font-medium font-mono transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/10 cursor-pointer active:scale-98 transition-all"
                >
                  {saveLoading ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Save Profile Details
                </button>
              </div>
            </div>

          </form>
        </div>

        {/* Right Column - Security Credentials / Change Password */}
        <div className="space-y-8">
          
          {/* Security & Access Panel */}
          <div className="bg-[#121214]/60 border border-zinc-900 rounded-xl p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
              <Lock className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-zinc-100">Security Credentials</h2>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
              Update your cryptographic login key routinely to protect your student portal and evaluation profiles.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4">
              
              {passwordSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-medium flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-850 focus:border-indigo-500/50 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">New Secure Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-950 border border-zinc-850 focus:border-indigo-500/50 rounded-lg pl-3 pr-9 py-2 text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-950 border border-zinc-850 focus:border-indigo-500/50 rounded-lg pl-3 pr-9 py-2 text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password strength visualization */}
              {newPassword && (
                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-900 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-zinc-500">Strength:</span>
                    <span className={getPasswordStrength(newPassword).textColor}>
                      {getPasswordStrength(newPassword).label}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-zinc-850 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${getPasswordStrength(newPassword).color}`} 
                      style={{ width: `${(getPasswordStrength(newPassword).score / 5) * 100}%` }}
                    />
                  </div>
                  <div className="space-y-1 pt-1">
                    {getPasswordRules(newPassword).map((rule, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[9px] font-mono">
                        {rule.met ? (
                          <Check className="w-2.5 h-2.5 text-emerald-500" />
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-full border border-zinc-800 block" />
                        )}
                        <span className={rule.met ? 'text-zinc-400' : 'text-zinc-600'}>{rule.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-200 disabled:opacity-50 py-2 rounded-lg text-xs font-semibold font-mono cursor-pointer active:scale-98 transition-all"
              >
                {passwordLoading ? (
                  <span className="w-3.5 h-3.5 border-2 border-zinc-400/30 border-t-zinc-400 rounded-full animate-spin" />
                ) : (
                  <Lock className="w-3 h-3" />
                )}
                Rotate Password Hash
              </button>

            </form>
          </div>

          {/* Secure Environment Notice */}
          <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
              Secure Proctor Profile
            </h3>
            <p className="text-[10px] text-zinc-400 leading-normal font-sans">
              Aegis encrypts profile structures using industry standards. These external identifiers (LeetCode/HackerRank) are cross-referenced during live coding reviews to prevent credentials spoofing.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
