import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileCode,
  FileText,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { useNotes } from '../../context/NotesContext';

export const ImportNotesModal = ({ isOpen, onClose }) => {
  const { importNotes } = useNotes();
  const fileInputRef = useRef(null);

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [previewInfo, setPreviewInfo] = useState(null); // { format: 'json'|'markdown', count: number, sampleSnippets: [] }
  const [importMode, setImportMode] = useState('merge'); // 'merge' | 'replace'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const resetState = () => {
    setSelectedFile(null);
    setFileContent('');
    setPreviewInfo(null);
    setImportMode('merge');
    setLoading(false);
    setError(null);
    setSuccessMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const processFile = async (file) => {
    if (!file) return;
    setError(null);
    setSuccessMsg(null);
    setSelectedFile(file);

    try {
      const text = await file.text();
      setFileContent(text);

      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.json') || file.type === 'application/json') {
        // Try parsing JSON
        try {
          const parsed = JSON.parse(text);
          let notesArr = [];
          if (Array.isArray(parsed)) {
            notesArr = parsed;
          } else if (Array.isArray(parsed.notes)) {
            notesArr = parsed.notes;
          } else if (parsed.content && typeof parsed.content === 'string') {
            notesArr = [parsed];
          }

          const validNotes = notesArr.filter(n => n && typeof n.content === 'string' && n.content.trim().length > 0);
          const sampleSnippets = validNotes.slice(0, 3).map(n => {
            const lines = (n.content || '').split('\n').filter(Boolean);
            return lines[0] || 'Empty note';
          });

          setPreviewInfo({
            format: 'json',
            count: validNotes.length,
            sampleSnippets,
          });

          if (validNotes.length === 0) {
            setError('The selected JSON file does not contain any valid notes with content.');
          }
        } catch {
          setError('Invalid JSON file. Please ensure the file contains valid JSON.');
        }
      } else {
        // Assume Markdown or text
        const sections = text.split(/(?:\r?\n|^)---(?:\r?\n|$)/);
        const validSections = sections
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('# NexTask Notes Export'));

        const count = validSections.length > 0 ? validSections.length : (text.trim().length > 0 ? 1 : 0);
        const sampleSnippets = (validSections.length > 0 ? validSections : [text.trim()])
          .slice(0, 3)
          .map(s => {
            // Strip header if present
            const clean = s.replace(/^### Note[^\n]*\n?/i, '').replace(/^Tags:[^\n]*\n?/i, '').trim();
            const lines = clean.split('\n').filter(Boolean);
            return lines[0] || 'Memo';
          });

        setPreviewInfo({
          format: 'markdown',
          count,
          sampleSnippets,
        });

        if (count === 0) {
          setError('The selected file does not appear to contain any note content.');
        }
      }
    } catch (err) {
      console.error('File reading error:', err);
      setError('Failed to read file: ' + err.message);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleImportSubmit = async () => {
    if (!fileContent || !previewInfo || previewInfo.count === 0) {
      setError('Please select a valid backup file to import.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);

      let payload;
      if (previewInfo.format === 'json') {
        const parsed = JSON.parse(fileContent);
        payload = {
          notes: Array.isArray(parsed) ? parsed : (parsed.notes || [parsed]),
          mode: importMode,
        };
      } else {
        payload = {
          markdown: fileContent,
          mode: importMode,
        };
      }

      const res = await importNotes(payload, importMode);
      setSuccessMsg(res.message || `Successfully imported ${previewInfo.count} notes.`);
      setTimeout(() => {
        handleClose();
      }, 1400);
    } catch (err) {
      console.error('Import failed:', err);
      setError(err.message || 'Failed to import backup notes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/40">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Import Backed Up Notes
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Restore notes from JSON or Markdown backups
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          
          {/* File Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                : selectedFile
                ? 'border-indigo-300 dark:border-indigo-800 bg-slate-50/50 dark:bg-slate-800/40'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/30 dark:bg-slate-900/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.md,text/markdown,text/plain,application/json"
              onChange={handleFileInput}
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                  {previewInfo?.format === 'json' ? (
                    <FileCode className="w-5 h-5" />
                  ) : (
                    <FileText className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-xs mx-auto">
                    {selectedFile.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {(selectedFile.size / 1024).toFixed(1)} KB • {previewInfo?.format?.toUpperCase() || 'DOCUMENT'}
                  </div>
                </div>
                <div className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline pt-1">
                  Click or drop to choose another file
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-900/60">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                    Browse backup file
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-400"> or drag and drop here</span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Supports JSON backups (*.json) or Markdown exports (*.md)
                </p>
              </div>
            )}
          </div>

          {/* Inspection / Preview Box */}
          {previewInfo && previewInfo.count > 0 && (
            <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/50 space-y-2 text-xs">
              <div className="flex items-center justify-between font-semibold text-indigo-950 dark:text-indigo-200">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Detected Notes:</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-indigo-200/80 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-bold">
                  {previewInfo.count} {previewInfo.count === 1 ? 'note' : 'notes'}
                </span>
              </div>

              {previewInfo.sampleSnippets.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Preview:
                  </span>
                  <ul className="space-y-1 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                    {previewInfo.sampleSnippets.map((snip, idx) => (
                      <li key={idx} className="truncate bg-white/70 dark:bg-slate-800/60 px-2 py-1 rounded-md border border-slate-200/60 dark:border-slate-700/50">
                        • {snip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Import Mode Options */}
          {previewInfo && previewInfo.count > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Import Option
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Merge Option */}
                <label
                  className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                    importMode === 'merge'
                      ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 dark:border-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Merge (Recommended)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-5 leading-normal">
                    Adds new notes and updates existing ones. Preserves current notes.
                  </p>
                </label>

                {/* Replace Option */}
                <label
                  className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                    importMode === 'replace'
                      ? 'border-amber-600 bg-amber-50/60 dark:bg-amber-950/40 dark:border-amber-500'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                      Replace All
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-5 leading-normal">
                    Wipes current notes and completely replaces them with the backup.
                  </p>
                </label>
              </div>
            </div>
          )}

          {/* Feedback Alerts */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleImportSubmit}
            disabled={loading || !selectedFile || !previewInfo || previewInfo.count === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Import Notes</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
