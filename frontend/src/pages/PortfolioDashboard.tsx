import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, Trash2, ChevronRight, Search, X, Network } from 'lucide-react';
import { usePortfolio } from '../hooks/usePortfolios';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import AddStockModal from '../components/Portfolio/AddStockModal';
import type { SortField, PortfolioStock } from '../types';
import { useSortedStocks, useFilteredStocks } from '../hooks/useStocks';
import type { StockItem } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────
function toStockItem(s: PortfolioStock): StockItem {
  return {
    symbol: s.symbol, name: s.name, sector: s.sector, theme: s.theme,
    priority: s.priority, price: s.price || 0, change: s.change || 0,
    changePercent: s.changePercent || 0, high: s.high || 0, low: s.low || 0,
    open: 0, prevClose: s.prevClose || 0, volume: 0,
    timestamp: s.timestamp || 0, currency: s.currency,
  };
}

const CURRENCY_SYM: Record<string, string> = {
  USD:'$', EUR:'€', GBP:'£', JPY:'¥', CHF:'Fr', CAD:'C$', AUD:'A$', HKD:'HK$', KRW:'₩', TWD:'NT$',
};
function cSym(c?: string) { return CURRENCY_SYM[c ?? 'USD'] ?? '$'; }
function fmtPrice(p: number, currency?: string) {
  if (p === 0) return '—';
  const s = cSym(currency);
  if (p >= 1000) return `${s}${(p / 1000).toFixed(1)}K`;
  return `${s}${p.toFixed(2)}`;
}
function fmtPct(p: number) {
  if (p === 0) return '—';
  return `${p > 0 ? '+' : ''}${p.toFixed(2)}%`;
}

const RISK_COLOR: Record<string, string> = {
  HIGH: '#ff1744', MEDIUM: '#ff9800', LOW: '#4ade80',
};
const RISK_SHORT: Record<string, string> = {
  HIGH: 'HI', MEDIUM: 'MED', LOW: 'LOW',
};

// Currency → region
function currencyToRegion(c?: string): string {
  if (!c || c === 'USD') return 'US';
  if (c === 'JPY') return 'JP';
  if (c === 'KRW') return 'KR';
  if (c === 'TWD') return 'TW';
  if (c === 'EUR') return 'EU';
  if (c === 'GBP') return 'GB';
  if (c === 'AUD') return 'AU';
  if (c === 'HKD') return 'HK';
  if (c === 'CAD') return 'CA';
  return '—';
}

// Chain layer grouping (maps supply-chain sector labels to layers)
const CHAIN_LAYERS: { id: string; label: string; sectors: string[]; color: string }[] = [
  { id:'L-2', label:'L-2  MINING/WAFER',   color:'#f59e0b', sectors:['Wafer/RE','Wafer','PolySi','RE Mining','Mining','Cu Mining','Refining'] },
  { id:'L-1', label:'L-1  CHEMICALS/GAS',  color:'#fbbf24', sectors:['Fotoresist','MOR/ALD','CMP/Chemicals','CMP Pad','CMP','CMP/Gas/Pkg','Chemicals','Gas','Gas WF6','HF','Etchants'] },
  { id:'L0',  label:'L0   EQUIPMENT',       color:'#00d4ff', sectors:['EUV Monopoly','Equipment','Etching','Metrologia','ALD','Coater 88%','Test ATE'] },
  { id:'L1',  label:'L1   FOUNDRY',          color:'#a78bfa', sectors:['Foundry','Foundry alt.','Foundry mature'] },
  { id:'L2',  label:'L2   PACKAGING/OSAT',  color:'#94a3b8', sectors:['OSAT','PFLO','ABF Film','ABF/LMC','ABF/Cu','Film','LMC','Underfill','TIM/Film','Solder Bump','PSPI'] },
  { id:'L3',  label:'L3   MEMORY/HBM',      color:'#60a5fa', sectors:['HBM Primary','HBM Secondary','HBM Tertiary'] },
  { id:'L4',  label:'L4   SUBSTRATES/MLCC', color:'#c4b5fd', sectors:['FC-BGA','Substrati','Substrati EU','PCB','MLCC','MLCC/Magneti','MLCC/Res.'] },
  { id:'L5',  label:'L5   POWER/INFRA',     color:'#f472b6', sectors:['Power/Cooling','Liquid Cooling','VRM','Power','GaN Power','Connettori','Ottica','Networking'] },
  { id:'L6',  label:'L6   ODM/OEM',          color:'#76b900', sectors:['ODM','Server AI','OEM','EMS/Design','EMS'] },
];

