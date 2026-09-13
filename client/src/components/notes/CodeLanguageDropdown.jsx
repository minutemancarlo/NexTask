import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Code,
  X,
  ClipboardPaste,
  Check,
  ChevronRight,
  Terminal,
} from 'lucide-react';
import { CODE_LANGUAGES } from '../../utils/codeLanguages';

export const CodeLanguageDropdown = ({ isOpen, onClose, onSelectLanguage, initialCode = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(CODE_LANGUAGES[0]);
  const [pastedCode, setPastedCode] = useState(initialCode);
  const [clipboardFeedback, setClipboardFeedback] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Sync initial code when opening
  useEffect(() => {
    if (isOpen) {
      setPastedCode(initialCode || '');
      setSearchQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen, initialCode]);

  // Filter languages based on search query
  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) {
      return CODE_LANGUAGES;
    }
    const q = searchQuery.toLowerCase().trim();
    return CODE_LANGUAGES.filter(lang =>
      lang.label.toLowerCase().includes(q) ||
      lang.tag.toLowerCase().includes(q) ||
      lang.category.toLowerCase().includes(q) ||
      (lang.ext && lang.ext.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  // Keep selected index in bounds
  useEffect(() => {
    setSelectedIndex(0);
    if (filteredLanguages.length > 0) {
      setSelectedLanguage(filteredLanguages[0]);
    }
  }, [filteredLanguages]);

  // Handle paste from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPastedCode(text);
        setClipboardFeedback(true);
        setTimeout(() => setClipboardFeedback(false), 2000);
      }
    } catch (err) {
      console.warn('Clipboard read error:', err);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredLanguages.length);
      setSelectedLanguage(filteredLanguages[(selectedIndex + 1) % filteredLanguages.length]);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIndex = (selectedIndex - 1 + filteredLanguages.length) % filteredLanguages.length;
      setSelectedIndex(nextIndex);
      setSelectedLanguage(filteredLanguages[nextIndex]);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredLanguages[selectedIndex]) {
        handleInsert(filteredLanguages[selectedIndex]);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Confirm insert
  const handleInsert = (langToUse = selectedLanguage) => {
    const lang = langToUse || selectedLanguage || { tag: 'text', label: 'Plain Text' };
    const code = pastedCode.trim();
    onSelectLanguage({
      tag: lang.tag,
      label: lang.label,
      code: code || '',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-2xs"
        onClick={onClose}
      />

      {/* Dropdown / Modal Box */}
      <div
        ref={dropdownRef}
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/40">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Insert Code Block
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Choose a programming language and optionally paste your code snippet
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search language... e.g. python, sql, typescript, bash..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Languages Grid / List */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
              <span>Available Languages ({filteredLanguages.length})</span>
              <span className="text-[10px] lowercase text-slate-400">arrow keys & enter or click</span>
            </div>

            <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900/60 p-1">
              {filteredLanguages.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No language found matching "{searchQuery}"
                </div>
              ) : (
                filteredLanguages.map((lang, index) => {
                  const isSelected = selectedLanguage?.id === lang.id;
                  const isHighlighted = index === selectedIndex;
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => {
                        setSelectedLanguage(lang);
                        setSelectedIndex(index);
                      }}
                      onDoubleClick={() => handleInsert(lang)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-medium shadow-2xs'
                          : isHighlighted
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Terminal className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-indigo-500'}`} />
                        <span>{lang.label}</span>
                        <span
                          className={`font-mono text-[10px] px-1.5 py-0.2 rounded ${
                            isSelected
                              ? 'bg-indigo-700 text-indigo-100'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          ```{lang.tag}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] ${
                          isSelected ? 'text-indigo-200' : 'text-slate-400'
                        }`}
                      >
                        {lang.category}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Optional Code Paste Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5 px-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>Paste Code Snippet</span>
                <span className="text-[11px] font-normal text-slate-400">(optional)</span>
              </label>

              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                {clipboardFeedback ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-500 font-semibold">Pasted!</span>
                  </>
                ) : (
                  <>
                    <ClipboardPaste className="w-3 h-3" />
                    <span>Paste from Clipboard</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              value={pastedCode}
              onChange={(e) => setPastedCode(e.target.value)}
              placeholder={`// Paste your ${selectedLanguage?.label || 'code'} here (or leave empty to type inside the note)...`}
              rows={4}
              className="w-full p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none leading-relaxed"
            />
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50/70 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
            <span>Selected:</span>
            <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">
              {selectedLanguage?.label} ({selectedLanguage?.tag})
            </strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleInsert(selectedLanguage)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <span>Insert {selectedLanguage?.label} Block</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </>
  );
};
