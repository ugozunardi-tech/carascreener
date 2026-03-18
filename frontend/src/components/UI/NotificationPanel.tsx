import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, X, RefreshCw, ExternalLink, TrendingUp, AlertTriangle, Handshake, DollarSign, Zap, Newspaper, ChevronDown } from 'lucide-react';

export interface NewsArticle {
  id: number;
  symbol: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
  signal: 'INVESTMENT' | 'M&A' | 'SUPPLY CHAIN' | 'REGULATORY' | 'DISRUPTION' | 'NEWS';
}

interface Props {
  symbols: string[];
}

const SIGNAL_META: Record<NewsArticle['signal'], { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  'INVESTMENT':   { color: '#00e676', bg: '#00e67618', icon: <DollarSign   className="w-3 h-3" />, label: 'Investment'   },
  'M&A':          { color: '#a78bfa', bg: '#a78bfa18', icon: <Handshake    className="w-3 h-3" />, label: 'M&A'          },
  'SUPPLY CHAIN': { color: '#00d4ff', bg: '#00d4ff18', icon: <TrendingUp   className="w-3 h-3" />, label: 'Supply Chain' },
  'REGULATORY':   { color: '#ff9800', bg: '#ff980018', icon: <AlertTriangle className="w-3 h-3" />, label: 'Regulatory'   },
  'DISRUPTION':   { color: '#ff1744', bg: '#ff174418', icon: <Zap          className="w-3 h-3" />, label: 'Disruption'   },
  'NEWS':         { color: '#64748b', bg: '#64748b18', icon: <Newspaper    className="w-3 h-3" />, label: 'News'         },
};

const SIGNAL_FILTERS: Array<NewsArticle['signal'] | 'ALL'> = ['ALL', 'INVESTMENT', 'M&A', 'SUPPLY CHAIN', 'DISRUPTION', 'REGULATORY', 'NEWS'];

const LS_KEY = 'cara_seen_news';

function loadSeenIds(): Set<number> {
  try { return new Set(JSON.parse(localStorage.getItem(LS_KEY) || '[]') as number[]); }
  catch { return new Set(); }
}
function saveSeenIds(ids: Set<number>) {
  const arr = [...ids].slice(-500);
  localStorage.setItem(LS_KEY, JSON.stringify(arr));
}

