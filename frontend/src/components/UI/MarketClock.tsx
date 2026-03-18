import { useState, useEffect } from 'react';

function getMarketStatus(): { label: string; color: string; dot: string } {
  const now = new Date();
  // Convert to ET
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const h = et.getHours();
  const m = et.getMinutes();
  const day = et.getDay(); // 0=Sun, 6=Sat
  const mins = h * 60 + m;

  if (day === 0 || day === 6) return { label: 'WEEKEND', color: 'text-text-muted', dot: 'bg-text-muted' };
  if (mins >= 570 && mins < 930) return { label: 'MARKET OPEN', color: 'text-accent-green', dot: 'bg-accent-green' }; // 9:30–15:30
  if (mins >= 240 && mins < 570) return { label: 'PRE-MARKET', color: 'text-accent-yellow', dot: 'bg-accent-yellow' }; // 4:00–9:30
  if (mins >= 930 && mins < 1200) return { label: 'AFTER-HOURS', color: 'text-accent-yellow', dot: 'bg-accent-yellow' }; // 15:30–20:00
  return { label: 'MARKET CLOSED', color: 'text-text-muted', dot: 'bg-text-muted' };
}

export default function MarketClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const status = getMarketStatus();
  const cetTime = time.toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="hidden md:flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${status.dot} animate-pulse-dot`} />
        <span className={`text-[10px] font-bold tracking-widest uppercase font-mono ${status.color}`}>
          {status.label}
        </span>
      </div>
      <span className="text-text-muted text-[10px]">|</span>
      <span className="text-[11px] font-mono text-text-secondary tabular-nums">
        {cetTime} <span className="text-text-muted">CET</span>
      </span>
    </div>
  );
}
