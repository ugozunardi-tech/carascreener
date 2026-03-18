import { Router, Request, Response } from 'express';
import { getQuote, getNews, getMetrics, getProfile } from '../services/finnhub';
import { getFullAnalysis, analyzeNews, analyzeTechnicals } from '../services/openai';
import { DEFAULT_WATCHLIST } from './stocks';

const router = Router();

// GET /api/analysis/:symbol - full GPT-4o analysis
router.get('/:symbol', async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const upperSymbol = symbol.toUpperCase();

  try {
    const watchlistItem = DEFAULT_WATCHLIST.find(s => s.symbol === upperSymbol);

    const [quote, news, metrics, profile] = await Promise.all([
      getQuote(upperSymbol),
      getNews(upperSymbol),
      getMetrics(upperSymbol),
      getProfile(upperSymbol),
    ]);

    if (!quote) {
      return res.status(404).json({ error: `No quote data found for ${upperSymbol}` });
    }

    const companyName = profile?.name || watchlistItem?.name || upperSymbol;

    const quoteData = {
      currentPrice: quote.c,
      change: quote.d,
      changePercent: quote.dp,
      high: quote.h,
      low: quote.l,
      open: quote.o,
      prevClose: quote.pc,
    };

    const metricsData = {
      high52w: metrics?.metric?.['52WeekHigh'] || quote.h * 1.2,
      low52w: metrics?.metric?.['52WeekLow'] || quote.l * 0.8,
      avgVolume: metrics?.metric?.averageVolume10Day || 0,
      beta: metrics?.metric?.beta || 1,
      pe: metrics?.metric?.peBasicExclExtraTTM || metrics?.metric?.peNormalizedAnnual || 0,
    };

    const analysis = await getFullAnalysis(
      upperSymbol,
      companyName,
      quoteData,
      metricsData,
      news
    );

    return res.json({
      symbol: upperSymbol,
      companyName,
      analysis,
    });
  } catch (error) {
    console.error(`Error generating analysis for ${symbol}:`, error);
    return res.status(500).json({ error: 'Failed to generate analysis' });
  }
});

// GET /api/analysis/:symbol/news - news-only analysis
router.get('/:symbol/news', async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const upperSymbol = symbol.toUpperCase();

  try {
    const watchlistItem = DEFAULT_WATCHLIST.find(s => s.symbol === upperSymbol);
    const [quote, news, profile] = await Promise.all([
      getQuote(upperSymbol),
      getNews(upperSymbol),
      getProfile(upperSymbol),
    ]);

    if (!quote) {
      return res.status(404).json({ error: `No data found for ${upperSymbol}` });
    }

    const companyName = profile?.name || watchlistItem?.name || upperSymbol;
    const analysis = await analyzeNews(
      upperSymbol,
      companyName,
      news,
      quote.c,
      quote.dp
    );

    return res.json({ symbol: upperSymbol, companyName, analysis, newsCount: news.length });
  } catch (error) {
    console.error(`Error analyzing news for ${symbol}:`, error);
    return res.status(500).json({ error: 'Failed to analyze news' });
  }
});

// GET /api/analysis/:symbol/technical - technical-only analysis
router.get('/:symbol/technical', async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const upperSymbol = symbol.toUpperCase();

  try {
    const watchlistItem = DEFAULT_WATCHLIST.find(s => s.symbol === upperSymbol);
    const [quote, metrics, profile] = await Promise.all([
      getQuote(upperSymbol),
      getMetrics(upperSymbol),
      getProfile(upperSymbol),
    ]);

    if (!quote) {
      return res.status(404).json({ error: `No data found for ${upperSymbol}` });
    }

    const companyName = profile?.name || watchlistItem?.name || upperSymbol;

    const quoteData = {
      currentPrice: quote.c,
      change: quote.d,
      changePercent: quote.dp,
      high: quote.h,
      low: quote.l,
      open: quote.o,
      prevClose: quote.pc,
    };

    const metricsData = {
      high52w: metrics?.metric?.['52WeekHigh'] || quote.h * 1.2,
      low52w: metrics?.metric?.['52WeekLow'] || quote.l * 0.8,
      avgVolume: metrics?.metric?.averageVolume10Day || 0,
      beta: metrics?.metric?.beta || 1,
      pe: metrics?.metric?.peBasicExclExtraTTM || 0,
    };

    const analysis = await analyzeTechnicals(upperSymbol, companyName, quoteData, metricsData);

    return res.json({ symbol: upperSymbol, companyName, analysis });
  } catch (error) {
    console.error(`Error analyzing technicals for ${symbol}:`, error);
    return res.status(500).json({ error: 'Failed to analyze technicals' });
  }
});

export default router;
