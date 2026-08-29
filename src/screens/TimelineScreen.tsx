import React, { useState, useEffect } from 'react';
import {
  History,
  Trash2,
  Filter,
  Clock,
  Sparkles,
  CheckCircle2,
  Play,
  Calendar,
  Briefcase,
  Coffee,
  Moon,
  Target,
  RotateCcw,
  Zap,
  AlertCircle,
  ChevronRight,
  Check,
  X,
} from 'lucide-react';
import {
  TimelineEntry,
  AdaptiveTimetableBlock,
  AdaptiveTimetableResponse,
  TimetablePriority,
  TimetableStatus,
  UserSettings,
} from '../types';
import { TimetablePlugin, TimetableProposal } from '../core/plugins/TimetablePlugin';

interface TimelineScreenProps {
  timelineEntries: TimelineEntry[];
  timetable: AdaptiveTimetableResponse | null;
  settings: UserSettings;
  isGeneratingTimetable: boolean;
  onGenerateTimetable: (adaptationReason?: string) => void;
  onUpdateBlockStatus: (blockId: string, status: TimetableStatus) => void;
  onDeleteBlock: (blockId: string) => void;
  onDeleteTimelineEntry: (id: number) => void;
  onStartActivity: (name: string, category: string, note?: string) => void;
  onUpdateSettings: (updated: Partial<UserSettings>) => void;
}

const CATEGORIES = ['All', 'Work', 'Study', 'Coding', 'Testing', 'Personal', 'Exercise', 'Break', 'Health', 'Other'];

