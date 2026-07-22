'use client';

import { useState, useEffect } from 'react';
import { Play, Sparkles } from 'lucide-react';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  angle: number;
}

export default function InaugurateLaunch() {
  const [isCounting, setIsCounting] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isCelebrated, setIsCelebrated] = useState(false);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [opacityClass, setOpacityClass] = useState('opacity-0 pointer-events-none');

  // Trigger countdown
  const startInauguration = () => {
    setCountdown(5);
    setIsCounting(true);
    setIsCelebrated(false);
    setOpacityClass('opacity-100 pointer-events-auto');
  };

  // Countdown timer
  useEffect(() => {
    if (!isCounting) return;
    
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Reached 0, trigger celebration
      setIsCelebrated(true);
      
      // Generate confetti
      const colors = ['#059669', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#ec4899', '#ffffff'];
      const pieces = Array.from({ length: 80 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100, // percentage
        y: Math.random() * 20 + 80, // starts near bottom
        size: Math.random() * 8 + 6, // size in px
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
        duration: Math.random() * 2 + 2, // time to fall
        angle: Math.random() * 360,
      }));
      setConfetti(pieces);

      // Auto-hide overlay after 4 seconds of celebration
      const endTimer = setTimeout(() => {
        setOpacityClass('opacity-0 pointer-events-none transition-opacity duration-1000');
        setTimeout(() => {
          setIsCounting(false);
          setIsCelebrated(false);
        }, 1000);
      }, 4000);

      return () => clearTimeout(endTimer);
    }
  }, [countdown, isCounting]);

  return (
    <>
      {/* Inaugurate Button Trigger */}
      <div className="flex justify-center my-4">
        <button
          onClick={startInauguration}
          className="group relative flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-700 to-green-700 text-white font-semibold text-xs rounded-md shadow-md hover:from-emerald-800 hover:to-green-800 transition-all duration-300 transform hover:scale-[1.03] cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          <Sparkles className="h-4 w-4 animate-pulse text-amber-300" />
          <span>Inaugurate Website</span>
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
        </button>
      </div>

      {/* Full-screen Launch Overlay */}
      <div className={`fixed inset-0 z-[9999] bg-neutral-950 flex flex-col items-center justify-center text-white transition-all duration-500 ${opacityClass}`}>
        
        {/* Confetti Container */}
        {isCelebrated && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
            {confetti.map(p => (
              <div
                key={p.id}
                className="absolute rounded-sm animate-confetti-fall"
                style={{
                  left: `${p.x}%`,
                  bottom: `${p.y}%`,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  backgroundColor: p.color,
                  transform: `rotate(${p.angle}deg)`,
                  animationDelay: `${p.delay}s`,
                  animationDuration: `${p.duration}s`,
                  opacity: 0.8,
                }}
              />
            ))}
          </div>
        )}

        {/* Outer Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-900/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-950/15 rounded-full blur-3xl pointer-events-none" />

        {/* Content Box */}
        <div className="relative z-20 flex flex-col items-center max-w-md px-6 text-center space-y-6">
          
          {!isCelebrated ? (
            <>
              {/* Launcher Scan Effect */}
              <div className="relative w-36 h-36 flex items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-950/10">
                <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500 animate-spin duration-1000" />
                
                {/* Tick Animation Box */}
                <div key={countdown} className="text-6xl font-sans font-bold text-emerald-400 animate-countdown-tick">
                  {countdown}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] tracking-widest text-emerald-500 uppercase font-mono font-bold animate-pulse">
                  System Launch Sequence Active
                </span>
                <h3 className="text-xl font-heading font-semibold text-neutral-100">
                  Inaugurating Forestry Registry
                </h3>
                <p className="text-xs text-neutral-400 font-sans max-w-[280px]">
                  Setting up zone configurations, encryption keys, and active GPS telemetry.
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-6 animate-celebrate-in">
              {/* Celebratory Shield Logo */}
              <div className="mx-auto w-24 h-24 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-pulse">
                <Sparkles className="h-10 w-10 text-emerald-400 animate-bounce" />
              </div>

              <div className="space-y-3">
                <span className="text-[10px] tracking-[0.2em] text-amber-400 uppercase font-mono font-bold">
                  ★ CONGRATULATIONS ★
                </span>
                <h2 className="text-3xl font-heading font-semibold text-white leading-tight">
                  Registry is Live!
                </h2>
                <p className="text-xs text-neutral-300 font-sans max-w-sm">
                  Palamau Tiger Reserve Forestry Tracking Platform has been successfully inaugurated and deployed to public servers.
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-800/40 text-[10px] text-emerald-400 font-mono font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                Entering System Workspace...
              </div>
            </div>
          )}
        </div>

        {/* Inline CSS Animations (Ensures complete isolation and zero dependencies) */}
        <style jsx global>{`
          @keyframes confetti-fall {
            0% {
              transform: translateY(0) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(-800px) translateX(var(--confetti-wind, 100px)) rotate(720deg);
              opacity: 0;
            }
          }
          
          .animate-confetti-fall {
            animation-name: confetti-fall;
            animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
            animation-fill-mode: forwards;
          }

          @keyframes countdown-tick {
            0% {
              transform: scale(0.6);
              opacity: 0;
              filter: blur(4px);
            }
            30% {
              transform: scale(1.1);
              opacity: 1;
              filter: blur(0px);
            }
            100% {
              transform: scale(0.9);
              opacity: 0.8;
            }
          }

          .animate-countdown-tick {
            animation: countdown-tick 0.95s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }

          @keyframes celebrate-in {
            0% {
              transform: scale(0.9);
              opacity: 0;
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }

          .animate-celebrate-in {
            animation: celebrate-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}</style>
      </div>
    </>
  );
}
