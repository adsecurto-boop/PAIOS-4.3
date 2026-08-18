import React, { useState } from 'react';
import { X, CheckCircle, Pin, Tag, AlertTriangle } from 'lucide-react';

interface TaskModalProps {
  onDismiss: () => void;
  onSave: (title: string, category: string, isPriority: boolean, description: string) => void;
}

const CATEGORIES = ['Work', 'Study', 'Coding', 'Testing', 'Personal', 'Exercise', 'Other'];

export const TaskModal: React.FC<TaskModalProps> = ({ onDismiss, onSave }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Work');
  const [isPriority, setIsPriority] = useState(false);
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(title.trim(), category, isPriority, description.trim());
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-indigo-400">
            <CheckCircle className="w-5 h-5" />
            <h3 className="font-heading font-bold text-lg text-white">Add New Task</h3>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Task Title *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Run regression test suite, Study chapter 4..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" /> Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    category === cat
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setIsPriority(!isPriority)}
              className={`p-2 rounded-lg transition-colors ${
                isPriority ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Pin className="w-4 h-4 fill-current" />
            </button>
            <div>
              <span className="text-xs font-semibold text-slate-200 block">Pin to Priority Today</span>
              <span className="text-[10px] text-slate-400">Shows in Today Screen top 3 priorities list</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details, sub-steps, or links..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onDismiss}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
