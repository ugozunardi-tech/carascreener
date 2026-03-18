import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import stocksRouter from './routes/stocks';
import watchlistRouter from './routes/watchlist';
import analysisRouter from './routes/analysis';
import portfoliosRouter from './routes/portfolios';
import supplychainRouter from './routes/supplychain';
import newsRouter from './routes/news';
import deepanalysisRouter from './routes/deepanalysis';

// Load .env from backend root regardless of cwd
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') }); // fallback for ts-node

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/stocks', stocksRouter);
app.use('/api/watchlist', watchlistRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/portfolios', portfoliosRouter);
app.use('/api/supplychain', supplychainRouter);
app.use('/api/news', newsRouter);
app.use('/api/deepanalysis', deepanalysisRouter);

// Serve pre-built frontend (production / Vercel)
const DIST = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(DIST));
app.get('*', (_req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`CaraScreener API running on port ${PORT}`);
});

export default app;
