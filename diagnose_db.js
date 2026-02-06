
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars. Please check .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log("Checking products table...");
  const { data, error } = await supabase
    .from('products')
    .select('id, title_bn, price_tiers, gift_rules')
    .eq('is_active', true)
    .limit(10);

  if (error) {
    console.error("Error fetching products:", error);
    return;
  }

  console.log(`Found ${data.length} active products.`);
  data.forEach(p => {
    console.log(`- [${p.id}] ${p.title_bn}`);
    console.log(`  Tiers: ${JSON.stringify(p.price_tiers)}`);
    console.log(`  Gifts: ${JSON.stringify(p.gift_rules)}`);
  });
}

diagnose();
