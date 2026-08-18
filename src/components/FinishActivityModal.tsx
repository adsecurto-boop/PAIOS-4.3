import React, { useState } from 'react';
import { X, CheckCircle2, Clock, FileText, Tag, Square, AlertCircle } from 'lucide-react';
import { ActivityLog, Task } from '../types';

interface FinishActivityModalProps {
  activity: ActivityLog;
  elapsedSeconds: number;
  tasks: Task[];
  onDismiss: () => void;
  onFinishAndLog: (id: number, finalNote: string, completedTaskId?: number | null) => void;
  onDiscard: (id: number) => void;
}

export const FinishActivityModal: React.FC<FinishActivityModalProps> = ({
  activity,
  elapsedSeconds,
  tasks,
  onDismiss,
  onFinishAndLog,
  onDiscard,
}) => {
  const [note, setNote] = useState(activity.note || '');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(() => {
    // Try to auto-match task by title or name
    const match = tasks.find(
      (t) =>
        t.status !== 'COMPLETED' &&
        (t.title.toLowerCase().includes(activity.activityName.toLowerCase()) ||
          activity.activityName.toLowerCase().includes(t.title.toLowerCase()))
    );
    return match ? match.id : null;
  });
  const [markTaskComplete, setMarkTaskComplete] = useState<boolean>(true);

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const taskIdToComplete = markTaskComplete && selectedTaskId ? selectedTaskId : null;
    onFinishAndLog(activity.id, note.trim(), taskIdToComplete);
    onDismiss();
  };

  const pendingTasks = tasks.filter((t) => t.status !== 'COMPLETED');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-rose-400">
            <Square className="w-5 h-5 fill-current" />
            <h3 className="font-heading font-bold text-lg text-white">Finish & Log Session</h3>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Summary Banner */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-900/50">
                {activity.category}
              </span>
              <h4 className="text-base font-bold text-white mt-1.5">{activity.activityName}</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Started {new Date(activity.startTimeMillis).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Total Focus Time</span>
              <span className="text-xl font-mono font-black text-emerald-400">
                {formatTimer(elapsedSeconds)}
              </span>
            </div>
          </div>

          {/* Session Notes / Key Takeaways */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-indigo-400" /> Key Accomplishments / Final Note
            </label>
            <textarea
              rows={3}
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What did you complete or discover during this session? (Logged to daily timeline)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Associated Task Completion */}
          {pendingTasks.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={markTaskComplete && selectedTaskId !== null}
                    onChange={(e) => setMarkTaskComplete(e.target.checked)}
                    disabled={selectedTaskId === null}
                    className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <span>Mark matching task as Completed</span>
                </label>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>

              <select
                value={selectedTaskId || ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  setSelectedTaskId(val);
                  if (val) setMarkTaskComplete(true);
                }}
                className="w-full bg-slate-900 border border-slate-800 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- No specific task linked --</option>
                {pendingTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.category}] {t.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                if (confirm('Discard this focus session without logging to timeline?')) {
                  onDiscard(activity.id);
                  onDismiss();
                }
              }}
              className="px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
            >
              Discard Session
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onDismiss}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Keep Running
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finish & Log Timeline</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
