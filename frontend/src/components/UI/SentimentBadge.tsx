import type { Sentiment } from '../../types';
import clsx from 'clsx';

const config: Record<Sentiment, { label: string; className: string; dot: string }> = {
  BULLISH: {
    label: 'BULLISH',
    className: 'bg-accent-green/10 text-accent-green border border-accent-green/30',
    dot: 'bg-accent-green',
  },
  BEARISH: {
    label: 'BEARISH',
    className: 'bg-accent-red/10 text-accent-red border border-accent-red/30',
    dot: 'bg-accent-red',
  },
  NEUTRAL: {
    label: 'NEUTRAL',
    className: 'bg-text-muted/15 text-text-secondary border border-text-muted/30',
    dot: 'bg-text-secondary',
  },
};

export default function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  const { label, className, dot } = config[sentiment];
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium font-mono', className)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', dot)} />
      {label}
    </span>
  );
}
