
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tffvsyarxfujmvbqlutr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmZnZzeWFyeGZ1am12YnFsdXRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMzU0OTEsImV4cCI6MjA4MjkxMTQ5MX0.7ctb_C-BJN_WTNi_yqaQllFY0oVARqsvSjQkte_M-yo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
    try {
        const { data: posts, error: postError } = await supabase
            .from('posts')
            .select('*')
            .limit(1);
        
        if (postError) {
            console.error('Error fetching posts:', postError);
        } else {
            console.log('Posts sample:', JSON.stringify(posts, null, 2));
        }

        const { data: users, error: userError } = await supabase
            .from('profiles') // checking if profiles table exists
            .select('id')
            .limit(1);
            
        if (userError) {
            console.log('Profiles table might not exist or be accessible.');
        } else {
            console.log('Users sample:', JSON.stringify(users, null, 2));
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkSchema();
