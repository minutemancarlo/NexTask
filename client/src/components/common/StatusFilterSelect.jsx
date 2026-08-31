import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';

export const StatusFilterSelect = ({
  operator = '=',
  onOperatorChange,
  selectedStatusIds = [],
  onChange,
  statuses = [],
  label = 'Status Filter',
  helperText,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isExclude = operator === '!' || operator === 'is_not';

  // Toggle individual status
  const handleToggleStatus = (statusId) => {
    const stringId = String(statusId);
    if (selectedStatusIds.includes(stringId)) {
      onChange(selectedStatusIds.filter((id) => id !== stringId));
    } else {
      onChange([...selectedStatusIds, stringId]);
    }
  };

  // Presets
  const applyPreset = (presetType) => {
    if (presetType === 'all') {
      onChange([]);
    } else if (presetType === 'active') {
      // New, In progress, Re-Opened
      const activeIds = statuses
        .filter((s) => {
          const name = s.name.toLowerCase();
          return (
            name.includes('new') ||
            name.includes('in progress') ||
            name.includes('re-opened') ||
            name.includes('reopened')
          );
        })
        .map((s) => String(s.id));
      onChange(activeIds);
      if (onOperatorChange) onOperatorChange('=');
    } else if (presetType === 'open') {
      const openIds = statuses.filter((s) => !s.isClosed).map((s) => String(s.id));
      onChange(openIds);
      if (onOperatorChange) onOperatorChange('=');
    } else if (presetType === 'closed') {
      const closedIds = statuses.filter((s) => s.isClosed).map((s) => String(s.id));
      onChange(closedIds);
      if (onOperatorChange) onOperatorChange('=');
    }
  };

  const handleSelectAll = () => {
    onChange(statuses.map((s) => String(s.id)));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  // Filtered statuses in dropdown based on search
  const filteredStatuses = statuses.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Selected names preview
  const selectedObjects = statuses.filter((s) => selectedStatusIds.includes(String(s.id)));

  const getSummaryText = () => {
    if (selectedStatusIds.length === 0) {
      return isExclude ? 'None Excluded (All Statuses)' : 'All Active Statuses';
    }
    if (selectedStatusIds.length === 1) {
      return selectedObjects[0]?.name || `Status #${selectedStatusIds[0]}`;
    }
    if (selectedStatusIds.length === 2) {
      return `${selectedObjects[0]?.name}, ${selectedObjects[1]?.name}`;
    }
    return `${selectedObjects[0]?.name}, ${selectedObjects[1]?.name} +${selectedStatusIds.length - 2} more`;
  };

  return (
    <div className={`space-y-1.5 relative ${isOpen ? 'z-40' : 'z-10'}`} ref={dropdownRef}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {label}
          </label>
          {helperText && (
            <span className="text-xs text-slate-500 dark:text-slate-400">{helperText}</span>
          )}
        </div>
      )}

      {/* Operator + Multi-Select Trigger Row */}
      <div className="flex items-stretch gap-2">
        {/* IS / IS NOT Condition Pill Switch */}
        <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-1 shrink-0">
          <button
            type="button"
            onClick={() => onOperatorChange && onOperatorChange('=')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              !isExclude
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            IS
          </button>
          <button
            type="button"
            onClick={() => onOperatorChange && onOperatorChange('!')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              isExclude
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            IS NOT
          </button>
        </div>

        {/* Multi-Select Trigger Box */}
        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`w-full px-3.5 py-2 rounded-xl border text-left text-sm flex items-center justify-between gap-2 transition-all cursor-pointer bg-white dark:bg-slate-800 ${
              isOpen
                ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div className="flex items-center gap-2 overflow-hidden truncate">
              <span
                className={`text-xs font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                  isExclude
                    ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300'
                    : 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300'
                }`}
              >
                {isExclude ? 'IS NOT' : 'IS'}
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                {getSummaryText()}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {selectedStatusIds.length > 0 && (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    isExclude
                      ? 'bg-amber-500 text-white'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  {selectedStatusIds.length}
                </span>
              )}
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  isOpen ? 'rotate-180 text-indigo-500' : ''
                }`}
              />
            </div>
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute z-[100] mt-1.5 left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-100 max-h-96 flex flex-col">
              {/* Presets Row */}
              <div className="flex items-center justify-between gap-1 flex-wrap pb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 mr-1">
                    Presets:
                  </span>
                  <button
                    type="button"
                    onClick={() => applyPreset('active')}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer transition-all"
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('open')}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer transition-all"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('closed')}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer transition-all"
                  >
                    Closed
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search statuses (e.g. In progress, New)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8.5 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status List with Checkboxes */}
              <div className="overflow-y-auto flex-1 max-h-52 space-y-1 pr-1">
                {filteredStatuses.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">
                    No statuses found matching "{searchTerm}"
                  </div>
                ) : (
                  filteredStatuses.map((status) => {
                    const isSelected = selectedStatusIds.includes(String(status.id));
                    return (
                      <label
                        key={status.id}
                        onClick={() => handleToggleStatus(status.id)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer select-none transition-colors ${
                          isSelected
                            ? isExclude
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                              : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                              isSelected
                                ? isExclude
                                  ? 'bg-amber-600 border-amber-600 text-white'
                                  : 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span>{status.name}</span>
                        </div>

                        {status.isClosed && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                            Closed
                          </span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>

              {/* Footer Done Button */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {selectedStatusIds.length} of {statuses.length} selected
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected Status Badges (Quick Removal) */}
      {selectedStatusIds.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          {selectedObjects.slice(0, 6).map((status) => (
            <span
              key={status.id}
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold ${
                isExclude
                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
                  : 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
              }`}
            >
              <span>{status.name}</span>
              <button
                type="button"
                onClick={() => handleToggleStatus(status.id)}
                className="hover:opacity-75 cursor-pointer ml-0.5"
                title="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {selectedObjects.length > 6 && (
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              +{selectedObjects.length - 6} more
            </span>
          )}
        </div>
      )}
    </div>
  );
};
