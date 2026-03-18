import type { DisruptionProfile } from '../../data/nodeIntelligence';

interface Props { data: DisruptionProfile }

const CONF_COLOR = { high: '#4ade80', medium: '#ffeb3b', low: '#ff9800' };

function ProbBar({ value, label, color }: { value: number; label: string; color: string }) {
  const pct = Math.round(value * 100);
  const barColor =
    pct >= 50 ? '#ff1744' :
    pct >= 25 ? '#ff9800' :
    pct >= 10 ? '#ffeb3b' :
                '#4ade80';
  return (
    <div className="mb-2.5">
      <div className="flex items-center justify-between text-[8px] mb-1">
        <span className="text-text-muted">{label}</span>
        <span className="font-black font-mono" style={{ color: barColor }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1a2236' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: barColor }} />
      </div>
    </div>
  );
}

export function DisruptionProbabilityPanel({ data }: Props) {
  const confColor = CONF_COLOR[data.confidence];
  const maxDps = Math.max(data.dps3m, data.dps12m);
  const urgency =
    maxDps >= 0.5 ? '#ff1744' :
    maxDps >= 0.25 ? '#ff9800' :
                     '#64748b';

  return (
    <div className="px-4 py-3 border-b border-border-primary flex-shrink-0">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest">Disruption Probability</span>
        <span className="text-[7px] font-bold uppercase px-1.5 py-px rounded"
          style={{ background: `${confColor}15`, color: confColor, border: `1px solid ${confColor}30` }}>
          {data.confidence} conf
        </span>
      </div>

      <ProbBar value={data.dps3m}  label="3-month window"  color={urgency} />
      <ProbBar value={data.dps12m} label="12-month window" color={urgency} />

      {/* Drivers */}
      <div className="mt-2">
        <div className="text-[7px] font-bold text-text-muted uppercase tracking-widest mb-1.5">Key Drivers</div>
        <div className="space-y-1">
          {data.drivers.map((d, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[8px]">
              <div className="w-1 h-1 rounded-full mt-1 flex-shrink-0" style={{ background: urgency }} />
              <span className="text-text-secondary leading-snug">{d}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
