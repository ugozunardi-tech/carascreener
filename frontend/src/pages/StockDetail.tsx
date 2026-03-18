import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, ExternalLink, Globe, Calendar, BarChart3,
  RefreshCw, AlertCircle, Building2, TrendingUp, TrendingDown
} from 'lucide-react';
import clsx from 'clsx';
import { useStockDetail, useStockNews, useStockAnalysis } from '../hooks/useStockDetail';
import PriorityBadge from '../components/UI/PriorityBadge';
import ChangeDisplay from '../components/UI/ChangeDisplay';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import NewsCard from '../components/StockCard/NewsCard';
import AIAnalysisPanel from '../components/StockCard/AIAnalysisPanel';
import TradingViewChart from '../components/StockCard/TradingViewChart';

type Tab = 'overview' | 'news' | 'analysis';

function formatMarketCap(mc: number): string {
  if (mc >= 1000) return `$${(mc / 1000).toFixed(2)}T`;
  if (mc >= 1) return `$${mc.toFixed(2)}B`;
  return `$${(mc * 1000).toFixed(0)}M`;
}

function MetricItem({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="metric-card">
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value || '-'}</span>
      {sub && <span className="text-[11px] text-text-muted">{sub}</span>}
    </div>
  );
}

export default function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [analysisEnabled, setAnalysisEnabled] = useState(false);

  const { detail, loading: detailLoading, error: detailError } = useStockDetail(symbol || '');
  const { news, loading: newsLoading } = useStockNews(symbol || '');
  const { analysis, loading: analysisLoading, error: analysisError, refetch: refetchAnalysis } = useStockAnalysis(symbol || '', analysisEnabled);

  const handleFetchAnalysis = () => {
    setAnalysisEnabled(true);
    refetchAnalysis();
  };

  if (detailLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" label={`Loading ${symbol}...`} />
      </div>
    );
  }

  if (detailError || !detail) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <AlertCircle className="w-10 h-10 text-accent-red mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-text-primary mb-2">Failed to load {symbol}</h2>
        <p className="text-text-secondary mb-6">{detailError || 'Stock not found'}</p>
        <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 bg-bg-secondary border border-border-primary text-text-primary rounded hover:border-accent-cyan/40 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const { quote, profile, metrics } = detail;
  const isPositive = (quote?.changePercent || 0) >= 0;

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-5 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link to="/" className="flex items-center gap-1.5 text-text-secondary hover:text-accent-cyan transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>
        <span className="text-text-muted">/</span>
        <span className="text-text-primary font-medium">{detail.symbol}</span>
      </div>

      {/* Stock Header */}
      <div className="glass-card p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            {/* Logo */}
            {profile?.logo && (
              <img
                src={profile.logo}
                alt={detail.name}
                className="w-12 h-12 rounded-lg object-contain bg-white/5 p-1.5 flex-shrink-0"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            {!profile?.logo && (
              <div className="w-12 h-12 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-accent-cyan" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold font-mono text-accent-cyan">{detail.symbol}</h1>
                <PriorityBadge priority={detail.priority} size="md" />
                {profile?.exchange && (
                  <span className="text-xs text-text-muted px-2 py-1 rounded bg-bg-tertiary border border-border-primary">
                    {profile.exchange}
                  </span>
                )}
              </div>
              <p className="text-base text-text-primary font-medium mt-0.5">{detail.name}</p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-xs text-text-secondary">{detail.sector}</span>
                {detail.theme && (
                  <>
                    <span className="text-text-muted">·</span>
                    <span className="text-xs text-accent-cyan/70 font-mono">{detail.theme}</span>
                  </>
                )}
                {profile?.country && (
                  <>
                    <span className="text-text-muted">·</span>
                    <span className="flex items-center gap-1 text-xs text-text-muted">
                      <Globe className="w-3 h-3" />
                      {profile.country}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Price */}
          {quote && (
            <div className="text-right">
              <div className="text-3xl font-bold font-mono text-text-primary">
                ${quote.price.toFixed(2)}
              </div>
              <div className="flex items-center gap-2 justify-end mt-1">
                {isPositive
                  ? <TrendingUp className="w-4 h-4 text-accent-green" />
                  : <TrendingDown className="w-4 h-4 text-accent-red" />}
                <ChangeDisplay value={quote.change} isPercent={false} />
                <ChangeDisplay value={quote.changePercent} isPercent={true} />
              </div>
              <div className="text-xs text-text-muted mt-1 font-mono">
                H: ${quote.high.toFixed(2)} · L: ${quote.low.toFixed(2)}
              </div>
            </div>
          )}
        </div>

        {/* External links */}
        {profile && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border-primary">
            {profile.weburl && (
              <a
                href={profile.weburl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent-cyan transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Website
              </a>
            )}
            {profile.ipo && (
              <span className="flex items-center gap-1.5 text-xs text-text-muted">
                <Calendar className="w-3 h-3" />
                IPO: {profile.ipo}
              </span>
            )}
            {profile.marketCap && (
              <span className="flex items-center gap-1.5 text-xs text-text-muted">
                <BarChart3 className="w-3 h-3" />
                Market Cap: {formatMarketCap(profile.marketCap)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-primary">
        {(['overview', 'news', 'analysis'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'tab-button capitalize',
              activeTab === tab ? 'active' : ''
            )}
          >
            {tab === 'analysis' ? 'AI Analysis' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'news' && news.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-accent-cyan/10 text-accent-cyan text-[10px] rounded font-mono">
                {news.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Chart */}
            <TradingViewChart symbol={detail.symbol} height={450} />

            {/* Key Metrics */}
            {metrics && (
              <div>
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Key Metrics</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  <MetricItem
                    label="Market Cap"
                    value={profile ? formatMarketCap(profile.marketCap) : '-'}
                  />
                  <MetricItem
                    label="P/E Ratio"
                    value={metrics.pe ? metrics.pe.toFixed(1) : '-'}
                  />
                  <MetricItem
                    label="52W High"
                    value={metrics.high52w ? `$${metrics.high52w.toFixed(2)}` : '-'}
                    sub={metrics.high52wDate}
                  />
                  <MetricItem
                    label="52W Low"
                    value={metrics.low52w ? `$${metrics.low52w.toFixed(2)}` : '-'}
                    sub={metrics.low52wDate}
                  />
                  <MetricItem
                    label="Beta"
                    value={metrics.beta ? metrics.beta.toFixed(2) : '-'}
                  />
                  <MetricItem
                    label="Avg Volume 10d"
                    value={metrics.avgVolume10d ? (metrics.avgVolume10d / 1e6).toFixed(1) + 'M' : '-'}
                  />
                  <MetricItem
                    label="EPS"
                    value={metrics.eps ? `$${metrics.eps.toFixed(2)}` : '-'}
                  />
                  <MetricItem
                    label="P/S Ratio"
                    value={metrics.ps ? metrics.ps.toFixed(1) : '-'}
                  />
                  <MetricItem
                    label="P/B Ratio"
                    value={metrics.pb ? metrics.pb.toFixed(1) : '-'}
                  />
                  <MetricItem
                    label="Gross Margin"
                    value={metrics.grossMargin ? `${metrics.grossMargin.toFixed(1)}%` : '-'}
                  />
                  <MetricItem
                    label="Net Margin"
                    value={metrics.netProfitMargin ? `${metrics.netProfitMargin.toFixed(1)}%` : '-'}
                  />
                  <MetricItem
                    label="ROE"
                    value={metrics.roe ? `${metrics.roe.toFixed(1)}%` : '-'}
                  />
                </div>
              </div>
            )}

            {/* 52W Range Visual */}
            {metrics?.high52w && metrics?.low52w && quote && (
              <div className="glass-card p-4">
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">52-Week Price Range</h3>
                <div className="space-y-3">
                  <div className="relative h-3 bg-border-primary rounded-full overflow-hidden">
                    {/* Range fill */}
                    <div
                      className="absolute left-0 top-0 h-full rounded-full"
                      style={{
                        background: 'linear-gradient(to right, #ff3b3b, #ffd700, #00ff88)',
                        width: `${Math.min(100, Math.max(0, ((quote.price - metrics.low52w) / (metrics.high52w - metrics.low52w)) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <div>
                      <div className="text-accent-red">${metrics.low52w.toFixed(2)}</div>
                      <div className="text-text-muted mt-0.5">52W Low</div>
                    </div>
                    <div className="text-center">
                      <div className="text-text-primary font-bold">${quote.price.toFixed(2)}</div>
                      <div className="text-text-muted mt-0.5">Current</div>
                    </div>
                    <div className="text-right">
                      <div className="text-accent-green">${metrics.high52w.toFixed(2)}</div>
                      <div className="text-text-muted mt-0.5">52W High</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* News Tab */}
        {activeTab === 'news' && (
          <div className="space-y-4">
            {newsLoading ? (
              <LoadingSpinner label="Loading news..." />
            ) : news.length === 0 ? (
              <div className="text-center py-12 text-text-secondary">
                <p>No recent news found for {detail.symbol}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-secondary">
                    {news.length} Recent Articles
                  </h3>
                  <span className="text-xs text-text-muted">Last 7 days · via Finnhub</span>
                </div>
                <div className="space-y-3">
                  {news.map(item => (
                    <NewsCard key={item.id} news={item} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* AI Analysis Tab */}
        {activeTab === 'analysis' && (
          <AIAnalysisPanel
            symbol={detail.symbol}
            analysis={analysis}
            loading={analysisLoading}
            error={analysisError}
            onFetch={handleFetchAnalysis}
          />
        )}
      </div>
    </div>
  );
}
