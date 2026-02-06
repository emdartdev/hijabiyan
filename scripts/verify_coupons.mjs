
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  console.log("Verifying coupons...");
  
  const { data, error } = await supabase
    .from('coupons')
    .upsert([
      { code: 'SAVE50', discount_flat_bdt: 50, min_order_bdt: 0, is_active: true },
      { code: 'SAVE200', discount_flat_bdt: 200, min_order_bdt: 0, is_active: true }
    ], { onConflict: 'code' })
    .select();

  if (error) {
    console.error("Upsert failed:", error);
  } else {
    console.log("Coupons verified/upserted successfully:", data);
  }

  // Also clear tiers to be safe
  const { error: tierErr } = await supabase
    .from('products')
    .update({ price_tiers: [] })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Just a dummy condition to update all

  if (tierErr) {
    console.error("Tier clear failed:", tierErr);
  } else {
    console.log("Product tiers cleared.");
  }
}

verify();
