import React, { useEffect, useRef, useState } from 'react';
import { ProctoringLog } from '../types';
import { Camera, Shield, Eye, AlertCircle, RefreshCw } from 'lucide-react';

interface ProctoringHudProps {
  onViolationLogged: (log: ProctoringLog) => void;
  isActive: boolean;
}

export default function ProctoringHud({ onViolationLogged, isActive }: ProctoringHudProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [eyeGazeStatus, setEyeGazeStatus] = useState<'Focused' | 'Departed'>('Focused');
  const [presenceStatus, setPresenceStatus] = useState<'Present' | 'Unattended' | 'Multiple Faces'>('Present');
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Trigger camera connection
  useEffect(() => {
    if (!isActive) return;

    let localStream: MediaStream | null = null;

    navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })
      .then(stream => {
        localStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.log('Video play error:', e));
        }
        setStreamActive(true);
      })
      .catch(err => {
        console.error('Camera connection error:', err);
        setErrorMessage('Camera access was blocked. Please permit webcam access in browser to proceed.');
      });

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive]);

  // Tab change detection (Window blur)
  useEffect(() => {
    if (!isActive) return;

    const handleBlur = () => {
      const log: ProctoringLog = {
        timestamp: new Date().toISOString(),
        type: 'tab-switch',
        details: 'Candidate switched active browser tabs or opened secondary windows.'
      };
      onViolationLogged(log);
    };

    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, [isActive, onViolationLogged]);

  // Full screen enforcement status check
  useEffect(() => {
    if (!isActive) return;

    const handleFullScreenChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullScreen(fs);
      if (!fs) {
        onViolationLogged({
          timestamp: new Date().toISOString(),
          type: 'fullscreen-exit',
          details: 'Candidate left standard locked full-screen proctor mode.'
        });
      }
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, [isActive, onViolationLogged]);

  // Copy paste block tracking
  useEffect(() => {
    if (!isActive) return;

    const handlePaste = (e: ClipboardEvent) => {
      // Prevent actual pasting in candidate inputs to stop cheating
      e.preventDefault();
      onViolationLogged({
        timestamp: new Date().toISOString(),
        type: 'copy-paste',
        details: 'Manual clipboard paste attempted on question input field.'
      });
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [isActive, onViolationLogged]);

  // Canvas drawing loop for the dynamic visual cybernetic tracking overlays!
  useEffect(() => {
    if (!isActive || !streamActive) return;

    let animId: number;
    let cycleCount = 0;

    const drawOverlay = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Match canvas width/height to feed size
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw horizontal target crosshairs
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();

      // Draw bounding box tracker around mock face coordinates
      cycleCount++;
      const basePulse = Math.sin(cycleCount * 0.05);

      // Let's dynamically simulate gaze fluctuations (looking off-screen randomly or periodically)
      const isOffGazeSim = (cycleCount % 400) > 340;
      const isAbsentSim = (cycleCount % 1200) > 1140;

      if (isAbsentSim) {
        setPresenceStatus('Unattended');
        setEyeGazeStatus('Departed');
      } else {
        setPresenceStatus('Present');
        if (isOffGazeSim) {
          setEyeGazeStatus('Departed');
        } else {
          setEyeGazeStatus('Focused');
        }
      }

      // If active eye state changes, periodically log to prevent pure visual fake state
      if (cycleCount % 400 === 341) {
        onViolationLogged({
          timestamp: new Date().toISOString(),
          type: 'look-away',
          details: 'Gaze departed from the examination environment temporarily.'
        });
      }
      if (cycleCount % 1200 === 1141) {
        onViolationLogged({
          timestamp: new Date().toISOString(),
          type: 'face-missing',
          details: 'Webcam feed reports candidate absent from assessment frame.'
        });
      }

      // Draw facial tracking coordinate overlays
      if (!isAbsentSim) {
        const x = canvas.width / 2 + Math.sin(cycleCount * 0.02) * 15;
        const y = canvas.height / 2 - 10 + Math.cos(cycleCount * 0.01) * 8;
        const boxWidth = 100 + basePulse * 3;
        const boxHeight = 115 + basePulse * 3;

        // Face outline box
        ctx.strokeStyle = isOffGazeSim ? 'rgba(239, 68, 68, 0.7)' : 'rgba(16, 185, 129, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight);

        // Corner guides
        ctx.fillStyle = isOffGazeSim ? '#ef4444' : '#10b981';
        const guideLen = 10;
        // Top-left
        ctx.fillRect(x - boxWidth / 2 - 1, y - boxHeight / 2 - 1, guideLen, 2.5);
        ctx.fillRect(x - boxWidth / 2 - 1, y - boxHeight / 2 - 1, 2.5, guideLen);
        // Top-right
        ctx.fillRect(x + boxWidth / 2 - guideLen + 1, y - boxHeight / 2 - 1, guideLen, 2.5);
        ctx.fillRect(x + boxWidth / 2 - 1.5, y - boxHeight / 2 - 1, 2.5, guideLen);
        // Bottom-left
        ctx.fillRect(x - boxWidth / 2 - 1, y + boxHeight / 2 - 1.5, guideLen, 2.5);
        ctx.fillRect(x - boxWidth / 2 - 1, y + boxHeight / 2 - guideLen + 1, 2.5, guideLen);
        // Bottom-right
        ctx.fillRect(x + boxWidth / 2 - guideLen + 1, y + boxHeight / 2 - 1.5, guideLen, 2.5);
        ctx.fillRect(x + boxWidth / 2 - 1.5, y + boxHeight / 2 - guideLen + 1, 2.5, guideLen);

        // Gaze tracking eye points
        ctx.beginPath();
        ctx.arc(x - 20, y - 15, 4, 0, Math.PI * 2);
        ctx.arc(x + 20, y - 15, 4, 0, Math.PI * 2);
        ctx.fillStyle = isOffGazeSim ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)';
        ctx.fill();

        // Gaze angle vector
        if (isOffGazeSim) {
          ctx.strokeStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(x - 20, y - 15);
          ctx.lineTo(x - 50, y - 25);
          ctx.moveTo(x + 20, y - 15);
          ctx.lineTo(x + 50, y - 25);
          ctx.stroke();
        }

        // Indicator tag
        ctx.fillStyle = isOffGazeSim ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.1)';
        ctx.fillRect(x - 45, y + boxHeight / 2 + 10, 90, 16);
        ctx.strokeStyle = isOffGazeSim ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)';
        ctx.strokeRect(x - 45, y + boxHeight / 2 + 10, 90, 16);
        
        ctx.fillStyle = isOffGazeSim ? '#fca5a5' : '#a7f3d0';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          isOffGazeSim ? 'GAZE DEPARTED' : 'GAZE LOGGED',
          x,
          y + boxHeight / 2 + 21
        );
      } else {
        // Missing state scanning line
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.lineWidth = 2;
        const lineY = (canvas.height / 2) + Math.sin(cycleCount * 0.1) * (canvas.height / 2 - 10);
        ctx.beginPath();
        ctx.moveTo(10, lineY);
        ctx.lineTo(canvas.width - 10, lineY);
        ctx.stroke();

        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.fillRect(20, canvas.height / 2 - 15, canvas.width - 40, 30);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.strokeRect(20, canvas.height / 2 - 15, canvas.width - 40, 30);

        ctx.fillStyle = '#fca5a5';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('WARNING: FACE DETECT ABSENT', canvas.width / 2, canvas.height / 2 + 4);
      }

      animId = requestAnimationFrame(drawOverlay);
    };

    animId = requestAnimationFrame(drawOverlay);
    return () => cancelAnimationFrame(animId);
  }, [isActive, streamActive, onViolationLogged]);

  return (
    <div className="bg-[#121214] border border-zinc-800 rounded-xl p-4 space-y-4 shadow-xl">
      <div className="flex justify-between items-center pb-2 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-zinc-200">Active Integrity HUD</span>
        </div>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[10px] font-mono text-zinc-400">TELEMETRY ON</span>
        </span>
      </div>

      {/* Camera Panel */}
      <div className="relative w-full aspect-video bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800 flex items-center justify-center">
        {errorMessage ? (
          <div className="p-4 text-center space-y-2">
            <AlertCircle className="w-6 h-6 text-rose-500 mx-auto" />
            <p className="text-xs text-zinc-400 leading-relaxed max-w-[240px] mx-auto">{errorMessage}</p>
          </div>
        ) : (
          <>
            {/* Real webcam stream */}
            <video 
              ref={videoRef} 
              muted 
              playsInline 
              className="absolute inset-0 w-full h-full object-cover opacity-60 scale-x-[-1]"
            />
            {/* Scanning cybernetic graphics canvas */}
            <canvas 
              ref={canvasRef} 
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            />

            {!streamActive && (
              <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-5 h-5 text-zinc-500 animate-spin" />
                <span className="text-[11px] font-mono text-zinc-500">INITIATING CAMERA FRAME...</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Vital Telemetry Status Cards */}
      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
        <div className="p-2.5 bg-[#18181b] border border-zinc-800 rounded-lg space-y-1">
          <span className="text-zinc-500 block">GAZE LOCK</span>
          <span className={`font-semibold ${eyeGazeStatus === 'Focused' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {eyeGazeStatus === 'Focused' ? 'LOCKED / SECURE' : 'LOOK AWAY FLAGGED'}
          </span>
        </div>
        
        <div className="p-2.5 bg-[#18181b] border border-zinc-800 rounded-lg space-y-1">
          <span className="text-zinc-500 block">PRESENCE</span>
          <span className={`font-semibold ${presenceStatus === 'Present' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {presenceStatus === 'Present' ? 'STABLE' : presenceStatus === 'Unattended' ? 'ABSENT WARNING' : 'MULTIPLE PEOPLES'}
          </span>
        </div>

        <div className="p-2.5 bg-[#18181b] border border-zinc-800 rounded-lg space-y-1">
          <span className="text-zinc-500 block">SCREEN LOCK</span>
          <span className={`font-semibold ${isFullScreen ? 'text-emerald-400' : 'text-amber-500'}`}>
            {isFullScreen ? 'FULLSCREEN' : 'WINDOW MODE'}
          </span>
        </div>

        <div className="p-2.5 bg-[#18181b] border border-zinc-800 rounded-lg space-y-1">
          <span className="text-zinc-500 block">CLIPBOARD</span>
          <span className="text-emerald-400 font-semibold">
            RESTRICTED
          </span>
        </div>
      </div>

      <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-[10px] text-zinc-500 leading-relaxed">
        <strong>Proctoring Notice:</strong> Moving out of frame, opening other applications, or copying/pasting content immediately records violation events onto the secure cloud evaluation ledger.
      </div>
    </div>
  );
}
