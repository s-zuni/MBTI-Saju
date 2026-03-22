const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/supabase-api',
    createProxyMiddleware({
      target: 'https://tffvsyarxfujmvbqlutr.supabase.co',
      changeOrigin: true,
      pathRewrite: {
        '^/supabase-api': '', // Remove /supabase-api prefix when forwarding
      },
    })
  );
};
