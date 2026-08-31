import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Flame, X } from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import confetti from 'canvas-confetti';

export const PomodoroTimer = () => {
  const {
    activeTimerTask,
    setActiveTimerTask,
    incrementPomodoro,
    settings,
  } = useTasks();

  const workMinutes = settings.pomodoro_work || 25;
  const breakMinutes = settings.pomodoro_break || 5;

  const [mode, setMode] = useState('work'); // 'work' | 'break'
  const [timeLeft, setTimeLeft] = useState(workMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  // Sound synthesis using Web Audio API
  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
      console.warn('Audio not allowed yet:', e);
    }
  };

  // Reset when settings work/break change
  useEffect(() => {
    if (!isRunning) {
      setTimeLeft(mode === 'work' ? workMinutes * 60 : breakMinutes * 60);
    }
  }, [workMinutes, breakMinutes, mode]);

  // Main countdown timer effect
  useEffect(() => {
    let interval = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      playChime();
      if (mode === 'work') {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.9 },
        });
        setSessionsCompleted(prev => prev + 1);
        if (activeTimerTask) {
          incrementPomodoro(activeTimerTask.id);
        }
        setMode('break');
        setTimeLeft(breakMinutes * 60);
      } else {
        setMode('work');
        setTimeLeft(workMinutes * 60);
      }
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode, workMinutes, breakMinutes, activeTimerTask]);

  if (!activeTimerTask) return null;

  const totalTime = mode === 'work' ? workMinutes * 60 : breakMinutes * 60;
  const progressPercent = Math.round(((totalTime - timeLeft) / totalTime) * 100);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'work' ? workMinutes * 60 : breakMinutes * 60);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-white/95 dark:bg-slate-900/95 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl shadow-2xl backdrop-blur-md p-5 w-88 text-slate-900 dark:text-white">
        
        {/* Header & Close */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-500 animate-ping' : 'bg-amber-400'}`}></span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              {mode === 'work' ? 'Deep Focus Session' : 'Rest Break'}
            </span>
          </div>
          <button
            onClick={() => setActiveTimerTask(null)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Task Focused */}
        <div className="mt-3">
          <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-500" /> Focusing on:
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate mt-1">
            {activeTimerTask.title}
          </p>
        </div>

        {/* Big Time Display & Circular Progress Bar */}
        <div className="my-4 flex flex-col items-center justify-center">
          <div className="text-4xl font-mono font-bold tracking-tight text-slate-900 dark:text-white">
            {formattedTime}
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 rounded-full ${
                mode === 'work' ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-emerald-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between pt-1.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all cursor-pointer ${
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-600'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
              }`}
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isRunning ? 'Pause' : 'Start'}
            </button>

            <button
              onClick={handleReset}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            🍅 {activeTimerTask.pomodoro_count || 0} done
          </div>
        </div>

      </div>
    </div>
  );
};