function getLayer(sector: string) {
  for (const l of CHAIN_LAYERS) {
    if (l.sectors.includes(sector)) return l;
  }
  return null;
}

// Market status
function getMarketStatus(currency?: string): 'open'|'pre'|'after'|'closed' {
  const tz = currency === 'EUR' ? 'Europe/Rome' : currency === 'GBP' ? 'Europe/London' : 'America/New_York';
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
  const day = d.getDay(); const mins = d.getHours() * 60 + d.getMinutes();
  if (day === 0 || day === 6) return 'closed';
  if (currency === 'EUR') {
    if (mins >= 540 && mins < 1050) return 'open';
    if (mins >= 480 && mins < 540)  return 'pre';
    if (mins >= 1050 && mins < 1200) return 'after';
    return 'closed';
  }
  if (currency === 'GBP') {
    if (mins >= 480 && mins < 1010) return 'open';
    if (mins >= 420 && mins < 480)  return 'pre';
    return 'closed';
  }
  if (mins >= 570 && mins < 960)  return 'open';
  if (mins >= 240 && mins < 570)  return 'pre';
  if (mins >= 960 && mins < 1200) return 'after';
  return 'closed';
}

// Sort icon
function SortIcon({ field, cfg }: { field: SortField; cfg: { field: string; direction: string } }) {
  if (cfg.field !== field) return <ArrowUpDown className="w-2.5 h-2.5 opacity-25" />;
  return cfg.direction === 'asc'
    ? <ArrowUp className="w-2.5 h-2.5" style={{ color: '#ff6900' }} />
    : <ArrowDown className="w-2.5 h-2.5" style={{ color: '#ff6900' }} />;
}

// Clock
function TerminalClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('en-US', { hour12: false }));
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString('en-US', { hour12: false })), 1000);
    return () => clearInterval(t);
  }, []);
  return <span>{time}</span>;
}

