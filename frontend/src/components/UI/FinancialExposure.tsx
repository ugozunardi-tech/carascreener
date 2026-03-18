import { useState } from 'react';
import { DollarSign } from 'lucide-react';
import type { FinancialExposure as FE } from '../../data/nodeIntelligence';

interface Props {
  data: FE;
  nodeColor: string;
}

const SEVERITIES = [
  { key: 'partial',  label: 'Partial 30%', mult: 0.30 },
  { key: 'full',     label: 'Full Halt',   mult: 1.00 },
  { key: 'custom',   label: 'Custom',      mult: null },
] as const;

export function FinancialExposurePanel({ data, nodeColor }: Props) {
  const [scenario, setScenario] = useState<'partial' | 'full' | 'custom'>('full');
  const [customPct, setCustomPct] = useState(50);

  const mult =
    scenario === 'partial' ? 0.30 :
    scenario === 'full'    ? 1.00 :
    customPct / 100;

  const rar    = data.revenueAtRisk    * mult;
  const ebitda = data.ebitdaImpact     * mult;
  const valsen = data.valuationSensitivity * mult;
  const capLoss = Math.round(data.capacityLoss * mult * 100);

  const urgencyColor =
    rar > 30 ? '#ff1744' :
    rar > 10 ? '#ff9800' :
               '#ffeb3b';

  return (
    <div className="px-4 py-3 border-b border-border-primary flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3 h-3" style={{ color: urgencyColor }} />
          <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest">Financial Exposure</span>
        </div>
        {/* Scenario tabs */}
        <div className="flex items-center gap-px rounded overflow-hidden border border-border-primary/60">
          {SEVERITIES.map(s => (
            <button
              key={s.key}
              onClick={() => setScenario(s.key)}
              className={`px-1.5 py-0.5 text-[7px] font-black uppercase transition-colors ${scenario === s.key ? 'text-bg-primary' : 'text-text-muted hover:text-text-secondary'}`}
              style={scenario === s.key ? { background: urgencyColor } : {}}
            >{s.label}</button>
          ))}
        </div>
      </div>

      {/* Custom slider */}
      {scenario === 'custom' && (
        <div className="flex items-center gap-2 mb-2.5">
          <input
            type="range" min={5} max={100} step={5}
            value={customPct}
            onChange={e => setCustomPct(+e.target.value)}
            className="flex-1 h-1 accent-cyan-400"
          />
          <span className="text-[9px] font-mono font-bold text-accent-cyan w-8 text-right">{customPct}%</span>
        </div>
      )}

      {/* Scenario banner */}
      <div className="text-[8px] text-text-muted italic mb-2.5 leading-snug truncate"
        style={{ color: `${urgencyColor}90` }}>
        {data.scenario}
      </div>

      {/* Numbers grid */}
      <div className="grid grid-cols-2 gap-2 mb-2.5">
        {[
          { label: 'Revenue at Risk',     value: `$${rar.toFixed(1)}B`,    color: urgencyColor },
          { label: 'EBITDA / Quarter',    value: `$${ebitda.toFixed(1)}B`, color: urgencyColor },
          { label: 'Mkt Cap Sensitivity', value: `$${valsen.toFixed(0)}B`, color: '#94a3b8'    },
          { label: 'Capacity Loss',       value: `${capLoss}%`,            color: capLoss > 50 ? '#ff5722' : '#ff9800' },
        ].map(item => (
          <div key={item.label} className="rounded px-2.5 py-2"
            style={{ background: `${item.color}0a`, border: `1px solid ${item.color}20` }}>
            <div className="text-[7px] text-text-muted uppercase tracking-widest mb-0.5">{item.label}</div>
            <div className="text-[15px] font-black font-mono leading-none" style={{ color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Fill bar */}
      <div className="h-1 rounded-full overflow-hidden" style={{ background: '#1a2236' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, rar / data.revenueAtRisk * 100)}%`, background: urgencyColor }} />
      </div>
    </div>
  );
}
