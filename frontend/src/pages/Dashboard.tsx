import { useState } from 'react';
import { RefreshCw, AlertCircle, ArrowUpRight, ArrowDownRight, Activity, TrendingUp } from 'lucide-react';
import { useStocks, useSortedStocks, useFilteredStocks } from '../hooks/useStocks';
import WatchlistTable from '../components/Watchlist/WatchlistTable';
import FilterBar from '../components/Watchlist/FilterBar';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import MarketTicker from '../components/UI/MarketTicker';
import SectorHeatmap from '../components/UI/SectorHeatmap';
import type { SortField } from '../types';

function StatCard({
  label, value, sub, color, icon, trend,
}: {
  label: string; value: string; sub?: string;
  color?: string; icon?: React.ReactNode; trend?: 'up' | 'down' | null;
}) {
  return (
    <div className="stat-card flex-1 min-w-[130px]">
      {/* top label */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-bold text-text-muted uppercase tracking-[0.15em]">{label}</span>
        {icon && <span className="text-text-muted">{icon}</span>}
      </div>
      {/* value */}
      <div className={`text-2xl font-black font-mono leading-none ${color || 'text-text-primary'}`}>
        {value}
      </div>
      {/* sub + trend */}
      {(sub || trend) && (
        <div className="flex items-center gap-1 mt-1.5">
          {trend === 'up' && <ArrowUpRight className="w-3 h-3 text-accent-green" />}
          {trend === 'down' && <ArrowDownRight className="w-3 h-3 text-accent-red" />}
          <span className="text-[10px] text-text-muted">{sub}</span>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { stocks, loading, error, lastUpdated, updatedSymbols, refresh } = useStocks();

  const {
    filtered, search, setSearch,
    selectedSector, setSelectedSector,
    selectedTheme, setSelectedTheme,
    selectedPriority, setSelectedPriority,
    sectors, themes,
  } = useFilteredStocks(stocks);

  const { sorted, sortConfig, toggleSort } = useSortedStocks(filtered);
  const [showHeatmap, setShowHeatmap] = useState(true);

  // Stats
  const priced        = stocks.filter(s => s.price > 0);
  const gainers       = priced.filter(s => s.changePercent > 0);
  const losers        = priced.filter(s => s.changePercent < 0);
  const highPriority  = stocks.filter(s => s.priority === 'HIGH');
  const avgChange     = priced.length > 0
    ? priced.reduce((a, s) => a + s.changePercent, 0) / priced.length : 0;
  const topMover      = [...priced].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))[0];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full border border-accent-cyan/20 flex items-center justify-center">
          <Activity className="w-5 h-5 text-accent-cyan animate-pulse" />
        </div>
        <LoadingSpinner size="sm" label="Fetching market data..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Ticker tape */}
      <MarketTicker stocks={stocks} />

      {/* Main content */}
      <div className="flex-1 max-w-[1700px] mx-auto w-full px-4 py-5 space-y-4 animate-fade-in">

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-accent-red/5 border border-accent-red/20 rounded-lg text-xs text-accent-red">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={refresh} className="ml-auto underline">Retry</button>
          </div>
        )}

        {/* Page title row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-text-primary tracking-tight">Market Watchlist</h1>
            <p className="text-[11px] text-text-muted mt-0.5 font-mono">
              {stocks.length} global equities · Finnhub real-time
              {lastUpdated && ` · synced ${lastUpdated.toLocaleTimeString()}`}
            </p>
          </div>
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-secondary border border-border-primary rounded-lg hover:border-accent-cyan/30 hover:text-text-primary transition-all"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>

        {/* ── Stat cards ── */}
        <div className="flex gap-3 flex-wrap">
          <StatCard
            label="Avg Change"
            value={`${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`}
            sub="portfolio average"
            color={avgChange >= 0 ? 'text-accent-green glow-green' : 'text-accent-red glow-red'}
            trend={avgChange > 0 ? 'up' : avgChange < 0 ? 'down' : null}
          />
          <StatCard
            label="Gainers"
            value={`${gainers.length}`}
            sub={`of ${priced.length} stocks up`}
            color="text-accent-green"
            trend="up"
            icon={<ArrowUpRight className="w-3.5 h-3.5" />}
          />
          <StatCard
            label="Losers"
            value={`${losers.length}`}
            sub={`of ${priced.length} stocks down`}
            color="text-accent-red"
            trend="down"
            icon={<ArrowDownRight className="w-3.5 h-3.5" />}
          />
          <StatCard
            label="High Priority"
            value={`${highPriority.length}`}
            sub="requiring attention"
            color="text-accent-red"
            icon={<span className="text-accent-red text-xs">●</span>}
          />
          {topMover && (
            <StatCard
              label="Top Mover"
              value={topMover.symbol}
              sub={`${topMover.changePercent > 0 ? '+' : ''}${topMover.changePercent.toFixed(2)}% today`}
              color="text-accent-cyan glow-cyan"
              icon={<TrendingUp className="w-3.5 h-3.5" />}
            />
          )}
          <div className="stat-card flex-1 min-w-[130px] flex flex-col justify-between">
            <span className="text-[9px] font-bold text-text-muted uppercase tracking-[0.15em]">Live Feed</span>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse-dot" />
              <span className="text-xs font-mono text-text-secondary">AUTO · 30s</span>
              {updatedSymbols.size > 0 && (
                <span className="text-[10px] text-accent-cyan font-mono">+{updatedSymbols.size} updated</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Sector Heatmap ── */}
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Sector Performance</span>
            <button onClick={() => setShowHeatmap(h => !h)} className="text-[10px] text-text-muted hover:text-text-secondary">
              {showHeatmap ? 'hide' : 'show'}
            </button>
          </div>
          {showHeatmap && (
            <SectorHeatmap
              stocks={priced}
              selectedSector={selectedSector}
              onSelectSector={setSelectedSector}
            />
          )}
        </div>

        {/* ── Filters ── */}
        <div className="glass-card p-4">
          <FilterBar
            search={search} onSearch={setSearch}
            selectedSector={selectedSector} onSector={setSelectedSector}
            selectedTheme={selectedTheme} onTheme={setSelectedTheme}
            selectedPriority={selectedPriority} onPriority={setSelectedPriority}
            sectors={sectors} themes={themes}
            stockCount={filtered.length} totalCount={stocks.length}
          />
        </div>

        {/* ── Table ── */}
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border-primary flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xs font-bold text-text-primary uppercase tracking-widest">Holdings</h2>
              <span className="text-[10px] font-mono text-text-muted">{sorted.length} / {stocks.length}</span>
            </div>
            <span className="text-[10px] text-text-muted">Click row → stock detail</span>
          </div>
          <WatchlistTable
            stocks={sorted}
            updatedSymbols={updatedSymbols}
            sortConfig={sortConfig}
            onSort={(f: SortField) => toggleSort(f)}
          />
        </div>
      </div>
    </div>
  );
}
