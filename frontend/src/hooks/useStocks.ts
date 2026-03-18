import { useState, useEffect, useCallback, useRef } from 'react';
import { stocksApi } from '../services/api';
import type { StockItem, SortConfig, SortField } from '../types';

const POLL_INTERVAL = 30000; // 30 seconds

export function useStocks() {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [updatedSymbols, setUpdatedSymbols] = useState<Set<string>>(new Set());
  const prevPrices = useRef<Record<string, number>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStocks = useCallback(async (isPolling = false) => {
    try {
      if (!isPolling) setLoading(true);
      const data = await stocksApi.getAll();

      setStocks(prev => {
        const changed = new Set<string>();
        data.stocks.forEach(stock => {
          const prevPrice = prevPrices.current[stock.symbol];
          if (prevPrice !== undefined && prevPrice !== stock.price && stock.price > 0) {
            changed.add(stock.symbol);
          }
          if (stock.price > 0) {
            prevPrices.current[stock.symbol] = stock.price;
          }
        });

        if (changed.size > 0) {
          setUpdatedSymbols(changed);
          setTimeout(() => setUpdatedSymbols(new Set()), 800);
        }

        // Preserve prices from previous fetch if new price is 0
        if (isPolling) {
          return data.stocks.map(stock => {
            if (stock.price === 0) {
              const existing = prev.find(p => p.symbol === stock.symbol);
              return existing ? { ...stock, price: existing.price, change: existing.change, changePercent: existing.changePercent } : stock;
            }
            return stock;
          });
        }
        return data.stocks;
      });

      setLastUpdated(new Date(data.updatedAt));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stocks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStocks();
    pollRef.current = setInterval(() => fetchStocks(true), POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchStocks]);

  const refresh = useCallback(() => fetchStocks(), [fetchStocks]);

  return { stocks, loading, error, lastUpdated, updatedSymbols, refresh };
}

export function useSortedStocks(stocks: StockItem[]) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'priority', direction: 'asc' });

  const toggleSort = useCallback((field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const sorted = [...stocks].sort((a, b) => {
    const { field, direction } = sortConfig;
    const mult = direction === 'asc' ? 1 : -1;

    if (field === 'priority') {
      const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return (order[a.priority] - order[b.priority]) * mult;
    }
    if (field === 'symbol' || field === 'name') {
      return a[field].localeCompare(b[field]) * mult;
    }
    return ((a[field] as number) - (b[field] as number)) * mult;
  });

  return { sorted, sortConfig, toggleSort };
}

export function useFilteredStocks(stocks: StockItem[]) {
  const [search, setSearch] = useState('');
  const [selectedSector, setSelectedSector] = useState('All');
  const [selectedTheme, setSelectedTheme] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');

  const sectors = ['All', ...Array.from(new Set(stocks.map(s => s.sector))).sort()];
  const themes = ['All', ...Array.from(new Set(stocks.map(s => s.theme))).sort()];

  const filtered = stocks.filter(stock => {
    const q = search.toLowerCase();
    if (q && !stock.symbol.toLowerCase().includes(q) && !stock.name.toLowerCase().includes(q) && !stock.theme.toLowerCase().includes(q)) {
      return false;
    }
    if (selectedSector !== 'All' && stock.sector !== selectedSector) return false;
    if (selectedTheme !== 'All' && stock.theme !== selectedTheme) return false;
    if (selectedPriority !== 'All' && stock.priority !== selectedPriority) return false;
    return true;
  });

  return {
    filtered,
    search, setSearch,
    selectedSector, setSelectedSector,
    selectedTheme, setSelectedTheme,
    selectedPriority, setSelectedPriority,
    sectors,
    themes,
  };
}
