import axios from 'axios';
import type { WatchlistResponse, StockDetail, NewsItem, FullAnalysis, Priority } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    const message = error.response?.data?.error || error.message || 'Network error';
    console.error('API Error:', message);
    return Promise.reject(new Error(message));
  }
);

export const stocksApi = {
  getAll: async (): Promise<WatchlistResponse> => {
    const { data } = await api.get<WatchlistResponse>('/stocks');
    return data;
  },

  getDetail: async (symbol: string): Promise<StockDetail> => {
    const { data } = await api.get<StockDetail>(`/stocks/${symbol}`);
    return data;
  },

  getNews: async (symbol: string): Promise<{ news: NewsItem[]; symbol: string }> => {
    const { data } = await api.get<{ news: NewsItem[]; symbol: string }>(`/stocks/${symbol}/news`);
    return data;
  },

  getSectors: async () => {
    const { data } = await api.get('/stocks/sectors');
    return data;
  },
};

export const analysisApi = {
  getFull: async (symbol: string): Promise<{ symbol: string; companyName: string; analysis: FullAnalysis }> => {
    const { data } = await api.get(`/analysis/${symbol}`);
    return data;
  },

  getNews: async (symbol: string) => {
    const { data } = await api.get(`/analysis/${symbol}/news`);
    return data;
  },

  getTechnical: async (symbol: string) => {
    const { data } = await api.get(`/analysis/${symbol}/technical`);
    return data;
  },
};

export const watchlistApi = {
  updatePriority: async (symbol: string, priority: Priority) => {
    const { data } = await api.patch(`/watchlist/${symbol}/priority`, { priority });
    return data;
  },
};

export default api;

export const portfolioApi = {
  getAll: async (): Promise<{ portfolios: import('../types').Portfolio[] }> => {
    const { data } = await api.get('/portfolios');
    return data;
  },

  getById: async (id: string): Promise<import('../types').Portfolio> => {
    const { data } = await api.get(`/portfolios/${id}`);
    return data;
  },

  create: async (payload: { name: string; color: string; description?: string }) => {
    const { data } = await api.post('/portfolios', payload);
    return data as { portfolio: import('../types').Portfolio };
  },

  update: async (id: string, payload: { name?: string; color?: string; description?: string }) => {
    const { data } = await api.put(`/portfolios/${id}`, payload);
    return data as { portfolio: import('../types').Portfolio };
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/portfolios/${id}`);
  },

  addStock: async (portfolioId: string, stock: { symbol: string; name?: string; sector?: string; theme?: string; priority?: string }) => {
    const { data } = await api.post(`/portfolios/${portfolioId}/stocks`, stock);
    return data as { portfolio: import('../types').Portfolio };
  },

  removeStock: async (portfolioId: string, symbol: string) => {
    const { data } = await api.delete(`/portfolios/${portfolioId}/stocks/${symbol}`);
    return data as { portfolio: import('../types').Portfolio };
  },

  updateStock: async (portfolioId: string, symbol: string, payload: { priority?: string; theme?: string }) => {
    const { data } = await api.patch(`/portfolios/${portfolioId}/stocks/${symbol}`, payload);
    return data as { portfolio: import('../types').Portfolio };
  },

  searchSymbol: async (q: string) => {
    const { data } = await api.get('/portfolios/search/symbol', { params: { q } });
    return data as { results: import('../types').SymbolSearchResult[] };
  },
};
