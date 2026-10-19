import React, { useState } from 'react';
import {
  Search,
  Hash,
  Pin,
  Archive,
  Layers,
  Download,
  Upload,
  FileCode,
  FileText,
  X,
  Plus,
  Sparkles,
  RefreshCw,
  AlertCircle,
  FolderArchive,
  Calendar,
} from 'lucide-react';
import { useNotes } from '../../context/NotesContext';
import { MemoComposer } from './MemoComposer';
import { MemoCard } from './MemoCard';
import { NotesCalendar } from './NotesCalendar';
import { ImportNotesModal } from './ImportNotesModal';

export const NotesView = () => {
  const {
    notes,
    allTags,
    loading,
    error,
    activeFilter,
    setActiveFilter,
    selectedTag,
    setSelectedTag,
    searchQuery,
    setSearchQuery,
    selectedDate,
    setSelectedDate,
    clearFilters,
    deleteNote,
    exportNotes,
  } = useNotes();

  // Delete confirmation modal state
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Handle Export
  const handleExport = async (format) => {
    try {
      setIsExporting(true);
      await exportNotes(format);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Check if any filter is active
  const hasActiveFilters = Boolean(selectedTag || searchQuery.trim() || selectedDate || activeFilter !== 'all');

  return (
    <div className="w-full max-w-7xl mx-auto px-3.5 sm:px-5 lg:px-6 py-6 flex-1 flex flex-col">
      
      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
        
        {/* =========================================
            LEFT COLUMN / SIDEBAR (lg:col-span-4 xl:col-span-3)
            ========================================= */}
        <aside className="lg:col-span-4 xl:col-span-3 space-y-4">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in memos..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Navigation Filter Tabs */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-1">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                <span>All Memos</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {activeFilter === 'all' ? notes.length : ''}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('pinned')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeFilter === 'pinned'
                  ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Pin className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                <span>Pinned</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {activeFilter === 'pinned' ? notes.length : ''}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('archived')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeFilter === 'archived'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Archive className="w-4 h-4" />
                <span>Archived</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {activeFilter === 'archived' ? notes.length : ''}
              </span>
            </button>
          </div>

          {/* Interactive Monthly Calendar */}
          <NotesCalendar />

          {/* Tags Cloud / List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-indigo-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Tags
                </h3>
              </div>
              {selectedTag && (
                <button
                  type="button"
                  onClick={() => setSelectedTag(null)}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Clear tag
                </button>
              )}
            </div>

            {allTags.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No hashtags used yet. Type #tag in your memo to start organizing!</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto pr-1">
                {allTags.map((item) => {
                  const isSelected = selectedTag === item.tag;
                  return (
                    <button
                      key={item.tag}
                      type="button"
                      onClick={() => setSelectedTag(isSelected ? null : item.tag)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
                      }`}
                    >
                      <span>#{item.tag}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          isSelected
                            ? 'bg-indigo-700 text-indigo-100'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Export / Backup Section */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5 flex items-center gap-2">
              <Download className="w-4 h-4 text-indigo-500" />
              <span>Backup & Restore</span>
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleExport('markdown')}
                disabled={isExporting}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800/40"
                title="Export all notes to a single Markdown document"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Markdown</span>
              </button>

              <button
                type="button"
                onClick={() => handleExport('json')}
                disabled={isExporting}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800/40"
                title="Export all notes and metadata as JSON"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>JSON</span>
              </button>
            </div>

            <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/50 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                title="Import backed up notes from a JSON or Markdown file"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Import Backup</span>
              </button>
            </div>
          </div>

        </aside>

        {/* =========================================
            RIGHT COLUMN / MAIN FEED (lg:col-span-8 xl:col-span-9)
            ========================================= */}
        <section className="lg:col-span-8 xl:col-span-9 space-y-5">
          
          {/* Active Filter Notification Bar */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/50 text-indigo-900 dark:text-indigo-200 text-xs shadow-2xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">Active filter:</span>
                {activeFilter !== 'all' && (
                  <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 font-mono text-[11px] capitalize">
                    {activeFilter}
                  </span>
                )}
                {selectedTag && (
                  <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 font-mono text-[11px] text-indigo-600 dark:text-indigo-300">
                    #{selectedTag}
                  </span>
                )}
                {selectedDate && (
                  <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 font-mono text-[11px]">
                    Date: {selectedDate}
                  </span>
                )}
                {searchQuery && (
                  <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-[11px]">
                    "{searchQuery}"
                  </span>
                )}
                <span className="text-slate-500 dark:text-slate-400">
                  ({notes.length} match{notes.length === 1 ? '' : 'es'})
                </span>
              </div>

              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </div>
          )}

          {/* Memo Composer (only shown when not on Archived tab) */}
          {activeFilter !== 'archived' && (
            <MemoComposer />
          )}

          {/* Feed Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
              <RefreshCw className="w-7 h-7 animate-spin text-indigo-500 mb-2.5" />
              <p className="text-sm font-medium">Loading your memos...</p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-center">
              <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          ) : notes.length === 0 ? (
            /* Empty State */
            <div className="py-12 px-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3 border border-indigo-200/60 dark:border-indigo-800/40">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                {hasActiveFilters ? 'No matching memos found' : 'Your memo stream is empty'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4 leading-relaxed">
                {hasActiveFilters
                  ? 'Try clearing active filters or searching for a different keyword or hashtag.'
                  : 'Jot down thoughts, ideas, or meeting notes with full Markdown and #hashtags.'}
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    Clear Filters
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import Backed Up Notes</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Stream of Memos */
            <div className="space-y-3.5">
              {notes.map((note) => (
                <MemoCard
                  key={note.id}
                  note={note}
                  onConfirmDelete={(n) => setNoteToDelete(n)}
                />
              ))}
            </div>
          )}

        </section>

      </div>

      {/* Delete Confirmation Modal */}
      {noteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Delete Memo?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              Are you sure you want to permanently delete this memo? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setNoteToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (noteToDelete) {
                    await deleteNote(noteToDelete.id);
                    setNoteToDelete(null);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Delete Memo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Notes Backup Modal */}
      <ImportNotesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

    </div>
  );
};
