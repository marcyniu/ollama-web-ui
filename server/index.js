import http from 'http';
import https from 'https';
import { URL } from 'url';

const PORT = parseInt(process.env.MODEL_MANAGER_PORT || '3001', 10);
const OLLAMA_HOST = (process.env.OLLAMA_HOST || 'http://localhost:11434').replace(/\/$/, '');

function fetchOllama(path, options = {}) {
  const target = new URL(path, OLLAMA_HOST);
  const lib = target.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        hostname: target.hostname,
        port: target.port || (target.protocol === 'https:' ? 443 : 80),
        path: target.pathname + (target.search || ''),
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      resolve
    );
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
  });
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  // Pre-flight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  try {
    // GET /api/models — list installed models
    if (req.method === 'GET' && pathname === '/api/models') {
      const upstream = await fetchOllama('/api/tags');
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json' });
      upstream.pipe(res);
      return;
    }

    // POST /api/models/pull — pull a model (stream progress)
    if (req.method === 'POST' && pathname === '/api/models/pull') {
      const body = await readBody(req);
      const upstream = await fetchOllama('/api/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/x-ndjson' });
      upstream.pipe(res);
      return;
    }

    // DELETE /api/models/delete — delete a model
    if (req.method === 'DELETE' && pathname === '/api/models/delete') {
      const body = await readBody(req);
      const upstream = await fetchOllama('/api/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json' });
      upstream.pipe(res);
      return;
    }

    // Health check
    if (req.method === 'GET' && pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', ollama: OLLAMA_HOST }));
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  } catch (err) {
    console.error('Backend error:', err.message);
    res.writeHead(502);
    res.end(`Upstream error: ${err.message}`);
  }
});

server.listen(PORT, () => {
  console.log(`Model Manager backend listening on port ${PORT}`);
  console.log(`Proxying to Ollama at ${OLLAMA_HOST}`);
});
