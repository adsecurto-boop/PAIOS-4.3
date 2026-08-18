import React, { useState } from 'react';
import { X, Moon, Star, ThumbsUp, ThumbsDown, BookOpen, RefreshCw } from 'lucide-react';
import { EveningReview } from '../types';

interface ReviewModalProps {
  dateString: string;
  activeTimeText: string;
  tasksCompletedText: string;
  existingReview: EveningReview | null;
  onDismiss: () => void;
  onSave: (review: EveningReview) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  dateString,
  activeTimeText,
  tasksCompletedText,
  existingReview,
  onDismiss,
  onSave,
}) => {
  const [wentWell, setWentWell] = useState(existingReview?.wentWell || '');
  const [didntGoWell, setDidntGoWell] = useState(existingReview?.didntGoWell || '');
  const [learnedText, setLearnedText] = useState(existingReview?.learnedText || '');
  const [doDifferently, setDoDifferently] = useState(existingReview?.doDifferently || '');
  const [rating, setRating] = useState(existingReview?.rating || 8);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      dateString,
      activeTimeFormatted: activeTimeText,
      workTimeFormatted: activeTimeText,
      studyTimeFormatted: '0h 0m',
      tasksCompletedText,
      wentWell,
      didntGoWell,
      learnedText,
      doDifferently,
      rating,
      createdAtMillis: existingReview?.createdAtMillis || Date.now(),
    });
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl my-8 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-indigo-400">
            <Moon className="w-5 h-5" />
            <div>
              <h3 className="font-heading font-bold text-lg text-white">Evening Review</h3>
              <p className="text-xs text-slate-400 font-mono">{dateString}</p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Daily Stats Summary */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-around text-center">
          <div>
            <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Total Active Focus</p>
            <p className="text-sm font-bold text-indigo-400 font-mono">{activeTimeText}</p>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div>
            <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Tasks Completed</p>
            <p className="text-sm font-bold text-emerald-400 font-mono">{tasksCompletedText}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400" /> Overall Day Rating (1 to 10)
            </label>
            <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <input
                type="range"
                min="1"
                max="10"
                value={rating}
                onChange={(e) => setRating(parseInt(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <span className="text-base font-mono font-extrabold text-amber-400 min-w-[32px] text-right">
                {rating}/10
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
              <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" /> What went well today?
            </label>
            <textarea
              rows={2}
              value={wentWell}
              onChange={(e) => setWentWell(e.target.value)}
              placeholder="Wins, breakthroughs, productive moments..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
              <ThumbsDown className="w-3.5 h-3.5 text-rose-400" /> What didn't go as planned?
            </label>
            <textarea
              rows={2}
              value={didntGoWell}
              onChange={(e) => setDidntGoWell(e.target.value)}
              placeholder="Distractions, unexpected blockers..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" /> What did you learn?
              </label>
              <input
                type="text"
                value={learnedText}
                onChange={(e) => setLearnedText(e.target.value)}
                placeholder="Key takeaway or concept"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5 text-purple-400" /> What will you do differently?
              </label>
              <input
                type="text"
                value={doDifferently}
                onChange={(e) => setDoDifferently(e.target.value)}
                placeholder="Actionable adjustment"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
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
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
            >
              Save Evening Review
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
