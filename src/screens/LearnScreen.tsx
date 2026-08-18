import React, { useState } from 'react';
import { Brain, Plus, Play, RotateCw, CheckCircle, Award, Trash2, Eye, EyeOff, Sparkles } from 'lucide-react';
import { StudyCard } from '../types';

interface LearnScreenProps {
  studyCards: StudyCard[];
  onStartStudySession: (topic: string, durationMins: number) => void;
  onReviewStudyCard: (cardId: number, rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY') => void;
  onDeleteStudyCard: (id: number) => void;
  onOpenAddCard: () => void;
}

export const LearnScreen: React.FC<LearnScreenProps> = ({
  studyCards,
  onStartStudySession,
  onReviewStudyCard,
  onDeleteStudyCard,
  onOpenAddCard,
}) => {
  const [activeCardIndex, setActiveCardIndex] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('ALL');

  const topics = ['ALL', ...Array.from(new Set(studyCards.map((c) => c.topic)))];

  const filteredCards = studyCards.filter((c) => {
    if (selectedTopic === 'ALL') return true;
    return c.topic === selectedTopic;
  });

  const currentCard = activeCardIndex !== null && filteredCards[activeCardIndex] ? filteredCards[activeCardIndex] : null;

  const handleNextCard = (rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY') => {
    if (currentCard) {
      onReviewStudyCard(currentCard.id, rating);
    }
    setShowAnswer(false);
    if (activeCardIndex !== null && activeCardIndex < filteredCards.length - 1) {
      setActiveCardIndex(activeCardIndex + 1);
    } else {
      setActiveCardIndex(null); // Finished drill
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-xl text-white">Active Recall & Learning</h2>
            <p className="text-xs text-slate-400">Master concepts faster using spaced repetition flashcards</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAddCard}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold text-xs shadow-md shadow-purple-600/30 flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Flashcard</span>
          </button>
        </div>
      </div>

      {/* Active Drill Card View */}
      {currentCard ? (
        <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/50 border border-purple-800/60 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-mono font-bold text-purple-400 bg-purple-950 px-2.5 py-1 rounded-lg border border-purple-800/60">
              {currentCard.topic}
            </span>
            <span className="text-xs font-mono text-slate-400">
              Card {activeCardIndex! + 1} of {filteredCards.length}
            </span>
          </div>

          <div className="py-8 text-center space-y-4">
            <h3 className="text-xl sm:text-2xl font-heading font-bold text-white max-w-xl mx-auto leading-relaxed">
              {currentCard.question}
            </h3>

            {showAnswer ? (
              <div className="p-5 rounded-2xl bg-slate-950 border border-purple-900/60 text-slate-200 text-sm max-w-xl mx-auto text-left leading-relaxed shadow-inner animate-in fade-in duration-200 whitespace-pre-line">
                <span className="text-xs font-mono font-semibold uppercase text-purple-400 block mb-2">
                  Answer / Explanation
                </span>
                {currentCard.answer}
              </div>
            ) : (
              <button
                onClick={() => setShowAnswer(true)}
                className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all shadow-lg shadow-purple-600/20 inline-flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                <span>Show Answer</span>
              </button>
            )}
          </div>

          {/* Rating Buttons */}
          {showAnswer && (
            <div className="pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                onClick={() => handleNextCard('AGAIN')}
                className="py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-semibold text-xs transition-colors"
              >
                Again (Hard)
              </button>
              <button
                onClick={() => handleNextCard('HARD')}
                className="py-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 font-semibold text-xs transition-colors"
              >
                Hard
              </button>
              <button
                onClick={() => handleNextCard('GOOD')}
                className="py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold text-xs transition-colors"
              >
                Good
              </button>
              <button
                onClick={() => handleNextCard('EASY')}
                className="py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-semibold text-xs transition-colors"
              >
                Easy (Mastered)
              </button>
            </div>
          )}
        </section>
      ) : (
        /* Start Quiz Launcher Hero */
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="font-heading font-bold text-lg text-white">Active Recall Practice Drill</h3>
            </div>
            <p className="text-xs text-slate-300 max-w-md">
              Test your knowledge on key software testing, system design, and study topics to boost long-term memory retention.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              disabled={filteredCards.length === 0}
              onClick={() => {
                setActiveCardIndex(0);
                setShowAnswer(false);
              }}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50 flex items-center gap-2 shrink-0"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Recall Session ({filteredCards.length} cards)</span>
            </button>
          </div>
        </section>
      )}

      {/* Topic Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <span className="text-xs text-slate-400 font-mono mr-1">Topic:</span>
        {topics.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedTopic(t)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              selectedTopic === t
                ? 'bg-purple-600 text-white font-semibold'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Cards List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCards.map((card) => (
          <div
            key={card.id}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 shadow-md transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-semibold uppercase text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-900/50">
                  {card.topic}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Reviews: {card.reviewCount} &bull; Confidence: {card.confidence}/10
                </span>
              </div>

              <h4 className="text-sm font-semibold text-white mb-2">{card.question}</h4>
              <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed whitespace-pre-line">{card.answer}</p>
            </div>

            <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/80">
              <button
                onClick={() => onStartStudySession(card.topic, 30)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Start 30m Study Timer</span>
              </button>

              <button
                onClick={() => onDeleteStudyCard(card.id)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors opacity-0 group-hover:opacity-100"
                title="Delete card"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
