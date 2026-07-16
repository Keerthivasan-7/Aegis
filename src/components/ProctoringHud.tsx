import React, { useEffect, useRef, useState } from 'react';
import { ProctoringLog } from '../types';
import { Camera, Shield, Eye, AlertCircle, RefreshCw } from 'lucide-react';
import * as faceapi from '@vladmandic/face-api';

interface ProctoringHudProps {
  onViolationLogged: (log: ProctoringLog) => void;
  isActive: boolean;
  onMultipleFacesStrike: (strikeCount: number) => void;
}

export default function ProctoringHud({ onViolationLogged, isActive, onMultipleFacesStrike }: ProctoringHudProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [eyeGazeStatus, setEyeGazeStatus] = useState<'Focused' | 'Departed'>('Focused');
  const [presenceStatus, setPresenceStatus] = useState<'Present' | 'Unattended' | 'Multiple Faces'>('Present');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Refs for tracking real detection data smoothly
  const latestDetectionRef = useRef<{
    box: { x: number; y: number; width: number; height: number } | null;
    landmarks: any | null;
    isLookingAway: boolean;
    presence: 'Present' | 'Unattended' | 'Multiple Faces';
  }>({
    box: null,
    landmarks: null,
    isLookingAway: false,
    presence: 'Unattended',
  });

  const lastLookAwayLogRef = useRef<number>(0);
  const lastFaceMissingLogRef = useRef<number>(0);
  const lastMultipleFacesLogRef = useRef<number>(0);
  
  // Decided to never reset the warning strikes during the session for exam integrity, 
  // so a candidate cannot exploit the system by briefly hiding the secondary person 
  // to reset their warnings and continuously violating the proctoring rules.
  const multipleFacesStrikeRef = useRef<number>(0);

  // Load face-api models
  useEffect(() => {
    let active = true;
    const loadModels = async () => {
      try {
        // Let TensorFlow.js automatically select the best accelerated backend (usually WebGL) for fast and precise face coordinate resolution
        if ((faceapi as any).tf) {
          try {
            await (faceapi as any).tf.ready();
            console.log('TensorFlow.js backend successfully initialized:', (faceapi as any).tf.getBackend());
          } catch (backendErr) {
            console.warn('Could not initialize TensorFlow.js backend, falling back:', backendErr);
          }
        }
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        if (active) {
          setModelsLoaded(true);
        }
      } catch (err) {
        console.warn('Failed to load face-api models:', err);
      }
    };
    loadModels();
    return () => {
      active = false;
    };
  }, []);

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
        console.warn('Camera connection error:', err);
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

  // Real face detection loop running every 1.5 seconds
  useEffect(() => {
    if (!isActive || !streamActive || !modelsLoaded) return;

    let timerId: any;

    const runDetection = async () => {
      const video = videoRef.current;
      if (!video || video.paused || video.ended || video.readyState < 4 || !video.videoWidth || !video.videoHeight || video.currentTime === 0) {
        // Not ready yet, schedule next check
        timerId = setTimeout(runDetection, 1500);
        return;
      }

      try {
        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 });
        const rawDetections = await faceapi.detectAllFaces(video, options).withFaceLandmarks();
        
        // Filter out any anomalous detections with invalid/null/NaN coordinates to avoid Box.constructor issues
        const detections = rawDetections.filter(det => {
          const box = det?.detection?.box;
          return box && 
                 box.left !== null && box.left !== undefined && !isNaN(box.left) &&
                 box.top !== null && box.top !== undefined && !isNaN(box.top) &&
                 box.width !== null && box.width !== undefined && !isNaN(box.width) &&
                 box.height !== null && box.height !== undefined && !isNaN(box.height);
        });

        const timestamp = new Date().toISOString();

        if (detections.length === 0) {
          latestDetectionRef.current = {
            box: null,
            landmarks: null,
            isLookingAway: false,
            presence: 'Unattended',
          };
          setPresenceStatus('Unattended');
          setEyeGazeStatus('Departed');

          if (Date.now() - lastFaceMissingLogRef.current > 5000) {
            onViolationLogged({
              timestamp,
              type: 'face-missing',
              details: 'Webcam feed reports candidate absent from assessment frame.'
            });
            lastFaceMissingLogRef.current = Date.now();
          }
        } else if (detections.length === 1) {
          const det = detections[0];
          const landmarks = det.landmarks;

          // Estimate head direction using facial landmarks
          const jawLeft = landmarks.positions[0];
          const jawRight = landmarks.positions[16];
          const noseTip = landmarks.positions[30];

          const dLeft = Math.abs(noseTip.x - jawLeft.x);
          const dRight = Math.abs(jawRight.x - noseTip.x);
          const ratio = dLeft / dRight;

          // Standard look away threshold
          const isLookingAway = ratio < 0.45 || ratio > 2.2;

          latestDetectionRef.current = {
            box: det.detection.box,
            landmarks,
            isLookingAway,
            presence: 'Present',
          };

          setPresenceStatus('Present');
          if (isLookingAway) {
            setEyeGazeStatus('Departed');
            if (Date.now() - lastLookAwayLogRef.current > 5000) {
              onViolationLogged({
                timestamp,
                type: 'look-away',
                details: 'Gaze departed from the examination environment temporarily.'
              });
              lastLookAwayLogRef.current = Date.now();
            }
          } else {
            setEyeGazeStatus('Focused');
          }
        } else {
          // Multiple faces
          latestDetectionRef.current = {
            box: detections[0].detection.box,
            landmarks: detections[0].landmarks,
            isLookingAway: true,
            presence: 'Multiple Faces',
          };
          setPresenceStatus('Multiple Faces');
          setEyeGazeStatus('Departed');

          if (Date.now() - lastMultipleFacesLogRef.current > 5000) {
            multipleFacesStrikeRef.current += 1;
            onViolationLogged({
              timestamp,
              type: 'multiple-faces',
              details: `Multiple faces detected in the camera frame. Strike ${multipleFacesStrikeRef.current}/3.`
            });
            onMultipleFacesStrike(multipleFacesStrikeRef.current);
            lastMultipleFacesLogRef.current = Date.now();
          }
        }
      } catch (err) {
        console.warn('Face detection error (handled gracefully):', err);
        // Fallback state on detection error to prevent HUD freezing or displaying stale face coords
        latestDetectionRef.current = {
          box: null,
          landmarks: null,
          isLookingAway: false,
          presence: 'Unattended',
        };
        setPresenceStatus('Unattended');
        setEyeGazeStatus('Departed');
      }

      // Schedule next check
      timerId = setTimeout(runDetection, 1500);
    };

    timerId = setTimeout(runDetection, 1000);

    return () => {
      clearTimeout(timerId);
    };
  }, [isActive, streamActive, modelsLoaded, onViolationLogged]);

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
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();

      cycleCount++;

      const detection = latestDetectionRef.current;

      if (detection.presence === 'Unattended') {
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
      } else {
        // We have a face! Draw the box and landmarks
        const isLookingAway = detection.isLookingAway;
        const hasMultiple = detection.presence === 'Multiple Faces';

        // Corner guides and face box
        if (detection.box && typeof detection.box.x === 'number' && typeof detection.box.y === 'number' && typeof detection.box.width === 'number' && typeof detection.box.height === 'number' && !isNaN(detection.box.x) && !isNaN(detection.box.y)) {
          const { x, y, width, height } = detection.box;

          // Face outline box
          ctx.strokeStyle = isLookingAway ? 'rgba(239, 68, 68, 0.7)' : 'rgba(16, 185, 129, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x, y, width, height);

          // Corner guides
          ctx.fillStyle = isLookingAway ? '#ef4444' : '#10b981';
          const guideLen = 12;
          // Top-left
          ctx.fillRect(x - 1, y - 1, guideLen, 2.5);
          ctx.fillRect(x - 1, y - 1, 2.5, guideLen);
          // Top-right
          ctx.fillRect(x + width - guideLen + 1, y - 1, guideLen, 2.5);
          ctx.fillRect(x + width - 1.5, y - 1, 2.5, guideLen);
          // Bottom-left
          ctx.fillRect(x - 1, y + height - 1.5, guideLen, 2.5);
          ctx.fillRect(x - 1, y + height - guideLen + 1, 2.5, guideLen);
          // Bottom-right
          ctx.fillRect(x + width - guideLen + 1, y + height - 1.5, guideLen, 2.5);
          ctx.fillRect(x + width - 1.5, y + height - guideLen + 1, 2.5, guideLen);

          // Gaze tracking eye points using real landmarks
          const landmarks = detection.landmarks;
          if (landmarks) {
            const leftEye = landmarks.getLeftEye();
            const rightEye = landmarks.getRightEye();

            // Calculate centers
            let lex = 0, ley = 0;
            leftEye.forEach((p: any) => { lex += p.x; ley += p.y; });
            lex /= leftEye.length;
            ley /= leftEye.length;

            let rex = 0, rey = 0;
            rightEye.forEach((p: any) => { rex += p.x; rey += p.y; });
            rex /= rightEye.length;
            rey /= rightEye.length;

            ctx.beginPath();
            ctx.arc(lex, ley, 3.5, 0, Math.PI * 2);
            ctx.arc(rex, rey, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = isLookingAway ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)';
            ctx.fill();

            // Gaze angle vector
            if (isLookingAway) {
              ctx.strokeStyle = '#ef4444';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              // estimate look-away direction vector
              const nose = landmarks.getNose();
              const noseTip = nose[3]; // nose tip point
              const jawLeft = landmarks.getJawOutline()[0];
              const jawRight = landmarks.getJawOutline()[16];
              const dLeft = Math.abs(noseTip.x - jawLeft.x);
              const dRight = Math.abs(jawRight.x - noseTip.x);
              const isLeftDir = dLeft < dRight;
              
              const dx = isLeftDir ? -35 : 35;
              ctx.moveTo(lex, ley);
              ctx.lineTo(lex + dx, ley - 10);
              ctx.moveTo(rex, rey);
              ctx.lineTo(rex + dx, rey - 10);
              ctx.stroke();
            }
          }

          // Indicator tag
          ctx.fillStyle = isLookingAway ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.1)';
          ctx.fillRect(x + width / 2 - 50, y + height + 10, 100, 16);
          ctx.strokeStyle = isLookingAway ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)';
          ctx.strokeRect(x + width / 2 - 50, y + height + 10, 100, 16);
          
          ctx.fillStyle = isLookingAway ? '#fca5a5' : '#a7f3d0';
          ctx.font = '9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(
            hasMultiple ? 'PEOPLE FLAGGED' : isLookingAway ? 'GAZE DEPARTED' : 'GAZE LOGGED',
            x + width / 2,
            y + height + 21
          );
        }
      }

      animId = requestAnimationFrame(drawOverlay);
    };

    animId = requestAnimationFrame(drawOverlay);
    return () => cancelAnimationFrame(animId);
  }, [isActive, streamActive]);

  return (
    <div className="bg-[#121214] border border-zinc-800 rounded-xl p-4 space-y-4 shadow-xl">
      <div className="flex justify-between items-center pb-2 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-zinc-200">Active Aegis HUD</span>
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
            {/* Scanning graphics canvas */}
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
