import { useState, useEffect, useRef } from 'react';
import { X, Search, Plus, Loader2 } from 'lucide-react';
import { portfolioApi } from '../../services/api';
import type { SymbolSearchResult, Priority } from '../../types';

interface Props {
  portfolioId: string;
  existingSymbols: string[];
  onClose: () => void;
  onAdd: (stock: { symbol: string; name?: string; priority?: string; theme?: string }) => Promise<void>;
}

const PRIORITY_OPTIONS: Priority[] = ['HIGH', 'MEDIUM', 'LOW'];

export default function AddStockModal({ portfolioId: _portfolioId, existingSymbols, onClose, onAdd }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SymbolSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SymbolSearchResult | null>(null);
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [theme, setTheme] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query.trim() || query.length < 1) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { results } = await portfolioApi.searchSymbol(query.trim());
        setResults(results);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  async function handleAdd() {
    if (!selected) return;
    setAdding(true);
    setError('');
    try {
      await onAdd({ symbol: selected.symbol, name: selected.name, priority, theme: theme.trim() || undefined });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add stock');
      setAdding(false);
    }
  }

  const isAlreadyAdded = (symbol: string) => existingSymbols.includes(symbol);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-bg-secondary border border-border-primary rounded-xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-primary">
          <div className="flex items-center gap-2.5">
            <Plus className="w-4 h-4 text-accent-cyan" />
            <h2 className="text-sm font-semibold text-text-primary">Add Stock</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-bg-tertiary rounded text-text-muted hover:text-text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Search */}
          {!selected ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search symbol or company name..."
                  className="w-full bg-bg-tertiary border border-border-primary rounded-lg pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-cyan/50 transition-colors"
                />
                {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted animate-spin" />}
              </div>

              {/* Results */}
              {results.length > 0 && (
                <div className="border border-border-primary rounded-lg overflow-hidden">
                  {results.map(r => {
                    const added = isAlreadyAdded(r.symbol);
                    return (
                      <button
                        key={r.symbol}
                        onClick={() => !added && setSelected(r)}
                        disabled={added}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm border-b border-border-primary/50 last:border-0 transition-colors text-left ${
                          added
                            ? 'opacity-40 cursor-not-allowed bg-bg-tertiary/30'
                            : 'hover:bg-bg-tertiary cursor-pointer'
                        }`}
                      >
                        <div>
                          <span className="font-mono font-semibold text-text-primary">{r.symbol}</span>
                          <span className="ml-3 text-text-secondary text-xs">{r.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-text-muted border border-border-primary rounded px-1.5 py-0.5">{r.type}</span>
                          {added && <span className="text-[10px] text-accent-green">Added</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {query.length > 0 && !searching && results.length === 0 && (
                <p className="text-xs text-text-muted text-center py-3">No results for "{query}"</p>
              )}

              {/* Manual entry tip */}
              {query.length > 0 && (
                <p className="text-xs text-text-muted text-center">
                  Or{' '}
                  <button
                    className="text-accent-cyan hover:underline"
                    onClick={() => setSelected({ symbol: query.toUpperCase(), name: query.toUpperCase(), type: 'Common Stock' })}
                  >
                    add "{query.toUpperCase()}" directly
                  </button>
                </p>
              )}
            </div>
          ) : (
            /* Configure selected stock */
            <div className="space-y-4">
              {/* Selected stock info */}
              <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg border border-accent-cyan/20">
                <div>
                  <span className="font-mono font-bold text-accent-cyan text-base">{selected.symbol}</span>
                  <p className="text-xs text-text-secondary mt-0.5">{selected.name}</p>
                </div>
                <button onClick={() => { setSelected(null); setQuery(''); }} className="text-xs text-text-muted hover:text-text-primary">
                  Change
                </button>
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-xs text-text-secondary uppercase tracking-wider">Priority</label>
                <div className="flex gap-2">
                  {PRIORITY_OPTIONS.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                        priority === p
                          ? p === 'HIGH'
                            ? 'bg-accent-red/20 border-accent-red text-accent-red'
                            : p === 'MEDIUM'
                            ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                            : 'bg-gray-500/20 border-gray-500 text-gray-400'
                          : 'bg-bg-tertiary border-border-primary text-text-muted hover:border-border-secondary'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme/Tag */}
              <div className="space-y-1.5">
                <label className="text-xs text-text-secondary uppercase tracking-wider">Theme / Tag <span className="text-text-muted normal-case">(optional)</span></label>
                <input
                  type="text"
                  value={theme}
                  onChange={e => setTheme(e.target.value)}
                  placeholder="e.g. AI, Cloud, Dividends..."
                  className="w-full bg-bg-tertiary border border-border-primary rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-cyan/50 transition-colors"
                />
              </div>

              {error && <p className="text-xs text-accent-red">{error}</p>}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-sm text-text-secondary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={adding}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-bg-primary bg-accent-cyan rounded-lg hover:bg-accent-cyan/90 disabled:opacity-50 transition-colors"
                >
                  {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  {adding ? 'Adding...' : 'Add to Portfolio'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
