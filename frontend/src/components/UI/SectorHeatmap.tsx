import type { StockItem } from '../../types';

interface Props {
  stocks: StockItem[];
  onSelectSector: (sector: string) => void;
  selectedSector: string;
}

function getSectorColor(avg: number): string {
  if (avg > 3)    return 'rgba(0,230,118,0.20)';
  if (avg > 1.5)  return 'rgba(0,230,118,0.13)';
  if (avg > 0.5)  return 'rgba(0,230,118,0.07)';
  if (avg > 0)    return 'rgba(0,230,118,0.04)';
  if (avg > -0.5) return 'rgba(255,59,59,0.04)';
  if (avg > -1.5) return 'rgba(255,59,59,0.08)';
  if (avg > -3)   return 'rgba(255,59,59,0.14)';
  return 'rgba(255,59,59,0.22)';
}

function getSectorBorder(avg: number): string {
  if (avg > 1)  return 'rgba(0,230,118,0.25)';
  if (avg > 0)  return 'rgba(0,230,118,0.12)';
  if (avg < -1) return 'rgba(255,59,59,0.25)';
  if (avg < 0)  return 'rgba(255,59,59,0.12)';
  return 'rgba(30,37,60,0.6)';
}

export default function SectorHeatmap({ stocks, onSelectSector, selectedSector }: Props) {
  const priced = stocks.filter(s => s.changePercent !== 0 && s.price > 0);

  const sectorMap: Record<string, StockItem[]> = {};
  priced.forEach(s => {
    sectorMap[s.sector] = [...(sectorMap[s.sector] || []), s];
  });

  const sectors = Object.entries(sectorMap)
    .map(([name, ss]) => ({
      name,
      count: ss.length,
      avg: ss.reduce((a, s) => a + s.changePercent, 0) / ss.length,
      gainers: ss.filter(s => s.changePercent > 0).length,
      losers:  ss.filter(s => s.changePercent < 0).length,
    }))
    .sort((a, b) => b.avg - a.avg);

  if (sectors.length === 0) return null;

  return (
    <div className="flex gap-2 flex-wrap">
      {sectors.map(sec => {
        const isSelected = selectedSector === sec.name;
        const up = sec.avg >= 0;
        return (
          <button
            key={sec.name}
            onClick={() => onSelectSector(isSelected ? 'All' : sec.name)}
            className="heat-cell text-left"
            style={{
              background: isSelected
                ? up ? 'rgba(0,230,118,0.18)' : 'rgba(255,59,59,0.18)'
                : getSectorColor(sec.avg),
              border: `1px solid ${isSelected
                ? up ? 'rgba(0,230,118,0.5)' : 'rgba(255,59,59,0.5)'
                : getSectorBorder(sec.avg)}`,
              minWidth: '110px',
            }}
          >
            <div className="text-[10px] text-text-muted uppercase tracking-widest mb-1 truncate">{sec.name}</div>
            <div className={`text-base font-bold font-mono ${up ? 'text-accent-green' : 'text-accent-red'}`}>
              {up ? '+' : ''}{sec.avg.toFixed(2)}%
            </div>
            <div className="text-[9px] text-text-muted mt-0.5 font-mono">
              {sec.count} stocks · ▲{sec.gainers} ▼{sec.losers}
            </div>
          </button>
        );
      })}
    </div>
  );
}
