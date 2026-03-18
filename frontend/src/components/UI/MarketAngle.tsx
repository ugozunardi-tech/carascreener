import type { MarketAngle as MA } from '../../data/nodeIntelligence';

interface Props { data: MA }

const MMS_META = {
  underpriced: { label: 'UNDERPRICED', color: '#ff1744', bg: '#ff174412', desc: 'Risk not reflected in current price — potential hedge/short opportunity' },
  priced:      { label: 'PRICED IN',   color: '#ffeb3b', bg: '#ffeb3b10', desc: 'Risk broadly understood by market — neutral positioning signal'         },
  overpriced:  { label: 'OVERPRICED',  color: '#4ade80', bg: '#4ade8010', desc: 'Market overweighting risk — potential long opportunity on excessive fear' },
};

export function MarketAnglePanel({ data }: Props) {
  const meta = MMS_META[data.mms];

  return (
    <div className="px-4 py-3 border-b border-border-primary flex-shrink-0">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest">Market Angle</span>
        <span className="text-[7px] font-black uppercase px-1.5 py-px rounded"
          style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}35` }}>
          {meta.label}
        </span>
      </div>

      {/* MMS description */}
      <div className="rounded px-2 py-1.5 mb-2.5 text-[8px] leading-snug"
        style={{ background: meta.bg, borderLeft: `2px solid ${meta.color}60`, color: meta.color }}>
        {meta.desc}
      </div>

      {/* Consensus gap */}
      <div className="mb-2.5">
        <div className="text-[7px] font-bold text-text-muted uppercase tracking-widest mb-1">Consensus Gap</div>
        <div className="text-[9px] text-text-secondary leading-snug">{data.consensusGap}</div>
      </div>

      {/* Triggers */}
      <div className="space-y-1.5">
        <div className="rounded px-2 py-1.5" style={{ background: '#4ade8010', border: '1px solid #4ade8025' }}>
          <div className="text-[7px] font-black uppercase tracking-widest mb-0.5" style={{ color: '#4ade80' }}>⬆ BULL CATALYST</div>
          <div className="text-[8px] text-text-secondary leading-snug">{data.bullTrigger}</div>
        </div>
        <div className="rounded px-2 py-1.5" style={{ background: '#ff174410', border: '1px solid #ff174425' }}>
          <div className="text-[7px] font-black uppercase tracking-widest mb-0.5" style={{ color: '#ff5722' }}>⬇ BEAR CATALYST</div>
          <div className="text-[8px] text-text-secondary leading-snug">{data.bearTrigger}</div>
        </div>
      </div>
    </div>
  );
}
