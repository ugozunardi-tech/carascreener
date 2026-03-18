import { Link, useLocation } from 'react-router-dom';
import { Zap } from 'lucide-react';
import MarketClock from '../UI/MarketClock';
import NotificationPanel from '../UI/NotificationPanel';

interface Props {
  watchedSymbols?: string[];
}

export default function Header({ watchedSymbols = [] }: Props) {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-border-primary" style={{background:'rgba(8,12,24,0.97)', backdropFilter:'blur(20px)'}}>
      <div className="px-4 h-12 flex items-center justify-between gap-6">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
          <div className="relative w-7 h-7 flex items-center justify-center">
            <div className="absolute inset-0 rounded-lg bg-accent-cyan/10 border border-accent-cyan/30 group-hover:border-accent-cyan/60 transition-all group-hover:shadow-[0_0_16px_rgba(0,212,255,0.2)]" />
            <Zap className="relative w-3.5 h-3.5 text-accent-cyan" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[13px] font-black text-text-primary tracking-tight">
              CARA<span className="text-accent-cyan">SCREENER</span>
            </span>
            <span className="text-[8px] text-text-muted tracking-[0.2em] uppercase font-mono">
              Market Intelligence
            </span>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-2 text-xs font-medium ml-auto">
          <Link to="/"
            className={`px-3 py-1.5 rounded transition-colors ${location.pathname === '/' ? 'text-accent-cyan bg-accent-cyan/8' : 'text-text-secondary hover:text-text-primary'}`}>
            Watchlist
          </Link>
          <MarketClock />

          {/* Notification bell */}
          <NotificationPanel symbols={watchedSymbols} />

          <div className="ml-1 px-2 py-0.5 rounded border border-border-primary text-[9px] text-text-muted font-mono tracking-widest">
            v1.0
          </div>
        </nav>
      </div>
    </header>
  );
}
