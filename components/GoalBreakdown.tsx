import React, { useState } from 'react';
import { TaskStep } from '../types';

interface GoalBreakdownProps {
  steps: TaskStep[];
  onSelectStep: (step: TaskStep) => void;
  onCancel: () => void;
}

const GoalBreakdown: React.FC<GoalBreakdownProps> = ({ steps, onSelectStep, onCancel }) => {
  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <button 
          onClick={onCancel}
          className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-sm font-bold flex items-center gap-2 mb-6 group transition-colors"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Home
        </button>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3">Break It Down</h2>
        <p className="text-slate-600 dark:text-slate-400 text-lg">Big goals can be overwhelming. Pick one small step to start right now.</p>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div 
            key={index}
            className="group bg-white dark:bg-slate-900 rounded-2xl p-6 border-2 border-slate-100 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-lg dark:hover:shadow-indigo-900/20 transition-all cursor-pointer relative transform hover:-translate-y-1"
            onClick={() => onSelectStep(step)}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex gap-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-sm group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {index + 1}
                </span>
                <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
                  {step.title}
                </h3>
              </div>
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap border border-slate-200 dark:border-slate-700">
                ~{step.minutes} min
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 pl-12 leading-relaxed">{step.description}</p>
            <div className="flex justify-end">
              <button className="text-sm font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 flex items-center gap-1">
                Start Session <span className="text-lg">→</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GoalBreakdown;