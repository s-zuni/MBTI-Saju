const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://tffvsyarxfujmvbqlutr.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmZnZzeWFyeGZ1am12YnFsdXRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMzU0OTEsImV4cCI6MjA4MjkxMTQ5MX0.7ctb_C-BJN_WTNi_yqaQllFY0oVARqsvSjQkte_M-yo');

async function check() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  console.log('Profiles data:', data);
  if (error) console.error('Profiles error:', error);
}
check();
