import { Router, Request, Response } from 'express';
import { getQuote, getProfile, getNews, getMetrics, batchGetQuotes } from '../services/finnhub';

const router = Router();

export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface WatchlistItem {
  symbol: string;
  name: string;
  sector: string;
  theme: string;
  priority: Priority;
}

export const DEFAULT_WATCHLIST: WatchlistItem[] = [
  // Tech
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', theme: 'Consumer Tech', priority: 'HIGH' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', theme: 'Cloud', priority: 'HIGH' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology', theme: 'AI/Semiconductors', priority: 'HIGH' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', theme: 'AI', priority: 'HIGH' },
  { symbol: 'META', name: 'Meta Platforms', sector: 'Technology', theme: 'AI/Social', priority: 'MEDIUM' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Technology', theme: 'Cloud/E-Commerce', priority: 'HIGH' },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Discretionary', theme: 'EV/AI', priority: 'HIGH' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology', theme: 'AI/Semiconductors', priority: 'HIGH' },
  { symbol: 'INTC', name: 'Intel Corp.', sector: 'Technology', theme: 'Semiconductors', priority: 'MEDIUM' },
  { symbol: 'CRM', name: 'Salesforce Inc.', sector: 'Technology', theme: 'Cloud/AI', priority: 'MEDIUM' },
  { symbol: 'SNOW', name: 'Snowflake Inc.', sector: 'Technology', theme: 'Cloud/AI', priority: 'MEDIUM' },
  { symbol: 'PLTR', name: 'Palantir Technologies', sector: 'Technology', theme: 'AI', priority: 'HIGH' },
  // Finance
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Financial', theme: 'Banking', priority: 'MEDIUM' },
  { symbol: 'GS', name: 'Goldman Sachs', sector: 'Financial', theme: 'Banking', priority: 'MEDIUM' },
  { symbol: 'V', name: 'Visa Inc.', sector: 'Financial', theme: 'Payments', priority: 'MEDIUM' },
  { symbol: 'COIN', name: 'Coinbase Global', sector: 'Financial', theme: 'Crypto', priority: 'HIGH' },
  // Healthcare
  { symbol: 'LLY', name: 'Eli Lilly', sector: 'Healthcare', theme: 'Biotech/GLP1', priority: 'HIGH' },
  { symbol: 'NVO', name: 'Novo Nordisk', sector: 'Healthcare', theme: 'Biotech/GLP1', priority: 'HIGH' },
  { symbol: 'MRNA', name: 'Moderna Inc.', sector: 'Healthcare', theme: 'Biotech', priority: 'MEDIUM' },
  // Energy
  { symbol: 'XOM', name: 'ExxonMobil', sector: 'Energy', theme: 'Oil & Gas', priority: 'LOW' },
  { symbol: 'NEE', name: 'NextEra Energy', sector: 'Energy', theme: 'Renewable Energy', priority: 'MEDIUM' },
  // Consumer
  { symbol: 'COST', name: 'Costco Wholesale', sector: 'Consumer Staples', theme: 'Retail', priority: 'MEDIUM' },
  { symbol: 'NKE', name: 'Nike Inc.', sector: 'Consumer Discretionary', theme: 'Consumer', priority: 'LOW' },
  // International
  { symbol: 'BABA', name: 'Alibaba Group', sector: 'Technology', theme: 'China Tech', priority: 'MEDIUM' },
  { symbol: 'TSM', name: 'Taiwan Semiconductor', sector: 'Technology', theme: 'Semiconductors', priority: 'HIGH' },
  { symbol: 'ASML', name: 'ASML Holding', sector: 'Technology', theme: 'Semiconductors', priority: 'HIGH' },
  // ETFs/Others
  { symbol: 'SPY', name: 'S&P 500 ETF', sector: 'ETF', theme: 'Index', priority: 'MEDIUM' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF', sector: 'ETF', theme: 'Index', priority: 'MEDIUM' },
  { symbol: 'MSTR', name: 'MicroStrategy', sector: 'Technology', theme: 'Crypto/Bitcoin', priority: 'HIGH' },
  { symbol: 'APP', name: 'Applovin Corp.', sector: 'Technology', theme: 'AI/AdTech', priority: 'HIGH' },
];

// In-memory priority overrides
const priorityOverrides: Record<string, Priority> = {};

// GET /api/stocks - return all watchlist stocks with current prices
router.get('/', async (_req: Request, res: Response) => {
  try {
    const symbols = DEFAULT_WATCHLIST.map(s => s.symbol);
    const quotes = await batchGetQuotes(symbols);

    const stocks = DEFAULT_WATCHLIST.map(item => {
      const quote = quotes[item.symbol];
      return {
        ...item,
        priority: priorityOverrides[item.symbol] || item.priority,
        price:         quote?.c  || 0,
        change:        quote?.d  || 0,
        changePercent: quote?.dp || 0,
        high:          quote?.h  || 0,
        low:           quote?.l  || 0,
        open:          quote?.o  || 0,
        prevClose:     quote?.pc || 0,
        volume:        0,
        timestamp:     quote?.t  || 0,
        currency:      (quote as { currency?: string } | undefined)?.currency || 'USD',
      };
    });

    res.json({ stocks, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Error fetching stocks:', error);
    res.status(500).json({ error: 'Failed to fetch stocks' });
  }
});

// GET /api/stocks/sectors - stocks grouped by sector
router.get('/sectors', (_req: Request, res: Response) => {
  const sectors: Record<string, WatchlistItem[]> = {};

  DEFAULT_WATCHLIST.forEach(item => {
    if (!sectors[item.sector]) {
      sectors[item.sector] = [];
    }
    sectors[item.sector].push({
      ...item,
      priority: (priorityOverrides[item.symbol] || item.priority) as Priority,
    });
  });

  res.json({ sectors });
});

// GET /api/stocks/:symbol - stock detail
router.get('/:symbol', async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const upperSymbol = symbol.toUpperCase();

  try {
    const [quote, profile, metrics] = await Promise.all([
      getQuote(upperSymbol),
      getProfile(upperSymbol),
      getMetrics(upperSymbol),
    ]);

    const watchlistItem = DEFAULT_WATCHLIST.find(s => s.symbol === upperSymbol);

    res.json({
      symbol: upperSymbol,
      name: profile?.name || watchlistItem?.name || upperSymbol,
      sector: watchlistItem?.sector || profile?.finnhubIndustry || 'Unknown',
      theme: watchlistItem?.theme || '',
      priority: priorityOverrides[upperSymbol] || watchlistItem?.priority || 'MEDIUM',
      quote: quote ? {
        price:         quote.c,
        change:        quote.d,
        changePercent: quote.dp,
        high:          quote.h,
        low:           quote.l,
        open:          quote.o,
        prevClose:     quote.pc,
        timestamp:     quote.t,
        currency:      (quote as { currency?: string }).currency || 'USD',
      } : null,
      profile: profile ? {
        marketCap: profile.marketCapitalization,
        country: profile.country,
        exchange: profile.exchange,
        ipo: profile.ipo,
        logo: profile.logo,
        weburl: profile.weburl,
        industry: profile.finnhubIndustry,
        currency: profile.currency,
      } : null,
      metrics: metrics?.metric ? {
        high52w: metrics.metric['52WeekHigh'],
        low52w: metrics.metric['52WeekLow'],
        high52wDate: metrics.metric['52WeekHighDate'],
        low52wDate: metrics.metric['52WeekLowDate'],
        pe: metrics.metric.peBasicExclExtraTTM || metrics.metric.peNormalizedAnnual,
        ps: metrics.metric.psAnnual,
        pb: metrics.metric.pbAnnual,
        eps: metrics.metric.epsBasicExclExtraItemsAnnual,
        revenueGrowth3Y: metrics.metric.revenueGrowth3Y,
        grossMargin: metrics.metric.grossMarginAnnual,
        netProfitMargin: metrics.metric.netProfitMarginAnnual,
        roe: metrics.metric.roeRfy,
        roa: metrics.metric.roaRfy,
        beta: metrics.metric.beta,
        avgVolume10d: metrics.metric.averageVolume10Day,
        debtToEquity: metrics.metric.totalDebt_totalEquityAnnual,
      } : null,
    });
  } catch (error) {
    console.error(`Error fetching stock ${symbol}:`, error);
    res.status(500).json({ error: 'Failed to fetch stock details' });
  }
});

// GET /api/stocks/:symbol/news
router.get('/:symbol/news', async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const upperSymbol = symbol.toUpperCase();

  try {
    const news = await getNews(upperSymbol);
    res.json({ news, symbol: upperSymbol });
  } catch (error) {
    console.error(`Error fetching news for ${symbol}:`, error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

export { priorityOverrides };
export default router;
