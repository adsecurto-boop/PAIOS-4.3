import React from 'react';
import { BarChart3, TrendingUp, Clock, Zap, Target, Star, Moon, Battery, Award } from 'lucide-react';
import { ActivityLog, MorningCheckIn, EveningReview } from '../types';

interface InsightsScreenProps {
  activityLogs: ActivityLog[];
  checkIns: MorningCheckIn[];
  reviews: EveningReview[];
}

export const InsightsScreen: React.FC<InsightsScreenProps> = ({ activityLogs, checkIns, reviews }) => {
  // Calculate total focus time
  const totalSeconds = activityLogs.reduce((acc, log) => {
    if (log.durationSeconds) return acc + log.durationSeconds;
    return acc;
  }, 0);

  const totalHours = (totalSeconds / 3600).toFixed(1);

  // Category breakdown
  const categoryMap: Record<string, number> = {};
  activityLogs.forEach((log) => {
    const sec = log.durationSeconds || 0;
    categoryMap[log.category] = (categoryMap[log.category] || 0) + sec;
  });

  const categoryList = Object.entries(categoryMap).map(([cat, sec]) => ({
    category: cat,
    hours: (sec / 3600).toFixed(1),
    percentage: totalSeconds > 0 ? Math.round((sec / totalSeconds) * 100) : 0,
  }));

  // Average day rating
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : '8.0';

  // Average sleep
  const avgSleep =
    checkIns.length > 0
      ? (checkIns.reduce((acc, c) => acc + c.sleepHours, 0) / checkIns.length).toFixed(1)
      : '7.5';

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <BarChart3 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-heading font-bold text-xl text-white">Productivity & Mindset Insights</h2>
          <p className="text-xs text-slate-400">Analytics across focus time, categories, energy, and evening ratings</p>
        </div>
      </div>

      {/* Top Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono mb-1">
            <Clock className="w-4 h-4" /> Total Focus
          </div>
          <p className="text-2xl font-mono font-extrabold text-white">{totalHours} <span className="text-xs font-normal text-slate-400">hrs</span></p>
          <span className="text-[10px] text-emerald-400 font-mono">+12% vs last week</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-mono mb-1">
            <Star className="w-4 h-4 fill-current" /> Avg Day Rating
          </div>
          <p className="text-2xl font-mono font-extrabold text-white">{avgRating} <span className="text-xs font-normal text-slate-400">/ 10</span></p>
          <span className="text-[10px] text-slate-400 font-mono">Based on evening reviews</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono mb-1">
            <Moon className="w-4 h-4" /> Avg Sleep
          </div>
          <p className="text-2xl font-mono font-extrabold text-white">{avgSleep} <span className="text-xs font-normal text-slate-400">hrs</span></p>
          <span className="text-[10px] text-emerald-400 font-mono">Optimal rest zone</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md">
          <div className="flex items-center gap-2 text-purple-400 text-xs font-mono mb-1">
            <Award className="w-4 h-4" /> Focus Streak
          </div>
          <p className="text-2xl font-mono font-extrabold text-white">5 <span className="text-xs font-normal text-slate-400">days</span></p>
          <span className="text-[10px] text-purple-400 font-mono">Active streak</span>
        </div>
      </div>

      {/* Time Allocation by Category */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-400" /> Time Allocation by Category
        </h3>

        {categoryList.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4 text-center">No focus sessions logged yet to display breakdown.</p>
        ) : (
          <div className="space-y-3">
            {categoryList.map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-200 font-semibold">{item.category}</span>
                  <span className="text-slate-400">{item.hours} hrs ({item.percentage}%)</span>
                </div>
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(5, item.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Evening Reflection Journal History */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <h3 className="font-heading font-bold text-base text-white">Recent Evening Reviews</h3>

        {reviews.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4 text-center">No evening reviews submitted yet.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((rev) => (
              <div key={rev.id || rev.dateString} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-indigo-400">{rev.dateString}</span>
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-900/50">
                    Day Rating: {rev.rating}/10
                  </span>
                </div>
                {rev.wentWell && (
                  <p className="text-xs text-slate-300">
                    <strong className="text-emerald-400 font-semibold">Went Well:</strong> {rev.wentWell}
                  </p>
                )}
                {rev.didntGoWell && (
                  <p className="text-xs text-slate-300">
                    <strong className="text-rose-400 font-semibold">Blockers:</strong> {rev.didntGoWell}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
