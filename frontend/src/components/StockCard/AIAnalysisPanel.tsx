import { useState } from 'react';
import { Brain, Sparkles, TrendingUp, AlertTriangle, Zap, Shield, Target, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import type { FullAnalysis } from '../../types';
import SentimentBadge from '../UI/SentimentBadge';
import RecommendationBadge from '../UI/RecommendationBadge';
import LoadingSpinner from '../UI/LoadingSpinner';

interface Props {
  symbol: string;
  analysis: FullAnalysis | null;
  loading: boolean;
  error: string | null;
  onFetch: () => void;
}

export default function AIAnalysisPanel({ symbol, analysis, loading, error, onFetch }: Props) {
  const [fetched, setFetched] = useState(false);

  const handleFetch = () => {
    setFetched(true);
    onFetch();
  };

  if (!fetched && !analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-14 h-14 rounded-full bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center">
          <Brain className="w-7 h-7 text-accent-cyan" />
        </div>
        <div className="text-center">
          <h3 className="text-base font-semibold text-text-primary">AI Analysis Ready</h3>
          <p className="text-sm text-text-secondary mt-1 max-w-xs">
            Generate a comprehensive GPT-4o analysis for <span className="text-accent-cyan font-mono">{symbol}</span> including news sentiment, technical outlook, and trading insights.
          </p>
        </div>
        <button
          onClick={handleFetch}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent-cyan/10 border border-accent-cyan/30 hover:border-accent-cyan/60 hover:bg-accent-cyan/15 text-accent-cyan rounded-lg font-medium text-sm transition-all duration-200"
        >
          <Sparkles className="w-4 h-4" />
          Generate AI Analysis
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-16">
        <LoadingSpinner label="GPT-4o is analyzing market data..." />
        <p className="text-center text-xs text-text-muted mt-2">This may take 15-30 seconds</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <AlertTriangle className="w-8 h-8 text-accent-red" />
        <p className="text-sm text-accent-red">{error}</p>
        <button
          onClick={handleFetch}
          className="flex items-center gap-2 px-4 py-2 bg-bg-tertiary border border-border-primary hover:border-accent-cyan/40 text-text-secondary rounded text-sm transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    );
  }

  if (!analysis) return null;

  const { news, technical } = analysis;

  const trendColors: Record<string, string> = {
    UPTREND: 'text-accent-green',
    DOWNTREND: 'text-accent-red',
    SIDEWAYS: 'text-accent-yellow',
  };

  const strengthColors: Record<string, string> = {
    STRONG: 'text-accent-green',
    MODERATE: 'text-accent-yellow',
    WEAK: 'text-text-secondary',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Overall Summary */}
      <div className="glass-card p-5 border-accent-cyan/20">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-accent-cyan" />
          <span className="text-sm font-semibold text-accent-cyan">AI Analyst Says</span>
          <span className="ml-auto text-[10px] text-text-muted font-mono">
            GPT-4o • {new Date(analysis.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <p className="text-sm text-text-primary leading-relaxed">{analysis.overallSummary}</p>
      </div>

      {/* News Sentiment */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent-yellow" />
            News Sentiment
          </h4>
          <SentimentBadge sentiment={news.sentiment} />
        </div>

        <p className="text-sm text-text-secondary mb-4 leading-relaxed">{news.summary}</p>

        {/* Sentiment bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-text-muted mb-1">
            <span>Bearish</span>
            <span className="font-mono">{(news.sentimentScore * 100).toFixed(0)}%</span>
            <span>Bullish</span>
          </div>
          <div className="h-1.5 bg-border-primary rounded-full overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all duration-500',
                news.sentimentScore > 0 ? 'bg-accent-green' : news.sentimentScore < 0 ? 'bg-accent-red' : 'bg-accent-yellow'
              )}
              style={{ width: `${Math.abs(news.sentimentScore) * 50 + 50}%`, marginLeft: news.sentimentScore < 0 ? '0' : undefined }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {news.keyPoints.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Key Points</h5>
              <ul className="space-y-1.5">
                {news.keyPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                    <span className="text-accent-cyan mt-0.5 flex-shrink-0">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {news.catalysts.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-accent-green uppercase tracking-wider mb-2">Catalysts</h5>
              <ul className="space-y-1.5">
                {news.catalysts.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                    <span className="text-accent-green mt-0.5 flex-shrink-0">+</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {news.risks.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-accent-red uppercase tracking-wider mb-2">Risks</h5>
              <ul className="space-y-1.5">
                {news.risks.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                    <span className="text-accent-red mt-0.5 flex-shrink-0">-</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Technical Analysis */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent-cyan" />
            Technical Analysis
          </h4>
          <RecommendationBadge rec={technical.recommendation} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-bg-secondary/60 rounded p-3">
            <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Trend</div>
            <div className={clsx('text-sm font-bold font-mono', trendColors[technical.trend])}>
              {technical.trend}
            </div>
          </div>
          <div className="bg-bg-secondary/60 rounded p-3">
            <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Strength</div>
            <div className={clsx('text-sm font-bold font-mono', strengthColors[technical.trendStrength])}>
              {technical.trendStrength}
            </div>
          </div>
          <div className="bg-bg-secondary/60 rounded p-3">
            <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Confidence</div>
            <div className="text-sm font-bold font-mono text-text-primary">
              {technical.confidence}%
            </div>
          </div>
          <div className="bg-bg-secondary/60 rounded p-3">
            <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Signal</div>
            <RecommendationBadge rec={technical.recommendation} />
          </div>
        </div>

        <p className="text-sm text-text-secondary mb-4 leading-relaxed">{technical.priceActionSummary}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-3.5 h-3.5 text-accent-green" />
              <span className="text-xs font-medium text-accent-green uppercase tracking-wider">Support Levels</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {technical.supportLevels.map((level, i) => (
                <span key={i} className="px-2 py-1 bg-accent-green/10 border border-accent-green/20 rounded text-xs font-mono text-accent-green">
                  ${typeof level === 'number' ? level.toFixed(2) : level}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-3.5 h-3.5 text-accent-red" />
              <span className="text-xs font-medium text-accent-red uppercase tracking-wider">Resistance Levels</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {technical.resistanceLevels.map((level, i) => (
                <span key={i} className="px-2 py-1 bg-accent-red/10 border border-accent-red/20 rounded text-xs font-mono text-accent-red">
                  ${typeof level === 'number' ? level.toFixed(2) : level}
                </span>
              ))}
            </div>
          </div>
        </div>

        {technical.keyInsights.length > 0 && (
          <div>
            <h5 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Key Insights</h5>
            <ul className="space-y-1.5">
              {technical.keyInsights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                  <span className="text-accent-cyan mt-0.5 flex-shrink-0 font-mono">{i + 1}.</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {technical.volumeAnalysis && (
          <div className="mt-3 pt-3 border-t border-border-primary">
            <span className="text-xs text-text-muted">Volume: </span>
            <span className="text-xs text-text-secondary">{technical.volumeAnalysis}</span>
          </div>
        )}
      </div>

      {/* Refresh button */}
      <div className="flex justify-end">
        <button
          onClick={handleFetch}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary border border-border-primary hover:border-accent-cyan/40 hover:text-text-primary rounded transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Regenerate Analysis
        </button>
      </div>
    </div>
  );
}
