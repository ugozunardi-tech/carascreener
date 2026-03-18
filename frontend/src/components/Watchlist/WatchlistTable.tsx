import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, Trash2, Info } from 'lucide-react';
import clsx from 'clsx';
import type { StockItem, SortConfig, SortField } from '../../types';

interface Props {
  stocks: StockItem[];
  updatedSymbols: Set<string>;
  sortConfig: SortConfig;
  onSort: (field: SortField) => void;
  onRemove?: (symbol: string) => void;
}

// ── Market status helper ──────────────────────────────────────────────────────
type MarketStatus = 'open' | 'pre' | 'after' | 'closed';

function localMins(tz: string) {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
  return { day: d.getDay(), mins: d.getHours() * 60 + d.getMinutes() };
}

function getMarketStatus(currency?: string): MarketStatus {
  // European currencies → CET/CEST (Milan, Frankfurt, Paris, Amsterdam)
  // London → GMT/BST
  // Everything else → US ET
  if (currency === 'EUR') {
    const { day, mins } = localMins('Europe/Rome');
    if (day === 0 || day === 6) return 'closed';
    if (mins >= 540 && mins < 1050) return 'open';   // 9:00–17:30 CET
    if (mins >= 480 && mins < 540)  return 'pre';    // 8:00–9:00
    if (mins >= 1050 && mins < 1200) return 'after'; // 17:30–20:00
    return 'closed';
  }
  if (currency === 'GBP') {
    const { day, mins } = localMins('Europe/London');
    if (day === 0 || day === 6) return 'closed';
    if (mins >= 480 && mins < 1010) return 'open';   // 8:00–16:50 GMT/BST
    if (mins >= 420 && mins < 480)  return 'pre';    // 7:00–8:00
    return 'closed';
  }
  // Default: US ET (NYSE/NASDAQ)
  const { day, mins } = localMins('America/New_York');
  if (day === 0 || day === 6) return 'closed';
  if (mins >= 570 && mins < 960)  return 'open';    // 9:30–16:00
  if (mins >= 240 && mins < 570)  return 'pre';     // 4:00–9:30
  if (mins >= 960 && mins < 1200) return 'after';   // 16:00–20:00
  return 'closed';
}

