import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL as string
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    // We cannot create a valid client without keys, so we throw an error that will be caught by the error boundary or show up in the console clearly.
    // However, to prevent a hard crash on module load, we can return a dummy proxy or throw on usage.
    // For now, let's keep it null but log heavily, OR better yet, throw an error if accessed.
}

export const supabase = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createClient('https://placeholder.supabase.co', 'placeholder'); // Prevent null pointer exception but calls will fail appropriately

