import type { TimeToImpact as TTI } from '../../data/nodeIntelligence';

interface Props { data: TTI }

const BUCKET_META = {
  immediate:  { label: 'IMMEDIATE',  color: '#ff1744', desc: 'No buffer — production halts now'              },
  near:       { label: 'NEAR-TERM',  color: '#ff5722', desc: 'Buffer absorbs shock; constraint bites in weeks' },
  medium:     { label: 'MED-TERM',   color: '#ff9800', desc: 'Partial substitution buys time; earnings-level risk' },
  structural: { label: 'STRUCTURAL', color: '#64748b', desc: 'Supply-chain redesign required; 12+ month horizon' },
};

export function TimeToImpactTimeline({ data }: Props) {
  const meta = BUCKET_META[data.bucket];

  // Position of impact marker as % of 365-day axis (capped)
  const pct = Math.min(95, Math.max(3, (data.days / 365) * 100));

  const rows = [
    { label: 'Inventory buffer',   value: data.inventoryDays > 0 ? `~${data.inventoryDays} days` : 'N/A (IP/tools)' },
    { label: 'Supplier lead time', value: data.leadTimeDays  > 0 ? `${data.leadTimeDays} days`   : 'Immediate'       },
    { label: 'Switch delay',       value: `${data.switchDelayMonths} months`                                          },
  ];

  return (
    <div className="px-4 py-3 border-b border-border-primary flex-shrink-0">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest">Time to Impact</span>
        <span className="text-[7px] font-black uppercase px-1.5 py-px rounded"
          style={{ background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}35` }}>
          {meta.label}
        </span>
      </div>

      {/* Timeline track */}
      <div className="relative mb-1.5 mt-3">
        {/* Track */}
        <div className="h-1 rounded-full" style={{ background: '#1a2236' }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: meta.color, opacity: 0.4 }} />
        </div>
        {/* Marker */}
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
          style={{ left: `${pct}%` }}>
          <div className="w-2.5 h-2.5 rounded-full border-2 border-current"
            style={{ background: meta.color, borderColor: meta.color, marginTop: -4 }} />
        </div>
      </div>

      {/* Axis labels */}
      <div className="flex justify-between text-[7px] text-text-muted font-mono mb-3">
        <span>Now</span><span>30d</span><span>90d</span><span>180d</span><span>1yr+</span>
      </div>

      {/* Description */}
      <div className="text-[9px] leading-snug mb-2.5" style={{ color: meta.color }}>
        {meta.desc}
      </div>

      {/* Detail rows */}
      <div className="space-y-1">
        {rows.map(r => (
          <div key={r.label} className="flex items-center justify-between text-[8px]">
            <span className="text-text-muted">{r.label}</span>
            <span className="font-mono font-bold text-text-secondary">{r.value}</span>
          </div>
        ))}
        {data.days > 0 && (
          <div className="flex items-center justify-between text-[8px] pt-1 border-t border-border-primary/30">
            <span className="text-text-muted">Gap before constraint</span>
            <span className="font-mono font-black" style={{ color: meta.color }}>
              {data.days >= 365 ? '12+ months' : `~${data.days} days`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
