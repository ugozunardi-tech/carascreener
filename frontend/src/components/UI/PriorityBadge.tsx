import { type Priority } from '../../types';
import clsx from 'clsx';

interface Props {
  priority: Priority;
  size?: 'sm' | 'md';
}

const config: Record<Priority, { label: string; className: string }> = {
  HIGH: {
    label: 'HIGH',
    className: 'bg-accent-red/15 text-accent-red border border-accent-red/30',
  },
  MEDIUM: {
    label: 'MED',
    className: 'bg-accent-yellow/15 text-accent-yellow border border-accent-yellow/30',
  },
  LOW: {
    label: 'LOW',
    className: 'bg-text-muted/20 text-text-secondary border border-text-muted/30',
  },
};

export default function PriorityBadge({ priority, size = 'sm' }: Props) {
  const { label, className } = config[priority];
  return (
    <span
      className={clsx(
        'inline-flex items-center font-mono font-medium rounded tracking-wider',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs',
        className
      )}
    >
      {label}
    </span>
  );
}
