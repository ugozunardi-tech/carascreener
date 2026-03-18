import { Router, Request, Response } from 'express';
import { portfolioStore } from '../services/portfolioStore';
import { batchGetQuotes, getQuote, getProfile } from '../services/finnhub';

const router = Router();

// GET /api/portfolios
router.get('/', async (_req: Request, res: Response) => {
  try {
    const portfolios = await portfolioStore.getAll();
    res.json({ portfolios });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /api/portfolios
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, color, description } = req.body as { name: string; color: string; description?: string };
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    const portfolio = await portfolioStore.create({
      name: name.trim(),
      color: color || '#00d4ff',
      description: description?.trim() || '',
    });
    return res.status(201).json({ portfolio });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// GET /api/portfolios/search/symbol?q=AAPL — symbol search via Finnhub (must be before /:id)
router.get('/search/symbol', async (req: Request, res: Response) => {
  const q = (req.query.q as string || '').trim().toUpperCase();
  if (!q || q.length < 1) return res.json({ results: [] });

  try {
    const { default: axios } = await import('axios');
    const apiKey = process.env.FINNHUB_API_KEY || '';
    const response = await axios.get('https://finnhub.io/api/v1/search', {
      params: { q, token: apiKey },
      timeout: 5000,
    });
    type RawResult = { symbol: string; description: string; type: string };
    const ALLOWED_TYPES = new Set(['Common Stock', 'ETP', 'ADR', 'GDR', 'DR']);
    const raw: RawResult[] = (response.data?.result || [])
      .filter((r: RawResult) => ALLOWED_TYPES.has(r.type));

    function relevance(r: RawResult): number {
      const sym  = r.symbol.toUpperCase();
      const desc = r.description.toUpperCase();
      const base = sym.split('.')[0];

      if (sym === q)  return 100;
      if (base === q) return 90;
      if (sym.startsWith(q) && !sym.includes('.')) return 80;
      if (sym.startsWith(q)) return 60;

      if (desc === q) return 70;
      if (desc.startsWith(q)) return 50;
      if (desc.includes(q)) return 30;

      return -1;
    }

    const sorted = [...raw]
      .filter(r => relevance(r) >= 0)
      .sort((a, b) => relevance(b) - relevance(a));

    const results = sorted.slice(0, 8).map(r => ({
      symbol: r.symbol,
      name: r.description,
      type: r.type,
    }));
    return res.json({ results });
  } catch {
    return res.json({ results: [] });
  }
});

// GET /api/portfolios/:id — with live prices
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const portfolio = await portfolioStore.getById(req.params.id);
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

    const symbols = portfolio.stocks.map(s => s.symbol);
    const quotes = symbols.length > 0 ? await batchGetQuotes(symbols) : {};

    const stocks = portfolio.stocks.map(stock => {
      const q = quotes[stock.symbol];
      return {
        ...stock,
        price:         q?.c  || 0,
        change:        q?.d  || 0,
        changePercent: q?.dp || 0,
        high:          q?.h  || 0,
        low:           q?.l  || 0,
        prevClose:     q?.pc || 0,
        timestamp:     q?.t  || 0,
        currency:      (q as { currency?: string })?.currency || 'USD',
      };
    });

    return res.json({ ...portfolio, stocks, updatedAt: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// PUT /api/portfolios/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, color, description } = req.body as { name?: string; color?: string; description?: string };
    const updated = await portfolioStore.update(req.params.id, { name, color, description });
    if (!updated) return res.status(404).json({ error: 'Portfolio not found' });
    return res.json({ portfolio: updated });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// DELETE /api/portfolios/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await portfolioStore.delete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Portfolio not found' });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// POST /api/portfolios/:id/stocks — add stock
router.post('/:id/stocks', async (req: Request, res: Response) => {
  try {
    const { symbol, name, sector, theme, priority } = req.body as {
      symbol: string; name?: string; sector?: string; theme?: string; priority?: 'HIGH' | 'MEDIUM' | 'LOW';
    };
    if (!symbol?.trim()) return res.status(400).json({ error: 'Symbol is required' });

    const upperSymbol = symbol.trim().toUpperCase();

    let stockName = name?.trim() || upperSymbol;
    let stockSector = sector?.trim() || 'Unknown';

    if (!name || !sector) {
      try {
        const profile = await getProfile(upperSymbol);
        if (profile?.name) stockName = profile.name;
        if (profile?.finnhubIndustry) stockSector = profile.finnhubIndustry;
      } catch { /* use defaults */ }
    }

    if (!name) {
      const quote = await getQuote(upperSymbol);
      if (!quote || quote.c === 0) {
        return res.status(400).json({ error: `Symbol "${upperSymbol}" not found or has no price data` });
      }
    }

    const portfolio = await portfolioStore.addStock(req.params.id, {
      symbol: upperSymbol,
      name: stockName,
      sector: stockSector,
      theme: theme?.trim() || '',
      priority: priority || 'MEDIUM',
    });

    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
    return res.status(201).json({ portfolio });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// DELETE /api/portfolios/:id/stocks/:symbol
router.delete('/:id/stocks/:symbol', async (req: Request, res: Response) => {
  try {
    const portfolio = await portfolioStore.removeStock(req.params.id, req.params.symbol);
    if (!portfolio) return res.status(404).json({ error: 'Portfolio or stock not found' });
    return res.json({ portfolio });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// PATCH /api/portfolios/:id/stocks/:symbol
router.patch('/:id/stocks/:symbol', async (req: Request, res: Response) => {
  try {
    const { priority, theme } = req.body as { priority?: 'HIGH' | 'MEDIUM' | 'LOW'; theme?: string };
    const portfolio = await portfolioStore.updateStock(req.params.id, req.params.symbol, { priority, theme });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio or stock not found' });
    return res.json({ portfolio });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

export default router;
