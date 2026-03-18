import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  value: number;
  isPercent?: boolean;
  showIcon?: boolean;
  className?: string;
}

export default function ChangeDisplay({ value, isPercent = false, showIcon = false, className }: Props) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;

  const colorClass = isPositive
    ? 'text-accent-green'
    : isNegative
    ? 'text-accent-red'
    : 'text-text-secondary';

  const formatted = isPercent
    ? `${isPositive ? '+' : ''}${value.toFixed(2)}%`
    : `${isPositive ? '+' : ''}$${Math.abs(value).toFixed(2)}`;

  return (
    <span className={clsx('inline-flex items-center gap-1 font-mono text-sm', colorClass, className)}>
      {showIcon && (
        isPositive ? <TrendingUp className="w-3.5 h-3.5" /> :
        isNegative ? <TrendingDown className="w-3.5 h-3.5" /> :
        <Minus className="w-3.5 h-3.5" />
      )}
      {isNeutral && !showIcon ? '-' : formatted}
    </span>
  );
}
