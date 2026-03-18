import { Router, Request, Response } from 'express';
import NodeCache from 'node-cache';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const router = Router();
const memCache = new NodeCache({ stdTTL: 86400 }); // 24h memory cache

const DISK_DIR = process.env.VERCEL
  ? '/tmp/deepanalysis'
  : path.join(__dirname, '../../.cache/deepanalysis');
try {
  if (!fs.existsSync(DISK_DIR)) fs.mkdirSync(DISK_DIR, { recursive: true });
} catch { /* read-only filesystem — disk cache disabled */ }

function diskPath(symbol: string) { return path.join(DISK_DIR, `${symbol}.json`); }
function readDisk(symbol: string) {
  const p = diskPath(symbol);
  if (!fs.existsSync(p)) return null;
  try {
    const { data, date } = JSON.parse(fs.readFileSync(p, 'utf-8'));
    // Invalidate if older than 7 days
    if (Date.now() - date > 7 * 86400 * 1000) return null;
    return data;
  } catch { return null; }
}
function writeDisk(symbol: string, data: unknown) {
  try { fs.writeFileSync(diskPath(symbol), JSON.stringify({ data, date: Date.now() })); }
  catch { /* non-fatal */ }
}

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

export interface SupplyChainAnalysis {
  symbol: string;
  company: string;
  generatedAt: string;
  ecosystem: {
    suppliers:     { name: string; ticker?: string; role: string; criticality: 'critical' | 'high' | 'medium' | 'low' }[];
    keyInputs:     string[];
    manufacturing: string;
    customers:     { name: string; ticker?: string; share?: number }[];
  };
  criticalNodes: { name: string; ticker?: string; role: string; why: string; monopoly: boolean }[];
  bottlenecks: {
    title: string; description: string;
    severity: 'critical' | 'high' | 'medium';
    type: 'single_point' | 'concentration' | 'geopolitical' | 'tech' | 'capacity';
  }[];
  vulnerabilities: {
    category: 'geopolitical' | 'capacity' | 'technology' | 'financial' | 'regulatory';
    title: string; description: string; severity: 'high' | 'medium' | 'low';
  }[];
  stressPoints:   { scenario: string; impact: string; probability: 'high' | 'medium' | 'low' }[];
  pricingPower:   { node: string; ticker?: string; level: 'dominant' | 'high' | 'medium' | 'low'; reason: string }[];
  advantages:     { title: string; description: string }[];
  risks: {
    rank: 1 | 2 | 3; title: string; description: string;
    probability: 'high' | 'medium' | 'low'; impact: 'high' | 'medium' | 'low';
  }[];
  strengths: { rank: 1 | 2 | 3; title: string; description: string }[];
  scenario: {
    type: 'disruption' | 'upside';
    title: string; description: string;
    timeline: string;
    implications: string[];
    affectedTickers: string[];
  };
}

// GET /api/deepanalysis/:symbol?name=Company+Name&refresh=1
router.get('/:symbol', async (req: Request, res: Response) => {
  const symbol      = req.params.symbol.toUpperCase();
  const companyName = (req.query.name as string) || symbol;
  const forceRefresh = req.query.refresh === '1';

  if (!forceRefresh) {
    const mem = memCache.get<SupplyChainAnalysis>(symbol);
    if (mem) { res.setHeader('X-Cache', 'MEM'); return res.json(mem); }
    const disk = readDisk(symbol);
    if (disk) { memCache.set(symbol, disk); res.setHeader('X-Cache', 'DISK'); return res.json(disk); }
  }

  const prompt = `You are a senior supply chain analyst at a top-tier investment bank. Produce a deep, institutional-quality supply chain analysis for ${symbol} — ${companyName}.

Be specific, fact-based, and quantified where possible. Use real company names and tickers.

Return a JSON object matching this EXACT schema:

{
  "ecosystem": {
    "suppliers": [{ "name": string, "ticker": string|null, "role": string, "criticality": "critical"|"high"|"medium"|"low" }],
    "keyInputs": [string],
    "manufacturing": string,
    "customers": [{ "name": string, "ticker": string|null, "share": number|null }]
  },
  "criticalNodes": [{ "name": string, "ticker": string|null, "role": string, "why": string, "monopoly": boolean }],
  "bottlenecks": [{ "title": string, "description": string, "severity": "critical"|"high"|"medium", "type": "single_point"|"concentration"|"geopolitical"|"tech"|"capacity" }],
  "vulnerabilities": [{ "category": "geopolitical"|"capacity"|"technology"|"financial"|"regulatory", "title": string, "description": string, "severity": "high"|"medium"|"low" }],
  "stressPoints": [{ "scenario": string, "impact": string, "probability": "high"|"medium"|"low" }],
  "pricingPower": [{ "node": string, "ticker": string|null, "level": "dominant"|"high"|"medium"|"low", "reason": string }],
  "advantages": [{ "title": string, "description": string }],
  "risks": [{ "rank": 1|2|3, "title": string, "description": string, "probability": "high"|"medium"|"low", "impact": "high"|"medium"|"low" }],
  "strengths": [{ "rank": 1|2|3, "title": string, "description": string }],
  "scenario": { "type": "disruption"|"upside", "title": string, "description": string, "timeline": string, "implications": [string], "affectedTickers": [string] }
}

Requirements:
- suppliers: 5-8 entries, ordered by criticality desc
- criticalNodes: 3-5 most important nodes (can include the company itself)
- bottlenecks: 3-5 entries
- vulnerabilities: 4-6 entries across different categories
- stressPoints: 3 entries
- pricingPower: 4-6 nodes across the chain
- advantages: 3-4 structural advantages
- risks: exactly 3, ranked 1-3
- strengths: exactly 3, ranked 1-3
- scenario: 1 high-conviction scenario (disruption OR upside, whichever is more impactful now)
- affectedTickers: 3-6 publicly traded tickers most affected by the scenario

Return ONLY valid JSON, no markdown, no commentary.`;

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.25,
      max_tokens: 2500,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = JSON.parse(completion.choices[0]?.message?.content ?? '{}');
    const result: SupplyChainAnalysis = {
      symbol,
      company: companyName,
      generatedAt: new Date().toISOString(),
      ...raw,
    };

    memCache.set(symbol, result);
    writeDisk(symbol, result);
    res.setHeader('X-Cache', 'MISS');
    return res.json(result);
  } catch (err) {
    console.error(`Deep analysis error for ${symbol}:`, err);
    return res.status(500).json({ error: 'Analysis generation failed' });
  }
});

// DELETE — clear cache for a symbol
router.delete('/:symbol', (req: Request, res: Response) => {
  const symbol = req.params.symbol.toUpperCase();
  memCache.del(symbol);
  try { fs.unlinkSync(diskPath(symbol)); } catch { /* ok */ }
  return res.json({ cleared: symbol });
});

export default router;
