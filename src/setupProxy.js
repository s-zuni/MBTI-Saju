const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const raw = fs.readFileSync(filePath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (key && process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  } catch {
    // ignore missing or unreadable env files in local dev
  }
}

const REWRITES = new Map([
  ['/api/confirm-payment', { file: 'payment.ts', query: { action: 'confirm' } }],
  ['/api/cancel-payment', { file: 'payment.ts', query: { action: 'cancel' } }],
  ['/api/naming', { file: 'analysis-special.ts', query: { type: 'naming' } }],
  ['/api/job', { file: 'analysis-special.ts', query: { type: 'job' } }],
  ['/api/trip', { file: 'analysis-special.ts', query: { type: 'trip' } }],
  ['/api/cherry', { file: 'analysis-special.ts', query: { type: 'cherry' } }],
  ['/api/fortune', { file: 'analysis-special.ts', query: { type: 'fortune' } }],
  ['/api/analyze', { file: 'analysis-main.ts', query: { part: 'core' } }],
  ['/api/analyze_fortune', { file: 'analysis-main.ts', query: { part: 'fortune' } }],
  ['/api/analyze_strategy', { file: 'analysis-main.ts', query: { part: 'strategy' } }],
  ['/api/analyze_full', { file: 'analysis-main.ts', query: { part: 'full' } }],
]);

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = function (app) {
  const rootDir = path.resolve(__dirname, '..');
  loadEnvFile(path.join(rootDir, '.env.local'));
  loadEnvFile(path.join(rootDir, '.env'));

  if (!process.env.SUPABASE_URL && process.env.REACT_APP_SUPABASE_URL) {
    process.env.SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
  }
  if (!process.env.SUPABASE_ANON_KEY && process.env.REACT_APP_SUPABASE_ANON_KEY) {
    process.env.SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
  }

  const jiti = require('jiti')(path.join(rootDir, 'package.json'));

  app.use('/api', async (req, res, next) => {
    const fullUrl = new URL(req.originalUrl, `http://${req.headers.host || 'localhost:3000'}`);
    const pathname = fullUrl.pathname;
    const rewrite = REWRITES.get(pathname);

    let fileName;
    if (rewrite) {
      fileName = rewrite.file;
      for (const [k, v] of Object.entries(rewrite.query)) {
        if (!fullUrl.searchParams.has(k)) {
          fullUrl.searchParams.set(k, v);
        }
      }
    } else {
      const base = pathname.replace(/^\/api\/?/, '').replace(/\/+$/, '');
      if (!base || base.includes('/') || base.startsWith('_')) {
        return next();
      }
      fileName = `${base}.ts`;
    }

    const filePath = path.join(rootDir, 'api', fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: `API route not found: ${pathname}` });
    }

    try {
      const mod = jiti(filePath);
      const handler = mod?.default || mod;
      if (typeof handler !== 'function') {
        return res.status(500).json({ success: false, error: `Invalid API handler: ${fileName}` });
      }

      const rawBuffer = await readRawBody(req);
      const isEdge = mod?.config?.runtime === 'edge';

      if (isEdge) {
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) {
          if (Array.isArray(v)) {
            v.forEach((item) => headers.append(k, item));
          } else if (typeof v === 'string') {
            headers.set(k, v);
          }
        }

        const init = {
          method: req.method,
          headers,
        };
        if (req.method !== 'GET' && req.method !== 'HEAD' && rawBuffer.length > 0) {
          init.body = rawBuffer;
        }

        const webReq = new Request(fullUrl.toString(), init);
        const webRes = await handler(webReq);

        res.status(webRes.status);
        webRes.headers.forEach((value, key) => {
          const lower = key.toLowerCase();
          if (lower !== 'transfer-encoding' && lower !== 'content-encoding') {
            res.setHeader(key, value);
          }
        });

        if (!webRes.body) {
          return res.end();
        }

        const reader = webRes.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
        return res.end();
      }

      // Node (VercelRequest, VercelResponse) 스타일 핸들러
      const contentType = String(req.headers['content-type'] || '');
      if (rawBuffer.length > 0 && contentType.includes('application/json')) {
        try {
          req.body = JSON.parse(rawBuffer.toString('utf8'));
        } catch {
          req.body = {};
        }
      } else if (rawBuffer.length > 0) {
        req.body = rawBuffer.toString('utf8');
      } else {
        req.body = {};
      }

      const queryObj = Object.fromEntries(fullUrl.searchParams.entries());
      req.query = { ...queryObj, ...(req.query || {}) };

      if (typeof res.status !== 'function') {
        res.status = (code) => {
          res.statusCode = code;
          return res;
        };
      }
      if (typeof res.json !== 'function') {
        res.json = (obj) => {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          return res.end(JSON.stringify(obj));
        };
      }

      return await handler(req, res);
    } catch (err) {
      console.error(`[local-api-proxy] ${pathname} error:`, err);
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: err?.message || '로컬 API 처리 중 오류가 발생했습니다.',
        });
      }
      return res.end();
    }
  });
};