// Scrolling ticker tape
function TickerTape({ stocks }: { stocks: StockItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const priced = stocks.filter(s => s.price > 0).slice(0, 30);
  if (!priced.length) return null;

  return (
    <div className="overflow-hidden border-b" style={{ borderColor: '#1a2236', background: '#06080f' }}>
      <div ref={ref} className="flex animate-marquee whitespace-nowrap py-1" style={{ width: 'max-content' }}>
        {[...priced, ...priced].map((s, i) => {
          const up = s.changePercent > 0; const dn = s.changePercent < 0;
          return (
            <span key={i} className="inline-flex items-center gap-1.5 px-4 font-mono text-[11px]">
              <span className="font-bold" style={{ color: '#e2e8f0' }}>{s.symbol}</span>
              <span style={{ color: '#94a3b8' }}>{fmtPrice(s.price, s.currency)}</span>
              <span style={{ color: up ? '#00e676' : dn ? '#ff1744' : '#475569' }}>
                {up ? '▲' : dn ? '▼' : ''}
                {s.changePercent !== 0 ? `${Math.abs(s.changePercent).toFixed(2)}%` : '—'}
              </span>
              <span style={{ color: '#1e2d4a' }}>│</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PortfolioDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { portfolio, loading, error, updatedSymbols, addStock, removeStock, refresh } = usePortfolio(id || null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeLayer, setActiveLayer] = useState<string | null>(null);

  const stocks: StockItem[] = (portfolio?.stocks || []).map(toStockItem);

  const {
    filtered: filteredByMeta, search, setSearch,
    selectedSector, setSelectedSector,
    selectedPriority, setSelectedPriority,
    selectedTheme, setSelectedTheme,
  } = useFilteredStocks(stocks);

  // Also filter by active layer
  const filtered = activeLayer
    ? filteredByMeta.filter(s => getLayer(s.sector)?.id === activeLayer)
    : filteredByMeta;

  const { sorted, sortConfig, toggleSort } = useSortedStocks(filtered);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <LoadingSpinner size="lg" label="Loading portfolio..." />
    </div>
  );
  if (error || !portfolio) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-2">
        <AlertCircle className="w-8 h-8 mx-auto" style={{ color: '#ff1744' }} />
        <p style={{ color: '#94a3b8' }}>{error || 'Portfolio not found'}</p>
      </div>
    </div>
  );

  // Derived stats
  const priced      = stocks.filter(s => s.price > 0);
  const gainers     = priced.filter(s => s.changePercent > 0).length;
  const losers      = priced.filter(s => s.changePercent < 0).length;
  const critCount   = stocks.filter(s => s.priority === 'HIGH').length;
  const avgChange   = priced.length
    ? priced.reduce((a, s) => a + s.changePercent, 0) / priced.length : 0;
  const isScPortfolio = stocks.some(s => CHAIN_LAYERS.some(l => l.sectors.includes(s.sector)));

  // Chain layer stats
  const layerStats = CHAIN_LAYERS.map(l => {
    const members = stocks.filter(s => l.sectors.includes(s.sector));
    const pricedM = members.filter(s => s.price > 0);
    const avg = pricedM.length ? pricedM.reduce((a,s) => a+s.changePercent,0)/pricedM.length : null;
    return { ...l, count: members.length, avg };
  }).filter(l => l.count > 0);

  // Geo breakdown from currency
  const geoMap: Record<string, number> = {};
  priced.forEach(s => {
    const r = currencyToRegion(s.currency);
    geoMap[r] = (geoMap[r] || 0) + 1;
  });
  const geoEntries = Object.entries(geoMap).sort((a,b) => b[1]-a[1]);
  const geoTotal = geoEntries.reduce((a,[,v]) => a+v, 0);

  // Risk distribution
  const riskDist = [
    { label: 'HIGH',   count: stocks.filter(s => s.priority === 'HIGH').length,   color: '#ff1744' },
    { label: 'MEDIUM', count: stocks.filter(s => s.priority === 'MEDIUM').length, color: '#ff9800' },
    { label: 'LOW',    count: stocks.filter(s => s.priority === 'LOW').length,     color: '#4ade80' },
  ];

  const TB = '#0a0c14';
  const BORDER = '#1a2236';
  const MUTED = '#475569';
  const BBG_ORANGE = '#ff6900';

  return (
    <div className="flex flex-col min-h-full font-mono" style={{ background: TB, color: '#e2e8f0' }}>

      {/* ── Status Bar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b" style={{ borderColor: BORDER, background: '#06080f' }}>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="font-black tracking-widest uppercase" style={{ color: BBG_ORANGE }}>{portfolio.name}</span>
          <span style={{ color: BORDER }}>│</span>
          <span style={{ color: MUTED }}>{stocks.length} COMPONENTS</span>
          <span style={{ color: BORDER }}>│</span>
          <span style={{ color: MUTED }}>RISK: <span style={{ color: critCount > 20 ? '#ff1744' : critCount > 10 ? '#ff9800' : '#4ade80', fontWeight: 700 }}>
            {critCount > 20 ? 'ELEVATED' : critCount > 10 ? 'MODERATE' : 'MANAGED'}
          </span></span>
          <span style={{ color: BORDER }}>│</span>
          <span style={{ color: MUTED }}>ET <TerminalClock /></span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5" style={{ color: MUTED }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00e676', boxShadow: '0 0 6px #00e676' }} />
            LIVE · 30s
            {updatedSymbols.size > 0 && <span style={{ color: '#00d4ff' }}> +{updatedSymbols.size}</span>}
          </span>
          {portfolio.id.includes('nvidia-sc') && (
            <button onClick={() => navigate('/network?portfolio=nvidia-sc')} className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold border transition-colors hover:opacity-80"
              style={{ borderColor: '#76b900', color: '#76b900', background: '#76b90015' }}>
              <Network className="w-2.5 h-2.5" /> VIEW NETWORK
            </button>
          )}
          <button onClick={refresh} className="flex items-center gap-1 px-2 py-0.5 text-[10px] border transition-colors hover:opacity-80"
            style={{ borderColor: BORDER, color: MUTED }}>
            <RefreshCw className="w-2.5 h-2.5" /> REFRESH
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold border transition-colors"
            style={{ borderColor: BBG_ORANGE, color: BBG_ORANGE, background: `${BBG_ORANGE}10` }}>
            <Plus className="w-2.5 h-2.5" /> ADD
          </button>
        </div>
      </div>

      {/* ── Ticker Tape ──────────────────────────────────────────────────────── */}
      <TickerTape stocks={stocks} />

      {/* ── Metric Strip ─────────────────────────────────────────────────────── */}
      <div className="flex border-b" style={{ borderColor: BORDER }}>
        {[
          { k: 'TOTAL',      v: stocks.length,                     c: '#e2e8f0' },
          { k: 'CRITICAL',   v: critCount,                         c: '#ff1744' },
          { k: 'PRICED',     v: priced.length,                     c: '#94a3b8' },
          { k: 'GAINERS',    v: gainers,                           c: '#00e676' },
          { k: 'LOSERS',     v: losers,                            c: '#ff1744' },
          { k: 'AVG Δ',      v: priced.length ? fmtPct(avgChange) : '—',
            c: avgChange > 0 ? '#00e676' : avgChange < 0 ? '#ff1744' : '#475569' },
        ].map(({ k, v, c }) => (
          <div key={k} className="flex-1 px-4 py-2.5 border-r" style={{ borderColor: BORDER }}>
            <div className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{k}</div>
            <div className="text-xl font-black leading-none" style={{ color: c }}>{v}</div>
          </div>
        ))}
        <div className="flex-1 px-4 py-2.5">
          <div className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>PORTFOLIO</div>
          <div className="text-[11px] font-bold" style={{ color: portfolio.color || BBG_ORANGE }}>
            {portfolio.description || '—'}
          </div>
        </div>
      </div>

      {/* ── Intel Panels ─────────────────────────────────────────────────────── */}
      {isScPortfolio && (
        <div className="flex border-b" style={{ borderColor: BORDER }}>

          {/* Chain Layers */}
          <div className="w-80 flex-shrink-0 border-r" style={{ borderColor: BORDER }}>
            <div className="px-3 py-1.5 border-b text-[9px] font-black uppercase tracking-widest" style={{ borderColor: BORDER, color: BBG_ORANGE }}>
              SUPPLY CHAIN LAYERS
            </div>
            {layerStats.map(l => {
              const isActive = activeLayer === l.id;
              const pct = Math.round((l.count / stocks.length) * 100);
              return (
                <button key={l.id} onClick={() => setActiveLayer(isActive ? null : l.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 border-b text-left transition-all hover:opacity-100"
                  style={{ borderColor: BORDER, background: isActive ? `${l.color}12` : 'transparent', opacity: activeLayer && !isActive ? 0.4 : 1 }}>
                  <span className="w-1.5 h-1.5 flex-shrink-0" style={{ background: l.color }} />
                  <span className="text-[10px] flex-1 truncate" style={{ color: isActive ? l.color : '#94a3b8' }}>{l.label}</span>
                  <span className="text-[10px] font-bold w-5 text-right" style={{ color: '#e2e8f0' }}>{l.count}</span>
                  <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: BORDER }}>
                    <div className="h-full" style={{ width: `${pct}%`, background: l.color }} />
                  </div>
                  {l.avg !== null && (
                    <span className="text-[9px] w-10 text-right" style={{ color: l.avg > 0 ? '#00e676' : l.avg < 0 ? '#ff1744' : MUTED }}>
                      {fmtPct(l.avg)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Risk Distribution */}
          <div className="flex-1 border-r" style={{ borderColor: BORDER }}>
            <div className="px-3 py-1.5 border-b text-[9px] font-black uppercase tracking-widest" style={{ borderColor: BORDER, color: BBG_ORANGE }}>
              RISK DISTRIBUTION
            </div>
            <div className="p-3 space-y-2">
              {riskDist.map(r => {
                const pct = Math.round((r.count / stocks.length) * 100);
                return (
                  <div key={r.label}>
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span style={{ color: r.color, fontWeight: 700 }}>{r.label}</span>
                      <span style={{ color: '#94a3b8' }}>{r.count} <span style={{ color: MUTED }}>({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: BORDER }}>
                      <div className="h-full" style={{ width: `${pct}%`, background: r.color }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Geo breakdown */}
            {geoEntries.length > 0 && (
              <>
                <div className="px-3 py-1.5 border-y text-[9px] font-black uppercase tracking-widest" style={{ borderColor: BORDER, color: BBG_ORANGE }}>
                  GEO EXPOSURE (PRICED NAMES)
                </div>
                <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-1">
                  {geoEntries.map(([region, count]) => (
                    <div key={region} className="flex items-center justify-between text-[10px]">
                      <span style={{ color: '#94a3b8' }}>{region}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: BORDER }}>
                          <div className="h-full" style={{ width: `${Math.round((count/geoTotal)*100)}%`, background: '#00d4ff' }} />
                        </div>
                        <span className="w-5 text-right" style={{ color: '#e2e8f0' }}>{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Session snapshot */}
          <div className="w-52 flex-shrink-0">
            <div className="px-3 py-1.5 border-b text-[9px] font-black uppercase tracking-widest" style={{ borderColor: BORDER, color: BBG_ORANGE }}>
              SESSION SNAPSHOT
            </div>
            {priced.length === 0 ? (
              <div className="p-3 text-[10px]" style={{ color: MUTED }}>Awaiting price data…</div>
            ) : (
              <div className="p-3 space-y-2">
                {[...priced].sort((a,b) => b.changePercent - a.changePercent).slice(0,3).map(s => (
                  <div key={s.symbol} className="flex items-center justify-between text-[10px]">
                    <span className="font-bold" style={{ color: '#e2e8f0' }}>{s.symbol}</span>
                    <span style={{ color: '#00e676' }}>▲ {s.changePercent.toFixed(2)}%</span>
                  </div>
                ))}
                <div className="border-t pt-2" style={{ borderColor: BORDER }}>
                  {[...priced].sort((a,b) => a.changePercent - b.changePercent).slice(0,3).map(s => (
                    <div key={s.symbol} className="flex items-center justify-between text-[10px]">
                      <span className="font-bold" style={{ color: '#e2e8f0' }}>{s.symbol}</span>
                      <span style={{ color: '#ff1744' }}>▼ {Math.abs(s.changePercent).toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Search / Filter Strip ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2 border-b" style={{ borderColor: BORDER, background: '#06080f' }}>
        <div className="flex items-center gap-1.5 flex-1 max-w-xs">
          <Search className="w-3 h-3 flex-shrink-0" style={{ color: MUTED }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="SEARCH SYMBOL / NAME..."
            className="bg-transparent text-[11px] outline-none w-full placeholder:font-mono"
            style={{ color: '#e2e8f0', letterSpacing: '0.05em' }}
          />
          {search && <button onClick={() => setSearch('')}><X className="w-3 h-3" style={{ color: MUTED }} /></button>}
        </div>
        <div className="flex items-center gap-1">
          {['HIGH','MEDIUM','LOW'].map(p => (
            <button key={p} onClick={() => setSelectedPriority(selectedPriority === p ? 'all' : p)}
              className="px-2 py-0.5 text-[9px] font-black border transition-all"
              style={{
                borderColor: selectedPriority === p ? RISK_COLOR[p] : BORDER,
                color: selectedPriority === p ? RISK_COLOR[p] : MUTED,
                background: selectedPriority === p ? `${RISK_COLOR[p]}12` : 'transparent',
              }}>
              {RISK_SHORT[p]}
            </button>
          ))}
        </div>
        {activeLayer && (
          <button onClick={() => setActiveLayer(null)}
            className="flex items-center gap-1 px-2 py-0.5 text-[9px] border"
            style={{ borderColor: BBG_ORANGE, color: BBG_ORANGE }}>
            <X className="w-2.5 h-2.5" /> CLEAR LAYER
          </button>
        )}
        <div className="ml-auto text-[10px]" style={{ color: MUTED }}>
          {sorted.length} / {stocks.length}
        </div>
      </div>

      {/* ── Holdings Table ────────────────────────────────────────────────────── */}
      {stocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 py-20">
          <p className="text-[12px]" style={{ color: MUTED }}>NO POSITIONS — PORTFOLIO EMPTY</p>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold border"
            style={{ borderColor: BBG_ORANGE, color: BBG_ORANGE }}>
            <Plus className="w-3 h-3" /> ADD FIRST COMPONENT
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto flex-1">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr style={{ background: '#06080f', borderBottom: `1px solid ${BORDER}` }}>
                <th className="px-3 py-2 text-left w-8" style={{ color: MUTED }}>#</th>

                {([
                  ['symbol',        'SYMBOL',   false],
                  ['name',          'COMPANY',  false],
                  ['price',         'PRICE',    true],
                  ['change',        '24H $',    true],
                  ['changePercent', '24H %',    true],
                ] as [SortField, string, boolean][]).map(([f, l, r]) => (
                  <th key={f}
                    className={`px-3 py-2 text-[9px] font-bold uppercase tracking-widest cursor-pointer select-none whitespace-nowrap ${r ? 'text-right' : 'text-left'}`}
                    style={{ color: sortConfig.field === f ? BBG_ORANGE : MUTED }}
                    onClick={() => toggleSort(f)}>
                    <span className="inline-flex items-center gap-1">
                      {l} <SortIcon field={f} cfg={sortConfig} />
                    </span>
                  </th>
                ))}

                <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-left" style={{ color: MUTED }}>LAYER</th>
                <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-left" style={{ color: MUTED }}>RISK</th>
                <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-left" style={{ color: MUTED }}>REGION</th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => {
                const up = s.changePercent > 0;
                const dn = s.changePercent < 0;
                const layer = getLayer(s.sector);
                const isUpdated = updatedSymbols.has(s.symbol);
                const isHigh = s.priority === 'HIGH';
                const mktStatus = getMarketStatus(s.currency);
                const dotColor = mktStatus === 'open' ? '#00e676' : mktStatus === 'pre' || mktStatus === 'after' ? '#ffab00' : '#475569';
                const region = currencyToRegion(s.currency);

                return (
                  <tr key={s.symbol}
                    className="cursor-pointer border-b group transition-colors"
                    style={{
                      borderColor: BORDER,
                      background: isUpdated ? (up ? '#00e67608' : '#ff174408') : isHigh ? '#ff174405' : 'transparent',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#ffffff08')}
                    onMouseLeave={e => (e.currentTarget.style.background = isUpdated ? (up ? '#00e67608' : '#ff174408') : isHigh ? '#ff174405' : 'transparent')}
                    onClick={() => navigate(`/stock/${s.symbol}`)}>

                    {/* # */}
                    <td className="px-3 py-2.5" style={{ color: MUTED }}>{i + 1}</td>

                    {/* Symbol */}
                    <td className="px-3 py-2.5">
                      <span className="font-black tracking-wide text-[12px]" style={{ color: isHigh ? '#ff8a80' : '#e2e8f0' }}>
                        {s.symbol}
                      </span>
                    </td>

                    {/* Company */}
                    <td className="px-3 py-2.5 max-w-[200px]">
                      <span className="truncate block text-[11px]" style={{ color: '#94a3b8' }}>{s.name}</span>
                    </td>

                    {/* Price */}
                    <td className="px-3 py-2.5 text-right">
                      <span className="inline-flex items-center justify-end gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />
                        <span className="font-bold" style={{ color: '#e2e8f0' }}>{fmtPrice(s.price, s.currency)}</span>
                      </span>
                    </td>

                    {/* 24h $ */}
                    <td className="px-3 py-2.5 text-right">
                      <span style={{ color: up ? '#00e676' : dn ? '#ff1744' : MUTED }}>
                        {s.change === 0 ? '—' : `${up ? '+' : ''}${cSym(s.currency)}${Math.abs(s.change).toFixed(2)}`}
                      </span>
                    </td>

                    {/* 24h % */}
                    <td className="px-3 py-2.5 text-right">
                      <span className="inline-flex items-center justify-end gap-1 px-1.5 py-0.5 font-bold"
                        style={{
                          color: up ? '#00e676' : dn ? '#ff1744' : MUTED,
                          background: up ? '#00e67610' : dn ? '#ff174410' : 'transparent',
                        }}>
                        {s.changePercent === 0 ? '—' : `${up ? '▲' : '▼'} ${Math.abs(s.changePercent).toFixed(2)}%`}
                      </span>
                    </td>

                    {/* Layer */}
                    <td className="px-3 py-2.5">
                      {layer ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5"
                          style={{ color: layer.color, background: `${layer.color}12`, border: `1px solid ${layer.color}30` }}>
                          {layer.id}
                        </span>
                      ) : (
                        <span className="text-[10px]" style={{ color: MUTED }}>{s.sector || '—'}</span>
                      )}
                    </td>

                    {/* Risk */}
                    <td className="px-3 py-2.5">
                      <span className="text-[9px] font-black px-1.5 py-0.5"
                        style={{ color: RISK_COLOR[s.priority], background: `${RISK_COLOR[s.priority]}12` }}>
                        {RISK_SHORT[s.priority]}
                      </span>
                    </td>

                    {/* Region */}
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] font-bold" style={{ color: MUTED }}>{region}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {removeStock && (
                          <button onClick={e => { e.stopPropagation(); removeStock(s.symbol); }}
                            className="w-5 h-5 flex items-center justify-center transition-colors"
                            style={{ color: MUTED }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#ff1744')}
                            onMouseLeave={e => (e.currentTarget.style.color = MUTED)}>
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                        <ChevronRight className="w-3.5 h-3.5" style={{ color: MUTED }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t text-[9px]" style={{ borderColor: BORDER, color: MUTED, background: '#06080f' }}>
        <span>CARASCREENER · SUPPLY CHAIN INTELLIGENCE PLATFORM</span>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1 px-2 py-0.5 border transition-colors"
          style={{ borderColor: BORDER, color: MUTED }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = BBG_ORANGE; (e.currentTarget as HTMLButtonElement).style.color = BBG_ORANGE; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; (e.currentTarget as HTMLButtonElement).style.color = MUTED; }}>
          <Plus className="w-2.5 h-2.5" /> ADD COMPONENT
        </button>
      </div>

      {showAddModal && (
        <AddStockModal portfolioId={portfolio.id} existingSymbols={portfolio.stocks.map(s => s.symbol)}
          onClose={() => setShowAddModal(false)} onAdd={addStock} />
      )}
    </div>
  );
}
