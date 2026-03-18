import { useMemo } from 'react';
import { AlertTriangle, Shield, TrendingDown, Globe } from 'lucide-react';
import type { GraphNode, GraphEdge } from '../../data/connections';
import { computeCommandStrip } from '../../utils/soWhat';

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeSelect: (id: string) => void;
}

const REGION_LABELS: Record<string, string> = {
  TW: 'Taiwan', KR: 'S. Korea', CN: 'China', NL: 'Netherlands',
  JP: 'Japan', US: 'United States', EU: 'Europe', AU: 'Australia', CA: 'Canada',
};

export function CommandStrip({ nodes, edges, onNodeSelect }: Props) {
  const data = useMemo(() => computeCommandStrip(nodes, edges), [nodes, edges]);

  const cards = [
    {
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      label: '#1 Bottleneck',
      value:    data.bottleneck ? data.bottleneck.node.id : '—',
      sub:      data.bottleneck
        ? `${data.bottleneck.dependentCount} direct dependents · no substitute`
        : 'No monopoly nodes visible',
      soWhat:   data.bottleneck
        ? `${data.bottleneck.node.id} → halts ${data.bottleneck.dependentCount} chains`
        : null,
      badge:    data.bottleneck ? 'CASCADE' : 'CLEAR',
      badgeColor: data.bottleneck ? '#ff1744' : '#4ade80',
      accent:   data.bottleneck ? '#ff1744' : '#4ade80',
      urgent:   !!data.bottleneck,
      dominant: true,
      onClick:  data.bottleneck ? () => onNodeSelect(data.bottleneck!.node.id) : undefined,
    },
    {
      icon: <Shield className="w-3.5 h-3.5" />,
      label: '#1 Sole Source',
      value:    data.singlePoint ? data.singlePoint.node.id : '—',
      sub:      data.singlePoint
        ? `${data.singlePoint.node.label.slice(0, 24)} · importance ${data.singlePoint.node.importance}/10`
        : 'No monopoly nodes visible',
      soWhat:   data.singlePoint
        ? `${data.singlePoint.node.id} → no substitute at any price`
        : null,
      badge:    data.singlePoint ? 'MONOPOLY' : 'NONE',
      badgeColor: data.singlePoint ? '#ff5722' : '#4ade80',
      accent:   data.singlePoint ? '#ff5722' : '#4ade80',
      urgent:   !!data.singlePoint,
      dominant: false,
      onClick:  data.singlePoint ? () => onNodeSelect(data.singlePoint!.node.id) : undefined,
    },
    {
      icon: <TrendingDown className="w-3.5 h-3.5" />,
      label: '#1 Max Exposure',
      value:    data.topConc ? `${Math.round(data.topConc.edge.concentration * 100)}%` : '—',
      sub:      data.topConc
        ? `${data.topConc.src?.id ?? '?'} → ${data.topConc.tgt?.id ?? '?'}`
        : 'No concentration data',
      soWhat:   data.topConc
        ? `${data.topConc.src?.id ?? '?'} → ${data.topConc.tgt?.id ?? '?'} · locked in`
        : null,
      badge:    data.topConc
        ? (data.topConc.edge.concentration > 0.7 ? 'NO EXIT' : 'ELEVATED')
        : 'LOW',
      badgeColor: data.topConc
        ? (data.topConc.edge.concentration > 0.7 ? '#ff1744' : '#ff9800')
        : '#4ade80',
      accent:   data.topConc
        ? (data.topConc.edge.concentration > 0.7 ? '#ff1744' : '#ff9800')
        : '#4ade80',
      urgent:   !!data.topConc && data.topConc.edge.concentration > 0.5,
      dominant: false,
      onClick:  data.topConc?.tgt ? () => onNodeSelect(data.topConc!.tgt!.id) : undefined,
    },
    {
      icon: <Globe className="w-3.5 h-3.5" />,
      label: '#1 Geo Risk',
      value:    data.geoRisk ? REGION_LABELS[data.geoRisk.region] ?? data.geoRisk.region : '—',
      sub:      data.geoRisk
        ? `${data.geoRisk.count} critical/high nodes · ${data.geoRisk.topNode.id} exposed`
        : 'No geo concentration',
      soWhat:   data.geoRisk
        ? `${data.geoRisk.count} nodes in ${data.geoRisk.region} → binary event risk`
        : null,
      badge:    data.geoRisk
        ? (data.geoRisk.region === 'TW' || data.geoRisk.region === 'CN' ? 'BINARY' : 'ELEVATED')
        : 'DIVERSIFIED',
      badgeColor: data.geoRisk
        ? (data.geoRisk.region === 'TW' || data.geoRisk.region === 'CN' ? '#ff1744' : '#ff9800')
        : '#4ade80',
      accent:   data.geoRisk
        ? (data.geoRisk.region === 'TW' || data.geoRisk.region === 'CN' ? '#ff1744' : '#ff9800')
        : '#4ade80',
      urgent:   !!data.geoRisk,
      dominant: false,
      onClick:  data.geoRisk ? () => onNodeSelect(data.geoRisk!.topNode.id) : undefined,
    },
  ];

  return (
    <div className="flex flex-shrink-0 border-b border-border-primary" style={{ minHeight: 66 }}>
      {cards.map((card, i) => (
        <button
          key={i}
          onClick={card.onClick}
          disabled={!card.onClick}
          className={`${card.dominant ? 'flex-[2]' : 'flex-1'} flex flex-col justify-center px-4 py-2 border-r border-border-primary/40 last:border-r-0 text-left transition-colors ${card.onClick ? 'cursor-pointer hover:bg-white/[0.025]' : 'cursor-default'}`}
          style={card.urgent ? { background: `${card.accent}08`, borderLeft: card.dominant ? `2px solid ${card.accent}60` : undefined } : {}}
        >
          {/* Label row */}
          <div className="flex items-center gap-1.5 mb-1" style={{ color: card.urgent ? card.accent : '#475569' }}>
            {card.icon}
            <span className="text-[8px] font-bold uppercase tracking-widest">{card.label}</span>
          </div>

          {/* Value row */}
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className={`font-black font-mono leading-none ${card.dominant ? 'text-[18px]' : 'text-[15px]'}`} style={{ color: card.accent }}>{card.value}</span>
            <span
              className="text-[7px] font-black uppercase tracking-wider px-1 py-px rounded"
              style={{ background: `${card.badgeColor}20`, color: card.badgeColor, border: `1px solid ${card.badgeColor}40` }}
            >
              {card.badge}
            </span>
          </div>

          {/* Sub line */}
          <div className="text-[8px] text-text-muted truncate">{card.sub}</div>

          {/* SO WHAT arrow-chain line */}
          {card.soWhat && card.urgent && (
            <div className="text-[8px] font-mono mt-0.5 truncate" style={{ color: `${card.accent}90` }}>
              ↳ {card.soWhat}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
