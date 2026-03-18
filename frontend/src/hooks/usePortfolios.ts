import { useState, useEffect, useCallback, useRef } from 'react';
import { portfolioApi } from '../services/api';
import type { Portfolio, PortfolioStock } from '../types';

// List of all portfolios (lightweight, no prices)
export function usePortfolioList() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const { portfolios } = await portfolioApi.getAll();
      setPortfolios(portfolios);
    } catch (err) {
      console.error('Failed to load portfolios', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createPortfolio = useCallback(async (name: string, color: string, description?: string) => {
    const { portfolio } = await portfolioApi.create({ name, color, description });
    setPortfolios(prev => [...prev, portfolio]);
    return portfolio;
  }, []);

  const deletePortfolio = useCallback(async (id: string) => {
    await portfolioApi.delete(id);
    setPortfolios(prev => prev.filter(p => p.id !== id));
  }, []);

  const updatePortfolio = useCallback(async (id: string, data: { name?: string; color?: string; description?: string }) => {
    const { portfolio } = await portfolioApi.update(id, data);
    setPortfolios(prev => prev.map(p => p.id === id ? portfolio : p));
    return portfolio;
  }, []);

  return { portfolios, loading, createPortfolio, deletePortfolio, updatePortfolio, refresh: fetchAll };
}

// Single portfolio with live prices (polls every 30s)
export function usePortfolio(id: string | null) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedSymbols, setUpdatedSymbols] = useState<Set<string>>(new Set());
  const prevPrices = useRef<Record<string, number>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async (isPolling = false) => {
    if (!id) return;
    try {
      if (!isPolling) setLoading(true);
      const data = await portfolioApi.getById(id);

      // track price flashes
      const changed = new Set<string>();
      data.stocks.forEach((s: PortfolioStock) => {
        const prev = prevPrices.current[s.symbol];
        if (prev !== undefined && prev !== s.price && s.price > 0) changed.add(s.symbol);
        if (s.price > 0) prevPrices.current[s.symbol] = s.price;
      });
      if (changed.size > 0) {
        setUpdatedSymbols(changed);
        setTimeout(() => setUpdatedSymbols(new Set()), 800);
      }

      if (isPolling) {
        setPortfolio(prev => {
          if (!prev) return data;
          return {
            ...data,
            stocks: data.stocks.map((s: PortfolioStock) => {
              if (s.price === 0) {
                const existing = prev.stocks.find(p => p.symbol === s.symbol);
                return existing ? { ...s, price: existing.price, change: existing.change, changePercent: existing.changePercent } : s;
              }
              return s;
            }),
          };
        });
      } else {
        setPortfolio(data);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    prevPrices.current = {};
    setPortfolio(null);
    setLoading(true);
    fetch();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetch(true), 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetch, id]);

  const addStock = useCallback(async (stock: { symbol: string; name?: string; sector?: string; theme?: string; priority?: string }) => {
    if (!id) return;
    const { portfolio } = await portfolioApi.addStock(id, stock);
    setPortfolio(portfolio);
    // re-fetch to get prices
    setTimeout(() => fetch(), 200);
  }, [id, fetch]);

  const removeStock = useCallback(async (symbol: string) => {
    if (!id) return;
    const { portfolio } = await portfolioApi.removeStock(id, symbol);
    setPortfolio(portfolio);
  }, [id]);

  const updateStock = useCallback(async (symbol: string, data: { priority?: string; theme?: string }) => {
    if (!id) return;
    const { portfolio } = await portfolioApi.updateStock(id, symbol, data);
    setPortfolio(portfolio);
  }, [id]);

  return {
    portfolio,
    loading,
    error,
    updatedSymbols,
    addStock,
    removeStock,
    updateStock,
    refresh: () => fetch(),
  };
}
