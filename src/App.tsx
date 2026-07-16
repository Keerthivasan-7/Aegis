import React, { useEffect, useState } from 'react';
import { Assessment, UserProfile } from './types';
import { getUserProfile } from './lib/db';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import AuthGate from './components/AuthGate';
import CandidatePortal from './components/CandidatePortal';
import AssessmentRunner from './components/AssessmentRunner';
import AdminDashboard from './components/AdminDashboard';
import LandingPage from './components/landing/LandingPage';
import { Loader } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUserState] = useState<UserProfile | null>(null);
  const [activeAssessment, setActiveAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLanding, setShowLanding] = useState(true);

  // Synchronize with active Firebase Auth session state or local session
  useEffect(() => {
    let active = true;

    const initAuth = async () => {
      try {
        setLoading(true);
        const { validateFirebaseConnection, isUsingLocalSandbox } = await import('./lib/db');
        await validateFirebaseConnection();

        if (isUsingLocalSandbox()) {
          // Check local sandbox session
          const localSession = localStorage.getItem('aegis_local_session');
          if (localSession && active) {
            try {
              setCurrentUserState(JSON.parse(localSession));
            } catch (e) {
              console.warn("Failed to parse local session:", e);
            }
          }
          if (active) {
            setLoading(false);
          }
        } else {
          // Subscribe to Firebase Auth
          const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
              if (firebaseUser) {
                const profile = await getUserProfile(firebaseUser.uid);
                if (active) {
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
                }
              } else if (active) {
                setCurrentUserState(null);
                setActiveAssessment(null);
              }
            } catch (err) {
              console.error("Auth state change error:", err);
            } finally {
              if (active) {
                setLoading(false);
              }
            }
          });

          return unsubscribe;
        }
      } catch (err) {
        console.error("Failed to initialize auth layer:", err);
        if (active) {
          setLoading(false);
        }
      }
    };

    let fbUnsubscribe: (() => void) | undefined;
    initAuth().then((unsub) => {
      if (unsub) fbUnsubscribe = unsub;
    });

    return () => {
      active = false;
      if (fbUnsubscribe) fbUnsubscribe();
    };
  }, []);

  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUserState(user);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('aegis_local_session');
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
    if (showLanding) {
      return <LandingPage onLogin={() => setShowLanding(false)} />;
    }
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
        onUpdateProfile={(updatedUser) => {
          setCurrentUserState(updatedUser);
        }}
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
