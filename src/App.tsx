import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { Loader } from 'lucide-react';

import { Assessment, UserProfile } from './types';
import { auth } from './lib/firebase';
import { getUserProfile, validateFirebaseConnection } from './lib/db';

import LandingPage from './components/landing/LandingPage';
import AuthGate from './components/AuthGate';
import CandidatePortal from './components/CandidatePortal';
import AssessmentRunner from './components/AssessmentRunner';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeAssessment, setActiveAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLanding, setShowLanding] = useState(true);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    const initialize = async () => {
      try {
        setLoading(true);

        // Verify Firebase configuration
        await validateFirebaseConnection();

        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          try {
            if (!active) return;

            if (firebaseUser) {
              const profile = await getUserProfile(firebaseUser.uid);

              if (profile) {
                setCurrentUser(profile);
              } else {
                setCurrentUser({
                  userId: firebaseUser.uid,
                  name: firebaseUser.displayName || 'Candidate',
                  email: firebaseUser.email || '',
                  role: 'student',
                  createdAt: new Date().toISOString(),
                });
              }
            } else {
              setCurrentUser(null);
              setActiveAssessment(null);
            }
          } catch (error) {
            console.error('Auth state error:', error);
          } finally {
            if (active) {
              setLoading(false);
            }
          }
        });
      } catch (error) {
        console.error('Failed to initialize Firebase:', error);

        if (active) {
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      active = false;

      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('aegis_local_session');
      setCurrentUser(null);
      setActiveAssessment(null);
    } catch (error) {
      console.error('Logout failed:', error);
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
    return showLanding ? (
      <LandingPage onLogin={() => setShowLanding(false)} />
    ) : (
      <AuthGate onAuthSuccess={handleAuthSuccess} />
    );
  }

  if (currentUser.role === 'student') {
    return activeAssessment ? (
      <AssessmentRunner
        user={currentUser}
        assessment={activeAssessment}
        onFinish={handleFinishAssessment}
      />
    ) : (
      <CandidatePortal
        user={currentUser}
        onSelectAssessment={setActiveAssessment}
        onLogout={handleLogout}
        onUpdateProfile={setCurrentUser}
      />
    );
  }

  return (
    <AdminDashboard
      user={currentUser}
      onLogout={handleLogout}
    />
  );
}