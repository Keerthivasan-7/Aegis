import React, { useEffect, useState } from 'react';
import { Assessment, UserProfile } from './types';
import { getCurrentUser, initDb, setCurrentUser } from './lib/db';
import AuthGate from './components/AuthGate';
import CandidatePortal from './components/CandidatePortal';
import AssessmentRunner from './components/AssessmentRunner';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [currentUser, setCurrentUserState] = useState<UserProfile | null>(null);
  const [activeAssessment, setActiveAssessment] = useState<Assessment | null>(null);

  // Initialize DB and pull session profile on mount
  useEffect(() => {
    initDb();
    setCurrentUserState(getCurrentUser());
  }, []);

  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUserState(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentUserState(null);
    setActiveAssessment(null);
  };

  const handleFinishAssessment = () => {
    setActiveAssessment(null);
  };

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
