import axios from 'axios';
import NodeCache from 'node-cache';
import { getYahooQuote, getYahooProfile } from './yahoo';

const BASE_URL = 'https://finnhub.io/api/v1';
const API_KEY = process.env.FINNHUB_API_KEY || '';

// Cache: 30s for quotes, 5min for profile/metrics, 10min for news
const quoteCache = new NodeCache({ stdTTL: 30 });
const profileCache = new NodeCache({ stdTTL: 300 });
const newsCache = new NodeCache({ stdTTL: 600 });
const metricsCache = new NodeCache({ stdTTL: 300 });

const finnhubClient = axios.create({
  baseURL: BASE_URL,
  params: { token: API_KEY },
  timeout: 10000,
});

export interface FinnhubQuote {
  c: number;   // current price
  d: number;   // change
  dp: number;  // change percent
  h: number;   // high
  l: number;   // low
  o: number;   // open
  pc: number;  // previous close
  t: number;   // timestamp
  currency?: string;  // 'USD' default; 'EUR', 'GBP' etc. for non-US stocks
  high52w?: number;   // from Yahoo fallback
  low52w?:  number;
}

export interface FinnhubProfile {
  country: string;
  currency: string;
  exchange: string;
  ipo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
  logo: string;
  finnhubIndustry: string;
}

export interface FinnhubNews {
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

export interface FinnhubMetrics {
  metric: {
    '52WeekHigh': number;
    '52WeekLow': number;
    '52WeekHighDate': string;
    '52WeekLowDate': string;
    peBasicExclExtraTTM: number;
    peNormalizedAnnual: number;
    psAnnual: number;
    pbAnnual: number;
    epsBasicExclExtraItemsAnnual: number;
    revenueGrowth3Y: number;
    ebitdaCagr5Y: number;
    grossMarginAnnual: number;
    netProfitMarginAnnual: number;
    roaRfy: number;
    roeRfy: number;
    currentRatioAnnual: number;
    totalDebt_totalEquityAnnual: number;
    averageVolume10Day: number;
    beta: number;
  };
}

export async function getQuote(symbol: string): Promise<FinnhubQuote | null> {
  const cacheKey = `quote_${symbol}`;
  const cached = quoteCache.get<FinnhubQuote>(cacheKey);
  if (cached) return cached;

  // Symbols with exchange suffix (RACE.MI, BMW.DE, MC.PA) → go straight to Yahoo.
  // Do NOT fall back to the base ticker on Finnhub — e.g. MC.PA base = MC (Moelis, not LVMH).
  if (symbol.includes('.')) {
    const yahooQuote = await getYahooQuote(symbol);
    if (yahooQuote) {
      quoteCache.set(cacheKey, yahooQuote as unknown as FinnhubQuote);
      return yahooQuote as unknown as FinnhubQuote;
    }
    return null;
  }

  // US/standard symbol → try Finnhub
  try {
    const response = await finnhubClient.get<FinnhubQuote>('/quote', { params: { symbol } });
    if (response.data && response.data.c !== 0) {
      quoteCache.set(cacheKey, response.data);
      return response.data;
    }
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
  }
  return null;
}

export async function getProfile(symbol: string): Promise<FinnhubProfile | null> {
  const cacheKey = `profile_${symbol}`;
  const cached = profileCache.get<FinnhubProfile>(cacheKey);
  if (cached) return cached;

  const tickersToTry = [symbol];
  if (symbol.includes('.')) {
    tickersToTry.push(symbol.split('.')[0]);
  }

  // European symbol → Yahoo profile
  if (symbol.includes('.')) {
    const yp = await getYahooProfile(symbol);
    if (yp) {
      const mapped: FinnhubProfile = {
        name: yp.name, country: yp.country, currency: yp.currency,
        exchange: yp.exchange, ipo: '', marketCapitalization: 0,
        phone: '', shareOutstanding: 0, ticker: symbol,
        weburl: yp.weburl, logo: '', finnhubIndustry: yp.industry || yp.sector,
      };
      profileCache.set(cacheKey, mapped);
      return mapped;
    }
    return null;
  }

  try {
    const response = await finnhubClient.get<FinnhubProfile>('/stock/profile2', { params: { symbol } });
    if (response.data && response.data.name) {
      profileCache.set(cacheKey, response.data);
      return response.data;
    }
  } catch (error) {
    console.error(`Error fetching profile for ${symbol}:`, error);
  }
  return null;
}

export async function getNews(symbol: string, from?: string, to?: string): Promise<FinnhubNews[]> {
  const today = new Date();
  const toDate = to || today.toISOString().split('T')[0];
  const fromDate = from || new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0];

  const cacheKey = `news_${symbol}_${fromDate}_${toDate}`;
  const cached = newsCache.get<FinnhubNews[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await finnhubClient.get<FinnhubNews[]>('/company-news', {
      params: { symbol, from: fromDate, to: toDate },
    });
    const news = Array.isArray(response.data) ? response.data.slice(0, 15) : [];
    newsCache.set(cacheKey, news);
    return news;
  } catch (error) {
    console.error(`Error fetching news for ${symbol}:`, error);
    return [];
  }
}

export async function getMetrics(symbol: string): Promise<FinnhubMetrics | null> {
  const cacheKey = `metrics_${symbol}`;
  const cached = metricsCache.get<FinnhubMetrics>(cacheKey);
  if (cached) return cached;

  try {
    const response = await finnhubClient.get<FinnhubMetrics>('/stock/metric', {
      params: { symbol, metric: 'all' },
    });
    if (response.data) {
      metricsCache.set(cacheKey, response.data);
      return response.data;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching metrics for ${symbol}:`, error);
    return null;
  }
}

export async function batchGetQuotes(symbols: string[]): Promise<Record<string, FinnhubQuote>> {
  const results: Record<string, FinnhubQuote> = {};

  // Process in batches of 5 to respect rate limits
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const promises = batch.map(async (symbol) => {
      const quote = await getQuote(symbol);
      if (quote) results[symbol] = quote;
    });
    await Promise.all(promises);

    // Small delay between batches to respect rate limits
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}
