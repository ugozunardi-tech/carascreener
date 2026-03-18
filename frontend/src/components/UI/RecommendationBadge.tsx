import type { Recommendation } from '../../types';
import clsx from 'clsx';

const config: Record<Recommendation, { className: string }> = {
  BUY: { className: 'bg-accent-green/15 text-accent-green border border-accent-green/40' },
  SELL: { className: 'bg-accent-red/15 text-accent-red border border-accent-red/40' },
  HOLD: { className: 'bg-accent-yellow/15 text-accent-yellow border border-accent-yellow/40' },
  WATCH: { className: 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/40' },
};

export default function RecommendationBadge({ rec }: { rec: Recommendation }) {
  const { className } = config[rec];
  return (
    <span className={clsx('inline-flex items-center px-3 py-1 rounded text-sm font-bold font-mono tracking-wider', className)}>
      {rec}
    </span>
  );
}
