import { Router, Request, Response } from 'express';
import NodeCache from 'node-cache';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const router = Router();

// In-memory cache (fast layer, 24h)
const cache = new NodeCache({ stdTTL: 86400 });

// Persistent disk cache — survives restarts so we never re-call GPT for the same symbol
const DISK_CACHE_DIR = path.join(__dirname, '../../.cache/supplychain');
if (!fs.existsSync(DISK_CACHE_DIR)) fs.mkdirSync(DISK_CACHE_DIR, { recursive: true });

function diskCachePath(symbol: string) {
  return path.join(DISK_CACHE_DIR, `${symbol}.json`);
}
function readDiskCache(symbol: string): unknown | null {
  const p = diskCachePath(symbol);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); }
  catch { return null; }
}
function writeDiskCache(symbol: string, data: unknown) {
  try { fs.writeFileSync(diskCachePath(symbol), JSON.stringify(data)); }
  catch { /* non-fatal */ }
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// GET /api/supplychain/:symbol?name=Company%20Name
router.get('/:symbol', async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const upperSymbol = symbol.toUpperCase();
  const companyName = (req.query.name as string) || upperSymbol;

  // 1. Memory cache
  const memCached = cache.get(upperSymbol);
  if (memCached !== undefined) {
    res.setHeader('X-Cache', 'MEM');
    return res.json(memCached);
  }

  // 2. Disk cache (persists across restarts)
  const diskCached = readDiskCache(upperSymbol);
  if (diskCached) {
    cache.set(upperSymbol, diskCached);
    res.setHeader('X-Cache', 'DISK');
    return res.json(diskCached);
  }

  // 3. Generate via GPT — use mini (15x cheaper, perfectly capable for structured JSON)
  const prompt = `You are a supply chain expert and equity analyst.

Generate a comprehensive supply chain graph for ${upperSymbol} - ${companyName}.

Include 8-15 of the most important supply chain relationships (suppliers, customers, manufacturers, key technology partners).
Focus on real, publicly traded companies with well-known relationships.
Include the main company as both "company" field AND as a node in "nodes" array.

Rules:
- For "type" use only: supplier, customer, foundry, material, technology, power, testing, thematic
- For "role" use only: upstream, midstream, downstream, hyperscaler, infrastructure
- For "risk" use only: critical, high, medium, low
- For "region" use only: US, TW, KR, NL, JP, EU, CN, AU, CA
- For "contractType" use only: sole-source, captive, long-term, strategic, spot, multi-source
- "concentration" is 0.0 to 1.0 (what fraction of buyer's supply comes from this single source)
- "note" fields must be max 150 characters

Return a JSON object with this exact structure:
{
  "company": {
    "id": "TICKER",
    "label": "Company Name",
    "sector": "Sector",
    "role": "midstream",
    "importance": 10,
    "risk": "high",
    "monopoly": false,
    "region": "US",
    "note": "Short analyst note"
  },
  "nodes": [
    {
      "id": "TICKER",
      "label": "Company Name",
      "sector": "Sector",
      "role": "upstream",
      "importance": 10,
      "risk": "critical",
      "monopoly": true,
      "region": "TW",
      "note": "Short analyst note max 150 chars"
    }
  ],
  "edges": [
    {
      "source": "TICKER_A",
      "target": "TICKER_B",
      "type": "foundry",
      "label": "Relationship label",
      "strength": 10,
      "concentration": 0.92,
      "substitutable": false,
      "risk": "critical",
      "contractType": "captive",
      "value": "Context about the contract/relationship"
    }
  ]
}

Return ONLY valid JSON, no markdown.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return res.status(500).json({ error: 'Failed to generate supply chain' });

    const data = JSON.parse(content);

    // Persist to both caches
    cache.set(upperSymbol, data);
    writeDiskCache(upperSymbol, data);

    res.setHeader('X-Cache', 'MISS');
    return res.json(data);
  } catch (error) {
    console.error(`Error generating supply chain for ${upperSymbol}:`, error);
    return res.status(500).json({ error: 'Failed to generate supply chain' });
  }
});

// DELETE /api/supplychain/:symbol — force refresh (clears disk + memory)
router.delete('/:symbol', (req: Request, res: Response) => {
  const upperSymbol = req.params.symbol.toUpperCase();
  cache.del(upperSymbol);
  try { fs.unlinkSync(diskCachePath(upperSymbol)); } catch { /* ok */ }
  res.json({ cleared: upperSymbol });
});

export default router;
