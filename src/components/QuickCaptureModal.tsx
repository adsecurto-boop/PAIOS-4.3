import React, { useState } from 'react';
import { X, Zap, Tag } from 'lucide-react';

interface QuickCaptureModalProps {
  onDismiss: () => void;
  onSave: (text: string, category: string) => void;
}

const CATEGORIES = ['Personal', 'Work', 'Study', 'Testing', 'Coding', 'Other'];

export const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({ onDismiss, onSave }) => {
  const [text, setText] = useState('');
  const [category, setCategory] = useState('Personal');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSave(text.trim(), category);
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-cyan-400">
            <Zap className="w-5 h-5 fill-current" />
            <h3 className="font-heading font-bold text-lg text-white">Quick Capture Note</h3>
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
              Quick Thought / Note *
            </label>
            <textarea
              rows={3}
              required
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Capture an idea, reminder, or insight instantly..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
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
                      ? 'bg-cyan-600 text-white font-semibold'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onDismiss}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!text.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-xs font-semibold shadow-md shadow-cyan-600/30 transition-all disabled:opacity-50"
            >
              Save Note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
