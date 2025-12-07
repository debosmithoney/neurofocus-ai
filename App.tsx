import React, { useState, useEffect, useRef } from 'react';
import { AppView, FocusMode, Session, DailyStats, DEFAULT_STATS, TaskStep } from './types';
import StatsCard from './components/StatsCard';
import ProblemPanel from './components/ProblemPanel';
import GoalBreakdown from './components/GoalBreakdown';
import Celebration from './components/Celebration';
import ImageEditor from './components/ImageEditor';
import { breakDownGoal, getDistractionCoaching } from './services/geminiService';

const STORE_KEY = 'neurofocus_stats';
const SESSION_KEY = 'neurofocus_active_session';
const BREAKDOWN_KEY = 'neurofocus_breakdown';

function App() {
  // --- Theme State ---
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored) return stored === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  // --- App State ---
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [stats, setStats] = useState<DailyStats>(DEFAULT_STATS);
  const [showSettings, setShowSettings] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Focus Session Inputs
  const [goal, setGoal] = useState('');
  const [mode, setMode] = useState<FocusMode>(FocusMode.STUDY);
  const [duration, setDuration] = useState(25);
  const [customDuration, setCustomDuration] = useState<string>('');

  // Voice Input State
  const [isListening, setIsListening] = useState(false);

  // Active Session State
  const [session, setSession] = useState<Session | null>(null);
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [coachingMessage, setCoachingMessage] = useState<string | null>(null);
  const [isCoachingLoading, setIsCoachingLoading] = useState(false);
  
  // Breakdown State
  const [generatedSteps, setGeneratedSteps] = useState<TaskStep[]>([]);
  const [isBreakdownLoading, setIsBreakdownLoading] = useState(false);

  // Timer Ref
  const timerRef = useRef<number | null>(null);

  // --- 1. Load Data on Mount ---
  useEffect(() => {
    // 1a. Stats
    const savedStats = localStorage.getItem(STORE_KEY);
    if (savedStats) {
      try {
        const parsed = JSON.parse(savedStats);
        const today = new Date().toISOString().split('T')[0];
        if (parsed.lastSessionDate !== today) {
           setStats({
             ...parsed,
             totalFocusMinutes: 0,
             sessionsCompleted: 0,
             problemsGenerated: 0,
             lastSessionDate: today
           });
        } else {
          setStats(parsed);
        }
      } catch (e) {
        console.error("Stats parse error", e);
      }
    }

    // 1b. Active Session (Restoration)
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try {
        const parsedSession: Session = JSON.parse(savedSession);
        // Only restore if it was running or paused, not completed
        if (parsedSession.status !== 'completed') {
          setSession(parsedSession);
          
          // Calculate elapsed time based on real clock
          const now = Date.now();
          const elapsedSinceStart = (now - parsedSession.startTime) / 1000;
          
          if (parsedSession.status === 'running') {
             const totalDurationSecs = parsedSession.durationMinutes * 60;
             const remaining = totalDurationSecs - elapsedSinceStart;
             
             if (remaining > 0) {
               setTimeLeft(remaining);
               setView(AppView.SESSION);
             } else {
               // Session finished while user was away
               setSession({ ...parsedSession, status: 'completed' });
               setTimeLeft(0);
               setView(AppView.SESSION);
             }
          } else {
            // If paused, we discard in this simple version to avoid complex sync bugs
            localStorage.removeItem(SESSION_KEY);
          }
        }
      } catch (e) {
        console.error("Session restore error", e);
      }
    }

    // 1c. Breakdown Steps
    const savedSteps = localStorage.getItem(BREAKDOWN_KEY);
    if (savedSteps) {
      try {
        const parsedSteps = JSON.parse(savedSteps);
        if (Array.isArray(parsedSteps) && parsedSteps.length > 0) {
          setGeneratedSteps(parsedSteps);
        }
      } catch(e) {}
    }

  }, []);

  // --- 2. Persistence Effects ---

  // Save Stats
  useEffect(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify(stats));
  }, [stats]);

  // Save Session
  useEffect(() => {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [session]);

  // Save Breakdown
  useEffect(() => {
    if (generatedSteps.length > 0) {
      localStorage.setItem(BREAKDOWN_KEY, JSON.stringify(generatedSteps));
    }
  }, [generatedSteps]);

  // --- 3. Timer Logic ---
  useEffect(() => {
    if (session?.status === 'running' && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            completeSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status, timeLeft]);


  // --- Actions ---

  const startSession = (sessionGoal: string, sessionDuration: number, sessionMode: FocusMode) => {
    const newSession: Session = {
      id: Date.now().toString(),
      goal: sessionGoal,
      mode: sessionMode,
      durationMinutes: sessionDuration,
      startTime: Date.now(),
      elapsedSeconds: 0,
      status: 'running',
    };
    setSession(newSession);
    setTimeLeft(sessionDuration * 60);
    setCoachingMessage(null);
    setShowCelebration(false);
    setView(AppView.SESSION);
  };

  const pauseSession = () => {
    setSession((prev) => prev ? { ...prev, status: 'paused' } : null);
  };

  const resumeSession = () => {
    if (session) {
       // Recalculate start time so elapsed math is correct relative to now
       const elapsed = (session.durationMinutes * 60) - timeLeft;
       const newStartTime = Date.now() - (elapsed * 1000);
       setSession({ ...session, status: 'running', startTime: newStartTime });
    }
  };

  const handleStopSession = () => {
    if (!session) return;
    
    // Calculate elapsed time (partial credit)
    const elapsedMinutes = Math.floor((session.durationMinutes * 60 - timeLeft) / 60);
    const message = elapsedMinutes > 0 
      ? `Ending early? We'll log the ${elapsedMinutes} minutes you've completed so far.`
      : "End session? No time will be logged as less than 1 minute has passed.";

    if (window.confirm(message)) {
      if (timerRef.current) clearInterval(timerRef.current);
      
      // Save partial progress
      if (elapsedMinutes > 0) {
        setStats(prev => ({
          ...prev,
          totalFocusMinutes: prev.totalFocusMinutes + elapsedMinutes,
          // We don't increment completed sessions, but we do log the minutes.
        }));
      }

      // Clear persistence explicitly
      localStorage.removeItem(SESSION_KEY);
      
      // Reset state
      setSession(null);
      setView(AppView.HOME);
    }
  };

  const completeSession = () => {
    if (!session) return;
    const today = new Date().toISOString().split('T')[0];
    
    // Update Stats
    setStats(prev => {
      const isNewDay = prev.lastSessionDate !== today;
      const newStreak = isNewDay && prev.lastSessionDate ? prev.streakDays + 1 : (prev.streakDays || 1);
      
      return {
        totalFocusMinutes: prev.totalFocusMinutes + session.durationMinutes,
        sessionsCompleted: prev.sessionsCompleted + 1,
        problemsGenerated: prev.problemsGenerated,
        streakDays: newStreak,
        lastSessionDate: today
      };
    });

    setSession({ ...session, status: 'completed' });
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Trigger Celebration
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 6000); // Hide after 6s
  };

  const handleBreakdown = async () => {
    if (!goal) {
      alert("Please enter a goal first.");
      return;
    }
    setIsBreakdownLoading(true);
    try {
      const steps = await breakDownGoal(goal);
      if (steps && steps.length > 0) {
        setGeneratedSteps(steps);
        setView(AppView.BREAKDOWN);
      } else {
         alert("Could not generate steps. Please try again.");
      }
    } catch (e) {
      console.error(e);
      alert("Could not generate steps. Please check your connection.");
    } finally {
      setIsBreakdownLoading(false);
    }
  };

  const handleDistraction = async () => {
    if (!session) return;
    setIsCoachingLoading(true);
    const elapsedMins = Math.floor((session.durationMinutes * 60 - timeLeft) / 60);
    const msg = await getDistractionCoaching(session.goal, session.mode, elapsedMins);
    setCoachingMessage(msg);
    setIsCoachingLoading(false);
  };

  const incrementProblemStat = () => {
    setStats(prev => ({ ...prev, problemsGenerated: prev.problemsGenerated + 1 }));
  };

  const handleVoiceInput = () => {
    if (isListening) return;

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Your browser does not support voice recognition. Please try Chrome or Edge.");
      return;
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setGoal(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleCustomDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomDuration(val);
    const num = parseInt(val);
    if (!isNaN(num) && num > 0) {
      setDuration(num);
    }
  };

  // --- Render Helpers ---

  const formatTime = (seconds: number) => {
    if (seconds < 0) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- Shared Layout Header ---
  const Header = () => (
    <header className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-center z-20 pointer-events-none">
       <div className="pointer-events-auto flex items-center gap-4">
         {view !== AppView.HOME && (
           <button onClick={() => setView(AppView.HOME)} className="text-slate-500 dark:text-slate-400 font-bold hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
             NeuroFocus AI
           </button>
         )}
         {view === AppView.HOME && (
           <button 
            onClick={() => setView(AppView.CREATIVE)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 text-xs font-bold border border-pink-200 dark:border-pink-800 hover:scale-105 transition-transform"
           >
             <span className="animate-sparkle">✨</span> Creative Studio
           </button>
         )}
       </div>
       <button 
         onClick={toggleTheme}
         className="pointer-events-auto p-2 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:scale-110 transition-transform shadow-sm"
         aria-label="Toggle Dark Mode"
       >
         {isDark ? (
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
         ) : (
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-moon"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
         )}
       </button>
    </header>
  );

  // --- Views ---

  if (view === AppView.CREATIVE) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
         <Header />
         <div className="pt-12">
            <ImageEditor onBack={() => setView(AppView.HOME)} />
         </div>
      </div>
    );
  }

  if (view === AppView.BREAKDOWN) {
    return (
      <div className="min-h-screen p-4 md:p-8 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
         <Header />
         <div className="mt-12">
            <GoalBreakdown 
              steps={generatedSteps}
              onCancel={() => setView(AppView.HOME)}
              onSelectStep={(step) => {
                setGoal(step.title); 
                setDuration(step.minutes);
                startSession(step.title, step.minutes, mode);
              }}
            />
         </div>
      </div>
    );
  }

  if (view === AppView.SESSION && session) {
    const isCompleted = session.status === 'completed';
    
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row transition-colors duration-300 overflow-hidden relative">
        {showCelebration && <Celebration />}
        <Header />
        
        {/* Left/Main Column: Timer */}
        <div className="flex-1 p-6 md:p-12 flex flex-col items-center justify-center relative min-h-[60vh] z-10">
          
          <div className="max-w-md w-full text-center space-y-8 relative">
             {/* Mode Badge */}
            <div className="animate-slide-up">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border
                ${session.mode === FocusMode.CODING ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' : 
                  session.mode === FocusMode.STUDY ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' : 
                  'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
                {session.mode} Mode
              </span>
              <h2 className="text-xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight">
                {session.goal}
              </h2>
            </div>

            {/* Timer Display */}
            <div className={`relative transition-all duration-500 ease-out ${isCompleted ? 'scale-110' : ''}`}>
              <div className="text-[6rem] md:text-[8rem] font-bold tabular-nums leading-none text-slate-900 dark:text-white tracking-tighter drop-shadow-sm dark:drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                {isCompleted ? "Done!" : formatTime(timeLeft)}
              </div>
              {session.status === 'paused' && !isCompleted && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-100 dark:bg-yellow-900/80 text-yellow-800 dark:text-yellow-100 px-4 py-2 rounded-lg font-bold shadow-sm backdrop-blur-sm border border-yellow-200 dark:border-yellow-700 animate-pulse">
                  PAUSED
                </div>
              )}
            </div>

            {/* Controls */}
            {!isCompleted ? (
              <div className="space-y-6 animate-slide-up" style={{animationDelay: '0.1s'}}>
                <div className="flex gap-4 justify-center">
                  {session.status === 'running' ? (
                    <button onClick={pauseSession} className="w-32 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 py-3 rounded-full font-bold transition-all border border-transparent dark:border-slate-700">
                      Pause
                    </button>
                  ) : (
                    <button onClick={resumeSession} className="w-32 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-400 text-white py-3 rounded-full font-bold transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30">
                      Resume
                    </button>
                  )}
                  {/* Stop button updated to handleStopSession */}
                  <button onClick={handleStopSession} className="w-32 border-2 border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 py-3 rounded-full font-bold transition-colors">
                    Finish Early
                  </button>
                </div>

                <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                  <button 
                    onClick={handleDistraction}
                    disabled={isCoachingLoading}
                    className="text-sm font-medium text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors flex items-center justify-center gap-2 w-full group"
                  >
                    {isCoachingLoading ? (
                      <span className="animate-pulse">Consulting coach...</span>
                    ) : (
                      <>
                        <span className="group-hover:scale-110 transition-transform">✋</span> I got distracted
                      </>
                    )}
                  </button>
                  
                  {coachingMessage && (
                    <div className="mt-4 p-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-blue-900 dark:text-blue-200 text-sm text-left animate-fade-in shadow-sm">
                      <p className="font-bold mb-1 text-blue-700 dark:text-blue-300 uppercase text-xs tracking-wider">Coach says</p>
                      {coachingMessage}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="animate-slide-up">
                <p className="text-slate-600 dark:text-slate-400 mb-6 text-lg">Great job! You maintained focus on your goal.</p>
                <div className="flex gap-4 justify-center">
                  <button 
                    onClick={() => {
                      localStorage.removeItem(SESSION_KEY);
                      setSession(null);
                      setView(AppView.HOME);
                    }}
                    className="bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-400 text-white px-8 py-3 rounded-full font-bold shadow-xl shadow-indigo-200 dark:shadow-indigo-900/30 transition-all hover:scale-105"
                  >
                    Start New Session
                  </button>
                  <button
                     onClick={() => {
                        localStorage.removeItem(SESSION_KEY);
                        setSession(null);
                        setView(AppView.CREATIVE);
                     }}
                     className="bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 px-6 py-3 rounded-full font-bold border border-pink-200 dark:border-pink-800 hover:bg-pink-200 dark:hover:bg-pink-900/50 transition-colors flex items-center gap-2"
                  >
                    <span>✨ Creative Break</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Tools */}
        <div className="w-full md:w-1/3 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 overflow-y-auto max-h-screen backdrop-blur-sm z-20">
          <ProblemPanel userGoal={session.goal} onProblemGenerated={incrementProblemStat} />
        </div>
      </div>
    );
  }

  // DEFAULT VIEW: HOME
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300 relative overflow-hidden">
      <Header />
      
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/30 dark:bg-indigo-900/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-200/30 dark:bg-teal-900/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-xl w-full relative z-0 mt-12 mb-8">
        
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-teal-500 dark:from-indigo-400 dark:to-teal-300">
            NeuroFocus AI
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
            Your ADHD-friendly companion for deep work.
          </p>
        </div>

        <StatsCard stats={stats} />

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl dark:shadow-2xl dark:shadow-black/50 border border-slate-100 dark:border-slate-800 p-6 md:p-8 animate-slide-up">
          <div className="space-y-8">
            
            {/* Goal Input */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 ml-1">
                What are you working on?
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g. Study React Hooks, Write essay intro..."
                  className="w-full text-lg p-4 pr-12 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-inner"
                />
                <button 
                  onClick={handleVoiceInput}
                  disabled={isListening}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${
                    isListening 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                  }`}
                  title="Speak your goal"
                >
                  {isListening ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Mode Selection */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 ml-1">
                Select Mode
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.values(FocusMode).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`p-3 rounded-xl text-sm font-bold transition-all border-2 ${
                      mode === m
                        ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Selection */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 ml-1">
                Duration (minutes)
              </label>
              <div className="flex flex-wrap gap-3">
                {[15, 25, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => { setDuration(mins); setCustomDuration(''); }}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all border-2 ${
                      duration === mins && customDuration === ''
                        ? 'bg-teal-50 dark:bg-teal-900/40 border-teal-500 text-teal-700 dark:text-teal-300'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
                 <div className="relative min-w-[100px] flex-1">
                    <input 
                      type="number" 
                      placeholder="Custom"
                      value={customDuration}
                      onChange={handleCustomDurationChange}
                      className={`w-full h-full p-3 rounded-xl font-bold text-center outline-none border-2 transition-all bg-white dark:bg-slate-950 ${
                         customDuration !== '' 
                         ? 'border-teal-500 text-teal-700 dark:text-teal-300 ring-2 ring-teal-500/20' 
                         : 'border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-indigo-500'
                      }`} 
                    />
                    {customDuration === '' && <span className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 font-bold text-sm">Custom</span>}
                 </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 flex flex-col md:flex-row gap-4">
              <button
                onClick={() => startSession(goal || 'Focus Session', duration, mode)}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 dark:from-indigo-500 dark:to-indigo-600 text-white p-4 rounded-2xl font-black text-lg shadow-xl shadow-indigo-200 dark:shadow-indigo-900/20 transform transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Start Focus Session
              </button>
              <button
                onClick={handleBreakdown}
                disabled={isBreakdownLoading}
                className="md:w-auto px-8 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
              >
                {isBreakdownLoading ? (
                   <div className="animate-spin h-5 w-5 border-2 border-slate-400 border-t-transparent rounded-full"></div>
                ) : (
                   <span>Break Down Goal</span>
                )}
              </button>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
           <button 
             onClick={() => setShowSettings(!showSettings)}
             className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold uppercase tracking-widest transition-colors"
           >
             About & Disclaimer
           </button>
           
           {showSettings && (
             <div className="mt-4 p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto animate-fade-in shadow-lg">
               <p className="mb-2"><strong>NeuroFocus AI</strong> helps you structure tasks and stay engaged. Built with Gemini 3 Pro.</p>
               <p className="italic text-xs">Disclaimer: This app is for productivity and educational purposes only. It is not a medical device and does not provide medical advice or treatment.</p>
               <div className="mt-4 flex gap-4 justify-center">
                  <a href="#" className="text-indigo-500 hover:underline">Privacy</a>
                  <a href="#" className="text-indigo-500 hover:underline">Terms</a>
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

export default App;