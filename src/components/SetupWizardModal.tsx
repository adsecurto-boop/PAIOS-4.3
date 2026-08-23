import React, { useState } from 'react';
import {
  Sparkles,
  User,
  Clock,
  Compass,
  CheckCircle2,
  Cpu,
  Monitor,
  Smartphone,
  Zap,
  RefreshCw,
  X,
  ArrowRight,
  ArrowLeft,
  Bot,
  Layers,
  ShieldCheck,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { UserSettings, Task, StudyCard, Medication } from '../types';
import { PAIOSStorage, getTodayDateString } from '../storage';
import { sendClientGeminiChat } from '../geminiClient';

interface SetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (updated: Partial<UserSettings>) => void;
  onResetAllData?: () => void;
  onCompleteTour: () => void;
}

export const SetupWizardModal: React.FC<SetupWizardModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetAllData,
  onCompleteTour,
}) => {
  const [step, setStep] = useState<number>(1);

  // Step 1: Profile & Persona
  const [userName, setUserName] = useState<string>(settings.userName || 'Alex');
  const [userRole, setUserRole] = useState<string>('Software Quality & Automation Engineer');

  // Step 2: Life Schedule Parameters
  const [officeStart, setOfficeStart] = useState<string>(settings.officeStartTime || '13:00');
  const [officeEnd, setOfficeEnd] = useState<string>(settings.officeEndTime || '22:00');
  const [bedtime, setBedtime] = useState<string>(settings.bedtime || '00:00');
  const [wakeTime, setWakeTime] = useState<string>(settings.wakeTime || '07:30');
  const [isWorkday, setIsWorkday] = useState<boolean>(settings.isWorkday !== false);

  // Step 3: AI Assistant Setup Prompt & State
  const [aiPrompt, setAiPrompt] = useState<string>(
    'I work a 1:00 PM to 10:00 PM shift in Software Testing. I am preparing for ISTQB certification, learning Playwright automation, and taking daily morning health supplements.'
  );
  const [isAiConfiguring, setIsAiConfiguring] = useState<boolean>(false);
  const [aiSuggestions, setAiSuggestions] = useState<{
    goals: string[];
    suggestedTasks: string[];
    suggestedCards: string[];
  } | null>(null);

  // Step 4: Starter Data Template Presets
  const [selectedTemplate, setSelectedTemplate] = useState<string>('sdet_qa');

  // Confirmation Modal for Reset
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleAiAssistGeneration = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiConfiguring(true);

    try {
      const promptText = `
You are the AI Setup Assistant for PAIOS (Personal AI Operating System).
The user is configuring their PAIOS starting setup with the following user profile description:
"${aiPrompt}"

Respond ONLY with valid raw JSON object formatted as:
{
  "goals": ["Goal 1", "Goal 2", "Goal 3"],
  "suggestedTasks": ["Task 1", "Task 2", "Task 3"],
  "suggestedCards": ["Flashcard Question? -> Answer"]
}
      `.trim();

      const res = await sendClientGeminiChat({
        userText: promptText,
        customApiKey: settings.customApiKey,
      });

      const aiText = res.text || '';

      // Parse JSON from codeblock or raw response
      const cleanJson = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      setAiSuggestions({
        goals: parsed.goals || [],
        suggestedTasks: parsed.suggestedTasks || [],
        suggestedCards: parsed.suggestedCards || [],
      });
    } catch (err) {
      // Fallback default AI generated setup structure
      setAiSuggestions({
        goals: [
          'Master Playwright & Python Test Automation',
          'Pass ISTQB Advanced Level Exam with top score',
          'Maintain 100% daily medication adherence & health tracking',
        ],
        suggestedTasks: [
          'Set up Playwright test repository with Page Object Model',
          'Review ISTQB Chapter 2: Testing Throughout the SDLC',
          'Perform daily morning vitals & symptom log in PAIOS Health Vault',
        ],
        suggestedCards: [
          'What is the difference between Verification and Validation? -> Verification checks if software meets specifications; Validation checks if it meets user needs.',
          'What are the key HTTP response status code ranges? -> 2xx Success, 3xx Redirection, 4xx Client Error, 5xx Server Error.',
        ],
      });
    } finally {
      setIsAiConfiguring(false);
    }
  };

  const handleApplySetup = () => {
    // 1. Save updated settings
    const updatedGoals = aiSuggestions?.goals && aiSuggestions.goals.length > 0
      ? aiSuggestions.goals
      : [
          'Master Playwright & Python Test Automation',
          'Complete ISTQB Certification Exam Prep',
          'Maintain daily medication adherence & health tracking',
        ];

    onUpdateSettings({
      userName: userName.trim() || 'Alex',
      officeStartTime: officeStart,
      officeEndTime: officeEnd,
      bedtime,
      wakeTime,
      isWorkday,
      goals: updatedGoals,
      onboardingCompleted: true,
      autoUpdateOnCommit: true,
    });

    // 2. Apply starter template or AI generated tasks
    if (selectedTemplate === 'sdet_qa' || selectedTemplate === 'ai_assisted') {
      const tasksToAdd = aiSuggestions?.suggestedTasks || [
        'Complete ISTQB Practice Exam Chapter 1',
        'Configure Playwright CI/CD workflow in GitHub Actions',
        'Log morning health vitals & medication dose',
      ];

      tasksToAdd.forEach((tTitle, idx) => {
        PAIOSStorage.addTask(
          tTitle,
          idx === 0 ? 'Study' : idx === 1 ? 'Work' : 'Health',
          idx === 0,
          'Added via PAIOS Setup Wizard'
        );
      });

      if (aiSuggestions?.suggestedCards) {
        aiSuggestions.suggestedCards.forEach((c) => {
          const parts = c.split('->');
          PAIOSStorage.addStudyCard(
            'ISTQB & Software Engineering',
            parts[0]?.trim() || c,
            parts[1]?.trim() || 'Review documentation for details.'
          );
        });
      }
    } else if (selectedTemplate === 'academic') {
      PAIOSStorage.addTask(
        'Review Chapter 3 Lecture Notes & Flashcards',
        'Study',
        true,
        'Added via Academic Template'
      );
      PAIOSStorage.addStudyCard(
        'Study Principles',
        'What is Active Recall and Spaced Repetition?',
        'Active recall tests memory retrieval without looking at answers; spaced repetition intervals memory testing to maximize long-term retention.'
      );
    }

    // 3. Complete tour and notify parent
    onCompleteTour();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden my-auto">
        {/* Subtle Ambient Background Gradient Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-white shadow-lg shadow-indigo-500/20">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-lg sm:text-xl text-white flex items-center gap-2">
                PAIOS Setup & Onboarding Tour
                <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-full">
                  Step {step} of 5
                </span>
              </h2>
              <p className="text-xs text-slate-400">Personal AI Operating System Setup & Data Initialization</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Setup Wizard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Indicator */}
        <div className="flex items-center justify-between gap-1 sm:gap-2 relative z-10">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className={`w-full h-1.5 rounded-full transition-all duration-300 ${
                  s <= step
                    ? 'bg-gradient-to-r from-indigo-500 to-cyan-400 shadow-sm'
                    : 'bg-slate-800'
                }`}
              />
              <span
                className={`text-[10px] font-mono ${
                  s === step ? 'text-indigo-300 font-bold' : 'text-slate-500'
                }`}
              >
                {s === 1 ? 'Profile' : s === 2 ? 'Schedule' : s === 3 ? 'AI Assist' : s === 4 ? 'Templates' : 'Sync'}
              </span>
            </div>
          ))}
        </div>

        {/* STEP 1: Profile & Persona */}
        {step === 1 && (
          <div className="space-y-4 relative z-10 animate-fade-in">
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-400" />
                Step 1: Your Profile & Identity
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Welcome to PAIOS! Let's personalize your AI assistant with your name and primary role.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Your Display Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Primary Role or Goal Focus
                </label>
                <input
                  type="text"
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  placeholder="e.g. Software Engineer, QA Tester, Medical Student"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Life Schedule Parameters */}
        {step === 2 && (
          <div className="space-y-4 relative z-10 animate-fade-in">
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Step 2: Adaptive Schedule & Shift Parameters
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                PAIOS builds adaptive daily timetables based on your exact work shift, sleep schedule, and rest preferences.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Work Shift Start Time
                  </label>
                  <input
                    type="text"
                    value={officeStart}
                    onChange={(e) => setOfficeStart(e.target.value)}
                    placeholder="13:00"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Work Shift End Time
                  </label>
                  <input
                    type="text"
                    value={officeEnd}
                    onChange={(e) => setOfficeEnd(e.target.value)}
                    placeholder="22:00"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Bedtime Target
                  </label>
                  <input
                    type="text"
                    value={bedtime}
                    onChange={(e) => setBedtime(e.target.value)}
                    placeholder="00:00"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Wake Time Target
                  </label>
                  <input
                    type="text"
                    value={wakeTime}
                    onChange={(e) => setWakeTime(e.target.value)}
                    placeholder="07:30"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-300 font-medium">Today's Mode:</span>
                <button
                  type="button"
                  onClick={() => setIsWorkday(!isWorkday)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-colors ${
                    isWorkday
                      ? 'bg-indigo-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {isWorkday ? 'WORKDAY SHIFT' : 'REST / WEEK-OFF DAY'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: AI Assistant Setup */}
        {step === 3 && (
          <div className="space-y-4 relative z-10 animate-fade-in">
            <div className="bg-gradient-to-r from-slate-950 via-indigo-950/60 to-slate-950 p-4 rounded-2xl border border-indigo-500/30 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-400" />
                Step 3: AI-Assisted PAIOS Setup Generator
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Describe your daily routine or career goals, and AI will automatically generate your long-term goals, starter tasks, and study cards!
              </p>

              <div>
                <label className="block text-xs font-semibold text-indigo-300 mb-1">
                  Describe Your Routine or Goal Focus:
                </label>
                <textarea
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="button"
                onClick={handleAiAssistGeneration}
                disabled={isAiConfiguring}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                {isAiConfiguring ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                    <span>AI Generating Setup Plan...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Generate AI Custom Setup Plan</span>
                  </>
                )}
              </button>

              {aiSuggestions && (
                <div className="p-3 bg-slate-900/90 rounded-xl border border-emerald-500/40 space-y-2 mt-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>AI Generated PAIOS Configuration Ready!</span>
                  </div>
                  <div className="text-[11px] text-slate-300 space-y-1">
                    <div>
                      <strong className="text-indigo-300">Goals:</strong>{' '}
                      {aiSuggestions.goals.join(', ')}
                    </div>
                    <div>
                      <strong className="text-cyan-300">Initial Tasks:</strong>{' '}
                      {aiSuggestions.suggestedTasks.join(' • ')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Starter Data Template Presets */}
        {step === 4 && (
          <div className="space-y-4 relative z-10 animate-fade-in">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Step 4: Select Starting Template Bundle
              </h3>
              <p className="text-xs text-slate-300">
                Choose a pre-packaged starter data bundle or keep your AI generated setup.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setSelectedTemplate('sdet_qa')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    selectedTemplate === 'sdet_qa'
                      ? 'bg-indigo-950/70 border-indigo-500 shadow-md'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">Software QA & Automation</span>
                    {selectedTemplate === 'sdet_qa' && <Check className="w-4 h-4 text-indigo-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Playwright, ISTQB certification flashcards, SDET tasks, and medication regimen tracking.
                  </p>
                </div>

                <div
                  onClick={() => setSelectedTemplate('academic')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    selectedTemplate === 'academic'
                      ? 'bg-indigo-950/70 border-indigo-500 shadow-md'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">Student & Exam Prep</span>
                    {selectedTemplate === 'academic' && <Check className="w-4 h-4 text-indigo-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Study timers, spaced repetition decks, lecture summary notes, and study timetables.
                  </p>
                </div>

                <div
                  onClick={() => setSelectedTemplate('health_wellness')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    selectedTemplate === 'health_wellness'
                      ? 'bg-indigo-950/70 border-indigo-500 shadow-md'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">Health & Vitals Focus</span>
                    {selectedTemplate === 'health_wellness' && <Check className="w-4 h-4 text-indigo-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Prescription dose logs, blood pressure/vitals tracking, doctor contact vault.
                  </p>
                </div>

                <div
                  onClick={() => setSelectedTemplate('clean')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    selectedTemplate === 'clean'
                      ? 'bg-indigo-950/70 border-indigo-500 shadow-md'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">Minimal Clean Slate</span>
                    {selectedTemplate === 'clean' && <Check className="w-4 h-4 text-indigo-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Blank canvas ready for your custom input.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Desktop & Android Cross-Platform Sync Tour */}
        {step === 5 && (
          <div className="space-y-4 relative z-10 animate-fade-in">
            <div className="bg-gradient-to-r from-slate-950 via-cyan-950/40 to-slate-950 p-4 rounded-2xl border border-cyan-500/30 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-cyan-400" />
                Step 5: Cross-Platform Desktop & Android Auto-Sync
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Desktop & Web Version</h4>
                    <p className="text-[11px] text-slate-400">Win64 Executable & Web Dashboard</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Android Version</h4>
                    <p className="text-[11px] text-slate-400">Mobile PWA & Native Sync</p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-900/90 rounded-xl border border-indigo-500/30 text-xs text-slate-300 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <Zap className="w-4 h-4" />
                  <span>Automatic Git Commit & Version Sync</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Whenever a successful Git commit or code update occurs, PAIOS automatically synchronizes data state across all connected Desktop and Android devices!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modal Bottom Controls */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4 relative z-10">
          <div className="flex items-center gap-2">
            {onResetAllData && (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Reset All PAIOS Data"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Data</span>
              </button>
            )}

            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div>
            {step < 5 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
              >
                <span>Next Step</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleApplySetup}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/40 transition-all animate-pulse"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Complete Onboarding & Start PAIOS</span>
              </button>
            )}
          </div>
        </div>

        {/* Confirmation Modal for Resetting Data */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
            <div className="bg-slate-900 border border-rose-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3 text-rose-400">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="font-heading font-bold text-base text-white">Reset All PAIOS Data?</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                This will reset your tasks, study cards, timeline logs, and settings to clean factory defaults.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onResetAllData) onResetAllData();
                    setShowResetConfirm(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                >
                  Confirm Data Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
