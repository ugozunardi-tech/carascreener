import { useState, useCallback } from 'react';
import { X, RefreshCw, AlertTriangle, Shield, Zap, TrendingUp, TrendingDown, ChevronRight, ExternalLink } from 'lucide-react';
// Types mirrored here to avoid cross-package import
interface SupplyChainAnalysis {
  symbol: string; company: string; generatedAt: string;
  ecosystem: {
    suppliers:     { name: string; ticker?: string; role: string; criticality: string }[];
    keyInputs:     string[];
    manufacturing: string;
    customers:     { name: string; ticker?: string; share?: number }[];
  };
  criticalNodes:  { name: string; ticker?: string; role: string; why: string; monopoly: boolean }[];
  bottlenecks:    { title: string; description: string; severity: string; type: string }[];
  vulnerabilities:{ category: string; title: string; description: string; severity: string }[];
  stressPoints:   { scenario: string; impact: string; probability: string }[];
  pricingPower:   { node: string; ticker?: string; level: string; reason: string }[];
  advantages:     { title: string; description: string }[];
  risks:          { rank: number; title: string; description: string; probability: string; impact: string }[];
  strengths:      { rank: number; title: string; description: string }[];
  scenario: { type: string; title: string; description: string; timeline: string; implications: string[]; affectedTickers: string[] };
}

interface Props {
  symbol: string;
  companyName: string;
  onClose: () => void;
  onTickerClick?: (symbol: string) => void;
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#ff1744', high: '#ff5722', medium: '#ff9800', low: '#4ade80',
  dominant: '#a78bfa',
};
const PROB_COLOR: Record<string, string> = {
  high: '#ff5722', medium: '#ff9800', low: '#4ade80',
};

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider"
      style={{ background: `${color}22`, color, border: `1px solid ${color}40` }}>
      {text}
    </span>
  );
}

function TickerChip({ ticker, onClick }: { ticker: string; onClick?: (t: string) => void }) {
  return (
    <button
      onClick={() => onClick?.(ticker)}
      className="font-mono font-black text-[9px] px-1.5 py-0.5 rounded transition-all hover:scale-105"
      style={{ background: '#00d4ff18', color: '#00d4ff', border: '1px solid #00d4ff40' }}
    >
      {ticker}
    </button>
  );
}

function RiskBar({ probability, impact }: { probability: string; impact: string }) {
  const pColor = PROB_COLOR[probability] ?? '#94a3b8';
  const iColor = PROB_COLOR[impact] ?? '#94a3b8';
  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="text-[8px] text-text-muted uppercase">Prob</span>
      <Badge text={probability} color={pColor} />
      <span className="text-[8px] text-text-muted uppercase">Impact</span>
      <Badge text={impact} color={iColor} />
    </div>
  );
}

