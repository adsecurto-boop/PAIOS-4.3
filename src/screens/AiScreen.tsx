import React, { useState, useRef, useEffect } from 'react';
import { Cpu, Send, Bot, User, Sparkles, Check, Play, Zap, RefreshCw, Copy, Shield, Code, HeartPulse, Lightbulb, ChevronDown, Brain } from 'lucide-react';
import { AiChatMessage } from '../types';

export type ChatRole = 'productivity' | 'sdet_mentor' | 'health_specialist' | 'creative_coach';
export type TaskComplexityMode = 'general' | 'complex' | 'fast';

interface AiScreenProps {
  messages: AiChatMessage[];
  userContextString: string;
  onSendMessage: (userText: string, options?: { role?: ChatRole; taskComplexity?: TaskComplexityMode }) => Promise<void>;
  onExecuteAction: (actionType: string, actionPayloadJson: string) => void;
  onClearHistory?: () => void;
}

export const AiScreen: React.FC<AiScreenProps> = ({
  messages,
  userContextString,
  onSendMessage,
  onExecuteAction,
  onClearHistory,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeRole, setActiveRole] = useState<ChatRole>('productivity');
  const [taskComplexity, setTaskComplexity] = useState<TaskComplexityMode>('general');
  const [executedActionIds, setExecutedActionIds] = useState<number[]>([]);
  const [copiedMsgId, setCopiedMsgId] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;
    const text = inputText.trim();
    setInputText('');
    setIsSending(true);
    try {
      await onSendMessage(text, { role: activeRole, taskComplexity });
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleExecute = (msgId: number, type: string, payloadJson: string) => {
    onExecuteAction(type, payloadJson);
    setExecutedActionIds((prev) => [...prev, msgId]);
  };

  const handleCopyText = (msgId: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // Roles Metadata
  const roleConfigs = {
    productivity: {
      name: 'Productivity OS',
      icon: Cpu,
      badge: 'PAIOS Core',
      color: 'from-indigo-500 to-cyan-500',
      description: 'Context-aware time blocking, task priorities, and schedule optimization.',
      starters: [
        'Summarize my top schedule priorities for today',
        'Add a task to finish Playwright test cases by 5 PM',
        'Start a 45-minute Deep Work focus activity timer',
      ],
    },
    sdet_mentor: {
      name: 'SDET & ISTQB Mentor',
      icon: Code,
      badge: 'QA Automation',
      color: 'from-purple-500 to-indigo-500',
      description: 'ISTQB CTFL study guide, Playwright/Python code reviews, and test strategies.',
      starters: [
        'Quiz me on ISTQB Equivalence Partitioning vs Boundary Value Analysis',
        'Write a Playwright TypeScript snippet for page object login automation',
        'Help me structure test cases for an API authentication endpoint',
      ],
    },
    health_specialist: {
      name: 'Health Companion',
      icon: HeartPulse,
      badge: 'Wellness',
      color: 'from-rose-500 to-amber-500',
      description: 'Medication tracking, symptom logs, refill alerts, and non-prescriptive guidance.',
      starters: [
        'Check my medication schedule and refill inventory status',
        'Log a mild dizziness symptom with severity 3/10',
        'What is standard FDA advice if I miss a scheduled dose?',
      ],
    },
    creative_coach: {
      name: 'Creative Coach',
      icon: Lightbulb,
      badge: 'Goal Execution',
      color: 'from-emerald-500 to-teal-500',
      description: 'High-impact brainstorming, career growth milestones, and habit design.',
      starters: [
        'Brainstorm 3 project ideas to showcase SDET expertise',
        'How can I optimize my daily evening review for better learning retention?',
        'Help me outline a 4-week roadmap to build an automated testing suite',
      ],
    },
  };

  // Model Metadata according to task complexity
  const modelTierInfo = {
    fast: {
      modelName: 'gemini-3.1-flash-lite',
      label: '⚡ Fast Tasks',
      desc: 'Ultra-low latency for quick Q&A and task entries',
    },
    general: {
      modelName: 'gemini-3.5-flash',
      label: '🤖 General Tasks',
      desc: 'Balanced model for daily planning & productivity',
    },
    complex: {
      modelName: 'gemini-3.1-pro-preview',
      label: '🧠 Complex Tasks',
      desc: 'Deep reasoning for complex strategy & code',
    },
  };

  const currentRole = roleConfigs[activeRole];
  const ActiveRoleIcon = currentRole.icon;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-h-[820px] bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/90 backdrop-blur flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${currentRole.color} flex items-center justify-center text-white shadow-md`}>
            <ActiveRoleIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-bold text-base text-white">Gemini Multi-Turn Chatbot</h2>
              <span className="text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800/80 px-2 py-0.5 rounded-full">
                {modelTierInfo[taskComplexity].modelName}
              </span>
              {taskComplexity === 'complex' && (
                <span className="text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-700/80 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <Brain className="w-3 h-3 text-purple-400" /> High Thinking
                </span>
              )}
              {taskComplexity === 'fast' && (
                <span className="text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" /> Low Latency
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">{currentRole.description}</p>
          </div>
        </div>

        {/* Controls: Persona & Model Selection */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Persona Selector */}
          <div className="relative">
            <select
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value as ChatRole)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer pr-7"
            >
              <option value="productivity">🎯 Productivity OS</option>
              <option value="sdet_mentor">🧪 SDET & ISTQB Mentor</option>
              <option value="health_specialist">🩺 Health Companion</option>
              <option value="creative_coach">💡 Creative Coach</option>
            </select>
          </div>

          {/* Task Complexity / Model Tier Selector */}
          <div className="relative">
            <select
              value={taskComplexity}
              onChange={(e) => setTaskComplexity(e.target.value as TaskComplexityMode)}
              className="bg-slate-900 border border-indigo-900/80 text-indigo-300 text-xs font-mono font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="general">🤖 General (3.5 Flash)</option>
              <option value="complex">🧠 Complex (3.1 Pro)</option>
              <option value="fast">⚡ Fast (3.1 Flash-Lite)</option>
            </select>
          </div>

          {/* Clear Thread Button */}
          {onClearHistory && messages.length > 0 && (
            <button
              onClick={onClearHistory}
              title="Start a new chat session"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 hover:text-rose-300 text-slate-400 border border-slate-700 transition-colors text-xs flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages Thread Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
        {messages.length === 0 ? (
          <div className="text-center py-10 px-4 text-slate-400 space-y-4 max-w-lg mx-auto">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${currentRole.color} p-0.5 mx-auto shadow-lg shadow-indigo-500/10`}>
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-indigo-400">
                <Sparkles className="w-7 h-7" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-heading">
                Connected to Gemini Chatbot ({currentRole.name})
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Multi-turn conversation active. Asking in <span className="text-indigo-300 font-mono font-semibold">{modelTierInfo[taskComplexity].label}</span> mode.
              </p>
            </div>

            {/* Suggested Starter Prompts */}
            <div className="space-y-2 pt-2 text-left">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block text-center">
                Suggested Prompts ({currentRole.badge}):
              </span>
              <div className="grid gap-2">
                {currentRole.starters.map((starter, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputText(starter)}
                    className="text-xs text-slate-300 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/80 p-2.5 rounded-xl text-left transition-all flex items-center justify-between group"
                  >
                    <span>&ldquo;{starter}&rdquo;</span>
                    <Send className="w-3.5 h-3.5 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${msg.isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                  msg.isUser
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-950 text-cyan-400 border border-indigo-900/60 shadow-md'
                }`}
              >
                {msg.isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Content Bubble */}
              <div className="space-y-2 max-w-[88%] sm:max-w-[80%]">
                <div
                  className={`relative group p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.isUser
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-900/20'
                      : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none whitespace-pre-line shadow-slate-950'
                  }`}
                >
                  {/* Sender Metadata Bar for Bot */}
                  {!msg.isUser && (
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-2 pb-1.5 border-b border-slate-800/80">
                      <span className="flex items-center gap-1 text-indigo-400 font-semibold">
                        <Sparkles className="w-3 h-3" /> Gemini Assistant
                      </span>
                      <div className="flex items-center gap-2">
                        {msg.timestampMillis && (
                          <span>{new Date(msg.timestampMillis).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                        <button
                          onClick={() => handleCopyText(msg.id, msg.text)}
                          className="text-slate-400 hover:text-white transition-colors"
                          title="Copy response"
                        >
                          {copiedMsgId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {msg.text}

                  {/* User Timestamp */}
                  {msg.isUser && msg.timestampMillis && (
                    <div className="text-[10px] font-mono text-indigo-200/80 text-right mt-1.5">
                      {new Date(msg.timestampMillis).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>

                {/* Structured Action Execution Block */}
                {!msg.isUser && msg.actionType && msg.actionPayloadJson && (
                  <div className="bg-slate-950 border border-indigo-900/80 p-3.5 rounded-xl space-y-2 shadow-xl">
                    <div className="flex items-center justify-between text-[11px] font-mono font-bold text-indigo-400">
                      <span className="flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-400" /> Suggested Action: {msg.actionType}
                      </span>
                    </div>

                    <pre className="text-[10px] font-mono text-slate-300 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 overflow-x-auto">
                      {msg.actionPayloadJson}
                    </pre>

                    {executedActionIds.includes(msg.id) || msg.isActionConfirmed ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold pt-1">
                        <Check className="w-4 h-4" /> Action Executed & Saved
                      </div>
                    ) : (
                      <button
                        onClick={() => handleExecute(msg.id, msg.actionType!, msg.actionPayloadJson!)}
                        className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-md"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Execute PAIOS Action
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Typing Indicator */}
        {isSending && (
          <div className="flex items-center gap-3 text-xs font-mono text-indigo-400 p-2 bg-slate-950/60 rounded-xl border border-indigo-900/40 w-fit">
            <Bot className="w-4 h-4 animate-bounce text-cyan-400" />
            <span className="flex items-center gap-1">
              Gemini ({modelTierInfo[taskComplexity].modelName}) is thinking...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-950/90 backdrop-blur flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Ask ${currentRole.name} using Gemini...`}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50 flex items-center justify-center shrink-0 shadow-md"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

