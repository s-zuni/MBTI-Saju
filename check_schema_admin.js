const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Extract keys directly from the original file for absolute certainty
const apiContent = fs.readFileSync('api/confirm-payment.ts', 'utf8');
const supabaseUrlMatch = apiContent.match(/process\.env\.VITE_SUPABASE_URL\s*\|\|\s*process\.env\.SUPABASE_URL\s*\|\|\s*'([^']+)'/);
const supabaseKeyMatch = apiContent.match(/process\.env\.SUPABASE_SERVICE_ROLE_KEY\s*\|\|\s*'([^']+)'/);
// Wait, the API file doesn't have the string literals for keys!
// Let me read .env or .env.local via script!
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env', override: false });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://tffvsyarxfujmvbqlutr.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.log("No service key found in env.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function check() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  console.log('Profiles data:', JSON.stringify(data, null, 2));
  if (error) console.error('Profiles error:', JSON.stringify(error, null, 2));

  const { data: cols, error: err2 } = await supabase.rpc('get_columns_for_table', { table_name: 'profiles' });
  console.log('Columns if RPC exists:', cols);
}
check();