function timeAgo(ts: number): string {
  const d = Date.now() / 1000 - ts;
  if (d < 3600)  return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

async function fetchFeed(symbols: string[], days: number): Promise<{ articles: NewsArticle[]; fetchedAt: string }> {
  const res = await fetch(`/api/news/feed?symbols=${encodeURIComponent(symbols.slice(0, 20).join(','))}&days=${days}`);
  if (!res.ok) throw new Error('Feed error');
  return res.json();
}

export async function fetchNodeNews(symbol: string): Promise<NewsArticle[]> {
  const res = await fetch(`/api/news/feed?symbols=${symbol}&days=7`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.articles || [];
}

export default function NotificationPanel({ symbols }: Props) {
  const [open,      setOpen]      = useState(false);
  const [articles,  setArticles]  = useState<NewsArticle[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [fetchedAt, setFetchedAt] = useState('');
  const [filter,    setFilter]    = useState<NewsArticle['signal'] | 'ALL'>('ALL');
  const [seenIds,   setSeenIds]   = useState<Set<number>>(loadSeenIds);
  const [days,      setDays]      = useState(3);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (d = days) => {
    if (!symbols.length) return;
    setLoading(true);
    try {
      const data = await fetchFeed(symbols, d);
      setArticles(data.articles);
      setFetchedAt(data.fetchedAt);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [symbols, days]);

  useEffect(() => {
    if (!open) return;
    load();
    const t = setInterval(() => load(), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [open, load]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
        markAllRead();
      }
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markAllRead = useCallback(() => {
    setSeenIds(prev => {
      const next = new Set([...prev, ...articles.map(a => a.id)]);
      saveSeenIds(next);
      return next;
    });
  }, [articles]);

  const markOne = useCallback((id: number) => {
    setSeenIds(prev => {
      const next = new Set([...prev, id]);
      saveSeenIds(next);
      return next;
    });
  }, []);

  const close = useCallback(() => { setOpen(false); markAllRead(); }, [markAllRead]);

  const unread     = articles.filter(a => !seenIds.has(a.id)).length;
  const highSignal = articles.some(a => !seenIds.has(a.id) && ['INVESTMENT', 'M&A', 'DISRUPTION'].includes(a.signal));
  const filtered   = filter === 'ALL' ? articles : articles.filter(a => a.signal === filter);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`relative w-8 h-8 flex items-center justify-center rounded-lg border transition-all ${open ? 'border-accent-cyan/60 bg-accent-cyan/15 text-accent-cyan' : 'border-border-primary text-text-muted hover:text-text-primary hover:border-border-secondary'}`}
        title="Market news & alerts"
      >
        <Bell className="w-3.5 h-3.5" />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full text-[8px] font-black text-white leading-none"
            style={{ background: highSignal ? '#ff1744' : '#00d4ff' }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute top-10 right-0 z-[300] flex flex-col rounded-xl border border-border-primary shadow-2xl overflow-hidden"
          style={{
            width: '420px',
            maxHeight: 'min(620px, calc(100vh - 80px))',
            background: 'rgba(10,15,30,0.98)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
          }}
        >
          {/* ── Header ── */}
          <div className="px-4 py-3 border-b border-border-primary/60 flex items-center gap-3 flex-shrink-0">
            <Bell className="w-4 h-4 text-accent-cyan flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-text-primary">Market Alerts</span>
                {unread > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0"
                    style={{ background: highSignal ? '#ff174422' : '#00d4ff22', color: highSignal ? '#ff1744' : '#00d4ff' }}>
                    {unread} new
                  </span>
                )}
              </div>
              {fetchedAt ? (
                <div className="text-[9px] text-text-muted mt-0.5 truncate">
                  Updated {new Date(fetchedAt).toLocaleTimeString()} · {symbols.length} stocks tracked
                </div>
              ) : (
                <div className="text-[9px] text-text-muted mt-0.5">{symbols.length} stocks tracked</div>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {unread > 0 && (
                <button onClick={markAllRead}
                  className="text-[9px] text-text-muted hover:text-text-secondary px-2 py-1 rounded border border-border-primary/50 hover:border-border-secondary/50 transition-colors whitespace-nowrap">
                  Mark all read
                </button>
              )}
              <button onClick={() => load(days)} disabled={loading}
                className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors">
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={close}
                className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ── Toolbar: period + signal filters ── */}
          <div className="px-3 py-2 flex items-center gap-3 border-b border-border-primary/40 flex-shrink-0 bg-white/[0.015]">
            {/* Period */}
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-text-muted uppercase tracking-widest font-bold mr-1">Period</span>
              {([1, 3, 7] as const).map(d => (
                <button key={d}
                  onClick={() => { setDays(d); load(d); }}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${days === d
                    ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40'
                    : 'text-text-muted border border-border-primary/50 hover:text-text-secondary'}`}>
                  {d}d
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="w-px h-4 bg-border-primary/60 flex-shrink-0" />

            {/* Signal filter — scrollable */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1 min-w-0">
              {SIGNAL_FILTERS.map(s => {
                const meta  = s === 'ALL' ? null : SIGNAL_META[s];
                const count = s === 'ALL' ? articles.length : articles.filter(a => a.signal === s).length;
                if (count === 0 && s !== 'ALL') return null;
                const active = filter === s;
                return (
                  <button key={s}
                    onClick={() => setFilter(s)}
                    className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded whitespace-nowrap transition-all flex-shrink-0 border"
                    style={active
                      ? { background: meta?.bg || '#00d4ff18', color: meta?.color || '#00d4ff', borderColor: `${meta?.color || '#00d4ff'}50` }
                      : { color: '#64748b', borderColor: 'rgba(30,45,74,0.5)' }}>
                    {meta?.icon}
                    {s === 'ALL' ? 'All' : meta!.label}
                    <span className="opacity-50 ml-0.5">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Articles ── */}
          <div className="flex-1 overflow-y-auto overscroll-contain" style={{ minHeight: 0 }}>
            {loading && !articles.length && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-6 h-6 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin" />
                <span className="text-[11px] text-text-muted">Fetching news for {symbols.length} companies…</span>
              </div>
            )}

            {!loading && !filtered.length && (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Newspaper className="w-7 h-7 text-text-muted/20" />
                <span className="text-[11px] text-text-muted">No {filter !== 'ALL' ? filter.toLowerCase() + ' ' : ''}news in the last {days}d</span>
              </div>
            )}

            {filtered.map(article => {
              const meta  = SIGNAL_META[article.signal];
              const isNew = !seenIds.has(article.id);
              return (
                <div
                  key={article.id}
                  className={`px-4 py-3 border-b border-border-primary/20 hover:bg-white/[0.025] transition-colors cursor-default ${isNew ? 'border-l-[3px]' : 'border-l-[3px] border-l-transparent'}`}
                  style={isNew ? { borderLeftColor: meta.color } : {}}
                  onClick={() => markOne(article.id)}
                >
                  {/* Meta row */}
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold flex-shrink-0"
                      style={{ background: meta.bg, color: meta.color }}>
                      {meta.icon}{meta.label}
                    </span>
                    <span className="font-mono font-bold text-[9px] px-1.5 py-0.5 rounded" style={{ background: '#00d4ff10', color: '#00d4ff' }}>
                      {article.symbol}
                    </span>
                    {isNew && (
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: meta.color, boxShadow: `0 0 4px ${meta.color}` }} />
                    )}
                    <span className="ml-auto text-[9px] text-text-muted flex-shrink-0">{timeAgo(article.datetime)}</span>
                  </div>

                  {/* Headline */}
                  <div className="text-[11px] font-semibold text-text-primary leading-snug mb-1.5">
                    {article.headline}
                  </div>

                  {/* Summary */}
                  {article.summary && article.summary !== article.headline && (
                    <div className="text-[10px] text-text-muted leading-relaxed line-clamp-2 mb-1.5">
                      {article.summary}
                    </div>
                  )}

                  {/* Footer row */}
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-text-muted/70">{article.source}</span>
                    {article.url && (
                      <a href={article.url} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-0.5 text-[9px] text-accent-cyan/50 hover:text-accent-cyan transition-colors">
                        Read more <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Footer ── */}
          {articles.length > 0 && (
            <div className="px-4 py-2 border-t border-border-primary/40 flex-shrink-0 flex items-center justify-between bg-white/[0.01]">
              <span className="text-[9px] text-text-muted/50">Powered by Finnhub · auto-refreshes every 5 min</span>
              <span className="text-[9px] font-mono text-text-muted/50">{filtered.length} articles</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
