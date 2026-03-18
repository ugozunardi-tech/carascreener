import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://sltonfyhwjcwvewtaigq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsdG9uZnlod2pjd3Zld3RhaWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MzM2ODYsImV4cCI6MjA4OTQwOTY4Nn0.21c0TxoIw22vc6b75Ww97hCZl3dA65BbbcXcSZ40zPI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const portfolios = JSON.parse(
  readFileSync(join(__dirname, '../data/portfolios.json'), 'utf8')
);

const rows = portfolios.map(p => ({
  id:          p.id,
  name:        p.name,
  color:       p.color,
  description: p.description || '',
  stocks:      p.stocks || [],
  created_at:  p.createdAt || new Date().toISOString(),
  updated_at:  p.updatedAt || new Date().toISOString(),
}));

console.log(`Migrating ${rows.length} portfolios...`);

const { data, error } = await supabase
  .from('portfolios')
  .upsert(rows, { onConflict: 'id' })
  .select('id, name');

if (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
}

console.log('Migration successful!');
data.forEach(p => console.log(`  ✓ ${p.id}: ${p.name}`));
