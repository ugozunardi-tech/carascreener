import type { CapacityProfile } from '../../data/nodeIntelligence';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props { data: CapacityProfile }

function utilizationColor(u: number) {
  if (u >= 90) return '#ff1744';
  if (u >= 80) return '#ff9800';
  if (u >= 70) return '#ffeb3b';
  return '#4ade80';
}

const TYPE_META = {
  cyclical:   { label: 'CYCLICAL',   color: '#ffeb3b', desc: 'Resolves when demand normalizes or capacity comes online' },
  structural: { label: 'STRUCTURAL', color: '#ff5722', desc: 'Does not resolve with capex — fundamental constraint'      },
  unknown:    { label: 'UNKNOWN',    color: '#64748b', desc: 'Capacity type uncertain — software/IP node'                },
};

const CAPEX_ICON = {
  expanding:    { icon: TrendingUp,   color: '#4ade80', label: 'Expanding' },
  stable:       { icon: Minus,        color: '#ffeb3b', label: 'Stable'    },
  contracting:  { icon: TrendingDown, color: '#ff1744', label: 'Shrinking' },
};

export function CapacityStatusPanel({ data }: Props) {
  if (data.utilization === 0 && data.css < 0.15) {
    return (
      <div className="px-4 py-3 border-b border-border-primary flex-shrink-0">
        <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest">Capacity Status</span>
        <div className="text-[9px] text-text-muted mt-1.5 italic">IP/software node — physical capacity not applicable</div>
      </div>
    );
  }

  const uColor  = utilizationColor(data.utilization);
  const typeMeta = TYPE_META[data.type];
  const capexMeta = CAPEX_ICON[data.capexTrend];
  const CapexIcon = capexMeta.icon;

  const cssVerdict =
    data.css >= 0.8 ? 'CRITICAL — no relief in 12–18 months' :
    data.css >= 0.6 ? 'TIGHT — allocation risk elevated'      :
    data.css >= 0.4 ? 'BALANCED — manageable near-term'       :
                      'SLACK — disruption risk low';

  return (
    <div className="px-4 py-3 border-b border-border-primary flex-shrink-0">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest">Capacity Status</span>
        <span className="text-[7px] font-black uppercase px-1.5 py-px rounded"
          style={{ background: `${typeMeta.color}15`, color: typeMeta.color, border: `1px solid ${typeMeta.color}30` }}>
          {typeMeta.label}
        </span>
      </div>

      {/* Utilization bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[8px] mb-1">
          <span className="text-text-muted">Utilization</span>
          <span className="font-black font-mono" style={{ color: uColor }}>{data.utilization}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1a2236' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${data.utilization}%`, background: uColor }} />
        </div>
      </div>

      {/* Meta rows */}
      <div className="space-y-1.5 mb-2.5">
        <div className="flex items-center justify-between text-[8px]">
          <span className="text-text-muted">Lead time</span>
          <span className="font-mono font-bold text-text-secondary">
            {data.leadTimeDays > 0 ? `${data.leadTimeDays} days` : 'N/A'}
          </span>
        </div>
        <div className="flex items-center justify-between text-[8px]">
          <span className="text-text-muted">Capex trend</span>
          <span className="flex items-center gap-1 font-bold" style={{ color: capexMeta.color }}>
            <CapexIcon className="w-3 h-3" /> {capexMeta.label}
          </span>
        </div>
        <div className="flex items-center justify-between text-[8px]">
          <span className="text-text-muted">Stress score</span>
          <span className="font-mono font-bold" style={{ color: uColor }}>{Math.round(data.css * 100)}/100</span>
        </div>
      </div>

      {/* Verdict */}
      <div className="rounded px-2 py-1.5 text-[8px] leading-snug"
        style={{ background: `${uColor}0a`, borderLeft: `2px solid ${uColor}60` }}>
        <span style={{ color: uColor }}>{cssVerdict}</span>
      </div>

      {/* Type description */}
      <div className="mt-1.5 text-[8px] text-text-muted leading-snug italic">{typeMeta.desc}</div>
    </div>
  );
}