export default function DeepAnalysisPanel({ symbol, companyName, onClose, onTickerClick }: Props) {
  const [data,    setData]    = useState<SupplyChainAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [loaded,  setLoaded]  = useState(false);

  const load = useCallback(async (refresh = false) => {
    setLoading(true); setError('');
    try {
      const url = `/api/deepanalysis/${symbol}?name=${encodeURIComponent(companyName)}${refresh ? '&refresh=1' : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Analysis failed');
      setData(await res.json());
      setLoaded(true);
    } catch {
      setError('Analysis generation failed. Try again.');
    } finally { setLoading(false); }
  }, [symbol, companyName]);

  // Auto-load on mount
  if (!loaded && !loading && !error) load();

  const d = data;

  return (
    <div className="fixed inset-0 z-[500] flex items-start justify-center pt-8 px-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div className="relative flex flex-col rounded-2xl border border-border-primary shadow-2xl overflow-hidden animate-fade-in"
        style={{ width: '100%', maxWidth: '860px', maxHeight: '88vh', background: 'rgba(8,12,24,0.99)' }}>

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border-primary flex-shrink-0"
          style={{ background: 'rgba(10,16,32,0.99)' }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-base text-accent-cyan">{symbol}</span>
              <span className="text-sm text-text-secondary truncate">{companyName}</span>
              {d && <span className="text-[8px] text-text-muted font-mono ml-2">
                {new Date(d.generatedAt).toLocaleDateString()}
              </span>}
            </div>
            <div className="text-[9px] text-text-muted uppercase tracking-widest mt-0.5">Deep Supply Chain Analysis</div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {d && (
              <button onClick={() => load(true)} disabled={loading}
                className="flex items-center gap-1 px-2 py-1 text-[9px] text-text-muted border border-border-primary rounded hover:text-text-primary transition-colors">
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            )}
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-2 border-accent-cyan/20 border-t-accent-cyan rounded-full animate-spin" />
            <div className="text-sm text-text-secondary">Generating deep analysis for {symbol}…</div>
            <div className="text-[10px] text-text-muted">Mapping ecosystem · identifying risks · evaluating resilience</div>
          </div>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertTriangle className="w-8 h-8 text-accent-red" />
            <div className="text-sm text-text-secondary">{error}</div>
            <button onClick={() => load()} className="px-4 py-2 text-xs bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 rounded-lg hover:bg-accent-cyan/20 transition-colors">
              Try again
            </button>
          </div>
        )}

        {/* ── Content ── */}
        {d && !loading && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

            {/* ── Top 3 Risks + Strengths ── */}
            <div className="grid grid-cols-2 gap-3">
              {/* Risks */}
              <div className="rounded-xl border border-accent-red/20 overflow-hidden" style={{ background: '#ff174408' }}>
                <div className="px-4 py-2.5 border-b border-accent-red/20 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-accent-red" />
                  <span className="text-[10px] font-black text-accent-red uppercase tracking-widest">Top 3 Risks</span>
                </div>
                <div className="divide-y divide-border-primary/20">
                  {d.risks?.map(r => (
                    <div key={r.rank} className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <span className="text-[9px] font-black text-accent-red/50 mt-0.5 flex-shrink-0">#{r.rank}</span>
                        <div>
                          <div className="text-[11px] font-bold text-text-primary">{r.title}</div>
                          <div className="text-[9px] text-text-muted mt-0.5 leading-relaxed">{r.description}</div>
                          <RiskBar probability={r.probability} impact={r.impact} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths */}
              <div className="rounded-xl border border-accent-green/20 overflow-hidden" style={{ background: '#00e67608' }}>
                <div className="px-4 py-2.5 border-b border-accent-green/20 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-accent-green" />
                  <span className="text-[10px] font-black text-accent-green uppercase tracking-widest">Top 3 Strengths</span>
                </div>
                <div className="divide-y divide-border-primary/20">
                  {d.strengths?.map(s => (
                    <div key={s.rank} className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <span className="text-[9px] font-black text-accent-green/50 mt-0.5 flex-shrink-0">#{s.rank}</span>
                        <div>
                          <div className="text-[11px] font-bold text-text-primary">{s.title}</div>
                          <div className="text-[9px] text-text-muted mt-0.5 leading-relaxed">{s.description}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Scenario ── */}
            {d.scenario && (() => {
              const isDisruption = d.scenario.type === 'disruption';
              const color = isDisruption ? '#ff5722' : '#00e676';
              const Icon = isDisruption ? TrendingDown : TrendingUp;
              return (
                <div className="rounded-xl border overflow-hidden" style={{ background: `${color}08`, borderColor: `${color}30` }}>
                  <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: `${color}20` }}>
                    <Zap className="w-3.5 h-3.5" style={{ color }} />
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>
                      High-Impact Scenario — {d.scenario.type === 'disruption' ? 'Disruption' : 'Upside'}
                    </span>
                    <Icon className="w-3 h-3 ml-auto" style={{ color }} />
                  </div>
                  <div className="px-4 py-3">
                    <div className="text-sm font-bold text-text-primary mb-1">{d.scenario.title}</div>
                    <div className="text-[10px] text-text-secondary leading-relaxed mb-2">{d.scenario.description}</div>
                    <div className="text-[9px] font-mono text-text-muted mb-2">Timeline: {d.scenario.timeline}</div>
                    <div className="space-y-1 mb-3">
                      {d.scenario.implications?.map((imp, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <ChevronRight className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color }} />
                          <span className="text-[10px] text-text-secondary">{imp}</span>
                        </div>
                      ))}
                    </div>
                    {d.scenario.affectedTickers?.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[8px] text-text-muted uppercase tracking-widest">Affected:</span>
                        {d.scenario.affectedTickers.map(t => (
                          <TickerChip key={t} ticker={t} onClick={onTickerClick} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ── Critical Nodes ── */}
            {d.criticalNodes?.length > 0 && (
              <section>
                <h3 className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">Critical Nodes</h3>
                <div className="grid grid-cols-2 gap-2">
                  {d.criticalNodes.map((n, i) => (
                    <div key={i} className="rounded-lg border border-border-primary/40 px-3 py-2.5"
                      style={{ background: 'rgba(255,255,255,0.015)' }}>
                      <div className="flex items-center gap-2 mb-1">
                        {n.ticker && <TickerChip ticker={n.ticker} onClick={onTickerClick} />}
                        {n.monopoly && <Badge text="No substitute" color="#ff1744" />}
                      </div>
                      <div className="text-[10px] font-bold text-text-primary">{n.name}</div>
                      <div className="text-[9px] text-text-muted mt-0.5">{n.role}</div>
                      <div className="text-[9px] text-text-secondary mt-1 leading-relaxed">{n.why}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Bottlenecks ── */}
            {d.bottlenecks?.length > 0 && (
              <section>
                <h3 className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">Bottlenecks & Single Points of Failure</h3>
                <div className="space-y-2">
                  {d.bottlenecks.map((b, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border border-border-primary/30 px-3 py-2.5"
                      style={{ background: `${SEVERITY_COLOR[b.severity] ?? '#94a3b8'}06` }}>
                      <div className="w-1 self-stretch rounded-full flex-shrink-0 mt-0.5"
                        style={{ background: SEVERITY_COLOR[b.severity] ?? '#94a3b8' }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-text-primary">{b.title}</span>
                          <Badge text={b.severity} color={SEVERITY_COLOR[b.severity] ?? '#94a3b8'} />
                          <Badge text={b.type.replace('_', ' ')} color="#64748b" />
                        </div>
                        <div className="text-[9px] text-text-muted mt-0.5 leading-relaxed">{b.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Vulnerabilities ── */}
            {d.vulnerabilities?.length > 0 && (
              <section>
                <h3 className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">Key Vulnerabilities</h3>
                <div className="grid grid-cols-2 gap-2">
                  {d.vulnerabilities.map((v, i) => (
                    <div key={i} className="rounded-lg border border-border-primary/30 px-3 py-2.5"
                      style={{ background: 'rgba(255,255,255,0.015)' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge text={v.category} color={SEVERITY_COLOR[v.severity] ?? '#94a3b8'} />
                        <Badge text={v.severity} color={SEVERITY_COLOR[v.severity] ?? '#94a3b8'} />
                      </div>
                      <div className="text-[10px] font-bold text-text-primary">{v.title}</div>
                      <div className="text-[9px] text-text-muted mt-0.5 leading-relaxed">{v.description}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Pricing Power ── */}
            {d.pricingPower?.length > 0 && (
              <section>
                <h3 className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">Pricing Power Across the Chain</h3>
                <div className="space-y-1.5">
                  {d.pricingPower.map((p, i) => {
                    const color = SEVERITY_COLOR[p.level] ?? '#94a3b8';
                    const pct = p.level === 'dominant' ? 95 : p.level === 'high' ? 75 : p.level === 'medium' ? 45 : 20;
                    return (
                      <div key={i} className="flex items-center gap-3 rounded-lg border border-border-primary/20 px-3 py-2"
                        style={{ background: 'rgba(255,255,255,0.01)' }}>
                        <div className="w-20 flex-shrink-0 flex items-center gap-1.5">
                          {p.ticker && <TickerChip ticker={p.ticker} onClick={onTickerClick} />}
                          {!p.ticker && <span className="text-[9px] text-text-secondary font-medium truncate">{p.node}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <div className="flex-1 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                            </div>
                            <Badge text={p.level} color={color} />
                          </div>
                          <div className="text-[8px] text-text-muted leading-snug">{p.reason}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Stress Points ── */}
            {d.stressPoints?.length > 0 && (
              <section>
                <h3 className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">Where the Chain Breaks Under Stress</h3>
                <div className="grid grid-cols-3 gap-2">
                  {d.stressPoints.map((sp, i) => (
                    <div key={i} className="rounded-lg border border-border-primary/30 px-3 py-2.5"
                      style={{ background: 'rgba(255,255,255,0.015)' }}>
                      <div className="mb-1"><Badge text={sp.probability + ' prob'} color={PROB_COLOR[sp.probability] ?? '#94a3b8'} /></div>
                      <div className="text-[9px] font-bold text-text-primary leading-snug mb-1">{sp.scenario}</div>
                      <div className="text-[8px] text-text-muted leading-relaxed">{sp.impact}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Ecosystem overview ── */}
            {d.ecosystem && (
              <section>
                <h3 className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">Ecosystem Overview</h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* Suppliers */}
                  <div className="rounded-lg border border-border-primary/30 overflow-hidden">
                    <div className="px-3 py-1.5 border-b border-border-primary/20 text-[9px] font-bold text-text-muted uppercase tracking-widest">Suppliers</div>
                    <div className="divide-y divide-border-primary/10">
                      {d.ecosystem.suppliers?.map((s, i) => (
                        <div key={i} className="px-3 py-2 flex items-center gap-2">
                          {s.ticker && <TickerChip ticker={s.ticker} onClick={onTickerClick} />}
                          <span className="text-[9px] text-text-secondary flex-1 truncate">{s.name}</span>
                          <Badge text={s.criticality} color={SEVERITY_COLOR[s.criticality] ?? '#94a3b8'} />
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Customers */}
                  <div className="rounded-lg border border-border-primary/30 overflow-hidden">
                    <div className="px-3 py-1.5 border-b border-border-primary/20 text-[9px] font-bold text-text-muted uppercase tracking-widest">Key Customers</div>
                    <div className="divide-y divide-border-primary/10">
                      {d.ecosystem.customers?.map((c, i) => (
                        <div key={i} className="px-3 py-2 flex items-center gap-2">
                          {c.ticker && <TickerChip ticker={c.ticker} onClick={onTickerClick} />}
                          <span className="text-[9px] text-text-secondary flex-1 truncate">{c.name}</span>
                          {c.share != null && (
                            <span className="text-[9px] font-mono text-text-muted">{Math.round(c.share * 100)}%</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {d.ecosystem.keyInputs?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {d.ecosystem.keyInputs.map((inp, i) => (
                      <span key={i} className="text-[9px] px-2 py-0.5 rounded bg-bg-tertiary border border-border-primary/40 text-text-muted">{inp}</span>
                    ))}
                  </div>
                )}
              </section>
            )}

            <div className="text-[8px] text-text-muted/40 text-center pt-2 pb-1">
              AI-generated analysis · {symbol} · {d.generatedAt ? new Date(d.generatedAt).toLocaleString() : ''} · Cached 7 days
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
