import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Hash,
  Bold,
  CheckSquare,
  Code,
  Quote,
  Pin,
  Sparkles,
  X,
} from 'lucide-react';
import { useNotes } from '../../context/NotesContext';
import { CodeLanguageDropdown } from './CodeLanguageDropdown';

export const MemoComposer = ({ editMode = false, initialContent = '', initialPinned = false, noteId = null, onCancel = null, onSaved = null }) => {
  const { createNote, updateNote, allTags } = useNotes();
  const [content, setContent] = useState(initialContent);
  const [isPinned, setIsPinned] = useState(initialPinned);
  const [submitting, setSubmitting] = useState(false);

  // Autocomplete state for hashtags
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [tagQuery, setTagQuery] = useState('');
  const [cursorPos, setCursorPos] = useState(0);

  // Code Language Dropdown / Modal state
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [selectedCodeSnippet, setSelectedCodeSnippet] = useState('');

  const textareaRef = useRef(null);
  const tagMenuRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(88, textareaRef.current.scrollHeight)}px`;
    }
  }, [content]);

  // Handle hashtag autocomplete trigger
  const handleContentChange = (e) => {
    const text = e.target.value;
    const pos = e.target.selectionStart;
    setContent(text);
    setCursorPos(pos);

    // Look backward from cursor to find if we are typing a hashtag
    const textBeforeCursor = text.slice(0, pos);
    const lastHashIndex = textBeforeCursor.lastIndexOf('#');

    if (lastHashIndex !== -1) {
      const textAfterHash = textBeforeCursor.slice(lastHashIndex + 1);
      // Ensure there are no spaces between hash and cursor
      if (!/\s/.test(textAfterHash)) {
        const query = textAfterHash.toLowerCase();
        setTagQuery(query);
        const matches = allTags.filter(t => t.tag.toLowerCase().includes(query));
        setTagSuggestions(matches);
        setActiveSuggestionIndex(0);
        setShowTagMenu(matches.length > 0);
        return;
      }
    }

    setShowTagMenu(false);
  };

  // Insert selected tag into content
  const insertTag = (tag) => {
    if (!textareaRef.current) return;
    const text = content;
    const pos = cursorPos;
    const textBeforeCursor = text.slice(0, pos);
    const lastHashIndex = textBeforeCursor.lastIndexOf('#');

    if (lastHashIndex !== -1) {
      const beforeHash = text.slice(0, lastHashIndex);
      const afterCursor = text.slice(pos);
      const newText = `${beforeHash}#${tag} ${afterCursor}`;
      setContent(newText);
      setShowTagMenu(false);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newPos = lastHashIndex + tag.length + 2;
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 0);
    }
  };

  // Insert helper markdown formats
  const insertFormatting = (prefix, suffix = '') => {
    if (!textareaRef.current) return;
    const ta = textareaRef.current;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.slice(start, end);

    let replacement = '';
    let newCursorPos = 0;

    if (prefix === '- [ ] ') {
      // Newline checklist item
      const needsNewline = start > 0 && content[start - 1] !== '\n';
      replacement = `${needsNewline ? '\n' : ''}- [ ] ${selected}`;
      newCursorPos = start + replacement.length;
    } else if (prefix === '```\n') {
      replacement = `\`\`\`js\n${selected || '// code here'}\n\`\`\`\n`;
      newCursorPos = start + replacement.length;
    } else {
      replacement = `${prefix}${selected || 'text'}${suffix}`;
      newCursorPos = start + prefix.length + (selected ? selected.length : 4);
    }

    const newText = content.slice(0, start) + replacement + content.slice(end);
    setContent(newText);

    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Open Code Language Dropdown / Modal
  const handleOpenCodeModal = () => {
    let snippet = '';
    if (textareaRef.current) {
      const ta = textareaRef.current;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      if (start !== end) {
        snippet = content.slice(start, end);
      }
    }
    setSelectedCodeSnippet(snippet);
    setIsCodeModalOpen(true);
  };

  // Insert Code Block with chosen language tag and code content
  const handleInsertCodeBlock = ({ tag, code }) => {
    if (!textareaRef.current) return;
    const ta = textareaRef.current;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;

    const snippet = code ? code : (selectedCodeSnippet || '// Write code here');
    const needsNewlineBefore = start > 0 && content[start - 1] !== '\n';
    const needsNewlineAfter = end < content.length && content[end] !== '\n';

    const replacement = `${needsNewlineBefore ? '\n' : ''}\`\`\`${tag}\n${snippet}\n\`\`\`${needsNewlineAfter ? '\n' : ''}`;
    const newText = content.slice(0, start) + replacement + content.slice(end);
    setContent(newText);

    setTimeout(() => {
      ta.focus();
      const codeStartPos = start + (needsNewlineBefore ? 1 : 0) + tag.length + 4;
      ta.setSelectionRange(codeStartPos, codeStartPos + snippet.length);
    }, 0);
  };

  // Keyboard navigation for suggestions and submit
  const handleKeyDown = (e) => {
    if (showTagMenu && tagSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIndex(prev => (prev + 1) % tagSuggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIndex(prev => (prev - 1 + tagSuggestions.length) % tagSuggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertTag(tagSuggestions[activeSuggestionIndex].tag);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowTagMenu(false);
        return;
      }
    }

    // Ctrl+Enter or Cmd+Enter to publish
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Submit memo
  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;

    try {
      setSubmitting(true);
      if (editMode && noteId) {
        await updateNote(noteId, { content: content.trim(), pinned: isPinned ? 1 : 0 });
        if (onSaved) onSaved();
      } else {
        await createNote({ content: content.trim(), pinned: isPinned ? 1 : 0 });
        setContent('');
        setIsPinned(false);
      }
    } catch (err) {
      console.error('Error submitting memo:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/60 overflow-visible">
      {/* Top Header Bar if Edit Mode */}
      {editMode && (
        <div className="flex items-center justify-between px-4 pt-3 pb-1 border-b border-slate-100 dark:border-slate-800/80">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Editing Memo
          </span>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Main Textarea */}
      <div className="p-3.5 relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          onClick={(e) => setCursorPos(e.target.selectionStart)}
          onKeyUp={(e) => setCursorPos(e.target.selectionStart)}
          placeholder={
            editMode
              ? 'Update your memo content...'
              : 'What are you thinking? Type #hashtag to tag topics, - [ ] for checklists...'
          }
          className="w-full resize-none bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none leading-relaxed transition-all min-h-[88px]"
        />

        {/* Floating Hashtag Autocomplete Popup */}
        {showTagMenu && tagSuggestions.length > 0 && (
          <div
            ref={tagMenuRef}
            className="absolute left-4 bottom-14 z-50 w-64 max-h-48 overflow-y-auto rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/60 mb-1">
              Matching Tags ({tagSuggestions.length})
            </div>
            {tagSuggestions.map((item, index) => (
              <button
                key={item.tag}
                type="button"
                onClick={() => insertTag(item.tag)}
                onMouseEnter={() => setActiveSuggestionIndex(index)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                  index === activeSuggestionIndex
                    ? 'bg-indigo-50 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 font-medium'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Hash className="w-3 h-3 text-indigo-500" />
                  <span>{item.tag}</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {item.count} notes
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Toolbar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/70 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 rounded-b-2xl">
        {/* Quick Format Tools */}
        <div className="flex items-center gap-1">
          {/* Insert Hashtag */}
          <button
            type="button"
            onClick={() => {
              if (textareaRef.current) {
                const ta = textareaRef.current;
                const pos = ta.selectionStart;
                const newText = content.slice(0, pos) + '#' + content.slice(pos);
                setContent(newText);
                setTimeout(() => {
                  ta.focus();
                  ta.setSelectionRange(pos + 1, pos + 1);
                  setCursorPos(pos + 1);
                  setTagQuery('');
                  setTagSuggestions(allTags);
                  setShowTagMenu(allTags.length > 0);
                }, 0);
              }
            }}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Insert Hashtag (#)"
          >
            <Hash className="w-4 h-4" />
          </button>

          {/* Checklist */}
          <button
            type="button"
            onClick={() => insertFormatting('- [ ] ')}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Insert Checklist (- [ ])"
          >
            <CheckSquare className="w-4 h-4" />
          </button>

          {/* Bold */}
          <button
            type="button"
            onClick={() => insertFormatting('**', '**')}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Bold (**text**)"
          >
            <Bold className="w-4 h-4" />
          </button>

          {/* Code Block with Searchable Language Dropdown */}
          <button
            type="button"
            onClick={handleOpenCodeModal}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Insert Code Block (Choose language & paste code)"
          >
            <Code className="w-4 h-4" />
          </button>

          {/* Blockquote */}
          <button
            type="button"
            onClick={() => insertFormatting('> ')}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Quote (> quote)"
          >
            <Quote className="w-4 h-4" />
          </button>

          {/* Pin toggle */}
          <button
            type="button"
            onClick={() => setIsPinned(!isPinned)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              isPinned
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
            title="Pin this memo to top"
          >
            <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-500 text-amber-500' : ''}`} />
            <span className="hidden sm:inline">{isPinned ? 'Pinned' : 'Pin'}</span>
          </button>
        </div>

        {/* Right side: Keyboard shortcut hint + Save button */}
        <div className="flex items-center gap-2.5">
          <span className="hidden md:inline text-[11px] text-slate-400 font-medium">
            Ctrl + Enter
          </span>

          {editMode && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!content.trim() || submitting}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{editMode ? 'Update' : 'Post Memo'}</span>
          </button>
        </div>
      </div>

      {/* Code Language Dropdown / Modal */}
      <CodeLanguageDropdown
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        onSelectLanguage={handleInsertCodeBlock}
        initialCode={selectedCodeSnippet}
      />
    </div>
  );
};
