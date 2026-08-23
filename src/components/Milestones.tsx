import React, { useState } from 'react';
import {
  Award,
  Flame,
  Sun,
  Moon,
  Zap,
  Target,
  Clock,
  CheckCircle2,
  Sparkles,
  Trophy,
  ShieldCheck,
  Star,
  Compass,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { ActivityLog, MorningCheckIn, EveningReview, TimelineEntry, Task } from '../types';

export interface MilestoneBadge {
  id: string;
  title: string;
  description: string;
  category: 'STREAK' | 'FOCUS' | 'TASKS' | 'MINDSET' | 'HABITS';
  icon: React.ReactNode;
  unlocked: boolean;
  currentValue: number;
  targetValue: number;
  unit: string;
  color: 'amber' | 'emerald' | 'cyan' | 'purple' | 'rose' | 'indigo';
}

interface MilestonesProps {
  activityLogs: ActivityLog[];
  activeActivity?: ActivityLog | null;
  timelineEntries?: TimelineEntry[];
  tasks?: Task[];
  checkIns: MorningCheckIn[];
  reviews: EveningReview[];
}

export const Milestones: React.FC<MilestonesProps> = ({
  activityLogs,
  activeActivity,
  timelineEntries = [],
  tasks = [],
  checkIns,
  reviews,
}) => {
  const [filterMode, setFilterMode] = useState<'ALL' | 'UNLOCKED' | 'IN_PROGRESS'>('ALL');

  // --- 1. STREAK CALCULATIONS ---
  // Combine all active dates (from activities, timeline, checkins, reviews)
  const activeDatesSet = new Set<string>();

  activityLogs.forEach((act) => {
    if (act.startTimeMillis) {
      activeDatesSet.add(new Date(act.startTimeMillis).toISOString().split('T')[0]);
    }
  });

  if (activeActivity && activeActivity.startTimeMillis) {
    activeDatesSet.add(new Date(activeActivity.startTimeMillis).toISOString().split('T')[0]);
  }

  timelineEntries.forEach((entry) => {
    if (entry.timestampMillis) {
      activeDatesSet.add(new Date(entry.timestampMillis).toISOString().split('T')[0]);
    }
  });

  checkIns.forEach((c) => {
    if (c.dateString) activeDatesSet.add(c.dateString);
  });

  reviews.forEach((r) => {
    if (r.dateString) activeDatesSet.add(r.dateString);
  });

  // Calculate current streak in consecutive days ending today/yesterday
  const calculateCurrentStreak = (): number => {
    let streak = 0;
    const now = new Date();
    let checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Check if active today
    let dateStr = checkDate.toISOString().split('T')[0];
    if (!activeDatesSet.has(dateStr)) {
      // Check yesterday to account for un-logged today yet
      checkDate.setDate(checkDate.getDate() - 1);
      dateStr = checkDate.toISOString().split('T')[0];
      if (!activeDatesSet.has(dateStr)) {
        return 0;
      }
    }

    while (activeDatesSet.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
      dateStr = checkDate.toISOString().split('T')[0];
    }

    return streak;
  };

  const currentStreak = calculateCurrentStreak();

  // --- 2. FOCUS TIME CALCULATIONS ---
  let totalFocusSeconds = activityLogs.reduce((acc, a) => acc + (a.durationSeconds || 0), 0);

  if (activeActivity) {
    const activeStart = activeActivity.startTimeMillis || Date.now();
    const pausedSecs = activeActivity.accumulatedPausedDurationSeconds || 0;
    const liveSecs = Math.max(0, Math.floor((Date.now() - activeStart) / 1000) - pausedSecs);
    totalFocusSeconds += liveSecs;
  }

  timelineEntries.forEach((e) => {
    if (e.durationMinutes) totalFocusSeconds += e.durationMinutes * 60;
  });

  const totalFocusHours = totalFocusSeconds / 3600;

  // Longest single focus session (seconds)
  let maxSingleSessionSecs = 0;
  activityLogs.forEach((a) => {
    if ((a.durationSeconds || 0) > maxSingleSessionSecs) {
      maxSingleSessionSecs = a.durationSeconds || 0;
    }
  });

  // --- 3. TIME-OF-DAY CHECKS ---
  let hasEarlyBird = false;
  let hasNightOwl = false;

  const checkTimestamp = (ts: number) => {
    if (!ts) return;
    const hour = new Date(ts).getHours();
    if (hour >= 4 && hour < 7) hasEarlyBird = true;
    if (hour >= 23 || hour < 4) hasNightOwl = true;
  };

  activityLogs.forEach((a) => checkTimestamp(a.startTimeMillis));
  checkIns.forEach((c) => checkTimestamp(c.createdAtMillis || new Date(c.dateString).getTime()));
  reviews.forEach((r) => checkTimestamp(r.createdAtMillis || new Date(r.dateString).getTime()));

  // --- 4. TASKS & CHECKINS ---
  const completedTasksCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const morningCheckInsCount = checkIns.length;
  const eveningReviewsCount = reviews.length;

  // --- 5. CATEGORIES COUNT ---
  const categorySet = new Set<string>();
  activityLogs.forEach((a) => a.category && categorySet.add(a.category));
  timelineEntries.forEach((e) => e.category && categorySet.add(e.category));

  // --- DEFINE MILESTONES BADGES ---
  const badges: MilestoneBadge[] = [
    {
      id: 'streak_7',
      title: '7-Day Streak',
      description: 'Logged activity or check-in for 7 consecutive days.',
      category: 'STREAK',
      icon: <Flame className="w-5 h-5" />,
      unlocked: currentStreak >= 7,
      currentValue: Math.min(currentStreak, 7),
      targetValue: 7,
      unit: 'days',
      color: 'amber',
    },
    {
      id: 'streak_30',
      title: 'Consistency Master',
      description: 'Maintained a 30-day activity streak in PAIOS.',
      category: 'STREAK',
      icon: <Trophy className="w-5 h-5" />,
      unlocked: currentStreak >= 30,
      currentValue: Math.min(currentStreak, 30),
      targetValue: 30,
      unit: 'days',
      color: 'amber',
    },
    {
      id: 'early_bird',
      title: 'Early Bird',
      description: 'Logged an activity or morning check-in between 4 AM and 7 AM.',
      category: 'HABITS',
      icon: <Sun className="w-5 h-5" />,
      unlocked: hasEarlyBird,
      currentValue: hasEarlyBird ? 1 : 0,
      targetValue: 1,
      unit: 'session',
      color: 'emerald',
    },
    {
      id: 'night_owl',
      title: 'Night Owl',
      description: 'Completed a focus session or evening review after 11 PM.',
      category: 'HABITS',
      icon: <Moon className="w-5 h-5" />,
      unlocked: hasNightOwl,
      currentValue: hasNightOwl ? 1 : 0,
      targetValue: 1,
      unit: 'session',
      color: 'purple',
    },
    {
      id: 'deep_focus',
      title: 'Deep Focus Pro',
      description: 'Completed a uninterrupted focus session lasting 2+ hours.',
      category: 'FOCUS',
      icon: <Zap className="w-5 h-5" />,
      unlocked: maxSingleSessionSecs >= 7200,
      currentValue: Math.min(Math.round(maxSingleSessionSecs / 60), 120),
      targetValue: 120,
      unit: 'mins',
      color: 'cyan',
    },
    {
      id: 'focus_10h',
      title: 'Focus Initiate',
      description: 'Accumulated 10 total hours of logged focus time.',
      category: 'FOCUS',
      icon: <Clock className="w-5 h-5" />,
      unlocked: totalFocusHours >= 10,
      currentValue: Math.min(Math.round(totalFocusHours), 10),
      targetValue: 10,
      unit: 'hrs',
      color: 'indigo',
    },
    {
      id: 'focus_100h',
      title: '100 Hours Club',
      description: 'Logged 100 total hours of focus activity across PAIOS.',
      category: 'FOCUS',
      icon: <Award className="w-5 h-5" />,
      unlocked: totalFocusHours >= 100,
      currentValue: Math.min(Math.round(totalFocusHours), 100),
      targetValue: 100,
      unit: 'hrs',
      color: 'amber',
    },
    {
      id: 'tasks_10',
      title: 'Task Crusher',
      description: 'Completed 10 tasks in your PAIOS workspace.',
      category: 'TASKS',
      icon: <CheckCircle2 className="w-5 h-5" />,
      unlocked: completedTasksCount >= 10,
      currentValue: Math.min(completedTasksCount, 10),
      targetValue: 10,
      unit: 'tasks',
      color: 'emerald',
    },
    {
      id: 'tasks_50',
      title: 'Task Master',
      description: 'Completed 50 tasks across all categories.',
      category: 'TASKS',
      icon: <Target className="w-5 h-5" />,
      unlocked: completedTasksCount >= 50,
      currentValue: Math.min(completedTasksCount, 50),
      targetValue: 50,
      unit: 'tasks',
      color: 'cyan',
    },
    {
      id: 'mindset_7',
      title: 'Mindset Master',
      description: 'Completed 7 evening reflection reviews.',
      category: 'MINDSET',
      icon: <Star className="w-5 h-5" />,
      unlocked: eveningReviewsCount >= 7,
      currentValue: Math.min(eveningReviewsCount, 7),
      targetValue: 7,
      unit: 'reviews',
      color: 'purple',
    },
    {
      id: 'checkin_7',
      title: 'Morning Champion',
      description: 'Completed 7 morning check-ins with priority goals.',
      category: 'MINDSET',
      icon: <ShieldCheck className="w-5 h-5" />,
      unlocked: morningCheckInsCount >= 7,
      currentValue: Math.min(morningCheckInsCount, 7),
      targetValue: 7,
      unit: 'check-ins',
      color: 'indigo',
    },
    {
      id: 'versatile',
      title: 'Polymath Explorer',
      description: 'Logged focus sessions across 4 distinct activity categories.',
      category: 'HABITS',
      icon: <Compass className="w-5 h-5" />,
      unlocked: categorySet.size >= 4,
      currentValue: Math.min(categorySet.size, 4),
      targetValue: 4,
      unit: 'categories',
      color: 'rose',
    },
  ];

  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const unlockPercentage = Math.round((unlockedCount / badges.length) * 100);

  const filteredBadges = badges.filter((b) => {
    if (filterMode === 'UNLOCKED') return b.unlocked;
    if (filterMode === 'IN_PROGRESS') return !b.unlocked;
    return true;
  });

  const getColorClasses = (color: MilestoneBadge['color'], unlocked: boolean) => {
    if (!unlocked) {
      return {
        cardBg: 'bg-slate-950/60 border-slate-800/60 opacity-80',
        iconBg: 'bg-slate-900 text-slate-500 border-slate-800',
        barFill: 'bg-slate-700',
        textAccent: 'text-slate-400',
      };
    }

    switch (color) {
      case 'amber':
        return {
          cardBg: 'bg-slate-950 border-amber-500/40 shadow-amber-500/10 shadow-lg',
          iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          barFill: 'bg-gradient-to-r from-amber-500 to-yellow-400',
          textAccent: 'text-amber-400',
        };
      case 'emerald':
        return {
          cardBg: 'bg-slate-950 border-emerald-500/40 shadow-emerald-500/10 shadow-lg',
          iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          barFill: 'bg-gradient-to-r from-emerald-500 to-teal-400',
          textAccent: 'text-emerald-400',
        };
      case 'cyan':
        return {
          cardBg: 'bg-slate-950 border-cyan-500/40 shadow-cyan-500/10 shadow-lg',
          iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
          barFill: 'bg-gradient-to-r from-cyan-500 to-blue-400',
          textAccent: 'text-cyan-400',
        };
      case 'purple':
        return {
          cardBg: 'bg-slate-950 border-purple-500/40 shadow-purple-500/10 shadow-lg',
          iconBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          barFill: 'bg-gradient-to-r from-purple-500 to-pink-400',
          textAccent: 'text-purple-400',
        };
      case 'rose':
        return {
          cardBg: 'bg-slate-950 border-rose-500/40 shadow-rose-500/10 shadow-lg',
          iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          barFill: 'bg-gradient-to-r from-rose-500 to-red-400',
          textAccent: 'text-rose-400',
        };
      case 'indigo':
      default:
        return {
          cardBg: 'bg-slate-950 border-indigo-500/40 shadow-indigo-500/10 shadow-lg',
          iconBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
          barFill: 'bg-gradient-to-r from-indigo-500 to-cyan-400',
          textAccent: 'text-indigo-400',
        };
    }
  };

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-5">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 relative shrink-0">
            <Trophy className="w-6 h-6" />
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
              Achievements & Milestones
              <span className="text-xs font-mono text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60 font-semibold">
                {unlockedCount} / {badges.length} Unlocked
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Current Active Streak: <strong className="text-amber-400 font-mono">{currentStreak} days</strong>
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 shrink-0">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filterMode === 'ALL' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterMode('UNLOCKED')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filterMode === 'UNLOCKED' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Unlocked ({unlockedCount})
          </button>
          <button
            onClick={() => setFilterMode('IN_PROGRESS')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filterMode === 'IN_PROGRESS'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            In Progress ({badges.length - unlockedCount})
          </button>
        </div>
      </div>

      {/* Overall Progress Meter */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">Total Milestone Progress</span>
          <span className="text-amber-400 font-bold">{unlockPercentage}%</span>
        </div>
        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
          <div
            className="bg-gradient-to-r from-amber-500 via-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.max(3, unlockPercentage)}%` }}
          />
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
        {filteredBadges.map((badge) => {
          const styles = getColorClasses(badge.color, badge.unlocked);
          const progressPct = Math.min(100, Math.round((badge.currentValue / badge.targetValue) * 100));

          return (
            <div
              key={badge.id}
              className={`p-3.5 rounded-xl border transition-all relative flex flex-col justify-between space-y-3 ${styles.cardBg}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className={`p-2 rounded-xl border shrink-0 ${styles.iconBg}`}>{badge.icon}</div>
                  <div>
                    <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                      {badge.title}
                      {badge.unlocked ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                      )}
                    </h4>
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500 block mt-0.5">
                      {badge.category}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">{badge.description}</p>

              {/* Progress Bar & Value */}
              <div className="space-y-1 pt-1 border-t border-slate-900/80">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className={styles.textAccent}>
                    {badge.currentValue} / {badge.targetValue} {badge.unit}
                  </span>
                  <span className="text-slate-400 font-semibold">{progressPct}%</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`${styles.barFill} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${Math.max(4, progressPct)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
