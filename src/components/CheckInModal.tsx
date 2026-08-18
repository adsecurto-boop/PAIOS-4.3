import React, { useState } from 'react';
import { X, Sun, Target, Smile, Battery, Moon } from 'lucide-react';
import { MorningCheckIn } from '../types';

interface CheckInModalProps {
  dateString: string;
  existingCheckIn: MorningCheckIn | null;
  onDismiss: () => void;
  onSave: (checkIn: MorningCheckIn) => void;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  dateString,
  existingCheckIn,
  onDismiss,
  onSave,
}) => {
  const [sleepHours, setSleepHours] = useState(existingCheckIn?.sleepHours || 7.5);
  const [sleepQuality, setSleepQuality] = useState(existingCheckIn?.sleepQuality || 8);
  const [energy, setEnergy] = useState(existingCheckIn?.energy || 8);
  const [mood, setMood] = useState(existingCheckIn?.mood || 8);
  const [mainGoal, setMainGoal] = useState(existingCheckIn?.mainGoal || '');
  const [priority1, setPriority1] = useState(existingCheckIn?.priority1 || '');
  const [priority2, setPriority2] = useState(existingCheckIn?.priority2 || '');
  const [priority3, setPriority3] = useState(existingCheckIn?.priority3 || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      dateString,
      sleepHours,
      sleepQuality,
      energy,
      mood,
      mainGoal,
      priority1,
      priority2,
      priority3,
      createdAtMillis: existingCheckIn?.createdAtMillis || Date.now(),
    });
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl my-8 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-amber-400">
            <Sun className="w-5 h-5" />
            <div>
              <h3 className="font-heading font-bold text-lg text-white">Morning Check-In</h3>
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          {/* Sleep & Quality */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <Moon className="w-3.5 h-3.5 text-indigo-400" /> Sleep Duration
                </span>
                <span className="text-xs font-mono font-bold text-indigo-400">{sleepHours} hrs</span>
              </div>
              <input
                type="range"
                min="3"
                max="12"
                step="0.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-300">Sleep Quality</span>
                <span className="text-xs font-mono font-bold text-amber-400">{sleepQuality}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={sleepQuality}
                onChange={(e) => setSleepQuality(parseInt(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Energy & Mood */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <Battery className="w-3.5 h-3.5 text-emerald-400" /> Energy Level
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">{energy}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={energy}
                onChange={(e) => setEnergy(parseInt(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <Smile className="w-3.5 h-3.5 text-cyan-400" /> Mood Score
                </span>
                <span className="text-xs font-mono font-bold text-cyan-400">{mood}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={mood}
                onChange={(e) => setMood(parseInt(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Main Goal */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-amber-400" /> Main Goal for Today
            </label>
            <input
              type="text"
              value={mainGoal}
              onChange={(e) => setMainGoal(e.target.value)}
              placeholder="What singular outcome makes today a win?"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Top 3 Priorities */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Top 3 Priorities
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={priority1}
                onChange={(e) => setPriority1(e.target.value)}
                placeholder="1. Primary Priority"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <input
                type="text"
                value={priority2}
                onChange={(e) => setPriority2(e.target.value)}
                placeholder="2. Secondary Priority"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <input
                type="text"
                value={priority3}
                onChange={(e) => setPriority3(e.target.value)}
                placeholder="3. Tertiary Priority"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
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
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-semibold shadow-md shadow-amber-600/30 transition-all"
            >
              Save Morning Check-In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
