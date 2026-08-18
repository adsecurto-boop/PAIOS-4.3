import React, { useState } from 'react';
import { CheckCircle2, Circle, Pin, Plus, Trash2, Filter, Tag, Play, Pause, Square, Timer } from 'lucide-react';
import { Task, TaskStatus, ActivityLog } from '../types';

interface TasksScreenProps {
  tasks: Task[];
  activeActivity?: ActivityLog | null;
  onToggleTaskStatus: (taskId: number) => void;
  onToggleTaskPriorityPin: (taskId: number) => void;
  onDeleteTask: (taskId: number) => void;
  onOpenAddTask: () => void;
  onStartTaskTimer?: (task: Task) => void;
  onPauseActivity?: (id?: number) => void;
  onResumeActivity?: (id?: number) => void;
  onOpenFinishModal?: () => void;
}

export const TasksScreen: React.FC<TasksScreenProps> = ({
  tasks,
  activeActivity,
  onToggleTaskStatus,
  onToggleTaskPriorityPin,
  onDeleteTask,
  onOpenAddTask,
  onStartTaskTimer,
  onPauseActivity,
  onResumeActivity,
  onOpenFinishModal,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const categories = ['ALL', ...Array.from(new Set(tasks.map((t) => t.category)))];

  const filteredTasks = tasks.filter((task) => {
    if (filterStatus === 'TODO' && task.status === 'COMPLETED') return false;
    if (filterStatus === 'COMPLETED' && task.status !== 'COMPLETED') return false;
    if (filterStatus === 'PINNED' && !task.isPriorityPin) return false;
    if (filterCategory !== 'ALL' && task.category !== filterCategory) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-xl text-white">Task Management</h2>
            <p className="text-xs text-slate-400">Organize, track focus sessions, and prioritize your daily action items</p>
          </div>
        </div>

        <button
          onClick={onOpenAddTask}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Task</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === 'ALL' ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-800 text-slate-400'
            }`}
          >
            All ({tasks.length})
          </button>
          <button
            onClick={() => setFilterStatus('TODO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === 'TODO' ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Pending ({tasks.filter((t) => t.status !== 'COMPLETED').length})
          </button>
          <button
            onClick={() => setFilterStatus('PINNED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === 'PINNED' ? 'bg-amber-600 text-white font-semibold' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Pinned ({tasks.filter((t) => t.isPriorityPin).length})
          </button>
          <button
            onClick={() => setFilterStatus('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === 'COMPLETED' ? 'bg-emerald-600 text-white font-semibold' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Completed ({tasks.filter((t) => t.status === 'COMPLETED').length})
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Tag className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                Category: {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30 text-indigo-400" />
          <p className="text-sm font-semibold">No tasks found</p>
          <p className="text-xs text-slate-500 mt-1">Create a task to keep track of your goals.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const isTaskActive =
              activeActivity &&
              (activeActivity.activityName.toLowerCase().includes(task.title.toLowerCase()) ||
                task.title.toLowerCase().includes(activeActivity.activityName.toLowerCase()));

            return (
              <div
                key={task.id}
                className={`p-4 rounded-xl border transition-all shadow-md flex items-start justify-between gap-3 group ${
                  isTaskActive
                    ? 'bg-indigo-950/40 border-indigo-500/60 shadow-indigo-950/50 shadow-lg'
                    : task.status === 'COMPLETED'
                    ? 'bg-slate-950/60 border-slate-800/60 opacity-75'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    onClick={() => onToggleTaskStatus(task.id)}
                    className="mt-0.5 text-slate-500 hover:text-emerald-400 transition-colors"
                  >
                    {task.status === 'COMPLETED' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-950" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={`text-sm font-semibold text-white ${
                          task.status === 'COMPLETED' ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {task.title}
                      </h3>

                      {task.isPriorityPin && (
                        <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-800/40 px-1.5 py-0.2 rounded flex items-center gap-1">
                          <Pin className="w-2.5 h-2.5 fill-current" /> Priority
                        </span>
                      )}

                      {isTaskActive && (
                        <span className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Tracking Focus
                        </span>
                      )}
                    </div>

                    {task.description && <p className="text-xs text-slate-400 mt-1">{task.description}</p>}

                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-900/50">
                        {task.category}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        Created {new Date(task.createdAtMillis).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Focus Timer Track Button */}
                  {task.status !== 'COMPLETED' && onStartTaskTimer && (
                    <>
                      {isTaskActive ? (
                        <div className="flex items-center gap-1">
                          {activeActivity.isPaused ? (
                            <button
                              onClick={() => onResumeActivity && onResumeActivity(activeActivity.id)}
                              className="p-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 transition-colors"
                              title="Resume timer"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                          ) : (
                            <button
                              onClick={() => onPauseActivity && onPauseActivity(activeActivity.id)}
                              className="p-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 transition-colors"
                              title="Pause timer"
                            >
                              <Pause className="w-3.5 h-3.5 fill-current" />
                            </button>
                          )}
                          <button
                            onClick={() => onOpenFinishModal && onOpenFinishModal()}
                            className="p-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 transition-colors"
                            title="Finish & Log timer"
                          >
                            <Square className="w-3.5 h-3.5 fill-current" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onStartTaskTimer(task)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1"
                          title="Start timer for this task"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span className="hidden sm:inline">Track</span>
                        </button>
                      )}
                    </>
                  )}

                  <button
                    onClick={() => onToggleTaskPriorityPin(task.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      task.isPriorityPin
                        ? 'text-amber-400 bg-amber-950/40'
                        : 'text-slate-500 hover:text-amber-400 hover:bg-slate-800'
                    }`}
                    title={task.isPriorityPin ? 'Unpin Priority' : 'Pin to Priority'}
                  >
                    <Pin className="w-4 h-4 fill-current" />
                  </button>

                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete Task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
