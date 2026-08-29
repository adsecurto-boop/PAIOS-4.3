import React, { useState } from 'react';
import { Target, CheckCircle2, ArrowRight, Sparkles, Brain, Shield, ChevronRight } from 'lucide-react';
import { GoalExtractor, ParsedGoal } from '../core/ai/GoalExtractor';
import { PAIOSStorage } from '../storage';

export interface OnboardingScreenProps {
  onCompleteOnboarding: (goals: ParsedGoal[]) => void;
  userName?: string;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onCompleteOnboarding,
  userName = 'Alex',
}) => {
  const [step, setStep] = useState<'GOAL_PROBE' | 'DOD_REVIEW' | 'COMPLETE'>('GOAL_PROBE');
  const [goalInput, setGoalInput] = useState('');
  const [extractedGoals, setExtractedGoals] = useState<ParsedGoal[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProbeGoals = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalInput.trim()) return;

    setIsProcessing(true);

    try {
      // Conversational Goal Probing with offline safety
      const goals = GoalExtractor.extractGoalsFromConversation(goalInput);
      setExtractedGoals(goals);
      setStep('DOD_REVIEW');
    } catch (err) {
      console.warn('[Onboarding] Goal extraction fallback:', err);
      // Fallback goal if parsing fails
      const fallbackGoal: ParsedGoal = {
        id: `goal_${Date.now()}`,
        title: goalInput.trim(),
        category: 'Career',
        definitionOfDone: `Complete key milestones for "${goalInput.trim()}".`,
        milestones: GoalExtractor.generateMilestones(goalInput.trim(), 'Achieve primary goal'),
        priority: 'HIGH',
        createdAtMillis: Date.now(),
      };
      setExtractedGoals([fallbackGoal]);
      setStep('DOD_REVIEW');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalizeOnboarding = () => {
    try {
      // 1. Get existing goals immutably
      const existingRaw = PAIOSStorage.getItem<ParsedGoal[]>('paios_goals', []);
      const existing = Array.isArray(existingRaw) ? existingRaw : [];

      // 2. Merge goals immutably
      const updatedGoals = GoalExtractor.mergeGoalsImmutably(existing, extractedGoals);

      // 3. Persist to storage without mutating parent input objects
      PAIOSStorage.setItem('paios_goals', updatedGoals);

      // 4. Update user settings goals string list
      const settings = PAIOSStorage.getSettings();
      const newGoalTitles = extractedGoals.map((g) => g.title);
      const mergedTitles = Array.from(new Set([...newGoalTitles, ...(settings.goals || [])]));
      PAIOSStorage.saveSettings({ ...settings, goals: mergedTitles });

      setStep('COMPLETE');
      onCompleteOnboarding(updatedGoals);
    } catch (err) {
      console.error('[Onboarding] Storage save error:', err);
      onCompleteOnboarding(extractedGoals);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 select-none pt-safe pb-safe safe-area-left safe-area-right">
      {/* Header */}
      <div className="w-full max-w-2xl mx-auto text-center pt-4 sm:pt-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-xl shadow-indigo-500/20 mb-4 animate-bounce">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
          Welcome to PAIOS 5.0, {userName}!
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
          Your Personal AI Operating System needs to align with your high-impact long-term goals.
        </p>
      </div>

      {/* Card Content Container */}
      <div className="w-full max-w-xl mx-auto my-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        {step === 'GOAL_PROBE' && (
          <form onSubmit={handleProbeGoals} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-400" />
                <span>What are your top goals right now?</span>
              </label>
              <p className="text-xs text-slate-400 leading-relaxed">
                Describe what you want to achieve (e.g., "Pass ISTQB CTFL certification, build PAIOS, and master Playwright automation").
              </p>
            </div>

            <textarea
              required
              rows={4}
              placeholder="e.g. Become an SDET lead, pass ISTQB CTFL certification test next month, and build automated PAIOS testing suite..."
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
            />

            <button
              type="submit"
              disabled={isProcessing || !goalInput.trim()}
              className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Probe & Breakdown Goals</span>
              <Sparkles className="w-4 h-4" />
            </button>
          </form>
        )}

        {step === 'DOD_REVIEW' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Extracted Goals & Definition of Done</span>
              </h3>
              <span className="text-xs font-mono text-indigo-400 bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-800/60">
                {extractedGoals.length} Goal{extractedGoals.length > 1 ? 's' : ''} Identified
              </span>
            </div>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {extractedGoals.map((goal, i) => (
                <div key={goal.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-sm text-slate-100">
                      {i + 1}. {goal.title}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/60 shrink-0">
                      {goal.category}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                    <strong className="text-slate-300 font-medium">Definition of Done: </strong>
                    {goal.definitionOfDone}
                  </div>

                  <div className="pt-1">
                    <span className="text-[11px] font-medium text-slate-400 block mb-1">Milestones:</span>
                    <div className="space-y-1">
                      {goal.milestones.map((ms) => (
                        <div key={ms.id} className="text-xs text-slate-400 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                          <span>{ms.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleFinalizeOnboarding}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
            >
              <span>Confirm & Activate Workspace</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 'COMPLETE' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Onboarding Complete!</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your goals are now active in PAIOS memory. The adaptive timetable engine will prioritize daily tasks to help you reach them.
            </p>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="w-full max-w-2xl mx-auto text-center pb-4 text-xs text-slate-500 flex items-center justify-center gap-1.5">
        <Shield className="w-3.5 h-3.5 text-slate-600" />
        <span>PAIOS 5.0 &bull; Goal Probing & Adaptive Intelligence Engine</span>
      </div>
    </div>
  );
};

export default OnboardingScreen;
