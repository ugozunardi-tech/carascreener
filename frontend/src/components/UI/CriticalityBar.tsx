export function CriticalityBar({
  value, max = 10, height = 3, className = '',
}: {
  value: number; max?: number; height?: number; className?: string;
}) {
  const pct   = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  const ratio = pct / 100;
  const color =
    ratio >= 0.8 ? '#ff1744' :
    ratio >= 0.6 ? '#ff9800' :
    ratio >= 0.4 ? '#ffeb3b' :
                   '#4ade80';
  return (
    <div
      className={`rounded-full overflow-hidden ${className}`}
      style={{ height, background: '#1a2236' }}
    >
      <div
        style={{
          width: `${pct}%`, height: '100%',
          background: color, borderRadius: height,
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  );
}
