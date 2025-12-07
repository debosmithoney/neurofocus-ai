import React, { useState, useEffect } from 'react';
import { PracticeProblem } from '../types';
import { generatePracticeProblem } from '../services/geminiService';

interface ProblemPanelProps {
  userGoal: string;
  onProblemGenerated: () => void;
}

// "Smart Context" is the first option now
const TOPICS = ["Smart Context (Based on Goal)", "General CS", "DSA - Arrays/Strings", "DSA - Trees/Graphs", "DSA - DP", "Web Dev - React", "Web Dev - CSS", "Backend - SQL", "System Design"];
const DIFFICULTIES = ["Easy", "Medium", "Hard"];

const ProblemPanel: React.FC<ProblemPanelProps> = ({ userGoal, onProblemGenerated }) => {
  const [topic, setTopic] = useState(TOPICS[0]);
  const [difficulty, setDifficulty] = useState(DIFFICULTIES[0]);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState<PracticeProblem | null>(null);
  const [showSolution, setShowSolution] = useState(false);

  // Reset problem when goal changes
  useEffect(() => {
    setProblem(null);
    setTopic(TOPICS[0]);
  }, [userGoal]);

  const handleGenerate = async () => {
    setLoading(true);
    setProblem(null);
    setShowSolution(false);
    try {
      const result = await generatePracticeProblem(topic, difficulty, userGoal);
      setProblem(result);
      onProblemGenerated();
    } catch (err) {
      console.error(err);
      alert("Failed to generate problem. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden h-full flex flex-col">
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
        <h3 className="font-bold text-slate-700 dark:text-slate-200">Practice & Learn</h3>
        <span className="text-[10px] px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full font-bold uppercase tracking-wide border border-purple-200 dark:border-purple-800/30">Gemini</span>
      </div>

      <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
        {!problem && !loading && (
          <div className="space-y-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Need a challenge? Generate a problem relevant to <strong>"{userGoal}"</strong>.
            </p>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Topic / Context</label>
                <select 
                  value={topic} 
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full text-sm bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border outline-none"
                >
                  {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Difficulty</label>
                <select 
                  value={difficulty} 
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full text-sm bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border outline-none"
                >
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={handleGenerate}
              className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md mt-2"
            >
              Generate Problem
            </button>
          </div>
        )}

        {loading && (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
            <div className="relative w-12 h-12 mb-4">
               <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-slate-200 dark:border-slate-700 opacity-25"></div>
               <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
            </div>
            <span className="text-sm font-medium animate-pulse">Gemini is thinking...</span>
          </div>
        )}

        {problem && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <div className="flex justify-between items-start mb-3 gap-2">
                <h4 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">{problem.title}</h4>
                <button 
                  onClick={() => setProblem(null)}
                  className="shrink-0 text-xs text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 underline font-medium"
                >
                  New Problem
                </button>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{problem.statement}</p>
              </div>
              
              {problem.inputOutput && (
                <div className="mt-4">
                   <p className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase mb-2">Example / Key Concept</p>
                   <div className="p-3 bg-slate-900 dark:bg-black text-slate-50 dark:text-slate-300 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800">
                     {problem.inputOutput}
                   </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase">Hints</p>
              <ul className="space-y-2">
                {problem.hints.map((hint, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <span className="text-indigo-500 font-bold">•</span>
                    <span>{hint}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowSolution(!showSolution)}
                className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-2 transition-colors"
              >
                <span>{showSolution ? 'Hide Explanation' : 'Show Explanation'}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showSolution ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
              </button>
              
              {showSolution && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-200 rounded-xl text-sm border border-green-100 dark:border-green-900/30 animate-fade-in">
                  <p className="font-bold mb-2 uppercase text-xs opacity-70">Answer / Explanation</p>
                  {problem.explanation}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProblemPanel;