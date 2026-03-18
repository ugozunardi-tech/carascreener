import { TrendingUp, TrendingDown } from 'lucide-react';
import type { StockItem } from '../../types';

const TICKER_SYMBOLS = ['SPY', 'QQQ', 'NVDA', 'AAPL', 'TSLA', 'MSFT', 'AMZN', 'META', 'AMD', 'ASML', 'TSM', 'MP'];

interface Props {
  stocks: StockItem[];
}

function TickerItem({ stock }: { stock: StockItem }) {
  const up = stock.changePercent > 0;
  const down = stock.changePercent < 0;
  return (
    <span className="inline-flex items-center gap-2 px-5 border-r border-border-primary/40">
      <span className="text-[11px] font-bold font-mono text-text-secondary tracking-wider">{stock.symbol}</span>
      <span className="text-[11px] font-mono text-text-primary">
        {stock.price > 0 ? `$${stock.price.toFixed(2)}` : '—'}
      </span>
      {stock.changePercent !== 0 && (
        <span className={`inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold ${up ? 'text-accent-green' : 'text-accent-red'}`}>
          {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {up ? '+' : ''}{stock.changePercent.toFixed(2)}%
        </span>
      )}
    </span>
  );
}

export default function MarketTicker({ stocks }: Props) {
  const tickerStocks = TICKER_SYMBOLS
    .map(sym => stocks.find(s => s.symbol === sym))
    .filter(Boolean) as StockItem[];

  if (tickerStocks.length === 0) return null;

  // Duplicate for seamless loop
  const doubled = [...tickerStocks, ...tickerStocks];

  return (
    <div className="ticker-tape h-8 flex items-center">
      <div className="ticker-content gap-0">
        {doubled.map((stock, i) => (
          <TickerItem key={`${stock.symbol}-${i}`} stock={stock} />
        ))}
      </div>
    </div>
  );
}
