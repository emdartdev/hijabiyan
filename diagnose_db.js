
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars. Please check .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log("Checking products and variants...");
  const { data: prods, error: prodErr } = await supabase
    .from('products')
    .select('id, title_bn, product_variants(id)')
    .limit(50);

  if (prodErr) {
    console.error("Error fetching products:", prodErr);
  } else {
    // Find one with variants
    const withVars = prods.find(p => p.product_variants && p.product_variants.length > 0);
    if (withVars) {
      console.log(`Attempting to delete product ${withVars.id} (${withVars.title_bn}) using RPC delete_product_final...`);
      const { error: rpcErr } = await supabase.rpc('delete_product_final', { p_product_id: withVars.id });
      
      if (rpcErr) {
        console.error("RPC failed! Error details:", JSON.stringify(rpcErr, null, 2));
      } else {
        console.log("RPC successful!");
      }
    } else {
      console.log("No products with variants found in the first 50.");
    }
  }
}

diagnose();
