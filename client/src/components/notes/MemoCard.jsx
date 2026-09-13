import React, { useState } from 'react';
import {
  Pin,
  MoreVertical,
  Edit3,
  Archive,
  ArchiveRestore,
  Trash2,
  Copy,
  Check,
  Clock,
  Hash,
} from 'lucide-react';
import { useNotes } from '../../context/NotesContext';
import { MarkdownRenderer } from './MarkdownRenderer';
import { MemoComposer } from './MemoComposer';

export const MemoCard = ({ note, onConfirmDelete }) => {
  const { togglePin, toggleArchive, toggleChecklistItem, setSelectedTag } = useNotes();
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  // Relative or formatted time helper
  const formattedTime = (() => {
    try {
      const date = new Date(note.created_at);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    } catch {
      return note.created_at;
    }
  })();

  const fullDateTime = (() => {
    try {
      return new Date(note.created_at).toLocaleString();
    } catch {
      return note.created_at;
    }
  })();

  const handleCopyMarkdown = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(note.content);
    setCopied(true);
    setShowMenu(false);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isEditing) {
    return (
      <MemoComposer
        editMode={true}
        initialContent={note.content}
        initialPinned={note.pinned}
        noteId={note.id}
        onCancel={() => setIsEditing(false)}
        onSaved={() => setIsEditing(false)}
      />
    );
  }

  return (
    <article
      className={`group relative bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 p-4 shadow-2xs hover:shadow-md ${
        note.pinned
          ? 'border-amber-300/80 dark:border-amber-700/60 ring-1 ring-amber-400/20 bg-gradient-to-b from-amber-50/20 to-transparent dark:from-amber-950/10'
          : 'border-slate-200/90 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Card Header: Timestamp, Pinned badge, Actions Menu */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <Clock className="w-3.5 h-3.5" />
          <span title={fullDateTime} className="font-medium cursor-help">
            {formattedTime}
          </span>

          {note.pinned && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 text-[11px] font-semibold">
              <Pin className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
              Pinned
            </span>
          )}

          {note.archived && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[11px] font-medium">
              <Archive className="w-2.5 h-2.5" />
              Archived
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* Quick Pin/Unpin */}
          <button
            type="button"
            onClick={() => togglePin(note.id)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              note.pinned
                ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                : 'text-slate-400 opacity-0 group-hover:opacity-100 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={note.pinned ? 'Unpin from top' : 'Pin to top'}
          >
            <Pin className={`w-3.5 h-3.5 ${note.pinned ? 'fill-amber-500' : ''}`} />
          </button>

          {/* Quick Copy Markdown */}
          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="p-1.5 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Copy raw markdown"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Card Menu Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="More actions"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-7 z-50 w-44 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl p-1 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      setIsEditing(true);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Edit Memo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      togglePin(note.id);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left cursor-pointer"
                  >
                    <Pin className="w-3.5 h-3.5 text-amber-500" />
                    <span>{note.pinned ? 'Unpin memo' : 'Pin to top'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      toggleArchive(note.id);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left cursor-pointer"
                  >
                    {note.archived ? (
                      <>
                        <ArchiveRestore className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Restore memo</span>
                      </>
                    ) : (
                      <>
                        <Archive className="w-3.5 h-3.5 text-slate-500" />
                        <span>Archive memo</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyMarkdown}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Markdown</span>
                  </button>

                  <div className="my-1 border-t border-slate-100 dark:border-slate-700/60" />

                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      if (onConfirmDelete) onConfirmDelete(note);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors text-left cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Delete</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Card Content (Markdown) */}
      <div className="py-1 text-slate-800 dark:text-slate-200">
        <MarkdownRenderer
          content={note.content}
          onTagClick={setSelectedTag}
          onToggleChecklist={toggleChecklistItem}
          noteId={note.id}
        />
      </div>

      {/* Card Footer: Quick Tag Chips if any */}
      {note.tags && note.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60">
          {note.tags.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(tag)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/80 dark:border-slate-700/60 transition-colors cursor-pointer"
            >
              <Hash className="w-2.5 h-2.5 text-slate-400" />
              <span>{tag}</span>
            </button>
          ))}
        </div>
      )}
    </article>
  );
};
