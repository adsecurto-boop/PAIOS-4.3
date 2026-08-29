import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Smile,
  Sparkles,
  Brain,
  Zap,
  Sun,
  Moon,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Database,
} from 'lucide-react';
import { JournalEntry } from '../types';
import { ContextCache } from '../core/memory/ContextCache';
import { ProgressComparator, ProgressComparisonResult } from '../core/journal/ProgressComparator';
import { MemoryDistiller } from '../core/memory/MemoryDistiller';
import { PAIOSStorage } from '../storage';

interface JournalScreenProps {
  entries: JournalEntry[];
  onAddJournalEntry: (title: string, content: string, moodScore: number, category: string) => void;
  onDeleteJournalEntry: (id: number) => void;
}

const CATEGORIES = ['Reflective', 'Personal', 'Work', 'Study', 'Goals', 'Gratitude'];

export const JournalScreen: React.FC<JournalScreenProps> = ({
  entries,
  onAddJournalEntry,
  onDeleteJournalEntry,
}) => {
  const [journalMode, setJournalMode] = useState<'morning_intent' | 'evening_review' | 'all'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [moodScore, setMoodScore] = useState(8);
  const [category, setCategory] = useState('Reflective');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ id: number; text: string; modelUsed: string; completionRate?: number } | null>(null);
  const [progressComparison, setProgressComparison] = useState<ProgressComparisonResult | null>(null);
  const [distilledSuccessMsg, setDistilledSuccessMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    // 1. Store raw reflection into Ephemeral Context Cache (48h device clock TTL)
    const contextCache = new ContextCache();
    contextCache.addEntry(
      `journal_reflection_${Date.now()}`,
      {
        title: title.trim(),
        content: content.trim(),
        moodScore,
        category,
        mode: journalMode,
      },
      'journal_raw',
      Date.now()
    );

    // 2. Invoke parent callback
    onAddJournalEntry(title.trim(), content.trim(), moodScore, category);

    // Reset Form
    setTitle('');
    setContent('');
    setShowAddForm(false);
  };

  const handleAiAnalyze = async (entry: JournalEntry, taskComplexity: 'fast' | 'complex') => {
    setIsAnalyzing(true);
    try {
      // 1. Run Progress Comparator against tasks & goals in storage
      const plannedTasks = PAIOSStorage.getTasks().map((t) => ({
        id: String(t.id),
        title: t.title,
        targetMinutes: 60,
        completed: t.status === 'COMPLETED',
      }));
      const comparisonResult = ProgressComparator.compareActualVsPlanned({
        journalText: `${entry.title}\n${entry.content}`,
        plannedTasks,
        activeGoals: [],
      });
      setProgressComparison(comparisonResult);

      // 2. Call AI analyze endpoint
      const res = await fetch('/api/ai/analyze-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt:
            taskComplexity === 'complex'
              ? 'Analyze this journal entry with deep reasoning. Extract key psychological insights, underlying personal growth themes, and 3 high-impact action steps for tomorrow.'
              : 'Summarize this journal entry quickly in 2-3 concise bullet points with low latency.',
          content: `${entry.title}\n${entry.content}`,
          taskComplexity,
        }),
      });

      const data = await res.json();
      if (data.success || data.resultText) {
        setAnalysisResult({
          id: entry.id,
          text: data.resultText || `Key Insight: Velocity achieved ${comparisonResult.completionRatePercent}% with ${comparisonResult.identifiedBlockers.length} blockers.`,
          modelUsed: data.modelUsed || (taskComplexity === 'complex' ? 'gemini-3.1-pro-preview' : 'gemini-2.5-flash'),
          completionRate: data.completionRate || comparisonResult.completionRatePercent,
        });
      }
    } catch (e) {
      console.error('AI Journal analysis error:', e);
      // Fallback local comparison insight
      const plannedTasks = PAIOSStorage.getTasks().map((t) => ({
        id: String(t.id),
        title: t.title,
        targetMinutes: 60,
        completed: t.status === 'COMPLETED',
      }));
      const comp = ProgressComparator.compareActualVsPlanned({
        journalText: `${entry.title}\n${entry.content}`,
        plannedTasks,
        activeGoals: [],
      });
      setProgressComparison(comp);
      setAnalysisResult({
        id: entry.id,
        text: `Key Insight: Velocity score ${comp.velocityScore}. Completion rate: ${comp.completionRatePercent}%.`,
        modelUsed: 'local-comparator',
        completionRate: comp.completionRatePercent,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDistillToLongTerm = (entry: JournalEntry) => {
    const memory = MemoryDistiller.distillEphemeralToLongTerm({
      journalText: `${entry.title}\n${entry.content}`,
      moodScore: entry.moodScore,
      completedTasksCount: PAIOSStorage.getTasks().filter((t) => t.status === 'COMPLETED').length,
      recordedAtMillis: entry.createdAtMillis,
    });
    setDistilledSuccessMsg(`Distilled into permanent long-term memory: ${memory.id}`);
    setTimeout(() => setDistilledSuccessMsg(null), 4000);
  };

  const handleDispatchBlockers = (comparison: ProgressComparisonResult) => {
    const count = ProgressComparator.dispatchBlockersToInboundPit(comparison.identifiedBlockers);
    alert(`Dispatched ${count} blocker(s) to PreContext Inbound Broker.`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-xl text-white">Reflective Journal</h2>
            <p className="text-xs text-slate-400">Capture long-form thoughts, achievements, and personal notes</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              data-testid="journal-tab-morning"
              onClick={() => setJournalMode('morning_intent')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                journalMode === 'morning_intent'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Morning Intent</span>
            </button>
            <button
              data-testid="journal-tab-evening"
              onClick={() => setJournalMode('evening_review')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                journalMode === 'evening_review'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Evening Review</span>
            </button>
            <button
              onClick={() => setJournalMode('all')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                journalMode === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-semibold text-xs shadow-md shadow-amber-600/30 flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? 'Cancel' : 'New Journal Entry'}</span>
          </button>
        </div>
      </div>

      {distilledSuccessMsg && (
        <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{distilledSuccessMsg}</span>
        </div>
      )}

      {/* Write New Entry Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-amber-900/50 rounded-2xl p-6 shadow-xl space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-base text-white">
              Write {journalMode === 'morning_intent' ? 'Morning Intent' : journalMode === 'evening_review' ? 'Evening Review' : 'New Entry'}
            </h3>
            <span className="text-[11px] text-amber-400/80 flex items-center gap-1 font-mono">
              <Layers className="w-3.5 h-3.5" /> 48h Context Cache TTL
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Entry Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Morning Focus Strategy, Weekly Review, or Major milestone"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Mood ({moodScore}/10)
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={moodScore}
                  onChange={(e) => setMoodScore(parseInt(e.target.value))}
                  className="w-full mt-2 accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Journal Content *
            </label>
            <textarea
              rows={5}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Reflect deeply on your day, learnings, achievements, or blockers encountered..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="submit"
              disabled={!title.trim() || !content.trim()}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md shadow-amber-600/30 transition-all disabled:opacity-50"
            >
              Save Entry
            </button>
          </div>
        </form>
      )}

      {/* Entries List */}
      {entries.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30 text-amber-400" />
          <p className="text-sm font-semibold">No journal entries yet</p>
          <p className="text-xs text-slate-500 mt-1">Start writing reflections to document your personal growth.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg space-y-3 transition-all group"
            >
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950 px-2.5 py-0.5 rounded border border-amber-900/50">
                    {entry.category}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {new Date(entry.createdAtMillis).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1">
                    <Smile className="w-3.5 h-3.5" /> Mood {entry.moodScore}/10
                  </span>
                  <button
                    onClick={() => onDeleteJournalEntry(entry.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete Entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="font-heading font-bold text-lg text-white">{entry.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{entry.content}</p>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAiAnalyze(entry, 'fast')}
                    disabled={isAnalyzing}
                    className="px-2.5 py-1 rounded-lg bg-amber-950/70 hover:bg-amber-900 border border-amber-800/80 text-amber-300 text-[11px] font-medium flex items-center gap-1.5 transition-all disabled:opacity-50"
                    title="Quick summary and velocity analysis"
                  >
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>AI Analyze</span>
                  </button>

                  <button
                    onClick={() => handleAiAnalyze(entry, 'complex')}
                    disabled={isAnalyzing}
                    className="px-2.5 py-1 rounded-lg bg-purple-950/70 hover:bg-purple-900 border border-purple-800/80 text-purple-300 text-[11px] font-medium flex items-center gap-1.5 transition-all disabled:opacity-50"
                    title="Deep reasoning & action plan"
                  >
                    <Brain className="w-3 h-3 text-purple-400" />
                    <span>Deep Reasoning Insights</span>
                  </button>

                  <button
                    onClick={() => handleDistillToLongTerm(entry)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 text-[11px] font-medium flex items-center gap-1.5 transition-all"
                    title="Distill to permanent immutable long-term memory"
                  >
                    <Database className="w-3 h-3 text-emerald-400" />
                    <span>Distill to Long-Term Memory</span>
                  </button>
                </div>

                {analysisResult && analysisResult.id === entry.id && (
                  <button
                    onClick={() => {
                      setAnalysisResult(null);
                      setProgressComparison(null);
                    }}
                    className="text-[10px] text-slate-500 hover:text-slate-300"
                  >
                    Dismiss Analysis
                  </button>
                )}
              </div>

              {/* Analysis & Progress Result Box */}
              {analysisResult && analysisResult.id === entry.id && (
                <div className="mt-3 p-4 bg-slate-950 border border-indigo-900/80 rounded-xl space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold text-indigo-400">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Gemini Intelligence & Progress Comparator
                    </span>
                    <span className="text-[10px] bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800/80 text-indigo-300">
                      {analysisResult.modelUsed}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                    {analysisResult.text}
                  </p>

                  {/* Progress Comparison Metrics Card */}
                  {progressComparison && (
                    <div className="pt-2 border-t border-slate-800/80 space-y-2">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Planned Hours</span>
                          <span className="font-mono font-bold text-slate-200">{progressComparison.plannedHours}h</span>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Actual Hours</span>
                          <span className="font-mono font-bold text-slate-200">{progressComparison.actualHours}h</span>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Completion</span>
                          <span className="font-mono font-bold text-amber-400">{progressComparison.completionRatePercent}%</span>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Velocity Score</span>
                          <span className="font-mono font-bold text-emerald-400">{progressComparison.velocityScore}</span>
                        </div>
                      </div>

                      {progressComparison.identifiedBlockers.length > 0 && (
                        <div className="bg-rose-950/40 border border-rose-900/60 rounded-lg p-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-rose-300 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                              Identified Blockers ({progressComparison.identifiedBlockers.length})
                            </span>
                            <button
                              onClick={() => handleDispatchBlockers(progressComparison)}
                              className="text-[10px] bg-rose-900 hover:bg-rose-800 text-rose-200 px-2 py-0.5 rounded font-medium transition-colors"
                            >
                              Dispatch to Inbound PIT
                            </button>
                          </div>
                          {progressComparison.identifiedBlockers.map((b) => (
                            <div key={b.id} className="text-[11px] text-rose-200/90 flex items-start gap-1">
                              <span>•</span>
                              <span>{b.description}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
