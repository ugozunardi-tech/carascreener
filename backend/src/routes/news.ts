import { Router, Request, Response } from 'express';
import NodeCache from 'node-cache';
import { getNews, FinnhubNews } from '../services/finnhub';

const router = Router();
const feedCache = new NodeCache({ stdTTL: 600 });

type Signal = 'INVESTMENT' | 'M&A' | 'SUPPLY CHAIN' | 'REGULATORY' | 'DISRUPTION' | 'NEWS';

interface TaggedArticle extends FinnhubNews {
  signal: Signal;
  symbol: string;
}

// Returns signal + relevance score (0 = generic noise, higher = more relevant)
function scoreArticle(headline: string, symbol: string): { signal: Signal; score: number } {
  const h = headline.toLowerCase();
  const sym = symbol.toLowerCase();

  // Boost if headline explicitly mentions the ticker or contains it as a word
  const mentionsTicker = new RegExp(`\\b${sym}\\b`).test(h);

  let signal: Signal = 'NEWS';
  let score = mentionsTicker ? 1 : 0;

  if (/acqui|merger|buyout|takeover|deal closed|to buy|bought/.test(h)) {
    signal = 'M&A'; score += 3;
  } else if (/invest|stake|fund|raises?\s+\$|funding round|venture|series [a-e]/.test(h)) {
    signal = 'INVESTMENT'; score += 3;
  } else if (/supply chain|manufactur|contract|partnership|supplier|joint venture/.test(h)) {
    signal = 'SUPPLY CHAIN'; score += 2;
  } else if (/tariff|sanction|ban|restrict|regulat|fda|sec\s|ftc|antitrust|fine|penalty/.test(h)) {
    signal = 'REGULATORY'; score += 2;
  } else if (/disruption|shortage|recall|halt|outage|strike|bankruptcy|default|crisis/.test(h)) {
    signal = 'DISRUPTION'; score += 3;
  } else {
    // Generic NEWS — only keep if it explicitly mentions the ticker (score >= 1)
    // or contains strong company-specific keywords
    if (/earnings|revenue|profit|loss|guidance|forecast|beat|miss|q[1-4]\s+\d{4}|full.?year/.test(h)) {
      score += 2; // financial results are always relevant
    } else if (/ceo|cfo|executive|appoint|resign|board/.test(h)) {
      score += 1;
    } else if (/launch|product|service|expan|open|new\s+\w+\s+market/.test(h)) {
      score += 1;
    }
  }

  return { signal, score };
}

router.get('/feed', async (req: Request, res: Response) => {
  try {
    const symbolsParam = typeof req.query.symbols === 'string' ? req.query.symbols.trim() : '';
    const symbols = symbolsParam
      ? symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 20)
      : [];

    const daysParam = parseInt(req.query.days as string, 10);
    const days = isNaN(daysParam) || daysParam < 1 ? 3 : Math.min(daysParam, 7);

    const cacheKey = `feed_${[...symbols].sort().join(',')}_${days}`;
    const cached = feedCache.get<{ articles: TaggedArticle[]; fetchedAt: string }>(cacheKey);
    if (cached) return res.json(cached);

    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const toStr   = toDate.toISOString().split('T')[0];
    const fromStr = fromDate.toISOString().split('T')[0];

    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const articles = await getNews(symbol, fromStr, toStr);
        return articles
          .map((article): TaggedArticle & { _score: number } => {
            const { signal, score } = scoreArticle(article.headline, symbol);
            return { ...article, signal, symbol, _score: score };
          })
          // Drop generic noise: score 0 = article never mentions the ticker and has no signal
          .filter(a => a._score >= 1);
      })
    );

    // Flatten, deduplicate by id, sort by datetime desc
    const seen = new Set<number>();
    const flat: TaggedArticle[] = [];
    for (const batch of results) {
      for (const article of batch) {
        if (!seen.has(article.id)) {
          seen.add(article.id);
          const { _score: _s, ...clean } = article as TaggedArticle & { _score: number };
          void _s;
          flat.push(clean);
        }
      }
    }
    flat.sort((a, b) => b.datetime - a.datetime);

    const payload = { articles: flat, fetchedAt: new Date().toISOString() };
    feedCache.set(cacheKey, payload);
    return res.json(payload);
  } catch (err) {
    console.error('Error in GET /api/news/feed:', err);
    return res.status(500).json({ error: 'Failed to fetch news feed' });
  }
});

export default router;
