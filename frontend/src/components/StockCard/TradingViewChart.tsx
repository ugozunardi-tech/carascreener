import { useEffect, useRef } from 'react';

interface Props {
  symbol: string;
  height?: number;
}

declare global {
  interface Window {
    TradingView: {
      widget: new (config: Record<string, unknown>) => void;
    };
  }
}

export default function TradingViewChart({ symbol, height = 420 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Remove existing widget
    if (widgetRef.current) {
      widgetRef.current.remove();
    }

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `NASDAQ:${symbol}`,
      interval: 'D',
      timezone: 'America/New_York',
      theme: 'dark',
      style: '1',
      locale: 'en',
      allow_symbol_change: false,
      calendar: false,
      backgroundColor: '#111827',
      gridColor: 'rgba(30, 45, 74, 0.8)',
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      hide_volume: false,
      studies: ['RSI@tv-basicstudies', 'MACD@tv-basicstudies'],
      support_host: 'https://www.tradingview.com',
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'tradingview-widget-container';
    wrapper.style.height = `${height}px`;
    wrapper.style.width = '100%';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';

    wrapper.appendChild(widgetDiv);
    wrapper.appendChild(script);
    container.appendChild(wrapper);

    return () => {
      wrapper.remove();
    };
  }, [symbol, height]);

  return (
    <div
      ref={containerRef}
      style={{ height: `${height}px` }}
      className="w-full rounded-lg overflow-hidden bg-bg-secondary border border-border-primary"
    />
  );
}
