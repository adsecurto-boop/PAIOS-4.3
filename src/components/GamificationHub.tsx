import React, { useState } from 'react';
import {
  Trophy,
  Flame,
  Zap,
  Star,
  Sparkles,
  Award,
  CheckCircle2,
  Clock,
  Target,
  Crown,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  Lock,
  Calendar,
} from 'lucide-react';
import { ActivityLog, MorningCheckIn, EveningReview, TimelineEntry, Task } from '../types';

export interface GamificationHubProps {
  activityLogs: ActivityLog[];
  activeActivity?: ActivityLog | null;
  timelineEntries?: TimelineEntry[];
  tasks?: Task[];
  checkIns: MorningCheckIn[];
  reviews: EveningReview[];
}

interface MilestoneBadge {
  id: string;
  title: string;
  description: string;
  category: 'STREAK' | 'FOCUS' | 'TASKS' | 'MINDSET' | 'HABITS';
  icon: React.ReactNode;
  unlocked: boolean;
  currentValue: number;
  targetValue: number;
  unit: string;
  xpReward: number;
  color: 'amber' | 'emerald' | 'cyan' | 'purple' | 'rose' | 'indigo';
}

export const GamificationHub: React.FC<GamificationHubProps> = ({
  activityLogs,
  activeActivity,
  timelineEntries = [],
  tasks = [],
  checkIns,
  reviews,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'BADGES' | 'STREAK'>('OVERVIEW');
  const [badgeFilter, setBadgeFilter] = useState<'ALL' | 'UNLOCKED' | 'IN_PROGRESS'>('ALL');

  // --- 1. STREAK & DATE CALCULATIONS ---
  const activeDatesSet = new Set<string>();
  const dailyXpMap: Record<string, number> = {};

  // Helper to record activity date and add XP
  const addDailyXp = (dateStr: string, xp: number) => {
    if (!dateStr) return;
    activeDatesSet.add(dateStr);
    dailyXpMap[dateStr] = (dailyXpMap[dateStr] || 0) + xp;
  };

  // Activity logs XP
  activityLogs.forEach((act) => {
    if (act.startTimeMillis) {
      const dateStr = new Date(act.startTimeMillis).toISOString().split('T')[0];
      const mins = Math.floor((act.durationSeconds || 0) / 60);
      const xp = mins * 10; // 10 XP per focus minute
      addDailyXp(dateStr, xp);
    }
  });

  // Active activity live XP
  if (activeActivity && activeActivity.startTimeMillis) {
    const dateStr = new Date(activeActivity.startTimeMillis).toISOString().split('T')[0];
    const pausedSecs = activeActivity.accumulatedPausedDurationSeconds || 0;
    const liveSecs = Math.max(0, Math.floor((Date.now() - activeActivity.startTimeMillis) / 1000) - pausedSecs);
    const mins = Math.floor(liveSecs / 60);
    addDailyXp(dateStr, mins * 10);
  }

  // Timeline entries XP
  timelineEntries.forEach((entry) => {
    if (entry.timestampMillis) {
      const dateStr = new Date(entry.timestampMillis).toISOString().split('T')[0];
      const mins = entry.durationMinutes || 0;
      addDailyXp(dateStr, mins * 10);
    }
  });

  // Completed tasks XP (+50 XP per completed task)
  tasks.forEach((t) => {
    if (t.status === 'COMPLETED') {
      const ts = t.completedAtMillis || t.createdAtMillis;
      if (ts) {
        const dateStr = new Date(ts).toISOString().split('T')[0];
        addDailyXp(dateStr, 50);
      }
    }
  });

  // Check-ins XP (+100 XP per check-in)
  checkIns.forEach((c) => {
    if (c.dateString) addDailyXp(c.dateString, 100);
  });

  // Reviews XP (+100 XP per review)
  reviews.forEach((r) => {
    if (r.dateString) addDailyXp(r.dateString, 100);
  });

  // Calculate Streak
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const calculateStreakMetrics = () => {
    let streak = 0;
    let checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let dateStr = checkDate.toISOString().split('T')[0];
    if (!activeDatesSet.has(dateStr)) {
      // Check yesterday if today hasn't been logged yet
      checkDate.setDate(checkDate.getDate() - 1);
      dateStr = checkDate.toISOString().split('T')[0];
      if (!activeDatesSet.has(dateStr)) {
        return { currentStreak: 0, longestStreak: 0 };
      }
    }

    let tempStreak = 0;
    while (activeDatesSet.has(dateStr)) {
      tempStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
      dateStr = checkDate.toISOString().split('T')[0];
    }

    streak = tempStreak;
    return { currentStreak: streak, longestStreak: Math.max(streak, 7) };
  };

  const { currentStreak, longestStreak } = calculateStreakMetrics();

  // Streak Multiplier
  const streakMultiplier = currentStreak >= 14 ? 1.5 : currentStreak >= 7 ? 1.25 : currentStreak >= 3 ? 1.1 : 1.0;

  // --- 2. TOTAL XP & LEVEL SYSTEM ---
  const rawXp = Object.values(dailyXpMap).reduce((acc, v) => acc + v, 0);
  const totalXp = Math.round(rawXp * streakMultiplier);

  // Level Curve: 500 XP per level
  const xpPerLevel = 500;
  const level = Math.floor(totalXp / xpPerLevel) + 1;
  const currentLevelXp = totalXp % xpPerLevel;
  const xpToNextLevel = xpPerLevel - currentLevelXp;
  const levelProgressPct = Math.min(100, Math.round((currentLevelXp / xpPerLevel) * 100));

  const getLevelTitle = (lvl: number): string => {
    if (lvl >= 25) return 'PAIOS Grandmaster';
    if (lvl >= 20) return 'Productivity Titan';
    if (lvl >= 15) return 'Focus Architect';
    if (lvl >= 10) return 'Deep Work Specialist';
    if (lvl >= 5) return 'Consistency Apprentice';
    if (lvl >= 2) return 'Focus Practitioner';
    return 'Novice Explorer';
  };

  // Today's XP
  const todayXp = Math.round((dailyXpMap[todayStr] || 0) * streakMultiplier);
  const dailyGoalXp = 300;
  const todayGoalPct = Math.min(100, Math.round((todayXp / dailyGoalXp) * 100));

  // --- 3. 14-DAY CONSISTENCY MAP ---
  const last14Days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (13 - i));
    const dStr = d.toISOString().split('T')[0];
    const isToday = dStr === todayStr;
    const dayXp = dailyXpMap[dStr] || 0;
    const isActive = activeDatesSet.has(dStr);
    const dayLabel = d.toLocaleDateString([], { weekday: 'narrow' });
    const dayNum = d.getDate();
    return { dateStr: dStr, dayLabel, dayNum, isActive, dayXp, isToday };
  });

  // --- 4. MILESTONES & BADGES ---
  let totalFocusSeconds = activityLogs.reduce((acc, a) => acc + (a.durationSeconds || 0), 0);
  if (activeActivity && activeActivity.startTimeMillis) {
    const pausedSecs = activeActivity.accumulatedPausedDurationSeconds || 0;
    const liveSecs = Math.max(0, Math.floor((Date.now() - activeActivity.startTimeMillis) / 1000) - pausedSecs);
    totalFocusSeconds += liveSecs;
  }
  timelineEntries.forEach((e) => {
    if (e.durationMinutes) totalFocusSeconds += e.durationMinutes * 60;
  });
  const totalFocusHours = totalFocusSeconds / 3600;

  let maxSingleSessionSecs = 0;
  activityLogs.forEach((a) => {
    if ((a.durationSeconds || 0) > maxSingleSessionSecs) maxSingleSessionSecs = a.durationSeconds || 0;
  });

  let hasEarlyBird = false;
  let hasNightOwl = false;
  const checkTime = (ts?: number) => {
    if (!ts) return;
    const h = new Date(ts).getHours();
    if (h >= 4 && h < 7) hasEarlyBird = true;
    if (h >= 23 || h < 4) hasNightOwl = true;
  };
  activityLogs.forEach((a) => checkTime(a.startTimeMillis));
  checkIns.forEach((c) => checkTime(c.createdAtMillis));
  reviews.forEach((r) => checkTime(r.createdAtMillis));

  const completedTasksCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const categorySet = new Set<string>();
  activityLogs.forEach((a) => a.category && categorySet.add(a.category));

  const badges: MilestoneBadge[] = [
    {
      id: 'streak_7',
      title: '7-Day Streak',
      description: 'Logged daily focus or check-ins for 7 consecutive days.',
      category: 'STREAK',
      icon: <Flame className="w-5 h-5" />,
      unlocked: currentStreak >= 7,
      currentValue: Math.min(currentStreak, 7),
      targetValue: 7,
      unit: 'days',
      xpReward: 250,
      color: 'amber',
    },
    {
      id: 'streak_30',
      title: 'Consistency Master',
      description: 'Maintained an impressive 30-day active streak.',
      category: 'STREAK',
      icon: <Trophy className="w-5 h-5" />,
      unlocked: currentStreak >= 30,
      currentValue: Math.min(currentStreak, 30),
      targetValue: 30,
      unit: 'days',
      xpReward: 1000,
      color: 'amber',
    },
    {
      id: 'early_bird',
      title: 'Early Bird',
      description: 'Completed a focus session or check-in between 4 AM and 7 AM.',
      category: 'HABITS',
      icon: <Sparkles className="w-5 h-5" />,
      unlocked: hasEarlyBird,
      currentValue: hasEarlyBird ? 1 : 0,
      targetValue: 1,
      unit: 'session',
      xpReward: 150,
      color: 'emerald',
    },
    {
      id: 'night_owl',
      title: 'Night Owl',
      description: 'Logged a late-night focus block or reflection after 11 PM.',
      category: 'HABITS',
      icon: <Star className="w-5 h-5" />,
      unlocked: hasNightOwl,
      currentValue: hasNightOwl ? 1 : 0,
      targetValue: 1,
      unit: 'session',
      xpReward: 150,
      color: 'purple',
    },
    {
      id: 'deep_focus',
      title: 'Deep Focus Pro',
      description: 'Completed a single uninterrupted focus session of 2+ hours.',
      category: 'FOCUS',
      icon: <Zap className="w-5 h-5" />,
      unlocked: maxSingleSessionSecs >= 7200,
      currentValue: Math.min(Math.round(maxSingleSessionSecs / 60), 120),
      targetValue: 120,
      unit: 'mins',
      xpReward: 300,
      color: 'cyan',
    },
    {
      id: 'focus_10h',
      title: '10 Hours Focus',
      description: 'Accumulated 10 total hours of focus work.',
      category: 'FOCUS',
      icon: <Clock className="w-5 h-5" />,
      unlocked: totalFocusHours >= 10,
      currentValue: Math.min(Math.round(totalFocusHours), 10),
      targetValue: 10,
      unit: 'hrs',
      xpReward: 200,
      color: 'indigo',
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
      xpReward: 200,
      color: 'emerald',
    },
    {
      id: 'mindset_7',
      title: 'Mindset Master',
      description: 'Completed 7 evening reflection reviews.',
      category: 'MINDSET',
      icon: <ShieldCheck className="w-5 h-5" />,
      unlocked: reviews.length >= 7,
      currentValue: Math.min(reviews.length, 7),
      targetValue: 7,
      unit: 'reviews',
      xpReward: 250,
      color: 'purple',
    },
    {
      id: 'checkin_7',
      title: 'Morning Champion',
      description: 'Logged 7 morning check-ins with priority goals.',
      category: 'MINDSET',
      icon: <Crown className="w-5 h-5" />,
      unlocked: checkIns.length >= 7,
      currentValue: Math.min(checkIns.length, 7),
      targetValue: 7,
      unit: 'check-ins',
      xpReward: 250,
      color: 'indigo',
    },
  ];

  const unlockedBadgesCount = badges.filter((b) => b.unlocked).length;

  const filteredBadges = badges.filter((b) => {
    if (badgeFilter === 'UNLOCKED') return b.unlocked;
    if (badgeFilter === 'IN_PROGRESS') return !b.unlocked;
    return true;
  });

  const getBadgeStyles = (color: MilestoneBadge['color'], unlocked: boolean) => {
    if (!unlocked) {
      return {
        cardBg: 'bg-slate-950/60 border-slate-800/60 opacity-75',
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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-6">
      {/* Visual Experience Point (XP) Banner & Rank Progress Bar */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950/70 to-slate-950 p-5 rounded-2xl border border-indigo-500/40 shadow-2xl relative overflow-hidden space-y-4">
        {/* Subtle Ambient Background Glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shrink-0 relative shadow-inner">
              <Trophy className="w-8 h-8 text-amber-400 animate-pulse" />
              <span className="absolute -bottom-1.5 -right-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-indigo-300 shadow">
                Lvl {level}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-semibold bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">
                  Productivity Rank
                </span>
                {streakMultiplier > 1.0 && (
                  <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/90 px-2.5 py-0.5 rounded-full border border-amber-500/50 flex items-center gap-1 shadow-sm">
                    <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                    {streakMultiplier}x XP Boost
                  </span>
                )}
              </div>
              <h3 className="font-heading font-extrabold text-xl text-white mt-0.5 flex items-center gap-2">
                Level {level}: <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-cyan-300">{getLevelTitle(level)}</span>
              </h3>
              <p className="text-xs text-slate-300 mt-1 flex items-center gap-2 flex-wrap">
                <span>Total Earned: <strong className="text-amber-300 font-mono font-bold">{totalXp.toLocaleString()} XP</strong></span>
                <span className="text-slate-600">•</span>
                <span>Next Rank: <strong className="text-cyan-300 font-mono">{getLevelTitle(level + 1)}</strong> (in <span className="text-emerald-400 font-mono">{xpToNextLevel} XP</span>)</span>
              </p>
            </div>
          </div>

          {/* Streak Indicator Pill */}
          <div className="flex items-center gap-3 bg-slate-900/90 p-3 rounded-2xl border border-amber-500/40 shrink-0 shadow-lg relative z-10">
            <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/30">
              <Flame className="w-5 h-5 text-amber-400 fill-amber-400/20" />
            </div>
            <div>
              <div className="text-xs font-bold text-white font-mono flex items-center gap-1">
                {currentStreak} Day Streak
              </div>
              <div className="text-[10px] text-slate-400">Personal Best: {longestStreak} days</div>
            </div>
          </div>
        </div>

        {/* Visual Experience Point (XP) Progress Bar */}
        <div className="space-y-2 pt-2 relative z-10">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              XP Progress to Level {level + 1}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-indigo-300 font-bold bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">
                {currentLevelXp} / {xpPerLevel} XP
              </span>
              <span className="text-amber-400 font-extrabold font-mono text-sm">{levelProgressPct}%</span>
            </div>
          </div>

          <div className="relative w-full bg-slate-900/90 h-4 rounded-full overflow-hidden border border-slate-700/80 shadow-inner p-0.5">
            {/* Multi-layered Glowing XP Progress Fill */}
            <div
              className="bg-gradient-to-r from-amber-500 via-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-700 shadow-lg relative overflow-hidden"
              style={{ width: `${Math.max(3, levelProgressPct)}%` }}
            >
              {/* Shimmer effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            </div>
          </div>

          {/* Level Milestone Tick Markers */}
          <div className="flex justify-between text-[10px] font-mono text-slate-400 px-1 pt-0.5">
            <span>Lvl {level} ({getLevelTitle(level)})</span>
            <span className="text-slate-400 font-bold">{levelProgressPct}% Progress</span>
            <span>Lvl {level + 1} ({getLevelTitle(level + 1)})</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'OVERVIEW'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Zap className="w-3.5 h-3.5" /> XP & Consistency
        </button>
        <button
          onClick={() => setActiveTab('BADGES')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'BADGES'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Award className="w-3.5 h-3.5" /> Unlockable Badges ({unlockedBadgesCount}/{badges.length})
        </button>
        <button
          onClick={() => setActiveTab('STREAK')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'STREAK'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" /> 14-Day Activity Heatmap
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-5">
          {/* Today's Daily XP Target */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white">Today's XP Target Goal</h4>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {todayXp} / {dailyGoalXp} XP ({todayGoalPct}%)
              </span>
            </div>
            <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(4, todayGoalPct)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Earn XP by running focus timers (+10 XP/min), completing tasks (+50 XP), or logging check-ins (+100 XP).
            </p>
          </div>

          {/* XP Earnings Rules Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Focus Timer
              </div>
              <p className="text-sm font-bold text-white font-mono">+10 XP <span className="text-[10px] text-slate-400 font-sans">/ min</span></p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Completed Task
              </div>
              <p className="text-sm font-bold text-white font-mono">+50 XP <span className="text-[10px] text-slate-400 font-sans">/ item</span></p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
                <Crown className="w-3 h-3" /> Check-In / Review
              </div>
              <p className="text-sm font-bold text-white font-mono">+100 XP <span className="text-[10px] text-slate-400 font-sans">/ entry</span></p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-[10px] font-mono text-purple-400 flex items-center gap-1">
                <Flame className="w-3 h-3" /> Streak Multiplier
              </div>
              <p className="text-sm font-bold text-white font-mono">{streakMultiplier}x <span className="text-[10px] text-slate-400 font-sans">bonus</span></p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: UNLOCKABLE BADGES */}
      {activeTab === 'BADGES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400 font-mono">
              Badges Unlocked: <strong className="text-indigo-400">{unlockedBadgesCount}</strong> of {badges.length}
            </div>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setBadgeFilter('ALL')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  badgeFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setBadgeFilter('UNLOCKED')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  badgeFilter === 'UNLOCKED' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Unlocked
              </button>
              <button
                onClick={() => setBadgeFilter('IN_PROGRESS')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  badgeFilter === 'IN_PROGRESS' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                In Progress
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredBadges.map((badge) => {
              const styles = getBadgeStyles(badge.color, badge.unlocked);
              const progressPct = Math.min(100, Math.round((badge.currentValue / badge.targetValue) * 100));

              return (
                <div
                  key={badge.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between space-y-2.5 ${styles.cardBg}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className={`p-2 rounded-xl border shrink-0 ${styles.iconBg}`}>{badge.icon}</div>
                      <div>
                        <h5 className="text-xs font-semibold text-white flex items-center gap-1">
                          {badge.title}
                          {badge.unlocked ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                          )}
                        </h5>
                        <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                          +{badge.xpReward} XP Reward
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">{badge.description}</p>

                  <div className="space-y-1 pt-1 border-t border-slate-900">
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
        </div>
      )}

      {/* TAB 3: 14-DAY HEATMAP */}
      {activeTab === 'STREAK' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-cyan-400" /> Past 14 Days Activity Consistency
            </h4>
            <span className="text-xs font-mono text-slate-400">
              Active Days: <strong className="text-emerald-400">{last14Days.filter((d) => d.isActive).length} / 14</strong>
            </span>
          </div>

          <div className="grid grid-cols-7 sm:grid-cols-14 gap-2">
            {last14Days.map((day) => (
              <div
                key={day.dateStr}
                className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center space-y-1 ${
                  day.isToday
                    ? 'border-indigo-500 bg-indigo-950/60 shadow-md ring-1 ring-indigo-500/50'
                    : day.isActive
                    ? 'border-emerald-500/40 bg-emerald-950/40'
                    : 'border-slate-800/80 bg-slate-950/60 opacity-60'
                }`}
                title={`${day.dateStr}: ${day.dayXp} XP`}
              >
                <span className="text-[10px] font-mono text-slate-400 uppercase">{day.dayLabel}</span>
                <span className={`text-xs font-mono font-bold ${day.isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {day.dayNum}
                </span>
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    day.isActive ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse' : 'bg-slate-800'
                  }`}
                />
                <span className="text-[9px] font-mono text-slate-400 truncate w-full">
                  {day.dayXp > 0 ? `${day.dayXp} XP` : '-'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
