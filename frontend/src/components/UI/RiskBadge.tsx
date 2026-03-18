const RISK_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  critical: { bg: '#ff174422', color: '#ff1744', border: '#ff174450' },
  high:     { bg: '#ff572222', color: '#ff5722', border: '#ff572250' },
  medium:   { bg: '#ff980022', color: '#ff9800', border: '#ff980050' },
  low:      { bg: '#4ade8018', color: '#4ade80', border: '#4ade8040' },
};

export function RiskBadge({ level, size = 'sm' }: { level: string; size?: 'xs' | 'sm' | 'md' }) {
  const s = RISK_STYLE[level] ?? RISK_STYLE.medium;
  const cls =
    size === 'xs' ? 'text-[7px] px-1 py-px' :
    size === 'sm' ? 'text-[8px] px-1.5 py-px' :
                    'text-[9px] px-2 py-0.5';
  return (
    <span
      className={`${cls} inline-flex items-center rounded font-black uppercase tracking-widest flex-shrink-0`}
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {level}
    </span>
  );
}
