import { ExternalLink, Clock } from 'lucide-react';
import type { NewsItem } from '../../types';

interface Props {
  news: NewsItem;
}

function timeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp * 1000;
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  const mins = Math.floor(diff / 60000);
  return `${mins}m ago`;
}

export default function NewsCard({ news }: Props) {
  return (
    <a
      href={news.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block p-4 rounded-lg bg-bg-card border border-border-primary hover:border-accent-cyan/30 transition-all duration-200 hover:bg-bg-tertiary/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-text-primary group-hover:text-accent-cyan transition-colors line-clamp-2 leading-snug">
            {news.headline}
          </h4>
          {news.summary && (
            <p className="mt-1.5 text-xs text-text-secondary line-clamp-2 leading-relaxed">
              {news.summary}
            </p>
          )}
          <div className="mt-2 flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-[11px] text-text-muted">
              <Clock className="w-3 h-3" />
              {timeAgo(news.datetime)}
            </span>
            <span className="text-[11px] text-text-muted">{news.source}</span>
          </div>
        </div>
        {news.image && (
          <img
            src={news.image}
            alt=""
            className="w-16 h-12 object-cover rounded flex-shrink-0 opacity-70 group-hover:opacity-90 transition-opacity"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <ExternalLink className="w-3.5 h-3.5 text-text-muted group-hover:text-accent-cyan flex-shrink-0 transition-colors mt-0.5" />
      </div>
    </a>
  );
}
