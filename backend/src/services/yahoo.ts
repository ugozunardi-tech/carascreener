/**
 * Yahoo Finance fallback for European/non-US stocks not supported by Finnhub free tier.
 * Uses the yahoo-finance2 package which handles Yahoo's authentication automatically.
 */
import NodeCache from 'node-cache';
// yahoo-finance2 v3+ requires `new YahooFinance()`
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { default: YahooFinanceClass } = require('yahoo-finance2') as {
  default: new (opts?: { suppressNotices?: string[] }) => {
    quote: (symbol: string) => Promise<{
      regularMarketPrice?: number;
      regularMarketChange?: number;
      regularMarketChangePercent?: number;
      regularMarketDayHigh?: number;
      regularMarketDayLow?: number;
      regularMarketOpen?: number;
      regularMarketPreviousClose?: number;
      regularMarketTime?: Date;
      fiftyTwoWeekHigh?: number;
      fiftyTwoWeekLow?: number;
      currency?: string;
      longName?: string;
      shortName?: string;
      fullExchangeName?: string;
    }>;
  };
};

const yf = new YahooFinanceClass({ suppressNotices: ['yahooSurvey'] });

const quoteCache = new NodeCache({ stdTTL: 60 });  // 1 min

export interface YahooQuote {
  c:  number;
  d:  number;
  dp: number;
  h:  number;
  l:  number;
  o:  number;
  pc: number;
  t:  number;
  currency: string;
  high52w?: number;
  low52w?:  number;
  name?: string;
  exchange?: string;
}

export interface YahooProfile {
  name:     string;
  sector:   string;
  industry: string;
  country:  string;
  currency: string;
  exchange: string;
  logo:     string;
  weburl:   string;
}

export async function getYahooQuote(symbol: string): Promise<YahooQuote | null> {
  const cacheKey = `yq3_${symbol}`;
  const cached = quoteCache.get<YahooQuote>(cacheKey);
  if (cached) return cached;

  try {
    const r = await yf.quote(symbol);
    const c  = r.regularMarketPrice ?? 0;
    if (!c) return null;

    const pc = r.regularMarketPreviousClose ?? c;
    const quote: YahooQuote = {
      c,
      d:  r.regularMarketChange ?? (c - pc),
      dp: r.regularMarketChangePercent ?? 0,
      h:  r.regularMarketDayHigh  ?? c,
      l:  r.regularMarketDayLow   ?? c,
      o:  r.regularMarketOpen     ?? c,
      pc,
      t:  r.regularMarketTime ? Math.floor(new Date(r.regularMarketTime).getTime() / 1000) : Math.floor(Date.now() / 1000),
      currency: r.currency ?? 'USD',
      high52w:  r.fiftyTwoWeekHigh,
      low52w:   r.fiftyTwoWeekLow,
      name:     r.longName ?? r.shortName,
      exchange: r.fullExchangeName,
    };

    quoteCache.set(cacheKey, quote);
    return quote;
  } catch (err) {
    console.error(`Yahoo Finance error for ${symbol}:`, (err as Error).message);
    return null;
  }
}

export async function getYahooProfile(symbol: string): Promise<YahooProfile | null> {
  const quote = await getYahooQuote(symbol);
  if (!quote?.name) return null;
  return {
    name:     quote.name,
    sector:   '',
    industry: '',
    country:  '',
    currency: quote.currency,
    exchange: quote.exchange ?? '',
    logo:     '',
    weburl:   '',
  };
}
