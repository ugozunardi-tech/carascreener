import clsx from 'clsx';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export default function LoadingSpinner({ size = 'md', className, label }: Props) {
  const sizeClass = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  }[size];

  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={clsx(
          'rounded-full border-accent-cyan/30 border-t-accent-cyan animate-spin',
          sizeClass
        )}
      />
      {label && <p className="text-sm text-text-secondary">{label}</p>}
    </div>
  );
}
