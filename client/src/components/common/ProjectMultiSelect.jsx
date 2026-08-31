import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Search, CheckSquare, Square, FolderGit2 } from 'lucide-react';

export const ProjectMultiSelect = ({
  selectedProjectIds = [],
  onChange,
  projects = [],
  label = 'Allowed Accessible Projects (Default)',
  helperText,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleProject = (projId) => {
    const stringId = String(projId);
    if (selectedProjectIds.includes(stringId)) {
      onChange(selectedProjectIds.filter((id) => id !== stringId));
    } else {
      onChange([...selectedProjectIds, stringId]);
    }
  };

  const handleSelectAll = () => {
    onChange(projects.map((p) => String(p.id)));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const filteredProjects = projects.filter((p) => {
    const name = (p.name || '').toLowerCase();
    const identifier = (p.identifier || '').toLowerCase();
    const id = String(p.id);
    const query = searchTerm.toLowerCase().trim();
    return name.includes(query) || identifier.includes(query) || id.includes(query);
  });

  const selectedProjects = projects.filter((p) => selectedProjectIds.includes(String(p.id)));

  const getSummaryText = () => {
    if (selectedProjectIds.length === 0) {
      return 'All Projects Allowed (No restriction)';
    }
    if (selectedProjectIds.length === 1) {
      return selectedProjects[0]?.name || `Project #${selectedProjectIds[0]}`;
    }
    if (selectedProjectIds.length === 2) {
      return `${selectedProjects[0]?.name}, ${selectedProjects[1]?.name}`;
    }
    return `${selectedProjects[0]?.name} +${selectedProjectIds.length - 1} more (${selectedProjectIds.length} allowed)`;
  };

  return (
    <div className={`space-y-1.5 relative ${isOpen ? 'z-50' : 'z-20'}`} ref={dropdownRef}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <FolderGit2 className="w-4 h-4 text-indigo-500" />
            <span>{label}</span>
          </label>
          {helperText && (
            <span className="text-xs text-slate-500 dark:text-slate-400">{helperText}</span>
          )}
        </div>
      )}

      {/* Trigger Button */}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-3.5 py-2.5 rounded-xl border text-left text-sm flex items-center justify-between gap-2 transition-all cursor-pointer bg-white dark:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed ${
            isOpen
              ? 'border-indigo-500 ring-2 ring-indigo-500/20'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
          }`}
        >
          <div className="flex items-center gap-2 overflow-hidden truncate">
            {selectedProjectIds.length > 0 ? (
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 shrink-0">
                {selectedProjectIds.length} Allowed
              </span>
            ) : (
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                Unrestricted
              </span>
            )}
            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
              {getSummaryText()}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {selectedProjectIds.length > 0 && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearAll();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    handleClearAll();
                  }
                }}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer inline-flex items-center justify-center"
                title="Clear selected projects"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                isOpen ? 'rotate-180 text-indigo-500' : ''
              }`}
            />
          </div>
        </button>

        {/* Dropdown Popover */}
        {isOpen && (
          <div className="absolute z-[100] mt-1.5 left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-100 max-h-96 flex flex-col">
            {/* Action Bar */}
            <div className="flex items-center justify-between gap-1 pb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {projects.length} Total Projects Available
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2 py-0.5 rounded text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-2 py-0.5 rounded text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search project name, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Scrollable Project Checklist */}
            <div className="overflow-y-auto space-y-1 flex-1 pr-1 max-h-56">
              {filteredProjects.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">
                  No projects match "{searchTerm}"
                </div>
              ) : (
                filteredProjects.map((p) => {
                  const stringId = String(p.id);
                  const isChecked = selectedProjectIds.includes(stringId);

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleToggleProject(p.id)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="shrink-0 text-slate-400">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <span className="truncate">{p.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 pl-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                          #{p.id}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Selected Count Footer */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                {selectedProjectIds.length === 0
                  ? 'All projects loaded by default'
                  : `${selectedProjectIds.length} of ${projects.length} projects allowed`}
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
