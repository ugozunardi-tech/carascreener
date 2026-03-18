# CaraScreener — Stock Market Intelligence Platform

A professional Bloomberg/Koyfin-style stock screener built with React + TypeScript (frontend) and Node.js + Express (backend), powered by Finnhub real-time market data and GPT-4o AI analysis.

## Features

- **Live Watchlist**: 31 global stocks across Technology, Financial, Healthcare, Energy, Consumer, and ETF sectors with real-time prices (Finnhub REST API, polling every 30s)
- **Smart Filtering**: Filter by sector, theme, priority, and free-text search
- **Priority System**: HIGH / MEDIUM / LOW priority badges with color coding
- **Price Flash Animations**: Green/red flash on price change
- **Stock Detail Page**: TradingView advanced chart, key financial metrics
- **AI Analysis (GPT-4o)**: News sentiment, catalysts/risks, technical analysis, support/resistance levels
- **Dark Terminal UI**: Bloomberg-inspired dark theme with cyan accent

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS (dark theme) |
| Routing | React Router v6 |
| Backend | Node.js + Express + TypeScript |
| Market Data | Finnhub REST API |
| AI Analysis | OpenAI GPT-4o |
| Charts | TradingView Widget + Recharts |
| Deploy | Vercel |

## Quick Start

### 1. Clone & install

```bash
git clone <repo-url>
cd carascreener

# Install root dev tools
npm install

# Install backend
cd backend && npm install

# Install frontend
cd ../frontend && npm install
```

### 2. Environment setup

The `.env` files are already created. To use your own keys:

```bash
# backend/.env
FINNHUB_API_KEY=your_key
OPENAI_API_KEY=your_key
PORT=3001
FRONTEND_URL=http://localhost:5173
```

```bash
# frontend/.env
VITE_API_URL=http://localhost:3001/api
```

### 3. Run in development

```bash
# From root (runs both concurrently)
npm run dev

# Or individually:
npm run dev:backend   # http://localhost:3001
npm run dev:frontend  # http://localhost:5173
```

### 4. Build for production

```bash
npm run build
```

## Project Structure

```
carascreener/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout/        # Header, Layout wrapper
│   │   │   ├── Watchlist/     # WatchlistTable, FilterBar
│   │   │   ├── StockCard/     # NewsCard, AIAnalysisPanel, TradingViewChart
│   │   │   └── UI/            # PriorityBadge, ChangeDisplay, etc.
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx  # Main watchlist page
│   │   │   └── StockDetail.tsx
│   │   ├── hooks/
│   │   │   ├── useStocks.ts   # Polling, filtering, sorting
│   │   │   └── useStockDetail.ts
│   │   ├── services/
│   │   │   └── api.ts         # Axios API client
│   │   └── types/
│   │       └── index.ts
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── stocks.ts      # GET /api/stocks, /api/stocks/:symbol
│   │   │   ├── watchlist.ts   # PATCH /api/watchlist/:symbol/priority
│   │   │   └── analysis.ts    # GET /api/analysis/:symbol
│   │   ├── services/
│   │   │   ├── finnhub.ts     # Finnhub API client with caching
│   │   │   └── openai.ts      # GPT-4o analysis
│   │   └── index.ts
├── vercel.json
└── .env.example
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/stocks` | All watchlist stocks with live prices |
| GET | `/api/stocks/:symbol` | Stock detail (quote + profile + metrics) |
| GET | `/api/stocks/:symbol/news` | Recent news (Finnhub) |
| GET | `/api/stocks/sectors` | Stocks grouped by sector |
| GET | `/api/analysis/:symbol` | Full GPT-4o analysis |
| GET | `/api/analysis/:symbol/news` | News-only AI analysis |
| GET | `/api/analysis/:symbol/technical` | Technical-only AI analysis |
| PATCH | `/api/watchlist/:symbol/priority` | Update stock priority |

## Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Set these environment variables in Vercel dashboard:
- `FINNHUB_API_KEY`
- `OPENAI_API_KEY`
- `FRONTEND_URL` (your Vercel frontend URL)
