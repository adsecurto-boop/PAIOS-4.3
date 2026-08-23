import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Star,
  Moon,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Layers,
  CheckCircle2,
  Zap,
  Activity,
  Sparkles,
} from 'lucide-react';
import { ActivityLog, MorningCheckIn, EveningReview, TimelineEntry, Task } from '../types';
import { GamificationHub } from '../components/GamificationHub';

export type TimeframeMode = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'ALL_TIME';

interface InsightsScreenProps {
  activityLogs: ActivityLog[];
  activeActivity?: ActivityLog | null;
  timelineEntries?: TimelineEntry[];
  tasks?: Task[];
  checkIns: MorningCheckIn[];
  reviews: EveningReview[];
}

export const InsightsScreen: React.FC<InsightsScreenProps> = ({
  activityLogs,
  activeActivity,
  timelineEntries = [],
  tasks = [],
  checkIns,
  reviews,
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeMode>('DAILY');

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  // Helper date range calculations
  const getTimeRanges = () => {
    switch (timeframe) {
      case 'DAILY': {
        const currentStart = startOfToday;
        const currentEnd = currentStart + 86400000;
        const prevStart = currentStart - 86400000;
        const prevEnd = currentStart;
        return { currentStart, currentEnd, prevStart, prevEnd, label: 'Today vs Yesterday' };
      }
      case 'WEEKLY': {
        const dayOfWeek = now.getDay();
        const currentStart = startOfToday - dayOfWeek * 86400000;
        const currentEnd = currentStart + 7 * 86400000;
        const prevStart = currentStart - 7 * 86400000;
        const prevEnd = currentStart;
        return { currentStart, currentEnd, prevStart, prevEnd, label: 'This Week vs Last Week' };
      }
      case 'MONTHLY': {
        const currentStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
        const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
        const prevEnd = currentStart;
        return { currentStart, currentEnd, prevStart, prevEnd, label: 'This Month vs Last Month' };
      }
      case 'YEARLY': {
        const currentStart = new Date(now.getFullYear(), 0, 1).getTime();
        const currentEnd = new Date(now.getFullYear() + 1, 0, 1).getTime();
        const prevStart = new Date(now.getFullYear() - 1, 0, 1).getTime();
        const prevEnd = currentStart;
        return { currentStart, currentEnd, prevStart, prevEnd, label: 'This Year vs Last Year' };
      }
      case 'ALL_TIME':
      default: {
        return { currentStart: 0, currentEnd: Infinity, prevStart: 0, prevEnd: 0, label: 'All-Time Totals' };
      }
    }
  };

  const { currentStart, currentEnd, prevStart, prevEnd, label: comparisonLabel } = getTimeRanges();

  // 1. Calculate live seconds for active tracker
  let liveActiveSecs = 0;
  if (activeActivity) {
    const activeStart = activeActivity.startTimeMillis || startOfToday;
    if (activeStart >= currentStart && activeStart < currentEnd) {
      const pausedSecs = activeActivity.accumulatedPausedDurationSeconds || 0;
      if (activeActivity.isRunning && !activeActivity.isPaused) {
        liveActiveSecs = Math.max(0, Math.floor((Date.now() - activeStart) / 1000) - pausedSecs);
      } else if (activeActivity.isPaused) {
        const pauseStart = activeActivity.pauseStartTimeMillis || Date.now();
        liveActiveSecs = Math.max(0, Math.floor((pauseStart - activeStart) / 1000) - pausedSecs);
      }
    }
  }

  // 2. Aggregate Current Period Activity Seconds & Category Breakdown
  const currentCategorySeconds: Record<string, number> = {};
  let currentTotalSeconds = 0;
  let currentSessionCount = 0;

  // Include active activity if present
  if (activeActivity && liveActiveSecs > 0) {
    const cat = activeActivity.category || 'Work';
    currentCategorySeconds[cat] = (currentCategorySeconds[cat] || 0) + liveActiveSecs;
    currentTotalSeconds += liveActiveSecs;
    currentSessionCount += 1;
  }

  // Aggregate activityLogs
  activityLogs.forEach((log) => {
    const start = log.startTimeMillis;
    if (start >= currentStart && start < currentEnd) {
      const sec = log.durationSeconds || 0;
      if (sec > 0) {
        const cat = log.category || 'Work';
        currentCategorySeconds[cat] = (currentCategorySeconds[cat] || 0) + sec;
        currentTotalSeconds += sec;
        currentSessionCount += 1;
      }
    }
  });

  // Aggregate timelineEntries (durationMinutes)
  timelineEntries.forEach((entry) => {
    const start = entry.timestampMillis;
    if (start >= currentStart && start < currentEnd) {
      const sec = (entry.durationMinutes || 0) * 60;
      if (sec > 0) {
        const cat = entry.category || 'Work';
        currentCategorySeconds[cat] = (currentCategorySeconds[cat] || 0) + sec;
        currentTotalSeconds += sec;
        currentSessionCount += 1;
      }
    }
  });

  // 3. Aggregate Preceding Period Activity Seconds for Growth KPI
  const prevCategorySeconds: Record<string, number> = {};
  let prevTotalSeconds = 0;
  let prevSessionCount = 0;

  if (timeframe !== 'ALL_TIME') {
    activityLogs.forEach((log) => {
      const start = log.startTimeMillis;
      if (start >= prevStart && start < prevEnd) {
        const sec = log.durationSeconds || 0;
        if (sec > 0) {
          const cat = log.category || 'Work';
          prevCategorySeconds[cat] = (prevCategorySeconds[cat] || 0) + sec;
          prevTotalSeconds += sec;
          prevSessionCount += 1;
        }
      }
    });

    timelineEntries.forEach((entry) => {
      const start = entry.timestampMillis;
      if (start >= prevStart && start < prevEnd) {
        const sec = (entry.durationMinutes || 0) * 60;
        if (sec > 0) {
          const cat = entry.category || 'Work';
          prevCategorySeconds[cat] = (prevCategorySeconds[cat] || 0) + sec;
          prevTotalSeconds += sec;
          prevSessionCount += 1;
        }
      }
    });
  }

  // 4. Calculate Growth Percentages
  const currentTotalHours = currentTotalSeconds / 3600;
  const prevTotalHours = prevTotalSeconds / 3600;

  let focusGrowthPct = 0;
  if (prevTotalHours > 0) {
    focusGrowthPct = Math.round(((currentTotalHours - prevTotalHours) / prevTotalHours) * 100);
  } else if (currentTotalHours > 0) {
    focusGrowthPct = 100;
  }

  let sessionGrowthPct = 0;
  if (prevSessionCount > 0) {
    sessionGrowthPct = Math.round(((currentSessionCount - prevSessionCount) / prevSessionCount) * 100);
  } else if (currentSessionCount > 0) {
    sessionGrowthPct = 100;
  }

  // 5. Category Breakdown List
  const categoryList = Object.entries(currentCategorySeconds)
    .map(([cat, sec]) => {
      const hrs = (sec / 3600).toFixed(1);
      const percentage = currentTotalSeconds > 0 ? Math.round((sec / currentTotalSeconds) * 100) : 0;
      const prevSec = prevCategorySeconds[cat] || 0;
      let catGrowth = 0;
      if (prevSec > 0) {
        catGrowth = Math.round(((sec - prevSec) / prevSec) * 100);
      } else if (sec > 0) {
        catGrowth = 100;
      }
      return {
        category: cat,
        hours: hrs,
        seconds: sec,
        percentage,
        growthPct: catGrowth,
      };
    })
    .sort((a, b) => b.seconds - a.seconds);

  // 6. Review Ratings & Sleep Averages
  const filteredReviews = reviews.filter((r) => {
    const t = r.createdAtMillis || new Date(r.dateString).getTime();
    return t >= currentStart && t < currentEnd;
  });
  const displayReviews = filteredReviews.length > 0 ? filteredReviews : reviews;

  const avgRating =
    displayReviews.length > 0
      ? (displayReviews.reduce((acc, r) => acc + r.rating, 0) / displayReviews.length).toFixed(1)
      : '8.5';

  const filteredCheckIns = checkIns.filter((c) => {
    const t = c.createdAtMillis || new Date(c.dateString).getTime();
    return t >= currentStart && t < currentEnd;
  });
  const displayCheckIns = filteredCheckIns.length > 0 ? filteredCheckIns : checkIns;

  const avgSleep =
    displayCheckIns.length > 0
      ? (displayCheckIns.reduce((acc, c) => acc + c.sleepHours, 0) / displayCheckIns.length).toFixed(1)
      : '7.5';

  // 7. Tasks Completed in timeframe
  const completedTasksCount = tasks.filter((t) => {
    if (t.status !== 'COMPLETED') return false;
    const completedAt = t.completedAtMillis || t.createdAtMillis;
    return completedAt >= currentStart && completedAt < currentEnd;
  }).length;

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header & Timeframe Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-xl text-white">Productivity & Growth Analytics</h2>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>{comparisonLabel}</span>
              {activeActivity && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Tracker Updating
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Timeframe Selector Pills */}
        <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800 overflow-x-auto no-scrollbar shrink-0">
          {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'ALL_TIME'] as TimeframeMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setTimeframe(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all whitespace-nowrap ${
                timeframe === mode
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {mode === 'DAILY'
                ? 'Daily'
                : mode === 'WEEKLY'
                ? 'Weekly'
                : mode === 'MONTHLY'
                ? 'Monthly'
                : mode === 'YEARLY'
                ? 'Yearly'
                : 'All-Time'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Growth Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Focus KPI */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-indigo-400 text-xs font-mono">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Focus Time
            </span>
            <Sparkles className="w-3.5 h-3.5 text-indigo-400/60" />
          </div>
          <p className="text-2xl sm:text-3xl font-mono font-extrabold text-white">
            {currentTotalHours.toFixed(1)}{' '}
            <span className="text-xs font-normal text-slate-400 font-sans">hrs</span>
          </p>
          <div className="flex items-center gap-1 text-[11px] font-mono">
            {focusGrowthPct >= 0 ? (
              <span className="text-emerald-400 flex items-center font-bold">
                <ArrowUpRight className="w-3.5 h-3.5" />+{focusGrowthPct}%
              </span>
            ) : (
              <span className="text-rose-400 flex items-center font-bold">
                <ArrowDownRight className="w-3.5 h-3.5" />
                {focusGrowthPct}%
              </span>
            )}
            <span className="text-slate-500 truncate">vs prev</span>
          </div>
        </div>

        {/* Focus Sessions & Tasks KPI */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md space-y-1">
          <div className="flex items-center justify-between text-cyan-400 text-xs font-mono">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> Activity & Tasks
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-mono font-extrabold text-white">
            {currentSessionCount + completedTasksCount}{' '}
            <span className="text-xs font-normal text-slate-400 font-sans">items</span>
          </p>
          <div className="flex items-center gap-1 text-[11px] font-mono">
            {sessionGrowthPct >= 0 ? (
              <span className="text-emerald-400 flex items-center font-bold">
                <ArrowUpRight className="w-3.5 h-3.5" />+{sessionGrowthPct}%
              </span>
            ) : (
              <span className="text-rose-400 flex items-center font-bold">
                <ArrowDownRight className="w-3.5 h-3.5" />
                {sessionGrowthPct}%
              </span>
            )}
            <span className="text-slate-500">volume</span>
          </div>
        </div>

        {/* Avg Day Rating KPI */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md space-y-1">
          <div className="flex items-center justify-between text-amber-400 text-xs font-mono">
            <span className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-current" /> Mindset Score
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-mono font-extrabold text-white">
            {avgRating} <span className="text-xs font-normal text-slate-400 font-sans">/ 10</span>
          </p>
          <span className="text-[10px] text-slate-400 font-mono block">Evening reviews avg</span>
        </div>

        {/* Avg Sleep KPI */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md space-y-1">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-mono">
            <span className="flex items-center gap-1.5">
              <Moon className="w-4 h-4" /> Sleep Rest
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-mono font-extrabold text-white">
            {avgSleep} <span className="text-xs font-normal text-slate-400 font-sans">hrs</span>
          </p>
          <span className="text-[10px] text-emerald-400 font-mono block">Optimal recovery</span>
        </div>
      </div>

      {/* Time Allocation by Category Section */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" /> Time Allocation by Category ({timeframe})
          </h3>
          <span className="text-xs font-mono text-slate-400 font-semibold">
            Total: {currentTotalHours.toFixed(1)} hrs
          </span>
        </div>

        {categoryList.length === 0 ? (
          <div className="py-8 text-center bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
            <Activity className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">No activity sessions logged yet for this {timeframe.toLowerCase()} window.</p>
            <p className="text-[11px] text-slate-500">Start the PAIOS Tracker on the Today screen to begin logging category metrics.</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {categoryList.map((item) => (
              <div key={item.category} className="space-y-1.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-100 font-bold">{item.category}</span>
                    {item.growthPct > 0 && (
                      <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-900/60">
                        +{item.growthPct}% vs prev
                      </span>
                    )}
                  </div>
                  <span className="text-slate-300 font-semibold">
                    {item.hours} hrs <span className="text-slate-500">({item.percentage}%)</span>
                  </span>
                </div>

                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(4, item.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Dedicated Gamification Hub Section */}
      <GamificationHub
        activityLogs={activityLogs}
        activeActivity={activeActivity}
        timelineEntries={timelineEntries}
        tasks={tasks}
        checkIns={checkIns}
        reviews={reviews}
      />

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
