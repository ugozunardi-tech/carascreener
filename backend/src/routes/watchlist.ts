import { Router, Request, Response } from 'express';
import { DEFAULT_WATCHLIST, priorityOverrides, Priority } from './stocks';

const router = Router();

// GET /api/watchlist - get current watchlist with priority overrides
router.get('/', (_req: Request, res: Response) => {
  const watchlist = DEFAULT_WATCHLIST.map(item => ({
    ...item,
    priority: (priorityOverrides[item.symbol] || item.priority) as Priority,
  }));
  res.json({ watchlist });
});

// PATCH /api/watchlist/:symbol/priority - update priority
router.patch('/:symbol/priority', (req: Request, res: Response) => {
  const { symbol } = req.params;
  const { priority } = req.body as { priority: Priority };
  const upperSymbol = symbol.toUpperCase();

  const validPriorities: Priority[] = ['HIGH', 'MEDIUM', 'LOW'];
  if (!validPriorities.includes(priority)) {
    return res.status(400).json({ error: 'Invalid priority. Must be HIGH, MEDIUM, or LOW' });
  }

  const item = DEFAULT_WATCHLIST.find(s => s.symbol === upperSymbol);
  if (!item) {
    return res.status(404).json({ error: `Symbol ${upperSymbol} not found in watchlist` });
  }

  priorityOverrides[upperSymbol] = priority;
  return res.json({
    symbol: upperSymbol,
    priority,
    message: `Priority updated to ${priority}`,
  });
});

export default router;
