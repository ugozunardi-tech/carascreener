import type { IntelTrigger } from '../../data/nodeIntelligence';
import type { NewsArticle } from './NotificationPanel';

interface Props {
  triggers:    IntelTrigger[];
  news:        NewsArticle[];
  newsLoading: boolean;
}

const CAT_META: Record<IntelTrigger['category'], { label: string; color: string }> = {
  'hard-data': { label: 'DATA',   color: '#ff1744' },
  'policy':    { label: 'POLICY', color: '#ff9800' },
  'news':      { label: 'NEWS',   color: '#00d4ff' },
  'market':    { label: 'MARKET', color: '#a78bfa' },
};

const PRI_META: Record<IntelTrigger['priority'], { color: string; dot: string }> = {
  'immediate': { color: '#ff1744', dot: 'animate-pulse' },
  'watch':     { color: '#ff9800', dot: ''              },
  'monitor':   { color: '#64748b', dot: ''              },
};

const SIGNAL_COLORS: Record<string, string> = {
  INVESTMENT: '#00e676', 'M&A': '#a78bfa', 'SUPPLY CHAIN': '#00d4ff',
  REGULATORY: '#ff9800', DISRUPTION: '#ff1744', NEWS: '#64748b',
};

function timeAgo(ts: number) {
  const secs = Date.now() / 1000 - ts;
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export function WatchlistPanel({ triggers, news, newsLoading }: Props) {
  // Sort triggers: immediate first, then watch, then monitor
  const sorted = [...triggers].sort((a, b) => {
    const order = { immediate: 0, watch: 1, monitor: 2 };
    return order[a.priority] - order[b.priority];
  });

  return (
    <div className="px-4 py-3 border-b border-border-primary">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest">Watchlist</span>
        {sorted.some(t => t.priority === 'immediate') && (
          <span className="text-[7px] font-black uppercase px-1.5 py-px rounded animate-pulse"
            style={{ background: '#ff174418', color: '#ff1744', border: '1px solid #ff174440' }}>
            Active
          </span>
        )}
      </div>

      {/* Intel triggers */}
      {sorted.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {sorted.map((t, i) => {
            const cat = CAT_META[t.category];
            const pri = PRI_META[t.priority];
            return (
              <div key={i} className="flex items-start gap-2 rounded px-2 py-1.5"
                style={{ background: `${pri.color}08`, border: `1px solid ${pri.color}18` }}>
                <div className={`w-1.5 h-1.5 rounded-full mt-0.5 flex-shrink-0 ${pri.dot}`}
                  style={{ background: pri.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[6px] font-black uppercase px-1 py-px rounded"
                      style={{ background: `${cat.color}20`, color: cat.color }}>{cat.label}</span>
                    <span className="text-[7px] text-text-muted ml-auto flex-shrink-0">{timeAgo(t.timestamp)}</span>
                  </div>
                  <div className="text-[8px] text-text-secondary leading-snug">{t.headline}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* News from feed */}
      {newsLoading && (
        <div className="flex items-center gap-1.5 py-2">
          <div className="w-2.5 h-2.5 border border-accent-cyan/40 border-t-accent-cyan rounded-full animate-spin" />
          <span className="text-[9px] text-text-muted">Loading news…</span>
        </div>
      )}
      {!newsLoading && news.length > 0 && (
        <>
          <div className="text-[7px] font-bold text-text-muted uppercase tracking-widest mb-1.5">Recent News</div>
          <div className="space-y-1.5">
            {news.slice(0, 4).map(a => (
              <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                className="block rounded p-2 border border-border-primary/30 hover:border-border-secondary hover:bg-bg-tertiary/20 transition-all group">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[7px] font-bold px-1 py-px rounded"
                    style={{ background: `${SIGNAL_COLORS[a.signal] ?? '#64748b'}15`, color: SIGNAL_COLORS[a.signal] ?? '#64748b' }}>
                    {a.signal}
                  </span>
                  <span className="ml-auto text-[7px] text-text-muted flex-shrink-0">{timeAgo(a.datetime)}</span>
                </div>
                <div className="text-[9px] font-medium text-text-primary leading-snug group-hover:text-accent-cyan transition-colors line-clamp-2">
                  {a.headline}
                </div>
              </a>
            ))}
          </div>
        </>
      )}
      {!newsLoading && news.length === 0 && sorted.length === 0 && (
        <div className="text-[9px] text-text-muted text-center py-3">No watchlist items</div>
      )}
    </div>
  );
}
