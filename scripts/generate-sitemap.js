
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://tffvsyarxfujmvbqlutr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmZnZzeWFyeGZ1am12YnFsdXRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMzU0OTEsImV4cCI6MjA4MjkxMTQ5MX0.7ctb_C-BJN_WTNi_yqaQllFY0oVARqsvSjQkte_M-yo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DOMAIN = 'https://www.mbtiju.com';

async function generateSitemap() {
    console.log('Generating dynamic sitemap...');

    const staticPages = [
        '',
        '/community',
        '/fortune',
        '/support',
        '/pricing',
        '/terms',
        '/privacy'
    ];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Static Pages
    staticPages.forEach(page => {
        xml += `  <url>\n`;
        xml += `    <loc>${DOMAIN}${page}</loc>\n`;
        xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>${page === '' ? '1.0' : '0.8'}</priority>\n`;
        xml += `  </url>\n`;
    });

    // Community Posts
    const { data: posts, error } = await supabase
        .from('posts')
        .select('id, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching posts for sitemap:', error);
    } else {
        posts.forEach(post => {
            xml += `  <url>\n`;
            xml += `    <loc>${DOMAIN}/community/post/${post.id}</loc>\n`;
            xml += `    <lastmod>${new Date(post.created_at).toISOString().split('T')[0]}</lastmod>\n`;
            xml += `    <changefreq>monthly</changefreq>\n`;
            xml += `    <priority>0.6</priority>\n`;
            xml += `  </url>\n`;
        });
    }

    xml += '</urlset>';

    fs.writeFileSync('./public/sitemap.xml', xml);
    console.log(`Sitemap generated with ${staticPages.length} static pages and ${posts?.length || 0} community posts.`);
}

generateSitemap();
