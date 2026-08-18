import React from 'react';
import { Play, Pause, Square, Timer } from 'lucide-react';
import { ActivityLog } from '../types';

interface MiniTimerPlayerProps {
  activity: ActivityLog;
  elapsedSeconds: number;
  onPause: (id: number) => void;
  onResume: (id: number) => void;
  onFinish: (id: number) => void;
  onTap: () => void;
}

export const MiniTimerPlayer: React.FC<MiniTimerPlayerProps> = ({
  activity,
  elapsedSeconds,
  onPause,
  onResume,
  onFinish,
  onTap,
}) => {
  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="bg-indigo-950/90 border-t border-indigo-800/80 backdrop-blur-md px-4 py-2.5 text-slate-100 shadow-lg">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        <div
          onClick={onTap}
          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 hover:opacity-90 transition-opacity"
        >
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${activity.isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                {formatTime(elapsedSeconds)}
              </span>
              <span className="text-xs text-indigo-300 font-medium truncate max-w-[150px] sm:max-w-[300px]">
                {activity.activityName}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate font-mono">
              Category: {activity.category} &bull; {activity.isPaused ? 'Paused' : 'Active'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activity.isPaused ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onResume(activity.id);
              }}
              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              title="Resume Activity"
            >
              <Play className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPause(activity.id);
              }}
              className="p-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors"
              title="Pause Activity"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onFinish(activity.id);
            }}
            className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors flex items-center gap-1 text-xs font-medium px-2.5"
            title="Finish Activity"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Finish</span>
          </button>
        </div>
      </div>
    </div>
  );
};
