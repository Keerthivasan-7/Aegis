import React, { useEffect, useState } from 'react';
import { Assessment, UserProfile } from './types';
import { getUserProfile } from './lib/db';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import AuthGate from './components/AuthGate';
import CandidatePortal from './components/CandidatePortal';
import AssessmentRunner from './components/AssessmentRunner';
import AdminDashboard from './components/AdminDashboard';
import { Loader } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUserState] = useState<UserProfile | null>(null);
  const [activeAssessment, setActiveAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);

  // Synchronize with active Firebase Auth session state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setLoading(true);
        if (firebaseUser) {
          const profile = await getUserProfile(firebaseUser.uid);
          if (profile) {
            setCurrentUserState(profile);
          } else {
            // Fallback user state in case profile sync is delayed
            setCurrentUserState({
              userId: firebaseUser.uid,
              name: firebaseUser.displayName || 'Candidate',
              email: firebaseUser.email || '',
              role: 'student',
              createdAt: new Date().toISOString()
            });
          }
        } else {
          setCurrentUserState(null);
          setActiveAssessment(null);
        }
      } catch (err) {
        console.error("Auth state change error:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUserState(user);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setCurrentUserState(null);
      setActiveAssessment(null);
    } catch (e) {
      console.error("Logout failure:", e);
    }
  };

  const handleFinishAssessment = () => {
    setActiveAssessment(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center gap-4 text-zinc-400 font-mono">
        <Loader className="w-8 h-8 animate-spin text-indigo-500" />
        Securing cryptosession channel...
      </div>
    );
  }

  if (!currentUser) {
    return <AuthGate onAuthSuccess={handleAuthSuccess} />;
  }

  if (currentUser.role === 'student') {
    if (activeAssessment) {
      return (
        <AssessmentRunner 
          user={currentUser} 
          assessment={activeAssessment} 
          onFinish={handleFinishAssessment} 
        />
      );
    }
    return (
      <CandidatePortal 
        user={currentUser} 
        onSelectAssessment={setActiveAssessment} 
        onLogout={handleLogout} 
      />
    );
  }

  // Admin / Examiner Role
  return (
    <AdminDashboard 
      user={currentUser} 
      onLogout={handleLogout} 
    />
  );
}