export const TimelineScreen: React.FC<TimelineScreenProps> = ({
  timelineEntries,
  timetable,
  settings,
  isGeneratingTimetable,
  onGenerateTimetable,
  onUpdateBlockStatus,
  onDeleteBlock,
  onDeleteTimelineEntry,
  onStartActivity,
  onUpdateSettings,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showGoalManager, setShowGoalManager] = useState(false);
  const [newGoalInput, setNewGoalInput] = useState('');

  const [activeProposal, setActiveProposal] = useState<TimetableProposal | null>(() =>
    TimetablePlugin.getActiveProposal()
  );
  const [proposalSecondsLeft, setProposalSecondsLeft] = useState(0);

  // Timetable Proposal 60s Ticker & Event Listeners
  useEffect(() => {
    const updateProposalState = () => {
      const prop = TimetablePlugin.getActiveProposal();
      setActiveProposal(prop);
      if (prop) {
        const left = Math.max(0, Math.ceil((prop.expiresAtMillis - Date.now()) / 1000));
        setProposalSecondsLeft(left);
      } else {
        setProposalSecondsLeft(0);
      }
    };

    updateProposalState();
    const interval = setInterval(updateProposalState, 1000);

    const handleProposalUpdate = () => updateProposalState();
    const handlePitSynced = () => updateProposalState();

    window.addEventListener('timetable_proposal_updated', handleProposalUpdate);
    window.addEventListener('precontext_pit_synced', handlePitSynced);

    return () => {
      clearInterval(interval);
      window.removeEventListener('timetable_proposal_updated', handleProposalUpdate);
      window.removeEventListener('precontext_pit_synced', handlePitSynced);
    };
  }, []);

  const handleAcceptProposal = (id: string) => {
    TimetablePlugin.acceptProposal(id);
    setActiveProposal(null);
  };

  const handleDeclineProposal = (id: string) => {
    TimetablePlugin.rejectProposal(id);
    setActiveProposal(null);
  };

  const now = new Date();
  const currentTimeDisplay = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const todayDateHeader = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  const filteredHistory = timelineEntries.filter((entry) => {
    if (selectedCategory === 'All') return true;
    return entry.category === selectedCategory;
  });

  const formatTimestamp = (millis: number) => {
    const d = new Date(millis);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateHeader = (millis: number) => {
    const d = new Date(millis);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getPriorityBadgeClass = (priority: TimetablePriority) => {
    switch (priority) {
      case 'FIXED':
        return 'bg-rose-950/80 text-rose-300 border-rose-800/80';
      case 'HIGH':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80';
      case 'FLEXIBLE':
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80';
      case 'OPTIONAL':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case 'RECOVERY':
        return 'bg-sky-950/80 text-sky-300 border-sky-800/80';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getStatusBadgeClass = (status: TimetableStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'in_progress':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse';
      case 'deferred':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30 line-through';
      case 'skipped':
        return 'bg-slate-800 text-slate-400 border-slate-700 line-through';
      default:
        return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20';
    }
  };

  const handleToggleWorkday = () => {
    onUpdateSettings({ isWorkday: !settings.isWorkday });
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalInput.trim()) return;
    const currentGoals = settings.goals || [];
    onUpdateSettings({ goals: [...currentGoals, newGoalInput.trim()] });
    setNewGoalInput('');
  };

  const handleRemoveGoal = (index: number) => {
    const currentGoals = settings.goals || [];
    const updated = currentGoals.filter((_, i) => i !== index);
    onUpdateSettings({ goals: updated });
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Rule B1: 60s Contextual Schedule Proposal Banner */}
      {activeProposal && activeProposal.status === 'pending' && proposalSecondsLeft > 0 && (
        <div className="bg-indigo-950/80 border border-indigo-500/50 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all animate-pulse-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/30 text-indigo-400 rounded-xl border border-indigo-500/40 shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300 fill-amber-300/30" />
            </div>
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-2">
                <span>AI Contextual Schedule Proposal</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-900/80 text-indigo-300 border border-indigo-700/60 font-semibold">
                  Rule B1 (60s Auto-Lapse)
                </span>
              </p>
              <p className="text-xs text-slate-300 mt-0.5">
                Suggested activity: <strong className="text-indigo-300">{activeProposal.activity}</strong> ({activeProposal.start}–{activeProposal.end}). {activeProposal.reason}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-800/80">
              ⏱ {proposalSecondsLeft}s
            </span>
            <button
              onClick={() => handleAcceptProposal(activeProposal.id)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Accept</span>
            </button>
            <button
              onClick={() => handleDeclineProposal(activeProposal.id)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Decline</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Banner: Real-Time Context & Adaptive AI Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          
          {/* Title & Live Time Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading font-bold text-2xl text-white">Adaptive Daily Timetable</h2>
                  <span className="text-xs font-mono font-bold bg-slate-800 text-emerald-400 px-2.5 py-0.5 rounded-full border border-slate-700">
                    Live: {currentTimeDisplay}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  AI-driven schedule starting strictly from <span className="text-emerald-300 font-semibold">{currentTimeDisplay}</span> until bedtime (<span className="text-slate-300">{settings.bedtime || '12:00 AM'}</span>)
                </p>
              </div>
            </div>

            {/* Sub-bar: Workday Toggle & Schedule Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                onClick={handleToggleWorkday}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                  settings.isWorkday !== false
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/40'
                    : 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/40'
                }`}
                title="Click to toggle Workday vs Week-Off schedule mode"
              >
                {settings.isWorkday !== false ? (
                  <>
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Workday ({settings.officeStartTime || '1:00 PM'}–{settings.officeEndTime || '10:00 PM'})</span>
                  </>
                ) : (
                  <>
                    <Coffee className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Week-Off / Study Focus Mode</span>
                  </>
                )}
              </button>

              <div className="px-3 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-amber-400" />
                <span>Bedtime: {settings.bedtime || '12:00 AM'}</span>
              </div>

              <button
                onClick={() => setShowGoalManager(!showGoalManager)}
                className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-all"
              >
                <Target className="w-3.5 h-3.5 text-indigo-400" />
                <span>Long-Term Goals ({(settings.goals || []).length})</span>
              </button>
            </div>
          </div>

          {/* AI Timetable Generator Action Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => onGenerateTimetable()}
              disabled={isGeneratingTimetable}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
            >
              {isGeneratingTimetable ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Calculating Schedule...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300/30" />
                  <span>{timetable ? 'Regenerate Daily Schedule' : 'Generate Daily AI Timetable'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Expandable Long-Term Goals Manager Drawer */}
        {showGoalManager && (
          <div className="mt-5 pt-4 border-t border-slate-800/80 bg-slate-950/60 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-indigo-400" /> Active Career & Life Goals
              </h4>
              <button
                onClick={() => setShowGoalManager(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              PAIOS AI uses these long-term goals to prioritize your daily study blocks (ISTQB, SDET, Playwright) and balance them against fixed commitments.
            </p>

            <form onSubmit={handleAddGoal} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add new long-term goal (e.g. Master Playwright Python Framework)..."
                value={newGoalInput}
                onChange={(e) => setNewGoalInput(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-sm"
              >
                Add Goal
              </button>
            </form>

            <div className="space-y-1.5 pt-1">
              {(settings.goals || []).map((goal, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-indigo-400 font-bold">{idx + 1}.</span>
                    <span>{goal}</span>
                  </span>
                  <button
                    onClick={() => handleRemoveGoal(idx)}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded"
                    title="Remove goal"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Adaptive Triggers Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-slate-300">Dynamic Schedule Adaptation Triggers:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => onGenerateTimetable('User completed previous task early. Recalculate remaining schedule starting now.')}
            disabled={isGeneratingTimetable}
            className="px-3.5 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/80 text-emerald-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Finished Task Early</span>
          </button>

          <button
            onClick={() => onGenerateTimetable('Previous task took longer than expected. Recalculate remaining schedule starting now, preserving fixed commitments, meals, and sleep.')}
            disabled={isGeneratingTimetable}
            className="px-3.5 py-1.5 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/80 text-amber-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Task Took Longer</span>
          </button>

          <button
            onClick={() => onGenerateTimetable('An unexpected interruption occurred. Rebuild remaining schedule from current time.')}
            disabled={isGeneratingTimetable}
            className="px-3.5 py-1.5 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/80 text-indigo-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
            <span>Unexpected Distraction</span>
          </button>
        </div>
      </div>

      {/* AI Explanation "Why this plan?" Banner */}
      {timetable && timetable.explanation && (
        <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-2xl p-4 shadow-md flex items-start gap-3">
          <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">
              PAIOS Adaptive Rationale ("Why this plan?")
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">{timetable.explanation}</p>
          </div>
        </div>
      )}

      {/* Timetable Schedule Stack Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-lg text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <span>Today's Remaining Schedule</span>
            {timetable && (
              <span className="text-xs font-mono font-normal text-slate-400">
                (Generated at {timetable.generatedAtTimeStr})
              </span>
            )}
          </h3>

          {timetable && timetable.blocks.length > 0 && (
            <span className="text-xs text-slate-400 font-mono">
              {timetable.blocks.length} scheduled block{timetable.blocks.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {!timetable || timetable.blocks.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
            <Sparkles className="w-10 h-10 mx-auto text-emerald-400/40" />
            <h4 className="text-base font-bold text-white">No AI Timetable Active For Today</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Click <span className="text-emerald-400 font-semibold">"Generate Daily AI Timetable"</span> above to build an optimized, goal-aware timetable starting strictly from current time.
            </p>
            <button
              onClick={() => onGenerateTimetable()}
              disabled={isGeneratingTimetable}
              className="mt-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Generate Timetable Now</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {timetable.blocks.map((block) => (
              <div
                key={block.id}
                className={`bg-slate-900 border rounded-2xl p-4 shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  block.status === 'in_progress'
                    ? 'border-amber-500/50 bg-amber-950/10 ring-1 ring-amber-500/30'
                    : block.status === 'completed'
                    ? 'border-emerald-800/40 opacity-75'
                    : block.status === 'deferred' || block.status === 'skipped'
                    ? 'border-slate-800/60 opacity-60'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Time & Activity Details */}
                <div className="flex items-start gap-4 min-w-0">
                  <div className="text-left shrink-0 min-w-[90px]">
                    <span className="text-sm font-mono font-bold text-emerald-400 block">
                      {block.start} – {block.end}
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-slate-400 block mt-0.5">
                      ⏱ {block.duration_minutes} min
                    </span>
                  </div>

                  <div className="w-px h-12 bg-slate-800 shrink-0 hidden sm:block" />

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Priority Badge */}
                      <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getPriorityBadgeClass(block.priority)}`}>
                        {block.priority}
                      </span>

                      {/* Category Pill */}
                      <span className="text-[10px] font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                        {block.category}
                      </span>

                      {/* Goal Link Tag */}
                      {block.goal && (
                        <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded-md border border-indigo-800/60 flex items-center gap-1">
                          <Target className="w-3 h-3 text-indigo-400" />
                          <span>{block.goal}</span>
                        </span>
                      )}

                      {/* Status Badge */}
                      <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getStatusBadgeClass(block.status)}`}>
                        {block.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <span>{block.activity}</span>
                    </h4>

                    {block.reason && (
                      <p className="text-xs text-slate-400 leading-relaxed italic">
                        "{block.reason}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions Controls */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center border-t md:border-t-0 border-slate-800 pt-3 md:pt-0 w-full md:w-auto justify-end">
                  {/* Start Timer Button */}
                  {block.status !== 'completed' && block.status !== 'deferred' && (
                    <button
                      onClick={() => onStartActivity(block.activity, block.category, `From Timetable (${block.start}-${block.end})`)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                      title="Start Active PAIOS Timer for this activity"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Start Timer</span>
                    </button>
                  )}

                  {/* Complete Block Button */}
                  {block.status !== 'completed' ? (
                    <button
                      onClick={() => onUpdateBlockStatus(block.id, 'completed')}
                      className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5"
                      title="Mark task completed and log to immutable timeline history"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Mark Done</span>
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1 px-2 py-1 bg-emerald-950/50 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Logged to History
                    </span>
                  )}

                  {/* Defer Button */}
                  {block.status === 'planned' && (
                    <button
                      onClick={() => onUpdateBlockStatus(block.id, 'deferred')}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition-all"
                      title="Defer this task"
                    >
                      Defer
                    </button>
                  )}

                  {/* Delete Block Button */}
                  <button
                    onClick={() => onDeleteBlock(block.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                    title="Remove block from timetable"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Immutable Timeline History Ledger Section */}
      <div className="pt-6 border-t border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-white">Immutable Timeline History Ledger</h3>
              <p className="text-xs text-slate-400">Permanent chronological record of completed activities, logged notes, and medication doses</p>
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" />
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Entries List */}
        {filteredHistory.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-500">
            <History className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-400" />
            <p className="text-xs font-semibold">No historical timeline entries found for category "{selectedCategory}"</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((entry) => (
              <div
                key={entry.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 transition-all shadow-md flex items-start justify-between gap-4 group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-slate-300 block">
                      {formatTimestamp(entry.timestampMillis)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {formatDateHeader(entry.timestampMillis)}
                    </span>
                  </div>

                  <div className="w-px h-10 bg-slate-800 shrink-0 self-center" />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-900/50">
                        {entry.type}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                        {entry.category}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-white mt-1">{entry.title}</h4>

                    {entry.note && <p className="text-xs text-slate-300 mt-1 leading-relaxed">{entry.note}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {entry.durationMinutes && (
                    <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-950 border border-indigo-800 px-2.5 py-1 rounded-lg">
                      {entry.durationMinutes} min
                    </span>
                  )}

                  <button
                    onClick={() => onDeleteTimelineEntry(entry.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete timeline entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
