
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Brain, Play, Square, RefreshCcw, Trophy, Timer, Hash, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { formatTime, formatDuration } from './utils/formatters';
import { IntervalRecord } from './types';

const STORAGE_KEY_PB = 'mindgap_personal_best';

const App: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentInterval, setCurrentInterval] = useState(0);
  const [intervals, setIntervals] = useState<IntervalRecord[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [personalBest, setPersonalBest] = useState<number>(0);
  const [showHistory, setShowHistory] = useState(false);
  
  const timerRef = useRef<number | null>(null);
  const lastThoughtTimestamp = useRef<number>(0);

  // Load Personal Best
  useEffect(() => {
    const storedPB = localStorage.getItem(STORAGE_KEY_PB);
    if (storedPB) {
      setPersonalBest(parseInt(storedPB, 10));
    }
  }, []);

  // Timer logic
  useEffect(() => {
    if (isActive) {
      timerRef.current = window.setInterval(() => {
        const now = Date.now();
        setCurrentInterval(now - lastThoughtTimestamp.current);
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  const startSession = () => {
    const now = Date.now();
    setIsActive(true);
    setSessionStartTime(now);
    lastThoughtTimestamp.current = now;
    setCurrentInterval(0);
    setIntervals([]);
  };

  const endSession = () => {
    setIsActive(false);
    // Log the final interval from last thought to end of session
    const finalInterval = Date.now() - lastThoughtTimestamp.current;
    if (finalInterval > 1000) {
        handleThought(true);
    }
  };

  const handleThought = useCallback((isManualEnd = false) => {
    if (!isActive && !isManualEnd) return;

    const now = Date.now();
    const duration = now - lastThoughtTimestamp.current;

    const newRecord: IntervalRecord = {
      id: intervals.length + 1,
      duration,
      timestamp: now,
    };

    setIntervals(prev => [...prev, newRecord]);
    
    // Update Personal Best
    if (duration > personalBest) {
      setPersonalBest(duration);
      localStorage.setItem(STORAGE_KEY_PB, duration.toString());
    }

    lastThoughtTimestamp.current = now;
    setCurrentInterval(0);
  }, [isActive, intervals.length, personalBest]);

  const stats = {
    count: intervals.length,
    longest: Math.max(...intervals.map(i => i.duration), currentInterval),
    average: intervals.length > 0 
      ? intervals.reduce((acc, curr) => acc + curr.duration, 0) / intervals.length 
      : 0,
    totalDuration: sessionStartTime ? Date.now() - sessionStartTime : 0
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-4 md:p-8 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <header className="w-full flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-indigo-600/30 rounded-xl glass">
            <Brain className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">MindGap</h1>
        </div>
        <div className="flex items-center space-x-2 text-indigo-200/70 text-sm glass px-3 py-1.5 rounded-full">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span>Best: {formatTime(personalBest)}</span>
        </div>
      </header>

      {/* Main Timer Display */}
      <main className="w-full flex-grow flex flex-col items-center justify-center space-y-12 py-8">
        <div className="relative group">
          <div className={`absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full transition-all duration-1000 ${isActive ? 'scale-125 opacity-100' : 'scale-75 opacity-0'}`} />
          <div className="relative flex flex-col items-center">
            <span className="text-indigo-300/60 uppercase tracking-[0.2em] text-xs font-medium mb-2">Current Interval</span>
            <div className={`text-7xl md:text-8xl font-light tracking-tighter ${isActive ? 'timer-shimmer' : 'text-slate-500'}`}>
              {formatTime(isActive ? currentInterval : 0)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col items-center space-y-6">
          {!isActive ? (
            <button
              onClick={startSession}
              className="group relative w-full md:w-64 py-6 bg-indigo-600 hover:bg-indigo-500 rounded-2xl transition-all duration-300 shadow-xl shadow-indigo-900/40 flex items-center justify-center space-x-3 overflow-hidden active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Play className="w-6 h-6 fill-current" />
              <span className="text-xl font-medium">Begin Session</span>
            </button>
          ) : (
            <div className="w-full space-y-4 flex flex-col items-center">
              <button
                onClick={() => handleThought()}
                className="group relative w-full py-10 md:py-12 bg-white/10 hover:bg-white/15 active:bg-white/5 rounded-3xl glass transition-all duration-200 flex flex-col items-center justify-center space-y-2 border-indigo-500/30 active:scale-95 select-none"
              >
                <RefreshCcw className="w-8 h-8 text-indigo-400 group-active:rotate-180 transition-transform duration-500" />
                <span className="text-2xl font-semibold tracking-wide text-indigo-100">Thought Occurred</span>
                <span className="text-xs text-indigo-300/50 uppercase tracking-widest">Tap to Reset Timer</span>
              </button>
              
              <button
                onClick={endSession}
                className="w-full md:w-48 py-4 text-rose-400/80 hover:text-rose-400 font-medium flex items-center justify-center space-x-2 transition-colors active:scale-95"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>End Session</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Stats Dashboard */}
      <section className="w-full grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard 
          icon={<Hash className="w-4 h-4" />} 
          label="Thoughts" 
          value={stats.count.toString()} 
          color="indigo" 
        />
        <StatCard 
          icon={<TrendingUp className="w-4 h-4" />} 
          label="Avg Gap" 
          value={formatTime(stats.average)} 
          color="emerald" 
        />
        <StatCard 
          icon={<Trophy className="w-4 h-4" />} 
          label="Longest" 
          value={formatTime(stats.longest)} 
          color="amber" 
        />
        <StatCard 
          icon={<Timer className="w-4 h-4" />} 
          label="Session" 
          value={formatDuration(stats.totalDuration)} 
          color="sky" 
        />
      </section>

      {/* Interval History */}
      <section className="w-full mt-4">
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between p-4 glass rounded-2xl hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <span className="font-medium text-slate-300">History Log</span>
            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-tighter">
              {intervals.length} intervals
            </span>
          </div>
          {showHistory ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {showHistory && (
          <div className="mt-2 space-y-2 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-indigo-500/20">
            {intervals.length === 0 ? (
              <div className="text-center py-8 text-slate-500 italic text-sm">No thoughts recorded yet. Breathe...</div>
            ) : (
              intervals.slice().reverse().map((record) => (
                <div key={record.id} className="flex justify-between items-center p-3 glass rounded-xl border-l-4 border-indigo-500/30">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-indigo-300/60 uppercase">Thought #{record.id}</span>
                    <span className="text-xs text-slate-500">{new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                  <div className="text-lg font-medium text-slate-200">
                    {formatTime(record.duration)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* Footer Branding */}
      <footer className="w-full text-center py-6 text-slate-500 text-xs font-light tracking-widest uppercase mt-auto">
        Mindful Awareness &bull; Inner Stillness
      </footer>
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'indigo' | 'emerald' | 'amber' | 'sky';
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => {
  const colorMap = {
    indigo: 'text-indigo-400 bg-indigo-400/10',
    emerald: 'text-emerald-400 bg-emerald-400/10',
    amber: 'text-amber-400 bg-amber-400/10',
    sky: 'text-sky-400 bg-sky-400/10',
  };

  return (
    <div className="glass p-4 rounded-2xl flex flex-col space-y-1">
      <div className={`w-fit p-1.5 rounded-lg mb-1 ${colorMap[color]}`}>
        {icon}
      </div>
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-lg font-medium text-slate-100 tabular-nums">{value}</span>
    </div>
  );
};

export default App;
