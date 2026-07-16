import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Navbar from './Navbar';
import HeroSection from './HeroSection';
import WhyAegis from './WhyAegis';
import FeatureShowcase from './FeatureShowcase';
import Comparison from './Comparison';
import FinalCta from './FinalCta';
import Footer from './Footer';
import ConsoleDemo from '../console/ConsoleDemo';

interface LandingPageProps {
  onLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [showConsole, setShowConsole] = useState(false);

  return (
    <AnimatePresence mode="wait">
      {showConsole ? (
        <motion.div key="console" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          <ConsoleDemo onBack={() => setShowConsole(false)} />
        </motion.div>
      ) : (
        <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
          className="min-h-screen bg-[#020617] cyber-grid">
          <Navbar onGetStarted={() => setShowConsole(true)} onLogin={onLogin} />
          <HeroSection onGetStarted={() => setShowConsole(true)} />
          <WhyAegis />
          <FeatureShowcase />
          <Comparison />
          <FinalCta onGetStarted={() => setShowConsole(true)} onLogin={onLogin} />
          <Footer />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LandingPage;
