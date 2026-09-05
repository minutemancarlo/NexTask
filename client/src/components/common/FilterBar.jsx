import React from 'react';
import { Search, X } from 'lucide-react';
import { useTasks } from '../../context/TaskContext';

export const FilterBar = () => {
  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedQuadrantFilter,
    setSelectedQuadrantFilter,
    selectedSourceFilter,
    setSelectedSourceFilter,
    categories,
    tasks,
  } = useTasks();

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedQuadrantFilter('');
    setSelectedSourceFilter('');
  };

  const hasActiveFilters = searchQuery || selectedCategory || selectedQuadrantFilter || selectedSourceFilter;

  // Urgent counts
  const overdueCount = tasks.filter(t => {
    if (!t.due_date || t.status === 'completed') return false;
    const today = new Date().toISOString().split('T')[0];
    return t.due_date < today;
  }).length;

  return (
    <div className="bg-white/70 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800/80 px-3.5 sm:px-5 lg:px-6 py-3 backdrop-blur-sm">
      <div className="w-full flex flex-col md:flex-row items-center justify-between gap-3.5">
        
        {/* Search Input */}
        <div className="relative w-full md:w-88">
          <Search className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks, descriptions, assignees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Badges & Selectors */}
        <div className="w-full md:w-auto flex items-center flex-wrap gap-2.5 justify-start md:justify-end">
          
          {/* Quadrant Quick Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700/50 text-sm">
            <button
              onClick={() => setSelectedQuadrantFilter('')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                !selectedQuadrantFilter
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedQuadrantFilter('Q1')}
              className={`px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedQuadrantFilter === 'Q1'
                  ? 'bg-red-500 text-white shadow-xs font-semibold'
                  : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
              }`}
              title="Q1: Do First (Urgent & Important)"
            >
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              Q1
            </button>
            <button
              onClick={() => setSelectedQuadrantFilter('Q2')}
              className={`px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedQuadrantFilter === 'Q2'
                  ? 'bg-amber-500 text-white shadow-xs font-semibold'
                  : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
              }`}
              title="Q2: Schedule (Important, Not Urgent)"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Q2
            </button>
            <button
              onClick={() => setSelectedQuadrantFilter('Q3')}
              className={`px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedQuadrantFilter === 'Q3'
                  ? 'bg-blue-500 text-white shadow-xs font-semibold'
                  : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
              }`}
              title="Q3: Delegate (Urgent, Not Important)"
            >
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              Q3
            </button>
            <button
              onClick={() => setSelectedQuadrantFilter('Q4')}
              className={`px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedQuadrantFilter === 'Q4'
                  ? 'bg-slate-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/60'
              }`}
              title="Q4: Eliminate (Not Urgent, Not Important)"
            >
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              Q4
            </button>
          </div>

          {/* Project / Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
          >
            <option value="">All Projects / Tags</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Source Origin Filter (User Added vs OpenProject) */}
          <select
            value={selectedSourceFilter}
            onChange={(e) => setSelectedSourceFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
          >
            <option value="">All Sources</option>
            <option value="user">👤 User Added</option>
            <option value="openproject">🔗 OpenProject</option>
          </select>

          {/* Overdue alert indicator */}
          {overdueCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-sm font-semibold border border-red-200 dark:border-red-800/50">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              {overdueCount} Overdue
            </div>
          )}

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 pl-1 cursor-pointer font-medium"
            >
              <X className="w-4 h-4" />
              Reset
            </button>
          )}

        </div>

      </div>
    </div>
  );
};
