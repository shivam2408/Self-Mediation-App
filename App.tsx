import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Brain, Play, Square, RefreshCcw, Trophy, 
  Timer, Hash, TrendingUp, Calendar, BookOpen, Trash2, X, Pause, PlayCircle
} from 'lucide-react';
import { formatTime, formatDuration } from './utils/formatters';
import { IntervalRecord, SessionRecord } from './types';

const STORAGE_KEY_PB = 'stillness_personal_best';
const STORAGE_KEY_SESSIONS = 'stillness_sessions_v4';

// --- Audio Utility ---
const playTuckSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
  } catch (e) {
    console.warn("Audio feedback failed", e);
  }
};

const App: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [view, setView] = useState<'main' | 'journal'>('main');
  const [currentInterval, setCurrentInterval] = useState(0);
  const [intervals, setIntervals] = useState<IntervalRecord[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [personalBest, setPersonalBest] = useState<number>(0);
  const [allSessions, setAllSessions] = useState<SessionRecord[]>([]);
  
  const timerRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Load Data
  useEffect(() => {
    const storedPB = localStorage.getItem(STORAGE_KEY_PB);
    if (storedPB) setPersonalBest(parseInt(storedPB, 10));

    const storedSessions = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (storedSessions) {
      try {
        setAllSessions(JSON.parse(storedSessions));
      } catch (e) {
        setAllSessions([]);
      }
    }
  }, []);

  // Timer logic - Refined to support pausing
  useEffect(() => {
    if (isActive && !isPaused) {
      lastUpdateRef.current = Date.now();
      timerRef.current = window.setInterval(() => {
        const now = Date.now();
        const delta = now - lastUpdateRef.current;
        setCurrentInterval(prev => prev + delta);
        lastUpdateRef.current = now;
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, isPaused]);

  const startSession = () => {
    setIsActive(true);
    setIsPaused(false);
    setSessionStartTime(Date.now());
    setCurrentInterval(0);
    setIntervals([]);
    playTuckSound();
  };

  const togglePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPaused(prev => !prev);
    playTuckSound();
  };

  const recordThought = useCallback(() => {
    if (!isActive || isPaused) return;
    playTuckSound();
    
    const duration = currentInterval;
    const newRecord: IntervalRecord = {
      id: intervals.length + 1,
      duration,
      timestamp: Date.now(),
    };

    setIntervals(prev => [...prev, newRecord]);
    
    if (duration > personalBest) {
      setPersonalBest(duration);
      localStorage.setItem(STORAGE_KEY_PB, duration.toString());
    }

    setCurrentInterval(0);
  }, [isActive, isPaused, currentInterval, intervals.length, personalBest]);

  const endSession = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsActive(false);
    setIsPaused(false);
    
    const totalSessionDuration = sessionStartTime ? Date.now() - sessionStartTime : 0;
    let finalIntervals = [...intervals];
    
    // Include the current running interval as the final piece
    if (currentInterval > 500) {
      finalIntervals.push({ 
        id: intervals.length + 1, 
        duration: currentInterval, 
        timestamp: Date.now() 
      });
    }

    if (finalIntervals.length > 0) {
      const sessionStats: SessionRecord = {
        id: Date.now(),
        date: new Date().toISOString(),
        intervals: finalIntervals,
        totalDuration: totalSessionDuration,
        thoughtCount: finalIntervals.length,
        longestGap: Math.max(...finalIntervals.map(i => i.duration), 0),
        avgGap: finalIntervals.reduce((acc, curr) => acc + curr.duration, 0) / finalIntervals.length
      };

      const updatedSessions = [sessionStats, ...allSessions];
      setAllSessions(updatedSessions);
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(updatedSessions));
    }

    setCurrentInterval(0);
    setIntervals([]);
  };

  const deleteSession = (id: number) => {
    const updated = allSessions.filter(s => s.id !== id);
    setAllSessions(updated);
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(updated));
  };

  const groupedSessions = useMemo(() => {
    const groups: { [key: string]: SessionRecord[] } = {};
    allSessions.forEach(session => {
      const dateKey = new Date(session.date).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(session);
    });
    return groups;
  }, [allSessions]);

  // Added liveStats computation to fix reference errors in the footer metrics
  const liveStats = useMemo(() => {
    const count = allSessions.reduce((acc, s) => acc + s.thoughtCount, 0);
    const totalDuration = allSessions.reduce((acc, s) => acc + s.totalDuration, 0);
    const average = allSessions.length > 0 
      ? allSessions.reduce((acc, s) => acc + s.avgGap, 0) / allSessions.length 
      : 0;
    const longest = personalBest;
    
    return { count, average, longest, totalDuration };
  }, [allSessions, personalBest]);

  const lastSession = allSessions[0];

  if (view === 'journal') {
    return (
      <div className="min-h-screen flex flex-col p-6 md:p-8 max-w-2xl mx-auto space-y-6 overflow-y-auto bg-[#0f172a] text-[#f8fafc]">
        <header className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-7 h-7 text-indigo-400" />
            <h1 className="text-3xl font-semibold tracking-tight">Journal</h1>
          </div>
          <button onClick={() => setView('main')} className="p-3 bg-white/5 rounded-full"><X className="w-6 h-6" /></button>
        </header>

        <div className="flex-grow space-y-8 pb-20">
          {Object.keys(groupedSessions).length === 0 ? (
            <div className="text-center py-20 text-slate-500 italic text-lg">Your meditation journey starts here.</div>
          ) : (
            Object.entries(groupedSessions).map(([date, sessions]) => (
              <div key={date} className="space-y-4">
                <h3 className="text-sm font-bold text-indigo-300/60 uppercase tracking-widest ml-2">{date}</h3>
                {(sessions as SessionRecord[]).map(s => (
                  <div key={s.id} className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-3xl group transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-2xl font-medium text-slate-100">{formatDuration(s.totalDuration)}</span>
                        <span className="text-xs text-slate-500 ml-3">{new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <button onClick={() => deleteSession(s.id)} className="text-slate-600 hover:text-rose-400 p-2"><Trash2 className="w-5 h-5" /></button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white/5 rounded-2xl p-3 text-center">
                        <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Thoughts</div>
                        <div className="text-lg text-indigo-300 font-bold">{s.thoughtCount}</div>
                      </div>
                      <div className="bg-white/5 rounded-2xl p-3 text-center">
                        <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Avg Gap</div>
                        <div className="text-lg text-emerald-400 font-bold">{formatTime(s.avgGap)}</div>
                      </div>
                      <div className="bg-white/5 rounded-2xl p-3 text-center">
                        <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Best Gap</div>
                        <div className="text-lg text-amber-400 font-bold">{formatTime(s.longestGap)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
        
        <button onClick={() => setView('main')} className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-indigo-600 px-12 py-5 rounded-full text-white font-bold shadow-2xl">Return</button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col items-center justify-between p-6 md:p-8 max-w-2xl mx-auto overflow-hidden bg-radial-at-tr from-[#1e1b4b] to-[#0f172a] text-[#f8fafc]">
      <header className="w-full flex justify-between items-center h-16">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-600/30 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg shadow-indigo-500/10">
            <Brain className="w-7 h-7 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tighter">Stillness</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={() => setView('journal')} className="p-3 bg-white/5 rounded-2xl hover:text-indigo-300 transition-colors relative">
            <BookOpen className="w-7 h-7" />
            {allSessions.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-500 text-xs font-bold text-white flex items-center justify-center rounded-full border-2 border-[#0f172a]">{allSessions.length}</span>}
          </button>
        </div>
      </header>

      <main className="w-full flex-grow flex flex-col items-center justify-center relative">
        {!isActive ? (
          <div className="w-full flex flex-col items-center space-y-12 animate-in fade-in duration-1000">
            {/* Dashboard View - Big Metrics */}
            <div className="w-full grid grid-cols-1 gap-6 px-4">
              <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center space-y-2">
                <span className="text-xs font-bold text-amber-400/80 uppercase tracking-[0.3em]">Personal Best Gap</span>
                <span className="text-7xl font-light tracking-tighter text-slate-100">{formatTime(personalBest)}</span>
              </div>
              
              {lastSession && (
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 flex justify-around">
                  <div className="text-center">
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Last Session</div>
                    <div className="text-2xl font-medium text-indigo-200">{formatDuration(lastSession.totalDuration)}</div>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div className="text-center">
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Last Avg</div>
                    <div className="text-2xl font-medium text-emerald-300">{formatTime(lastSession.avgGap)}</div>
                  </div>
                </div>
              )}
            </div>

            <button onClick={startSession} className="group relative w-48 py-5 bg-indigo-600 hover:bg-indigo-500 rounded-3xl transition-all shadow-2xl shadow-indigo-900/60 flex items-center justify-center space-x-3 active:scale-95">
              <Play className="w-6 h-6 fill-current" />
              <span className="text-xl font-semibold">Begin</span>
            </button>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            {/* Active Timer Display */}
            <div className={`absolute top-12 flex flex-col items-center z-20 pointer-events-none transition-opacity duration-300 ${isPaused ? 'opacity-30' : 'opacity-100'}`}>
              <span className="text-xs text-indigo-300/60 uppercase tracking-[0.4em] font-bold mb-2">Current Stillness</span>
              <div className="text-[6.5rem] leading-none font-light tracking-tighter text-indigo-100">
                {formatTime(currentInterval)}
              </div>
            </div>

            {/* MASSIVE TAP ZONE */}
            <button 
              onClick={recordThought}
              disabled={isPaused}
              className={`w-full h-[60vh] bg-white/5 backdrop-blur-md border border-white/10 rounded-[3.5rem] flex flex-col items-center justify-center space-y-6 active:scale-[0.97] transition-all duration-150 select-none touch-none overflow-hidden ${isPaused ? 'opacity-10 grayscale' : 'animate-pulse cursor-pointer'}`}
              style={{ animationDuration: '4s' }}
            >
              <RefreshCcw className="w-20 h-20 text-indigo-400 opacity-20" />
              <div className="text-center space-y-2">
                <span className="text-3xl font-semibold text-indigo-100/30 uppercase tracking-[0.2em]">TAP SCREEN</span>
                <p className="text-xs text-indigo-300/20 uppercase font-bold tracking-widest">When a thought arises</p>
              </div>
            </button>

            {/* Controls Bar */}
            <div className="mt-10 flex items-center space-x-4 w-full justify-center">
              <button 
                onClick={togglePause}
                className="flex items-center space-x-3 bg-white/10 hover:bg-white/15 px-8 py-4 rounded-2xl transition-all active:scale-95"
              >
                {isPaused ? <PlayCircle className="w-6 h-6 text-emerald-400" /> : <Pause className="w-6 h-6 text-amber-400" />}
                <span className="font-bold uppercase tracking-widest text-sm">{isPaused ? 'Resume' : 'Pause'}</span>
              </button>

              <button 
                onClick={() => endSession()}
                className="flex items-center space-x-3 bg-rose-500/10 hover:bg-rose-500/20 px-8 py-4 rounded-2xl transition-all active:scale-95 border border-rose-500/20"
              >
                <Square className="w-5 h-5 text-rose-400 fill-current" />
                <span className="text-rose-400 font-bold uppercase tracking-widest text-sm">Finish</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer Metrics - Always visible but styled better */}
      <footer className={`w-full grid grid-cols-4 gap-3 mb-6 transition-all duration-700 ${isActive ? 'opacity-20 blur-sm translate-y-4 scale-90 pointer-events-none' : 'opacity-100'}`}>
        <StatItem icon={<Hash className="w-4 h-4" />} label="Total" value={liveStats.count.toString()} color="indigo" />
        <StatItem icon={<TrendingUp className="w-4 h-4" />} label="Avg" value={formatTime(liveStats.average)} color="emerald" />
        <StatItem icon={<Trophy className="w-4 h-4" />} label="Best" value={formatTime(liveStats.longest)} color="amber" />
        <StatItem icon={<Timer className="w-4 h-4" />} label="Time" value={formatDuration(liveStats.totalDuration)} color="sky" />
      </footer>
    </div>
  );
};

const StatItem: React.FC<{ icon: React.ReactNode, label: string, value: string, color: string }> = ({ icon, label, value, color }) => {
  const colorMap: any = {
    indigo: 'text-indigo-400 bg-indigo-400/10',
    emerald: 'text-emerald-400 bg-emerald-400/10',
    amber: 'text-amber-400 bg-amber-400/10',
    sky: 'text-sky-400 bg-sky-400/10',
  };
  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-4 rounded-3xl flex flex-col items-center justify-center space-y-1.5 shadow-lg shadow-black/20">
      <div className={`w-fit p-1.5 rounded-xl ${colorMap[color]}`}>{icon}</div>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
      <span className="text-base font-semibold text-slate-100 tabular-nums">{value}</span>
    </div>
  );
};

export default App;