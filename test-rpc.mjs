import { createClient } from '@supabase/supabase-js';

const url = "https://tffvsyarxfujmvbqlutr.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmZnZzeWFyeGZ1am12YnFsdXRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMzU0OTEsImV4cCI6MjA4MjkxMTQ5MX0.7ctb_C-BJN_WTNi_yqaQllFY0oVARqsvSjQkte_M-yo";

const supabase = createClient(url, key);

async function test() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  // We don't have admin key so admin.listUsers might fail. Let's just create a dummy query if we know a user_id.
  // I'll just check what the RPC returns if user doesn't exist.
  const { data, error: rpcError } = await supabase.rpc('get_user_available_credits_v2', {
    p_user_id: "00000000-0000-0000-0000-000000000000"
  });
  console.log("data:", JSON.stringify(data, null, 2));
  console.log("error:", rpcError);
}
test();
