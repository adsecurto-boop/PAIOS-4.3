import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  ListTodo,
  Layers,
  Flag,
  Check,
  Compass,
  Cpu,
} from 'lucide-react';
import { PAIOSStorage } from '../storage';
import { GoalExtractor, ExtractedGoal, Goal } from '../core/ai/GoalExtractor';
import { PriorityLevel } from '../types';

export interface OnboardingScreenProps {
  onComplete: () => void;
  userName?: string;
}

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: number;
}

const QUICK_STARTERS = [
  {
    title: 'SDET & Software Automation Career',
    prompt: 'My goal is to become a Lead SDET. Definition of done is passing ISTQB certification and landing a Senior SDET role. Sub-projects: 1. Master Playwright & Python automation 2. Build end-to-end CI/CD test harness 3. Complete ISTQB Advanced test syllabus. Priority: HIGH',
  },
  {
    title: 'Ship Full-Stack AI Application (PAIOS 5.0)',
    prompt: 'My goal is to build and deploy PAIOS 5.0. Definition of done is shipping desktop and web version with offline SQLite sync and passing 100% ATDD tests. Sub-projects: 1. SQLite & JWT Auth layer 2. Conversational Onboarding 3. Health & Medication Hub. Priority: CRITICAL',
  },
  {
    title: 'Health, Focus & Routine Optimization',
    prompt: 'My goal is to achieve daily peak focus and physical well-being. Definition of done is logging 4+ hours deep work daily, zero missed medication doses, and consistent sleep schedule. Sub-projects: 1. Daily morning check-in & evening review 2. Medication adherence tracking 3. Regular cardio exercise. Priority: HIGH',
  },
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete, userName = 'Alex' }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg_welcome',
      sender: 'ai',
      text: `Hello ${userName}! Welcome to PAIOS 5.0 — your Personal AI Operating System. Let's calibrate your workspace by discovering your primary goals, Definition of Done, and milestones. What is the most important goal you want to conquer?`,
      timestamp: Date.now(),
    },
  ]);

  const [inputVal, setInputVal] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedGoals, setExtractedGoals] = useState<Goal[]>([]);
  const [currentExtracted, setCurrentExtracted] = useState<ExtractedGoal>({
    title: '',
    projects: [],
    definitionOfDone: '',
    priority: 'HIGH',
    category: 'Work',
    isComplete: false,
    missingFields: ['title', 'definitionOfDone', 'projects'],
  });

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof chatBottomRef.current?.scrollIntoView === 'function') {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (userTextToSend?: string) => {
    const text = (userTextToSend !== undefined ? userTextToSend : inputVal).trim();
    if (!text || isProcessing) return;

    if (!userTextToSend) {
      setInputVal('');
    }

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsProcessing(true);

    try {
      // 1. Run conversational goal extractor
      const extracted = GoalExtractor.extractGoalFromConversation(newHistory);
      setCurrentExtracted(extracted);

      let aiReplyText = '';

      if (extracted.isComplete) {
        const normalized = GoalExtractor.normalizeGoal(extracted);
        // Check if goal already in list
        const exists = extractedGoals.some(
          (g) => g.title.toLowerCase() === normalized.title.toLowerCase()
        );
        if (!exists) {
          setExtractedGoals((prev) => [...prev, normalized]);
        }

        aiReplyText = `Terrific! I've structured your goal: "${extracted.title}" with ${extracted.projects.length} milestones and a defined Definition of Done.\n\nDefinition of Done: ${extracted.definitionOfDone}\nPriority: ${extracted.priority}\n\nWould you like to add another goal, or proceed to your workspace?`;
      } else {
        const probe = GoalExtractor.probeMissingGoalDetails(extracted);
        aiReplyText = probe || 'Could you provide more details about your goal milestones and success criteria?';
      }

      const aiMsg: Message = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: aiReplyText,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('Goal extraction error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyStarter = (starterPrompt: string) => {
    handleSendMessage(starterPrompt);
  };

  const handleConfirmAndFinish = () => {
    const currentSettings = PAIOSStorage.getSettings();
    const finalGoalStrings = extractedGoals.map((g) => {
      const projectsStr = g.projects
        .map((p) => (typeof p === 'string' ? p : p.title))
        .join(', ');
      return `${g.title} (DoD: ${g.definitionOfDone} | Projects: ${projectsStr})`;
    });

    // Fallback if none created yet
    if (finalGoalStrings.length === 0 && currentExtracted.title) {
      finalGoalStrings.push(
        `${currentExtracted.title} (DoD: ${currentExtracted.definitionOfDone || 'Complete milestones'} | Priority: ${currentExtracted.priority})`
      );
    } else if (finalGoalStrings.length === 0) {
      finalGoalStrings.push(
        'Lead SDET & Automation Mastery',
        'Ship PAIOS 5.0 Desktop & Web Platform',
        'Daily Focus & Adherence Routine'
      );
    }

    // Persist to Settings
    PAIOSStorage.saveSettings({
      ...currentSettings,
      goals: finalGoalStrings,
      onboardingCompleted: true,
    });

    // Also seed starter tasks for identified projects
    extractedGoals.forEach((g) => {
      g.projects.forEach((proj) => {
        const title = typeof proj === 'string' ? proj : proj.title;
        PAIOSStorage.addTask(title, g.category || 'Work', g.priority === 'CRITICAL' || g.priority === 'HIGH', `Sub-project for goal: ${g.title}`);
      });
    });

    onComplete();
  };

  const handleSkip = () => {
    const currentSettings = PAIOSStorage.getSettings();
    PAIOSStorage.saveSettings({
      ...currentSettings,
      onboardingCompleted: true,
    });
    onComplete();
  };

  return (
    <div
      id="onboarding-screen-container"
      data-testid="onboarding-screen"
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8 selection:bg-indigo-500 selection:text-white"
    >
      {/* Top Header */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">PAIOS 5.0 Goal Discovery</h1>
            <p className="text-xs text-slate-400">Conversational calibration & immutability setup</p>
          </div>
        </div>

        <button
          id="onboarding-skip-btn"
          data-testid="onboarding-skip-btn"
          onClick={handleSkip}
          className="text-xs font-medium text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors"
        >
          Skip to Dashboard
        </button>
      </div>

      {/* Main Grid: Chat on Left, Extracted Goal Card on Right */}
      <div className="max-w-6xl w-full mx-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 overflow-hidden">
        {/* Left Column: Chat Conversation */}
        <div className="lg:col-span-7 flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {/* Quick Starters Carousel */}
          <div className="p-3 bg-slate-950/60 border-b border-slate-800">
            <div className="flex items-center space-x-2 text-xs text-slate-400 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold text-slate-300">Quick Ambition Starters:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_STARTERS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleApplyStarter(s.prompt)}
                  className="text-xs px-3 py-1.5 bg-slate-800/80 hover:bg-indigo-600/30 hover:border-indigo-500/50 border border-slate-700/80 rounded-lg text-slate-200 text-left transition-all"
                >
                  {s.title}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[420px]" data-testid="onboarding-chat-messages">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/20'
                      : 'bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-slate-800/90 text-slate-400 border border-slate-700/80 rounded-2xl rounded-bl-none px-4 py-2.5 text-xs flex items-center space-x-2 animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                  <span>Analyzing goal parameters & Definition of Done...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input Field */}
          <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center space-x-2">
            <input
              id="onboarding-chat-input"
              data-testid="onboarding-chat-input"
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder="Type your goal, milestones, or Definition of Done..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              id="onboarding-send-btn"
              data-testid="onboarding-send-btn"
              onClick={() => handleSendMessage()}
              disabled={!inputVal.trim() || isProcessing}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl shadow-md shadow-indigo-600/30 transition-all cursor-pointer disabled:cursor-not-allowed"
              aria-label="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Column: Live Discovered Goal Extraction Card */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Active Goal Extractor Preview */}
          <div
            id="extracted-goal-card"
            data-testid="extracted-goal-card"
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex-1 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Compass className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Goal Telemetry</h3>
                </div>
                {currentExtracted.isComplete ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                    <Check className="w-3 h-3" />
                    <span>Complete</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Probing Info</span>
                  </span>
                )}
              </div>

              {/* Goal Title */}
              <div className="mt-4">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Primary Objective / Goal
                </label>
                <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-medium text-slate-100">
                  {currentExtracted.title || <span className="text-slate-600 italic">Awaiting goal statement...</span>}
                </div>
              </div>

              {/* Definition of Done */}
              <div className="mt-3">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Definition of Done (DoD)
                </label>
                <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300">
                  {currentExtracted.definitionOfDone || (
                    <span className="text-slate-600 italic">Awaiting success criteria / metric...</span>
                  )}
                </div>
              </div>

              {/* Sub-Projects / Milestones */}
              <div className="mt-3">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Actionable Milestones ({currentExtracted.projects.length})
                </label>
                <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 space-y-1.5 max-h-36 overflow-y-auto">
                  {currentExtracted.projects.length > 0 ? (
                    currentExtracted.projects.map((p, idx) => (
                      <div key={idx} className="flex items-center space-x-2 text-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        <span>{p}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-600 italic">No sub-projects identified yet.</span>
                  )}
                </div>
              </div>

              {/* Priority & Category Badge */}
              <div className="mt-3 flex items-center space-x-3">
                <div className="flex-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Priority
                  </label>
                  <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-950/60 border border-indigo-700/60 text-indigo-300">
                    {currentExtracted.priority || 'NORMAL'}
                  </span>
                </div>
                <div className="flex-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Domain
                  </label>
                  <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300">
                    {currentExtracted.category || 'Work'}
                  </span>
                </div>
              </div>
            </div>

            {/* Discovered Goals Count */}
            <div className="mt-6 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                <span>Confirmed Workspace Goals:</span>
                <span className="font-bold text-white">{extractedGoals.length}</span>
              </div>
              <button
                id="onboarding-finish-btn"
                data-testid="onboarding-finish-btn"
                onClick={handleConfirmAndFinish}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <span>Confirm Goals & Enter PAIOS</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingScreen;
