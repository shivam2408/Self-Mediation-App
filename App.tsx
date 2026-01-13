
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Brain, Play, Square, RefreshCcw, Trophy, 
  Timer, Hash, TrendingUp, ChevronDown, ChevronUp, 
  Calendar, BookOpen, Trash2, X 
} from 'lucide-react';
import { formatTime, formatDuration } from './utils/formatters';
import { IntervalRecord, SessionRecord } from './types';

const STORAGE_KEY_PB = 'mindgap_personal_best';
const STORAGE_KEY_SESSIONS = 'mindgap_sessions_v3';

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
  const [view, setView] = useState<'main' | 'journal'>('main');
  const [currentInterval, setCurrentInterval] = useState(0);
  const [intervals, setIntervals] = useState<IntervalRecord[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [personalBest, setPersonalBest] = useState<number>(0);
  const [allSessions, setAllSessions] = useState<SessionRecord[]>([]);
  
  const timerRef = useRef<number | null>(null);
  const lastThoughtTimestamp = useRef<number>(0);

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

  // Timer logic
  useEffect(() => {
    if (isActive) {
      timerRef.current = window.setInterval(() => {
        setCurrentInterval(Date.now() - lastThoughtTimestamp.current);
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive]);

  const startSession = () => {
    const now = Date.now();
    setIsActive(true);
    setSessionStartTime(now);
    lastThoughtTimestamp.current = now;
    setCurrentInterval(0);
    setIntervals([]);
    playTuckSound();
  };

  const recordThought = useCallback(() => {
    if (!isActive) return;
    playTuckSound();
    
    const now = Date.now();
    const duration = now - lastThoughtTimestamp.current;
    
    const newRecord: IntervalRecord = {
      id: intervals.length + 1,
      duration,
      timestamp: now,
    };

    setIntervals(prev => [...prev, newRecord]);
    
    if (duration > personalBest) {
      setPersonalBest(duration);
      localStorage.setItem(STORAGE_KEY_PB, duration.toString());
    }

    lastThoughtTimestamp.current = now;
    setCurrentInterval(0);
  }, [isActive, intervals.length, personalBest]);

  const endSession = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsActive(false);
    
    const now = Date.now();
    const finalGap = now - lastThoughtTimestamp.current;
    const totalSessionDuration = now - (sessionStartTime || now);
    
    let finalIntervals = [...intervals];
    if (finalGap > 500) {
      finalIntervals.push({ id: intervals.length + 1, duration: finalGap, timestamp: now });
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

  const liveStats = {
    count: intervals.length,
    longest: Math.max(...intervals.map(i => i.duration), currentInterval, 0),
    average: intervals.length > 0 ? intervals.reduce((acc, curr) => acc + curr.duration, 0) / intervals.length : 0,
    totalDuration: sessionStartTime ? Date.now() - sessionStartTime : 0
  };

  if (view === 'journal') {
    return (
      <div className="min-h-screen flex flex-col p-4 md:p-8 max-w-2xl mx-auto space-y-6 overflow-y-auto bg-[#0f172a] text-[#f8fafc]">
        <header className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            <h1 className="text-2xl font-semibold tracking-tight">Session Journal</h1>
          </div>
          <button onClick={() => setView('main')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-grow space-y-8 pb-20">
          {Object.keys(groupedSessions).length === 0 ? (
            <div className="text-center py-20 text-slate-500 italic">No recorded sessions yet.</div>
          ) : (
            Object.entries(groupedSessions).map(([date, sessions]) => (
              <div key={date} className="space-y-3">
                <h3 className="text-[10px] font-bold text-indigo-300/60 uppercase tracking-widest ml-2">{date}</h3>
                {/* FIX: Cast sessions to SessionRecord[] to ensure TypeScript recognizes the 'map' method on the unknown value. */}
                {(sessions as SessionRecord[]).map(s => (
                  <div key={s.id} className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl group transition-all hover:bg-white/[0.07]">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-lg font-medium text-slate-100">{formatDuration(s.totalDuration)} Session</span>
                        <span className="text-[10px] text-slate-500 ml-2">{new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <button onClick={() => deleteSession(s.id)} className="text-slate-600 hover:text-rose-400 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white/5 rounded-xl p-2 text-center">
                        <div className="text-[8px] uppercase text-slate-500 font-bold">Thoughts</div>
                        <div className="text-indigo-300 font-bold">{s.thoughtCount}</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-2 text-center">
                        <div className="text-[8px] uppercase text-slate-500 font-bold">Avg Gap</div>
                        <div className="text-emerald-400 font-bold">{formatTime(s.avgGap)}</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-2 text-center">
                        <div className="text-[8px] uppercase text-slate-500 font-bold">Best Gap</div>
                        <div className="text-amber-400 font-bold">{formatTime(s.longestGap)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
        
        <button onClick={() => setView('main')} className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/5 backdrop-blur-md border border-white/10 px-10 py-4 rounded-full text-indigo-300 font-bold hover:bg-white/10 transition-colors">Close Journal</button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col items-center justify-between p-4 md:p-8 max-w-2xl mx-auto overflow-hidden bg-radial-at-tr from-[#1e1b4b] to-[#0f172a] text-[#f8fafc]">
      <header className="w-full flex justify-between items-center h-16">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-indigo-600/30 rounded-xl backdrop-blur-md border border-white/10">
            <Brain className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">MindGap</h1>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={() => setView('journal')} className="p-2 text-slate-400 hover:text-indigo-300 transition-colors relative">
            <BookOpen className="w-6 h-6" />
            {allSessions.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 text-[10px] font-bold text-white flex items-center justify-center rounded-full">{allSessions.length}</span>}
          </button>
          <div className="text-xs bg-white/5 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full text-indigo-200/70">
            Best: {formatTime(personalBest)}
          </div>
        </div>
      </header>

      <main className="w-full flex-grow flex flex-col items-center justify-center relative">
        {!isActive ? (
          <div className="flex flex-col items-center space-y-8 animate-in fade-in duration-700">
            <div className="text-center space-y-2">
              <div className="text-6xl font-light tracking-tighter text-slate-400 opacity-20">READY?</div>
              <p className="text-sm text-slate-500 italic">Close your eyes and breathe.</p>
            </div>
            <button onClick={startSession} className="group relative w-64 py-8 bg-indigo-600 hover:bg-indigo-500 rounded-3xl transition-all shadow-2xl shadow-indigo-900/40 flex items-center justify-center space-x-3 active:scale-95">
              <Play className="w-8 h-8 fill-current" />
              <span className="text-2xl font-medium">Begin</span>
            </button>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="absolute top-10 flex flex-col items-center z-10 pointer-events-none">
              <span className="text-[10px] text-indigo-300/40 uppercase tracking-[0.3em] font-bold mb-1">Current Gap</span>
              <div className="text-7xl font-light tracking-tighter text-indigo-100">
                {formatTime(currentInterval)}
              </div>
            </div>

            {/* MASSIVE TAP ZONE - DOUBLE SIZE */}
            <button 
              onClick={recordThought}
              className="w-full h-[65vh] bg-white/5 backdrop-blur-md border border-white/10 rounded-[3rem] flex flex-col items-center justify-center space-y-4 active:bg-white/10 active:scale-[0.98] transition-all duration-75 select-none touch-none overflow-hidden animate-pulse"
              style={{ animationDuration: '3s' }}
            >
              <RefreshCcw className="w-16 h-16 text-indigo-400 opacity-20" />
              <div className="text-center space-y-1">
                <span className="text-2xl font-semibold text-indigo-100/40 uppercase tracking-widest">TAP ANYWHERE</span>
                <p className="text-[10px] text-indigo-300/20 uppercase font-bold tracking-tighter">Eyes closed mode</p>
              </div>
            </button>

            <button onClick={() => endSession()} className="mt-8 flex items-center space-x-2 text-rose-400/50 hover:text-rose-400 transition-colors uppercase text-xs font-bold tracking-widest py-4 px-8">
              <Square className="w-4 h-4 fill-current" />
              <span>Finish & Save</span>
            </button>
          </div>
        )}
      </main>

      <footer className={`w-full grid grid-cols-4 gap-2 mb-4 transition-all duration-500 ${isActive ? 'opacity-30 blur-sm scale-90' : 'opacity-100'}`}>
        <StatItem icon={<Hash className="w-3 h-3" />} label="Thoughts" value={liveStats.count.toString()} color="indigo" />
        <StatItem icon={<TrendingUp className="w-3 h-3" />} label="Avg Gap" value={formatTime(liveStats.average)} color="emerald" />
        <StatItem icon={<Trophy className="w-3 h-3" />} label="Best Gap" value={formatTime(liveStats.longest)} color="amber" />
        <StatItem icon={<Timer className="w-3 h-3" />} label="Duration" value={formatDuration(liveStats.totalDuration)} color="sky" />
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
    <div className="bg-white/5 backdrop-blur-md border border-white/10 p-3 rounded-2xl flex flex-col items-center justify-center space-y-1">
      <div className={`w-fit p-1 rounded-lg ${colorMap[color]}`}>{icon}</div>
      <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-xs font-medium text-slate-100 tabular-nums">{value}</span>
    </div>
  );
};

export default App;
