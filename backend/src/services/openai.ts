import OpenAI from 'openai';
import NodeCache from 'node-cache';
import { FinnhubNews } from './finnhub';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Cache AI responses for 6 hours — fundamentals don't change hourly
const analysisCache = new NodeCache({ stdTTL: 21600 });

export interface NewsAnalysis {
  summary: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sentimentScore: number; // -1 to 1
  keyPoints: string[];
  risks: string[];
  catalysts: string[];
}

export interface TechnicalAnalysis {
  trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
  trendStrength: 'STRONG' | 'MODERATE' | 'WEAK';
  supportLevels: number[];
  resistanceLevels: number[];
  volumeAnalysis: string;
  priceActionSummary: string;
  recommendation: 'BUY' | 'SELL' | 'HOLD' | 'WATCH';
  confidence: number; // 0-100
  keyInsights: string[];
}

export interface FullAnalysis {
  news: NewsAnalysis;
  technical: TechnicalAnalysis;
  overallSummary: string;
  timestamp: string;
}

export async function analyzeNews(
  symbol: string,
  companyName: string,
  news: FinnhubNews[],
  currentPrice: number,
  changePercent: number
): Promise<NewsAnalysis> {
  const cacheKey = `news_analysis_${symbol}_${new Date().toISOString().slice(0, 10)}`;
  const cached = analysisCache.get<NewsAnalysis>(cacheKey);
  if (cached) return cached;

  const newsText = news
    .slice(0, 8)
    .map((n, i) => `${i + 1}. [${new Date(n.datetime * 1000).toLocaleDateString()}] ${n.headline}\n   ${n.summary?.substring(0, 200) || ''}`)
    .join('\n\n');

  const prompt = `You are a professional stock analyst at a top-tier investment firm. Analyze the following news for ${companyName} (${symbol}).

Current Price: $${currentPrice.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}% today)

Recent News:
${newsText || 'No recent news available.'}

Provide a concise, professional analysis in JSON format with:
- summary: 2-3 sentence executive summary of the news situation (max 200 chars)
- sentiment: one of BULLISH, BEARISH, NEUTRAL
- sentimentScore: number from -1 (very bearish) to 1 (very bullish)
- keyPoints: array of 3-4 key takeaways (each max 80 chars)
- risks: array of 2-3 key risks (each max 80 chars)
- catalysts: array of 2-3 potential catalysts (each max 80 chars)

Respond ONLY with valid JSON, no markdown.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';
    const analysis = JSON.parse(content) as NewsAnalysis;
    analysisCache.set(cacheKey, analysis);
    return analysis;
  } catch (error) {
    console.error(`Error analyzing news for ${symbol}:`, error);
    return {
      summary: 'Analysis temporarily unavailable.',
      sentiment: 'NEUTRAL',
      sentimentScore: 0,
      keyPoints: [],
      risks: [],
      catalysts: [],
    };
  }
}

export async function analyzeTechnicals(
  symbol: string,
  companyName: string,
  quote: {
    currentPrice: number;
    change: number;
    changePercent: number;
    high: number;
    low: number;
    open: number;
    prevClose: number;
  },
  metrics: {
    high52w: number;
    low52w: number;
    avgVolume: number;
    beta: number;
    pe: number;
  }
): Promise<TechnicalAnalysis> {
  const cacheKey = `tech_analysis_${symbol}_${new Date().toISOString().slice(0, 10)}`;
  const cached = analysisCache.get<TechnicalAnalysis>(cacheKey);
  if (cached) return cached;

  const prompt = `You are a professional technical analyst. Analyze the following price data for ${companyName} (${symbol}).

Price Data:
- Current Price: $${quote.currentPrice.toFixed(2)}
- Today's Change: ${quote.change >= 0 ? '+' : ''}$${quote.change.toFixed(2)} (${quote.changePercent.toFixed(2)}%)
- Today's Range: $${quote.low.toFixed(2)} - $${quote.high.toFixed(2)}
- Previous Close: $${quote.prevClose.toFixed(2)}
- 52-Week High: $${metrics.high52w.toFixed(2)}
- 52-Week Low: $${metrics.low52w.toFixed(2)}
- Beta: ${metrics.beta?.toFixed(2) || 'N/A'}
- P/E Ratio: ${metrics.pe?.toFixed(1) || 'N/A'}
- Avg Volume (10d): ${metrics.avgVolume?.toLocaleString() || 'N/A'}

Current price vs 52W range: ${(((quote.currentPrice - metrics.low52w) / (metrics.high52w - metrics.low52w)) * 100).toFixed(1)}% from bottom

Provide professional technical analysis in JSON format:
- trend: UPTREND, DOWNTREND, or SIDEWAYS
- trendStrength: STRONG, MODERATE, or WEAK
- supportLevels: array of 2 key support price levels (numbers)
- resistanceLevels: array of 2 key resistance price levels (numbers)
- volumeAnalysis: brief volume analysis (max 100 chars)
- priceActionSummary: 2-3 sentence price action summary (max 250 chars)
- recommendation: BUY, SELL, HOLD, or WATCH
- confidence: 0-100 confidence score
- keyInsights: array of 3 key technical insights (each max 90 chars)

Respond ONLY with valid JSON, no markdown.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 700,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';
    const analysis = JSON.parse(content) as TechnicalAnalysis;
    analysisCache.set(cacheKey, analysis);
    return analysis;
  } catch (error) {
    console.error(`Error analyzing technicals for ${symbol}:`, error);
    return {
      trend: 'SIDEWAYS',
      trendStrength: 'WEAK',
      supportLevels: [metrics.low52w, quote.low],
      resistanceLevels: [quote.high, metrics.high52w],
      volumeAnalysis: 'Volume data unavailable.',
      priceActionSummary: 'Technical analysis temporarily unavailable.',
      recommendation: 'HOLD',
      confidence: 0,
      keyInsights: [],
    };
  }
}

export async function getFullAnalysis(
  symbol: string,
  companyName: string,
  quote: {
    currentPrice: number;
    change: number;
    changePercent: number;
    high: number;
    low: number;
    open: number;
    prevClose: number;
  },
  metrics: {
    high52w: number;
    low52w: number;
    avgVolume: number;
    beta: number;
    pe: number;
  },
  news: FinnhubNews[]
): Promise<FullAnalysis> {
  const [newsAnalysis, technicalAnalysis] = await Promise.all([
    analyzeNews(symbol, companyName, news, quote.currentPrice, quote.changePercent),
    analyzeTechnicals(symbol, companyName, quote, metrics),
  ]);

  const overallSummary = `${companyName} is showing a ${technicalAnalysis.trend.toLowerCase()} with ${technicalAnalysis.trendStrength.toLowerCase()} momentum. News sentiment is ${newsAnalysis.sentiment.toLowerCase()}. ${technicalAnalysis.priceActionSummary}`;

  return {
    news: newsAnalysis,
    technical: technicalAnalysis,
    overallSummary,
    timestamp: new Date().toISOString(),
  };
}
