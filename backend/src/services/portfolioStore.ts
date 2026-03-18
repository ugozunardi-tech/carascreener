import fs from 'fs';
import path from 'path';

export interface PortfolioStock {
  symbol: string;
  name: string;
  sector: string;
  theme: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  addedAt: string;
}

export interface Portfolio {
  id: string;
  name: string;
  color: string;
  description: string;
  stocks: PortfolioStock[];
  createdAt: string;
  updatedAt: string;
}

const DATA_FILE = path.join(__dirname, '../../data/portfolios.json');

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readData(): Portfolio[] {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeData(portfolios: Portfolio[]) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(portfolios, null, 2));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export const portfolioStore = {
  getAll(): Portfolio[] {
    return readData();
  },

  getById(id: string): Portfolio | null {
    return readData().find(p => p.id === id) || null;
  },

  create(data: { name: string; color: string; description?: string }): Portfolio {
    const portfolios = readData();
    const portfolio: Portfolio = {
      id: generateId(),
      name: data.name,
      color: data.color,
      description: data.description || '',
      stocks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    portfolios.push(portfolio);
    writeData(portfolios);
    return portfolio;
  },

  update(id: string, data: Partial<Pick<Portfolio, 'name' | 'color' | 'description'>>): Portfolio | null {
    const portfolios = readData();
    const idx = portfolios.findIndex(p => p.id === id);
    if (idx === -1) return null;
    portfolios[idx] = { ...portfolios[idx], ...data, updatedAt: new Date().toISOString() };
    writeData(portfolios);
    return portfolios[idx];
  },

  delete(id: string): boolean {
    const portfolios = readData();
    const idx = portfolios.findIndex(p => p.id === id);
    if (idx === -1) return false;
    portfolios.splice(idx, 1);
    writeData(portfolios);
    return true;
  },

  addStock(portfolioId: string, stock: Omit<PortfolioStock, 'addedAt'>): Portfolio | null {
    const portfolios = readData();
    const portfolio = portfolios.find(p => p.id === portfolioId);
    if (!portfolio) return null;
    if (portfolio.stocks.find(s => s.symbol === stock.symbol)) return portfolio; // already exists
    portfolio.stocks.push({ ...stock, addedAt: new Date().toISOString() });
    portfolio.updatedAt = new Date().toISOString();
    writeData(portfolios);
    return portfolio;
  },

  removeStock(portfolioId: string, symbol: string): Portfolio | null {
    const portfolios = readData();
    const portfolio = portfolios.find(p => p.id === portfolioId);
    if (!portfolio) return null;
    portfolio.stocks = portfolio.stocks.filter(s => s.symbol !== symbol.toUpperCase());
    portfolio.updatedAt = new Date().toISOString();
    writeData(portfolios);
    return portfolio;
  },

  updateStock(portfolioId: string, symbol: string, data: Partial<Pick<PortfolioStock, 'priority' | 'theme'>>): Portfolio | null {
    const portfolios = readData();
    const portfolio = portfolios.find(p => p.id === portfolioId);
    if (!portfolio) return null;
    const stock = portfolio.stocks.find(s => s.symbol === symbol.toUpperCase());
    if (!stock) return null;
    Object.assign(stock, data);
    portfolio.updatedAt = new Date().toISOString();
    writeData(portfolios);
    return portfolio;
  },
};
