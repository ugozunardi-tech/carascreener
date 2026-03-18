import { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { PORTFOLIO_COLORS } from '../../types';

interface Props {
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCreate: (name: string, color: string, description?: string) => Promise<any>;
}

export default function CreatePortfolioModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PORTFOLIO_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setLoading(true);
    setError('');
    try {
      await onCreate(name.trim(), color, description.trim() || undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create portfolio');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-bg-secondary border border-border-primary rounded-xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-primary">
          <div className="flex items-center gap-2.5">
            <FolderPlus className="w-4 h-4 text-accent-cyan" />
            <h2 className="text-sm font-semibold text-text-primary">New Portfolio</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-bg-tertiary rounded text-text-muted hover:text-text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs text-text-secondary uppercase tracking-wider">Portfolio Name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Tech Growth, Dividends, Watch..."
              className="w-full bg-bg-tertiary border border-border-primary rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-cyan/50 transition-colors"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs text-text-secondary uppercase tracking-wider">Description <span className="text-text-muted normal-case">(optional)</span></label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Short description..."
              className="w-full bg-bg-tertiary border border-border-primary rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-cyan/50 transition-colors"
            />
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <label className="text-xs text-text-secondary uppercase tracking-wider">Color</label>
            <div className="flex items-center gap-2">
              {PORTFOLIO_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110' : 'border-transparent opacity-70 hover:opacity-100'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <div className="ml-2 flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs font-mono text-text-muted">{color}</span>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-accent-red">{error}</p>
          )}

          {/* Preview */}
          <div className="flex items-center gap-2.5 p-3 bg-bg-tertiary rounded-lg border border-border-primary">
            <div className="w-2 h-6 rounded-full" style={{ backgroundColor: color }} />
            <div>
              <div className="text-sm font-medium text-text-primary">{name || 'Portfolio Name'}</div>
              <div className="text-xs text-text-muted">{description || 'No description'} · 0 stocks</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-text-secondary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 px-4 py-2 text-sm font-semibold text-bg-primary bg-accent-cyan rounded-lg hover:bg-accent-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create Portfolio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
