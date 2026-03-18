import { createClient } from '@supabase/supabase-js';

export interface PortfolioStock {
  symbol:    string;
  name:      string;
  sector:    string;
  theme:     string;
  priority:  'HIGH' | 'MEDIUM' | 'LOW';
  addedAt:   string;
}

export interface Portfolio {
  id:          string;
  name:        string;
  color:       string;
  description: string;
  stocks:      PortfolioStock[];
  createdAt:   string;
  updatedAt:   string;
}

// ── Supabase client ───────────────────────────────────────────────────────────
function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY env vars are required');
  return createClient(url, key);
}

// ── Row shape from Supabase (snake_case) ─────────────────────────────────────
interface Row {
  id:          string;
  name:        string;
  color:       string;
  description: string;
  stocks:      PortfolioStock[];
  created_at:  string;
  updated_at:  string;
}

function rowToPortfolio(r: Row): Portfolio {
  return {
    id:          r.id,
    name:        r.name,
    color:       r.color,
    description: r.description,
    stocks:      r.stocks ?? [],
    createdAt:   r.created_at,
    updatedAt:   r.updated_at,
  };
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Store ─────────────────────────────────────────────────────────────────────
export const portfolioStore = {

  async getAll(): Promise<Portfolio[]> {
    const { data, error } = await getClient()
      .from('portfolios')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data as Row[]).map(rowToPortfolio);
  },

  async getById(id: string): Promise<Portfolio | null> {
    const { data, error } = await getClient()
      .from('portfolios')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToPortfolio(data as Row) : null;
  },

  async create(input: { name: string; color: string; description?: string }): Promise<Portfolio> {
    const now = new Date().toISOString();
    const row = {
      id:          generateId(),
      name:        input.name,
      color:       input.color,
      description: input.description || '',
      stocks:      [],
      created_at:  now,
      updated_at:  now,
    };
    const { data, error } = await getClient()
      .from('portfolios')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return rowToPortfolio(data as Row);
  },

  async update(id: string, input: Partial<Pick<Portfolio, 'name' | 'color' | 'description'>>): Promise<Portfolio | null> {
    const { data, error } = await getClient()
      .from('portfolios')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data ? rowToPortfolio(data as Row) : null;
  },

  async delete(id: string): Promise<boolean> {
    const { error, count } = await getClient()
      .from('portfolios')
      .delete({ count: 'exact' })
      .eq('id', id);
    if (error) throw error;
    return (count ?? 0) > 0;
  },

  async addStock(portfolioId: string, stock: Omit<PortfolioStock, 'addedAt'>): Promise<Portfolio | null> {
    const portfolio = await this.getById(portfolioId);
    if (!portfolio) return null;
    if (portfolio.stocks.find(s => s.symbol === stock.symbol)) return portfolio;
    const stocks = [...portfolio.stocks, { ...stock, addedAt: new Date().toISOString() }];
    const { data, error } = await getClient()
      .from('portfolios')
      .update({ stocks, updated_at: new Date().toISOString() })
      .eq('id', portfolioId)
      .select()
      .single();
    if (error) throw error;
    return rowToPortfolio(data as Row);
  },

  async removeStock(portfolioId: string, symbol: string): Promise<Portfolio | null> {
    const portfolio = await this.getById(portfolioId);
    if (!portfolio) return null;
    const stocks = portfolio.stocks.filter(s => s.symbol !== symbol.toUpperCase());
    const { data, error } = await getClient()
      .from('portfolios')
      .update({ stocks, updated_at: new Date().toISOString() })
      .eq('id', portfolioId)
      .select()
      .single();
    if (error) throw error;
    return rowToPortfolio(data as Row);
  },

  async updateStock(portfolioId: string, symbol: string, input: Partial<Pick<PortfolioStock, 'priority' | 'theme'>>): Promise<Portfolio | null> {
    const portfolio = await this.getById(portfolioId);
    if (!portfolio) return null;
    const stocks = portfolio.stocks.map(s =>
      s.symbol === symbol.toUpperCase() ? { ...s, ...input } : s
    );
    const { data, error } = await getClient()
      .from('portfolios')
      .update({ stocks, updated_at: new Date().toISOString() })
      .eq('id', portfolioId)
      .select()
      .single();
    if (error) throw error;
    return rowToPortfolio(data as Row);
  },
};
