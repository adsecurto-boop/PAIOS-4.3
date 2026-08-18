import React, { useState } from 'react';
import { X, Brain, Tag, Sparkles, Zap } from 'lucide-react';

interface StudyCardModalProps {
  onDismiss: () => void;
  onSave: (topic: string, question: string, answer: string) => void;
}

export const StudyCardModal: React.FC<StudyCardModalProps> = ({ onDismiss, onSave }) => {
  const [topic, setTopic] = useState('Software Testing');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    onSave(topic.trim() || 'General', question.trim(), answer.trim());
    onDismiss();
  };

  const handleAiGenerateCard = async (complexity: 'fast' | 'complex') => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/analyze-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Create a high-yield study flashcard question and answer pair for topic "${topic}".
Output MUST follow this EXACT JSON format (no extra text):
{"question": "The question text here", "answer": "The answer explanation here"}`,
          content: topic,
          taskComplexity: complexity,
        }),
      });
      const data = await res.json();
      if (data.success && data.resultText) {
        try {
          const jsonMatch = data.resultText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.question) setQuestion(parsed.question);
            if (parsed.answer) setAnswer(parsed.answer);
          } else {
            setQuestion(`Key concept in ${topic}?`);
            setAnswer(data.resultText);
          }
        } catch (e) {
          setAnswer(data.resultText);
        }
      }
    } catch (e) {
      console.error('AI Flashcard Generation Failed:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-purple-400">
            <Brain className="w-5 h-5" />
            <h3 className="font-heading font-bold text-lg text-white">New Active Recall Flashcard</h3>
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Subject / Topic
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAiGenerateCard('fast')}
                  disabled={isGenerating || !topic.trim()}
                  className="text-[10px] bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-amber-300 font-semibold px-2 py-0.5 rounded flex items-center gap-1 transition-all disabled:opacity-50"
                  title="Low-latency flashcard generation using gemini-3.1-flash-lite"
                >
                  <Zap className="w-3 h-3 text-amber-400" /> Fast AI
                </button>
                <button
                  type="button"
                  onClick={() => handleAiGenerateCard('complex')}
                  disabled={isGenerating || !topic.trim()}
                  className="text-[10px] bg-purple-950/80 hover:bg-purple-900 border border-purple-800 text-purple-300 font-semibold px-2 py-0.5 rounded flex items-center gap-1 transition-all disabled:opacity-50"
                  title="Deep reasoning flashcard using gemini-3.1-pro-preview with High Thinking"
                >
                  <Brain className="w-3 h-3 text-purple-400" /> High Thinking AI
                </button>
              </div>
            </div>
            <input
              type="text"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Software Testing, System Design, Algorithms..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Question / Concept Prompt *
            </label>
            <textarea
              rows={2}
              required
              autoFocus
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What question requires active recall?"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Answer / Explanation *
            </label>
            <textarea
              rows={3}
              required
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Comprehensive explanation or key bullet points..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
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
              disabled={!question.trim() || !answer.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white text-xs font-semibold shadow-md shadow-purple-600/30 transition-all disabled:opacity-50"
            >
              Save Flashcard
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
