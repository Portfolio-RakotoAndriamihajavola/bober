const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, '.data');
const DATA_FILE = path.join(DATA_DIR, 'shared-sync.json');

const ALLOWED_KEYS = new Set([
  'boberPlayedMatches',
  'boberUpcomingMatches',
  'boberComments',
  'boberPlayerAccounts',
  'boberTeamTierState',
  'boberAttendancePolls'
]);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf'
};

function ensureDataStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(DATA_FILE)) {
    const initial = {
      version: 0,
      updatedAt: new Date().toISOString(),
      data: {}
    };

    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf8');
  }
}

function readStore() {
  ensureDataStore();

  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid shared sync store');
    }

    return {
      version: Number(parsed.version) || 0,
      updatedAt: String(parsed.updatedAt || new Date().toISOString()),
      data: parsed.data && typeof parsed.data === 'object' ? parsed.data : {}
    };
  } catch {
    return {
      version: 0,
      updatedAt: new Date().toISOString(),
      data: {}
    };
  }
}

function writeStore(store) {
  ensureDataStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function getSafePath(requestPath) {
  const decodedPath = decodeURIComponent(requestPath.split('?')[0]);
  const cleanPath = decodedPath === '/' ? '/index.html' : decodedPath;
  const fullPath = path.resolve(ROOT_DIR, `.${cleanPath}`);

  if (!fullPath.startsWith(ROOT_DIR)) {
    return null;
  }

  return fullPath;
}

function serveStatic(req, res) {
  const safePath = getSafePath(req.url || '/');
  if (!safePath) {
    sendJson(res, 403, { error: 'Forbidden path' });
    return;
  }

  fs.stat(safePath, (statErr, stats) => {
    if (statErr || !stats.isFile()) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(safePath);
    stream.pipe(res);
  });
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
      if (body.length > 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });

    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const method = req.method || 'GET';
  const url = req.url || '/';

  if (url === '/api/sync' && method === 'GET') {
    const store = readStore();
    sendJson(res, 200, store);
    return;
  }

  if (url === '/api/sync' && method === 'POST') {
    try {
      const body = await collectBody(req);
      const payload = JSON.parse(body || '{}');
      const key = String(payload.key || '');

      if (!ALLOWED_KEYS.has(key)) {
        sendJson(res, 400, { error: 'Invalid key' });
        return;
      }

      const store = readStore();
      store.data[key] = payload.value;
      store.version += 1;
      store.updatedAt = new Date().toISOString();
      writeStore(store);

      sendJson(res, 200, { ok: true, version: store.version, updatedAt: store.updatedAt });
    } catch {
      sendJson(res, 400, { error: 'Invalid JSON payload' });
    }
    return;
  }

  if (url === '/api/health' && method === 'GET') {
    sendJson(res, 200, { ok: true });
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`BOBER Team Hub server running on http://localhost:${PORT}`);
});
