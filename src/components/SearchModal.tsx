import React, { useState } from 'react';
import { X, Search, CheckCircle, History, Zap, BookOpen, Brain } from 'lucide-react';
import { SearchResults } from '../types';

interface SearchModalProps {
  searchResults: SearchResults;
  onSearch: (query: string) => void;
  onDismiss: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ searchResults, onSearch, onDismiss }) => {
  const [query, setQuery] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    onSearch(q);
  };

  const totalMatches =
    searchResults.tasks.length +
    searchResults.timeline.length +
    searchResults.captures.length +
    searchResults.journal.length +
    searchResults.studyCards.length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-start justify-center p-4 pt-16">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-indigo-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={handleChange}
            placeholder="Search across Tasks, Timeline, Notes, Journal & Flashcards..."
            className="w-full bg-transparent text-sm text-white focus:outline-none placeholder:text-slate-500 font-medium"
          />
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-5 flex-1">
          {!query.trim() && (
            <div className="text-center py-10 text-slate-500">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30 text-indigo-400" />
              <p className="text-xs font-mono">Type a query above to perform instant cross-system search</p>
            </div>
          )}

          {query.trim() && totalMatches === 0 && (
            <div className="text-center py-10 text-slate-400">
              <p className="text-sm font-semibold">No results found for "{query}"</p>
              <p className="text-xs text-slate-500 mt-1">Try searching for keywords in tasks, notes, or cards</p>
            </div>
          )}

          {/* Tasks Results */}
          {searchResults.tasks.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-2">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Tasks ({searchResults.tasks.length})</span>
              </div>
              <div className="space-y-1.5">
                {searchResults.tasks.map((task) => (
                  <div key={task.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-white">{task.title}</h4>
                      {task.description && <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{task.description}</p>}
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300">
                      {task.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline Results */}
          {searchResults.timeline.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2">
                <History className="w-3.5 h-3.5" />
                <span>Timeline Logs ({searchResults.timeline.length})</span>
              </div>
              <div className="space-y-1.5">
                {searchResults.timeline.map((entry) => (
                  <div key={entry.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <h4 className="text-xs font-semibold text-white">{entry.title}</h4>
                    {entry.note && <p className="text-[11px] text-slate-400 mt-0.5">{entry.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes/Captures Results */}
          {searchResults.captures.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2">
                <Zap className="w-3.5 h-3.5" />
                <span>Quick Captures ({searchResults.captures.length})</span>
              </div>
              <div className="space-y-1.5">
                {searchResults.captures.map((capture) => (
                  <div key={capture.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <p className="text-xs text-white">{capture.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Journal Results */}
          {searchResults.journal.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Journal Entries ({searchResults.journal.length})</span>
              </div>
              <div className="space-y-1.5">
                {searchResults.journal.map((j) => (
                  <div key={j.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <h4 className="text-xs font-semibold text-white">{j.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{j.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Study Cards Results */}
          {searchResults.studyCards.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-purple-400 mb-2">
                <Brain className="w-3.5 h-3.5" />
                <span>Flashcards ({searchResults.studyCards.length})</span>
              </div>
              <div className="space-y-1.5">
                {searchResults.studyCards.map((card) => (
                  <div key={card.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] font-mono font-semibold text-purple-400">{card.topic}</span>
                    <h4 className="text-xs font-semibold text-white mt-0.5">{card.question}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{card.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
