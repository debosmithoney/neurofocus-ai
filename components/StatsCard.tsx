import React from 'react';
import { DailyStats } from '../types';

interface StatsCardProps {
  stats: DailyStats;
}

const StatsCard: React.FC<StatsCardProps> = ({ stats }) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 mb-8 animate-slide-up" style={{animationDelay: '0.1s'}}>
      <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Today's Progress</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-center border border-indigo-100 dark:border-indigo-800/30">
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{stats.totalFocusMinutes}</div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-indigo-800 dark:text-indigo-300 mt-1">Minutes</div>
        </div>
        <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl text-center border border-teal-100 dark:border-teal-800/30">
          <div className="text-2xl font-black text-teal-600 dark:text-teal-400">{stats.sessionsCompleted}</div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-teal-800 dark:text-teal-300 mt-1">Sessions</div>
        </div>
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-center border border-amber-100 dark:border-amber-800/30">
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.streakDays}</div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300 mt-1">Streak</div>
        </div>
        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-xl text-center border border-rose-100 dark:border-rose-800/30">
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{stats.problemsGenerated}</div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-rose-800 dark:text-rose-300 mt-1">Problems</div>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;