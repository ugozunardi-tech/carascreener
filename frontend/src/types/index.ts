export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
export type Sentiment = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type Trend = 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
export type TrendStrength = 'STRONG' | 'MODERATE' | 'WEAK';
export type Recommendation = 'BUY' | 'SELL' | 'HOLD' | 'WATCH';

export interface StockItem {
  symbol: string;
  name: string;
  sector: string;
  theme: string;
  priority: Priority;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  volume: number;
  timestamp: number;
  currency?: string;  // 'USD' default; 'EUR', 'GBP' etc. for European stocks
}

export interface StockDetail {
  symbol: string;
  name: string;
  sector: string;
  theme: string;
  priority: Priority;
  quote: {
    price: number;
    change: number;
    changePercent: number;
    high: number;
    low: number;
    open: number;
    prevClose: number;
    timestamp: number;
  } | null;
  profile: {
    marketCap: number;
    country: string;
    exchange: string;
    ipo: string;
    logo: string;
    weburl: string;
    industry: string;
    currency: string;
  } | null;
  metrics: {
    high52w: number;
    low52w: number;
    high52wDate: string;
    low52wDate: string;
    pe: number;
    ps: number;
    pb: number;
    eps: number;
    revenueGrowth3Y: number;
    grossMargin: number;
    netProfitMargin: number;
    roe: number;
    roa: number;
    beta: number;
    avgVolume10d: number;
    debtToEquity: number;
  } | null;
}

export interface NewsItem {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export interface NewsAnalysis {
  summary: string;
  sentiment: Sentiment;
  sentimentScore: number;
  keyPoints: string[];
  risks: string[];
  catalysts: string[];
}

export interface TechnicalAnalysis {
  trend: Trend;
  trendStrength: TrendStrength;
  supportLevels: number[];
  resistanceLevels: number[];
  volumeAnalysis: string;
  priceActionSummary: string;
  recommendation: Recommendation;
  confidence: number;
  keyInsights: string[];
}

export interface FullAnalysis {
  news: NewsAnalysis;
  technical: TechnicalAnalysis;
  overallSummary: string;
  timestamp: string;
}

export interface WatchlistResponse {
  stocks: StockItem[];
  updatedAt: string;
}

export type SortField = 'symbol' | 'name' | 'price' | 'change' | 'changePercent' | 'priority';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

// Portfolio types
export interface PortfolioStock {
  symbol: string;
  name: string;
  sector: string;
  theme: string;
  priority: Priority;
  addedAt: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  prevClose: number;
  timestamp: number;
  currency?: string;
}

export interface Portfolio {
  id: string;
  name: string;
  color: string;
  description: string;
  stocks: PortfolioStock[];
  createdAt: string;
  updatedAt: string;
}

export interface SymbolSearchResult {
  symbol: string;
  name: string;
  type: string;
}

export const PORTFOLIO_COLORS = [
  '#00d4ff',
  '#00ff88',
  '#a78bfa',
  '#f59e0b',
  '#f472b6',
  '#34d399',
  '#fb923c',
  '#60a5fa',
];
