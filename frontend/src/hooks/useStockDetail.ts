import { useState, useEffect } from 'react';
import { stocksApi, analysisApi } from '../services/api';
import type { StockDetail, NewsItem, FullAnalysis } from '../types';

export function useStockDetail(symbol: string) {
  const [detail, setDetail] = useState<StockDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    setError(null);

    stocksApi.getDetail(symbol)
      .then(data => {
        setDetail(data);
        setError(null);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to fetch stock details');
      })
      .finally(() => setLoading(false));
  }, [symbol]);

  return { detail, loading, error };
}

export function useStockNews(symbol: string) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);

    stocksApi.getNews(symbol)
      .then(data => {
        setNews(data.news);
        setError(null);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to fetch news');
      })
      .finally(() => setLoading(false));
  }, [symbol]);

  return { news, loading, error };
}

export function useStockAnalysis(symbol: string, enabled = false) {
  const [analysis, setAnalysis] = useState<FullAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);

    analysisApi.getFull(symbol)
      .then(data => {
        setAnalysis(data.analysis);
        setError(null);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to generate analysis');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (enabled) fetch();
  }, [symbol, enabled]);

  return { analysis, loading, error, refetch: fetch };
}