const STATUS_DOT: Record<MarketStatus, { color: string; title: string }> = {
  open:   { color: '#00e676', title: 'Live price — market open'         },
  pre:    { color: '#ffd700', title: 'Pre-market price'                 },
  after:  { color: '#ffd700', title: 'After-hours price'                },
  closed: { color: '#ff3b3b', title: 'Market closed — last close price' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function SortIcon({ field, cfg }: { field: SortField; cfg: SortConfig }) {
  if (cfg.field !== field) return <ArrowUpDown className="w-2.5 h-2.5 text-text-muted opacity-40" />;
  return cfg.direction === 'asc'
    ? <ArrowUp className="w-2.5 h-2.5 text-accent-cyan" />
    : <ArrowDown className="w-2.5 h-2.5 text-accent-cyan" />;
}

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', JPY: '¥', CHF: 'Fr', CAD: 'C$', AUD: 'A$', HKD: 'HK$',
};
function currSym(c?: string) { return CURRENCY_SYMBOL[c ?? 'USD'] ?? (c ? c + ' ' : '$'); }

function fmt(p: number, currency?: string) {
  const sym = currSym(currency);
  if (p === 0) return '—';
  if (p >= 1000) return `${sym}${(p / 1000).toFixed(1)}k`;
  return `${sym}${p.toFixed(2)}`;
}

function Range({ price, low, high }: { price: number; low: number; high: number }) {
  if (!high || !low || high === low) return <span className="text-text-muted text-xs">—</span>;
  const pct = Math.min(100, Math.max(0, ((price - low) / (high - low)) * 100));
  const color = pct > 70 ? '#00e676' : pct > 40 ? '#00d4ff' : '#ff3b3b';
  return (
    <div className="flex flex-col gap-1 w-20">
      <div className="relative h-[3px] bg-border-primary rounded-full overflow-hidden">
        <div className="absolute h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}44, ${color})` }} />
        <div className="absolute top-0 w-[2px] h-full rounded-full" style={{ left: `${pct}%`, background: color, boxShadow: `0 0 4px ${color}` }} />
      </div>
      <span className="text-[9px] font-mono text-text-muted">{pct.toFixed(0)}%</span>
    </div>
  );
}

function WatchBadge({ p }: { p: string }) {
  if (p === 'HIGH')   return <span className="badge-high">HIGH</span>;
  if (p === 'MEDIUM') return <span className="badge-medium">MED</span>;
  return <span className="badge-low">LOW</span>;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function WatchlistTable({ stocks, updatedSymbols, sortConfig, onSort, onRemove }: Props) {
  const navigate = useNavigate();

  const SH = ({ field, label, right, tooltip }: { field: SortField; label: string; right?: boolean; tooltip?: string }) => (
    <th
      className={clsx('px-3 py-2.5 text-left text-[10px] font-bold text-text-muted uppercase tracking-widest cursor-pointer select-none whitespace-nowrap group', right && 'text-right')}
      onClick={() => onSort(field)}
      title={tooltip}
    >
      <span className="inline-flex items-center gap-1 group-hover:text-text-secondary transition-colors">
        {label} <SortIcon field={field} cfg={sortConfig} />
      </span>
    </th>
  );

  if (!stocks.length) return (
    <div className="flex flex-col items-center justify-center py-20 gap-2 text-text-secondary">
      <span className="text-3xl">📭</span>
      <p className="text-sm">No stocks match your filters</p>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th className="px-3 py-2.5 text-left text-[10px] font-bold text-text-muted w-7">#</th>
            <SH field="symbol"        label="Symbol" />
            <SH field="name"          label="Company" />
            <SH field="price"         label="Price"   right />
            <SH field="change"        label="24h $"   right tooltip="Change in dollars over the last trading session" />
            <SH field="changePercent" label="24h %"   right tooltip="Percentage change over the last trading session" />
            <th className="px-3 py-2.5 text-[10px] font-bold text-text-muted uppercase tracking-widest">52W Range</th>
            <th className="px-3 py-2.5 text-[10px] font-bold text-text-muted uppercase tracking-widest">
              <span className="inline-flex items-center gap-1" title="Your personal watch level — set when adding the stock. HIGH = monitor closely, MED = on radar, LOW = background watch.">
                Watch <Info className="w-2.5 h-2.5 opacity-50" />
              </span>
            </th>
            <th className="px-3 py-2.5 text-[10px] font-bold text-text-muted uppercase tracking-widest">Sector</th>
            <th className="px-3 py-2.5 text-[10px] font-bold text-text-muted uppercase tracking-widest">Theme</th>
            <th className="px-3 py-2.5 w-10" />
          </tr>
        </thead>
        <tbody>
          {stocks.map((s, i) => {
            const isUpdated = updatedSymbols.has(s.symbol);
            const up = s.changePercent > 0;
            const dn = s.changePercent < 0;
            const isHigh = s.priority === 'HIGH';
            const dot = STATUS_DOT[getMarketStatus(s.currency)];

            return (
              <tr
                key={s.symbol}
                className={clsx(
                  'group cursor-pointer',
                  isHigh ? 'row-high' : '',
                  isUpdated ? (up ? 'price-flash-green' : 'price-flash-red') : ''
                )}
                onClick={() => navigate(`/stock/${s.symbol}`)}
              >
                {/* # */}
                <td className="px-3 py-3 text-text-muted font-mono text-[10px] w-7">{i + 1}</td>

                {/* Symbol */}
                <td className="px-3 py-3">
                  <span className="font-mono font-black text-sm tracking-wide text-text-primary">
                    {s.symbol}
                  </span>
                </td>

                {/* Name */}
                <td className="px-3 py-3 max-w-[180px]">
                  <span className="text-xs text-text-secondary truncate block">{s.name}</span>
                </td>

                {/* Price + market status dot */}
                <td className="px-3 py-3 text-right">
                  <span className="inline-flex items-center justify-end gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse-dot"
                      style={{ backgroundColor: dot.color, boxShadow: `0 0 5px ${dot.color}` }}
                      title={dot.title}
                    />
                    <span className="font-mono font-bold text-sm text-text-primary">{fmt(s.price, s.currency)}</span>
                    {s.currency && s.currency !== 'USD' && (
                      <span className="text-[8px] font-mono text-text-muted border border-border-primary/50 px-1 rounded">{s.currency}</span>
                    )}
                  </span>
                </td>

                {/* 24h $ */}
                <td className="px-3 py-3 text-right">
                  <span className={clsx('font-mono text-xs', up ? 'text-accent-green' : dn ? 'text-accent-red' : 'text-text-muted')}>
                    {s.change === 0 ? '—' : `${up ? '+' : ''}${currSym(s.currency)}${Math.abs(s.change).toFixed(2)}`}
                  </span>
                </td>

                {/* 24h % */}
                <td className="px-3 py-3 text-right">
                  <span className={clsx(
                    'inline-flex items-center justify-end gap-1 px-2 py-0.5 rounded font-mono text-xs font-bold',
                    up ? 'bg-accent-green/10 text-accent-green' :
                    dn ? 'bg-accent-red/10 text-accent-red' : 'text-text-muted'
                  )}>
                    {s.changePercent === 0 ? '—' : `${up ? '▲' : '▼'} ${Math.abs(s.changePercent).toFixed(2)}%`}
                  </span>
                </td>

                {/* 52W range */}
                <td className="px-3 py-3">
                  <Range price={s.price} low={s.low} high={s.high} />
                </td>

                {/* Watch level */}
                <td className="px-3 py-3"><WatchBadge p={s.priority} /></td>

                {/* Sector */}
                <td className="px-3 py-3">
                  <span className="text-[11px] text-text-muted">{s.sector}</span>
                </td>

                {/* Theme */}
                <td className="px-3 py-3">
                  <span className="text-[10px] font-mono text-accent-cyan/60 px-1.5 py-0.5 rounded bg-accent-cyan/5 border border-accent-cyan/10 whitespace-nowrap">
                    {s.theme}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    {onRemove && (
                      <button
                        onClick={e => { e.stopPropagation(); onRemove(s.symbol); }}
                        className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded hover:bg-accent-red/10 hover:text-accent-red text-text-muted transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-text-muted group-hover:text-accent-cyan transition-colors" />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
