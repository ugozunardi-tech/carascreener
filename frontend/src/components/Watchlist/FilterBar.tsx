import { Search, X } from 'lucide-react';
import clsx from 'clsx';
import type { Priority } from '../../types';

interface Props {
  search: string;
  onSearch: (v: string) => void;
  selectedSector: string;
  onSector: (v: string) => void;
  selectedTheme: string;
  onTheme: (v: string) => void;
  selectedPriority: string;
  onPriority: (v: string) => void;
  sectors: string[];
  themes: string[];
  stockCount: number;
  totalCount: number;
}

const PRIORITIES: (Priority | 'All')[] = ['All', 'HIGH', 'MEDIUM', 'LOW'];

const priorityStyles: Record<string, string> = {
  All: 'text-text-secondary border-border-primary hover:border-text-muted',
  HIGH: 'text-accent-red border-accent-red/40 hover:border-accent-red',
  MEDIUM: 'text-accent-yellow border-accent-yellow/40 hover:border-accent-yellow',
  LOW: 'text-text-secondary border-border-secondary hover:border-text-muted',
};

const priorityActiveStyles: Record<string, string> = {
  All: 'bg-bg-tertiary text-text-primary border-accent-cyan',
  HIGH: 'bg-accent-red/10 text-accent-red border-accent-red',
  MEDIUM: 'bg-accent-yellow/10 text-accent-yellow border-accent-yellow',
  LOW: 'bg-text-muted/15 text-text-secondary border-text-muted',
};

export default function FilterBar({
  search, onSearch,
  selectedSector, onSector,
  selectedTheme, onTheme,
  selectedPriority, onPriority,
  sectors, themes,
  stockCount, totalCount,
}: Props) {
  const hasActiveFilters = search || selectedSector !== 'All' || selectedTheme !== 'All' || selectedPriority !== 'All';

  const clearAll = () => {
    onSearch('');
    onSector('All');
    onTheme('All');
    onPriority('All');
  };

  return (
    <div className="space-y-3">
      {/* Search + count */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search symbol, name, or theme..."
            className="w-full pl-9 pr-4 py-2 bg-bg-tertiary border border-border-primary rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/50 transition-colors"
          />
          {search && (
            <button
              onClick={() => onSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:text-text-primary text-text-muted transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <span className="text-sm text-text-secondary font-mono">
          <span className="text-text-primary font-semibold">{stockCount}</span>
          <span className="text-text-muted">/{totalCount}</span>
          <span className="ml-1">stocks</span>
        </span>

        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs text-text-secondary border border-border-primary hover:text-text-primary hover:border-accent-cyan/40 transition-colors"
          >
            <X className="w-3 h-3" />
            Clear filters
          </button>
        )}
      </div>

      {/* Sector tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-xs text-text-muted mr-1">Sector:</span>
        {sectors.map(sector => (
          <button
            key={sector}
            onClick={() => onSector(sector)}
            className={clsx(
              'px-3 py-1.5 rounded text-xs font-medium transition-all duration-150 border',
              selectedSector === sector
                ? 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/40'
                : 'text-text-secondary border-border-primary hover:text-text-primary hover:border-text-muted'
            )}
          >
            {sector}
          </button>
        ))}
      </div>

      {/* Priority + Theme row */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Priority */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-muted mr-1">Priority:</span>
          {PRIORITIES.map(p => (
            <button
              key={p}
              onClick={() => onPriority(p)}
              className={clsx(
                'px-2.5 py-1 rounded text-xs font-medium font-mono transition-all duration-150 border',
                selectedPriority === p
                  ? priorityActiveStyles[p]
                  : priorityStyles[p]
              )}
            >
              {p === 'All' ? 'ALL' : p}
            </button>
          ))}
        </div>

        {/* Theme chips */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs text-text-muted mr-1">Theme:</span>
          <button
            onClick={() => onTheme('All')}
            className={clsx(
              'px-2 py-0.5 rounded text-xs font-mono transition-all border',
              selectedTheme === 'All'
                ? 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30'
                : 'text-text-muted border-border-primary hover:text-text-secondary'
            )}
          >
            All
          </button>
          {themes.filter(t => t !== 'All').map(theme => (
            <button
              key={theme}
              onClick={() => onTheme(theme)}
              className={clsx(
                'px-2 py-0.5 rounded text-xs font-mono transition-all border',
                selectedTheme === theme
                  ? 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30'
                  : 'text-text-muted border-border-primary hover:text-text-secondary hover:border-text-muted'
              )}
            >
              {theme}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
