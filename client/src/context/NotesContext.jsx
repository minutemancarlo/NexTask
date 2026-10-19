import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const NotesContext = createContext();

export const NotesProvider = ({ children }) => {
  const [notes, setNotes] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active filters
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'pinned' | 'archived'
  const [selectedTag, setSelectedTag] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);

  // Fetch tags and stats
  const refreshMetadata = useCallback(async () => {
    try {
      const [fetchedTags, fetchedStats] = await Promise.all([
        api.getNoteTags(),
        api.getNoteStats(),
      ]);
      setAllTags(fetchedTags || []);
      setStats(fetchedStats || {});
    } catch (err) {
      console.error('Failed to load note metadata:', err);
    }
  }, []);

  // Fetch notes based on current filters
  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        filter: activeFilter,
      };
      if (selectedTag) params.tag = selectedTag;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedDate) params.date = selectedDate;

      const fetchedNotes = await api.getNotes(params);
      setNotes(fetchedNotes || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load notes:', err);
      setError('Could not connect to NexTask notes service.');
    } finally {
      setLoading(false);
    }
  }, [activeFilter, selectedTag, searchQuery, selectedDate]);

  // Reload notes when filters change
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Initial metadata fetch
  useEffect(() => {
    refreshMetadata();
  }, [refreshMetadata]);

  // Create new note
  const createNote = async ({ content, pinned = 0 }) => {
    try {
      const created = await api.createNote({ content, pinned });
      setNotes(prev => [created, ...prev]);
      refreshMetadata();
      return created;
    } catch (err) {
      console.error('Failed to create note:', err);
      throw err;
    }
  };

  // Update note content or attributes
  const updateNote = async (id, updates) => {
    try {
      const updated = await api.updateNote(id, updates);
      setNotes(prev => prev.map(n => n.id === id ? updated : n));
      refreshMetadata();
      return updated;
    } catch (err) {
      console.error('Failed to update note:', err);
      throw err;
    }
  };

  // Toggle checklist item within a note
  const toggleChecklistItem = async (noteId, itemText, isChecked) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    // Replace the specific line in markdown
    const lines = note.content.split('\n');
    const updatedLines = lines.map(line => {
      if (line.includes(itemText)) {
        if (isChecked) {
          return line.replace(/- \[[ xX]\]/, '- [x]');
        } else {
          return line.replace(/- \[[ xX]\]/, '- [ ]');
        }
      }
      return line;
    });

    const newContent = updatedLines.join('\n');
    // Optimistic update
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, content: newContent } : n));

    try {
      await api.updateNote(noteId, { content: newContent });
    } catch (err) {
      console.error('Failed to toggle checklist item:', err);
      // Rollback
      fetchNotes();
    }
  };

  // Toggle pinned status
  const togglePin = async (id) => {
    try {
      // Optimistic update
      setNotes(prev => {
        const target = prev.find(n => n.id === id);
        if (!target) return prev;
        const newPinned = !target.pinned;
        const updated = { ...target, pinned: newPinned };
        // Sort: pinned first
        const others = prev.filter(n => n.id !== id);
        return [updated, ...others].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
      });

      const res = await api.togglePinNote(id);
      setNotes(prev => prev.map(n => n.id === id ? res : n));
    } catch (err) {
      console.error('Failed to toggle pin:', err);
      fetchNotes();
    }
  };

  // Toggle archived status
  const toggleArchive = async (id) => {
    try {
      // Optimistic removal from active view
      setNotes(prev => prev.filter(n => n.id !== id));
      await api.toggleArchiveNote(id);
      refreshMetadata();
    } catch (err) {
      console.error('Failed to toggle archive:', err);
      fetchNotes();
    }
  };

  // Delete note
  const deleteNote = async (id) => {
    try {
      setNotes(prev => prev.filter(n => n.id !== id));
      await api.deleteNote(id);
      refreshMetadata();
    } catch (err) {
      console.error('Failed to delete note:', err);
      fetchNotes();
      throw err;
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedTag(null);
    setSearchQuery('');
    setSelectedDate(null);
    setActiveFilter('all');
  };

  // Export
  const exportNotes = async (format) => {
    return api.exportNotes(format);
  };

  // Import backed up notes
  const importNotes = async (payload, mode = 'merge') => {
    try {
      const body = typeof payload === 'object' && !Array.isArray(payload) && (payload.notes || payload.markdown)
        ? { mode, ...payload }
        : { notes: payload, mode };
      const result = await api.importNotes(body);
      await fetchNotes();
      await refreshMetadata();
      return result;
    } catch (err) {
      console.error('Failed to import notes:', err);
      throw err;
    }
  };

  return (
    <NotesContext.Provider
      value={{
        notes,
        allTags,
        stats,
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
        fetchNotes,
        createNote,
        updateNote,
        toggleChecklistItem,
        togglePin,
        toggleArchive,
        deleteNote,
        exportNotes,
        importNotes,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
};

export const useNotes = () => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
};
