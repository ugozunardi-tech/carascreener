import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Plus, LayoutDashboard, Trash2, Edit2, Check, X, Network } from 'lucide-react';
import type { Portfolio } from '../../types';
import { PORTFOLIO_COLORS } from '../../types';

interface Props {
  portfolios: Portfolio[];
  onCreateClick: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string, color: string) => void;
}

export default function PortfolioSidebar({ portfolios, onCreateClick, onDelete, onRename }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const isActive = (id: string) => location.pathname === `/portfolio/${id}`;

  return (
    <aside className="w-52 flex-shrink-0 border-r border-border-primary flex flex-col" style={{background:'rgba(8,12,24,0.98)'}}>
      {/* Header */}
      <div className="px-3 pt-4 pb-2 flex items-center justify-between">
        <span className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">Portfolios</span>
        <button onClick={onCreateClick} className="w-5 h-5 flex items-center justify-center rounded hover:bg-bg-tertiary text-text-muted hover:text-accent-cyan transition-colors" title="New portfolio">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Watchlist link */}
      <Link to="/" className={`mx-2 mb-1 flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all ${
        location.pathname === '/'
          ? 'bg-accent-cyan/8 text-accent-cyan border border-accent-cyan/15'
          : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/40'
      }`}>
        <LayoutDashboard className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="font-semibold">Market Watchlist</span>
      </Link>

      {/* Network graph link */}
      <Link to="/network" className={`mx-2 mb-1 flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all ${
        location.pathname === '/network'
          ? 'bg-accent-purple/8 text-accent-purple border border-accent-purple/15'
          : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/40'
      }`}>
        <Network className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="font-semibold">Supply Chain Map</span>
      </Link>

      {/* Divider */}
      {portfolios.length > 0 && (
        <div className="px-3 pt-3 pb-1">
          <div className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">My Portfolios</div>
        </div>
      )}

      {/* List */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {portfolios.map(p => (
          <div key={p.id} className="group relative">
            {editingId === p.id ? (
              <div className="px-2 py-2 space-y-2">
                <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { onRename(p.id, editName.trim() || p.name, editColor); setEditingId(null); } if (e.key === 'Escape') setEditingId(null); }}
                  className="w-full bg-bg-tertiary border border-accent-cyan/30 rounded px-2 py-1 text-xs text-text-primary focus:outline-none" />
                <div className="flex gap-1 flex-wrap">
                  {PORTFOLIO_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setEditColor(c)}
                      className={`w-4 h-4 rounded-full border-[1.5px] transition-all ${editColor === c ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-90'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { onRename(p.id, editName.trim() || p.name, editColor); setEditingId(null); }}
                    className="flex-1 py-0.5 text-[10px] text-accent-green border border-accent-green/30 rounded hover:bg-accent-green/10 flex items-center justify-center gap-0.5">
                    <Check className="w-3 h-3" /> Save
                  </button>
                  <button onClick={() => setEditingId(null)}
                    className="flex-1 py-0.5 text-[10px] text-text-muted border border-border-primary rounded hover:bg-bg-tertiary flex items-center justify-center gap-0.5">
                    <X className="w-3 h-3" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <Link to={`/portfolio/${p.id}`} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all ${
                isActive(p.id)
                  ? 'bg-bg-tertiary text-text-primary border border-border-secondary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/40'
              }`}>
                <div className="w-2 h-2 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: p.color, boxShadow: `0 0 6px ${p.color}66` }} />
                <span className="flex-1 truncate font-medium">{p.name}</span>
                <span className="text-[9px] font-mono text-text-muted">{p.stocks.length}</span>
              </Link>
            )}

            {editingId !== p.id && (
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-bg-secondary border border-border-primary rounded p-0.5 z-10">
                <button onClick={e => { e.preventDefault(); setEditingId(p.id); setEditName(p.name); setEditColor(p.color); }}
                  className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-accent-cyan rounded transition-colors">
                  <Edit2 className="w-2.5 h-2.5" />
                </button>
                <button onClick={async e => { e.preventDefault(); if (confirm('Delete portfolio?')) { onDelete(p.id); if (isActive(p.id)) navigate('/'); } }}
                  className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-accent-red rounded transition-colors">
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
          </div>
        ))}

        {portfolios.length === 0 && (
          <div className="px-3 py-5 text-center">
            <p className="text-[10px] text-text-muted">No portfolios yet</p>
            <button onClick={onCreateClick} className="mt-1 text-[10px] text-accent-cyan hover:underline">Create one →</button>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-border-primary">
        <button onClick={onCreateClick}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-[10px] text-text-muted hover:text-accent-cyan border border-border-primary hover:border-accent-cyan/30 rounded-lg transition-all uppercase tracking-widest font-bold">
          <Plus className="w-3 h-3" /> New Portfolio
        </button>
      </div>
    </aside>
  );
}
