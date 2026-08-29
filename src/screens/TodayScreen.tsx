import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  Pin,
  CheckCircle2,
  Circle,
  Plus,
  Zap,
  BookOpen,
  Brain,
  History,
  Timer,
  Tag,
  Clock,
  Sparkles,
  ArrowRight,
  X,
  Check,
} from 'lucide-react';
import { ActivityLog, Task, TimelineEntry, UserSettings } from '../types';
import { TimetablePlugin, TimetableProposal } from '../core/plugins/TimetablePlugin';

interface TodayScreenProps {
  activeActivity: ActivityLog | null;
  priorities: Task[];
  todayTasks: Task[];
  timelineEntries: TimelineEntry[];
  userName: string;
  onStartActivity: (name: string, category: string, note?: string) => void;
  onStartTaskTimer?: (task: Task) => void;
  onPauseActivity: (id?: number) => void;
  onResumeActivity: (id?: number) => void;
  onFinishActivity: (id?: number) => void;
  onOpenFinishModal?: () => void;
  onToggleTaskStatus: (taskId: number) => void;
  onOpenStartActivity: () => void;
  onOpenQuickCapture: () => void;
  onOpenAddTask: () => void;
  onOpenJournal: () => void;
  onOpenStudy: () => void;
}

export const TodayScreen: React.FC<TodayScreenProps> = ({
  activeActivity,
  priorities,
  todayTasks,
  timelineEntries,
  userName,
  onStartActivity,
  onStartTaskTimer,
  onPauseActivity,
  onResumeActivity,
  onFinishActivity,
  onOpenFinishModal,
  onToggleTaskStatus,
  onOpenStartActivity,
  onOpenQuickCapture,
  onOpenAddTask,
  onOpenJournal,
  onOpenStudy,
}) => {
  const [liveSeconds, setLiveSeconds] = useState(0);
  const [activeProposal, setActiveProposal] = useState<TimetableProposal | null>(() =>
    TimetablePlugin.getActiveProposal()
  );
  const [proposalSecondsLeft, setProposalSecondsLeft] = useState(0);

  // Live timer ticker update
  useEffect(() => {
    let interval: any = null;
    if (activeActivity) {
      const updateSeconds = () => {
        const now = Date.now();
        const pausedSecs = activeActivity.accumulatedPausedDurationSeconds || 0;
        if (activeActivity.isRunning && !activeActivity.isPaused) {
          const grossSecs = Math.max(0, Math.floor((now - activeActivity.startTimeMillis) / 1000));
          const netSecs = Math.max(0, grossSecs - pausedSecs);
          setLiveSeconds(netSecs);
        } else if (activeActivity.isPaused) {
          const pauseStart = activeActivity.pauseStartTimeMillis || now;
          const grossSecs = Math.max(0, Math.floor((pauseStart - activeActivity.startTimeMillis) / 1000));
          const netSecs = Math.max(0, grossSecs - pausedSecs);
          setLiveSeconds(netSecs);
        }
      };
      updateSeconds();
      interval = setInterval(updateSeconds, 1000);
    } else {
      setLiveSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeActivity]);

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

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleFinishClick = () => {
    if (onOpenFinishModal) {
      onOpenFinishModal();
    } else if (activeActivity) {
      onFinishActivity(activeActivity.id);
    }
  };

  const handleStartTask = (task: Task) => {
    if (onStartTaskTimer) {
      onStartTaskTimer(task);
    } else {
      onStartActivity(task.title, task.category, task.description || undefined);
    }
  };

  return (
    <div className="space-y-6 pb-12">
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
                Suggested focus: <strong className="text-indigo-300">{activeProposal.activity}</strong> ({activeProposal.start}–{activeProposal.end}). {activeProposal.reason}
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

      {/* 1. Active Timer Hero Card */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/60 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        {activeActivity ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                      activeActivity.isPaused ? 'bg-amber-400 opacity-75' : 'bg-emerald-400 opacity-75'
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-3 w-3 ${
                      activeActivity.isPaused ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  />
                </span>
                <span className="text-xs font-mono uppercase tracking-widest text-indigo-300 font-semibold">
                  {activeActivity.isPaused ? 'Timer Paused' : 'Live Focus Session'}
                </span>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-semibold">
                {activeActivity.category}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
              <div>
                <h2 className="text-2xl font-heading font-extrabold text-white">{activeActivity.activityName}</h2>
                {activeActivity.note && (
                  <p className="text-xs text-slate-400 mt-1 italic font-mono">&ldquo;{activeActivity.note}&rdquo;</p>
                )}
              </div>

              <div className="text-3xl sm:text-4xl font-mono font-black tracking-tight text-emerald-400 bg-slate-950/80 px-4 py-2 rounded-xl border border-emerald-900/50 shadow-inner inline-block self-start sm:self-auto">
                {formatTimer(liveSeconds)}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-slate-800/80">
              {activeActivity.isPaused ? (
                <button
                  onClick={() => onResumeActivity(activeActivity.id)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Resume Session</span>
                </button>
              ) : (
                <button
                  onClick={() => onPauseActivity(activeActivity.id)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-600/20"
                >
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause Timer</span>
                </button>
              )}

              <button
                onClick={handleFinishClick}
                className="py-2.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-600/20"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Finish & Log</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-indigo-400" />
                <h2 className="font-heading font-bold text-lg text-white">Focus Session Timer</h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">Ready</span>
            </div>

            <p className="text-xs text-slate-300">
              Start a real-time focus activity to automatically record your timeline logs and track productivity metrics.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={onOpenStartActivity}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start New Activity</span>
              </button>

              <div className="hidden sm:flex items-center gap-1.5 ml-2 text-xs font-mono text-slate-400">
                <span>Quick start:</span>
                <button
                  onClick={() => onStartActivity('Deep Work', 'Work')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  Work
                </button>
                <button
                  onClick={() => onStartActivity('Study Session', 'Study')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  Study
                </button>
                <button
                  onClick={() => onStartActivity('Testing & QA', 'Testing')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  Testing
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 2. Quick Actions Bar */}
      <section className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <button
          onClick={onOpenStartActivity}
          className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-left transition-all group flex flex-col justify-between h-20"
        >
          <Timer className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
          <div>
            <span className="text-xs font-semibold text-white block">Start Timer</span>
            <span className="text-[10px] text-slate-400">Track focus</span>
          </div>
        </button>

        <button
          onClick={onOpenQuickCapture}
          className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-left transition-all group flex flex-col justify-between h-20"
        >
          <Zap className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          <div>
            <span className="text-xs font-semibold text-white block">Quick Note</span>
            <span className="text-[10px] text-slate-400">Instant capture</span>
          </div>
        </button>

        <button
          onClick={onOpenAddTask}
          className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-left transition-all group flex flex-col justify-between h-20"
        >
          <Plus className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          <div>
            <span className="text-xs font-semibold text-white block">Add Task</span>
            <span className="text-[10px] text-slate-400">To-do item</span>
          </div>
        </button>

        <button
          onClick={onOpenJournal}
          className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-left transition-all group flex flex-col justify-between h-20"
        >
          <BookOpen className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          <div>
            <span className="text-xs font-semibold text-white block">Journal</span>
            <span className="text-[10px] text-slate-400">Reflective entry</span>
          </div>
        </button>

        <button
          onClick={onOpenStudy}
          className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-left transition-all group flex flex-col justify-between h-20 col-span-2 sm:col-span-1"
        >
          <Brain className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
          <div>
            <span className="text-xs font-semibold text-white block">Study Cards</span>
            <span className="text-[10px] text-slate-400">Active recall</span>
          </div>
        </button>
      </section>

      {/* 3. Priority Pins Section */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Pin className="w-4 h-4 text-amber-400 fill-current" />
            <h3 className="font-heading font-bold text-base text-white">Today's Priority Pins</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">{priorities.length} / 3 pinned</span>
        </div>

        {priorities.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl">
            <p className="text-xs text-slate-400">No priority tasks pinned for today.</p>
            <button
              onClick={onOpenAddTask}
              className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              + Add a priority task
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {priorities.map((task) => {
              const isTaskActive = activeActivity && activeActivity.activityName.toLowerCase().includes(task.title.toLowerCase());
              return (
                <div
                  key={task.id}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 group ${
                    isTaskActive
                      ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md shadow-indigo-950/50'
                      : 'bg-slate-950 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => onToggleTaskStatus(task.id)}
                      className="text-slate-500 hover:text-emerald-400 transition-colors"
                      title={task.status === 'COMPLETED' ? 'Mark Incomplete' : 'Mark Complete'}
                    >
                      {task.status === 'COMPLETED' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-950" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-xs font-medium text-white truncate ${
                            task.status === 'COMPLETED' ? 'line-through text-slate-500' : ''
                          }`}
                        >
                          {task.title}
                        </p>
                        {isTaskActive && (
                          <span className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-1.5 py-0.2 rounded animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Tracking Now
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950 px-1.5 py-0.2 rounded">
                          {task.category}
                        </span>
                        {task.description && (
                          <span className="text-[10px] text-slate-400 truncate max-w-[200px]">{task.description}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {task.status !== 'COMPLETED' && (
                      <button
                        onClick={() => handleStartTask(task)}
                        className={`p-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                          isTaskActive
                            ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                            : 'bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white'
                        }`}
                        title="Start timer for this task"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span className="hidden sm:inline text-[11px] font-medium">Track</span>
                      </button>
                    )}
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded">
                      High Priority
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Today's Timeline Logs & Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Timeline Logs */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                <h3 className="font-heading font-bold text-base text-white">Today's Timeline Logs</h3>
              </div>
              <span className="text-xs font-mono text-slate-400">{timelineEntries.length} entries</span>
            </div>

            {timelineEntries.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">No timeline activity logged today yet.</p>
            ) : (
              <div className="space-y-3">
                {timelineEntries.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">
                        {entry.type} &bull; {entry.category}
                      </span>
                      <h4 className="text-xs font-semibold text-white mt-0.5">{entry.title}</h4>
                      {entry.note && <p className="text-[11px] text-slate-400 mt-0.5">{entry.note}</p>}
                    </div>
                    {entry.durationMinutes !== undefined && entry.durationMinutes !== null && (
                      <span className="text-[10px] font-mono font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                        {entry.durationMinutes > 0 ? `${entry.durationMinutes}m` : '< 1m'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Pending Tasks */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              <h3 className="font-heading font-bold text-base text-white">Pending Tasks</h3>
            </div>
            <button
              onClick={onOpenAddTask}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>

          <div className="space-y-2">
            {todayTasks.filter((t) => t.status !== 'COMPLETED').length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">All tasks completed for today!</p>
            ) : (
              todayTasks
                .filter((t) => t.status !== 'COMPLETED')
                .slice(0, 5)
                .map((task) => {
                  const isTaskActive = activeActivity && activeActivity.activityName.toLowerCase().includes(task.title.toLowerCase());
                  return (
                    <div
                      key={task.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                        isTaskActive
                          ? 'bg-indigo-950/40 border-indigo-500/50'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          onClick={() => onToggleTaskStatus(task.id)}
                          className="text-slate-500 hover:text-emerald-400 transition-colors"
                        >
                          <Circle className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-medium text-white truncate">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleStartTask(task)}
                          className="p-1 rounded-md text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors"
                          title="Start timer for this task"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          {task.category}
                        </span>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
