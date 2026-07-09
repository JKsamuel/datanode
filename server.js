import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './agents/lib/env.js';
import { createInvestigationRun, getInvestigationRun, listInvestigationRuns } from './agents/lib/investigation.js';
import { SupabaseRestClient, hasServiceRoleKey } from './agents/lib/supabase-rest.js';

loadEnv();

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const port = Number.parseInt(process.env.PORT || '4173', 10);

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'],
]);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new Error('Request body is too large.');
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString('utf8');
  return body ? JSON.parse(body) : {};
}

async function handleApi(request, response, url) {
  if (url.pathname === '/api/health') {
    sendJson(response, 200, { ok: true, serviceRole: hasServiceRoleKey() });
    return true;
  }

  if (url.pathname === '/api/investigation-runs' && request.method === 'GET') {
    try {
      const client = new SupabaseRestClient();
      const limit = Number.parseInt(url.searchParams.get('limit') || '12', 10);
      const runs = await listInvestigationRuns(client, { limit: Number.isFinite(limit) ? limit : 12 });
      sendJson(response, 200, { ok: true, runs });
    } catch (error) {
      sendJson(response, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/investigation-runs' && request.method === 'POST') {
    if (!hasServiceRoleKey()) {
      sendJson(response, 503, { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY is required on the local server.' });
      return true;
    }
    try {
      const body = await readJsonBody(request);
      const client = new SupabaseRestClient();
      const result = await createInvestigationRun({
        client,
        query: String(body.query || 'Hamilton'),
        dateRange: String(body.dateRange || '90'),
        platform: String(body.platform || 'all'),
        resultLimit: Number.parseInt(body.resultLimit || '80', 10),
        source: 'datanode_local_api',
      });
      sendJson(response, 200, {
        ok: true,
        run: {
          id: result.run.id,
          runKey: result.run.run_key,
          query: result.run.query,
          platform: result.run.platform,
          dateRange: result.run.date_range,
          resultCount: result.run.result_count,
          graphNodeCount: result.run.graph_node_count,
          graphEdgeCount: result.run.graph_edge_count,
          createdAt: result.run.created_at,
        },
        posts: result.posts,
        entities: result.entities,
      });
    } catch (error) {
      sendJson(response, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
    return true;
  }

  const runMatch = url.pathname.match(/^\/api\/investigation-runs\/([0-9a-f-]{36})$/i);
  if (runMatch && request.method === 'GET') {
    try {
      const client = new SupabaseRestClient();
      const detail = await getInvestigationRun(client, runMatch[1]);
      if (!detail) {
        sendJson(response, 404, { ok: false, error: 'Investigation run not found.' });
        return true;
      }
      sendJson(response, 200, { ok: true, ...detail });
    } catch (error) {
      sendJson(response, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
    return true;
  }

  if (url.pathname.startsWith('/api/')) {
    sendJson(response, 404, { ok: false, error: 'API route not found.' });
    return true;
  }

  return false;
}

async function serveStatic(request, response, url) {
  const requestedPath = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const normalizedPath = normalize(requestedPath).replace(/^(\.\.[/\\])+/, '');
  const absolutePath = resolve(join(rootDir, normalizedPath));
  if (!absolutePath.startsWith(rootDir) || !existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  const extension = extname(absolutePath);
  response.writeHead(200, {
    'Content-Type': mimeTypes.get(extension) || 'application/octet-stream',
    'Cache-Control': extension === '.html' ? 'no-store' : 'no-cache',
  });
  createReadStream(absolutePath).pipe(response);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || `localhost:${port}`}`);
    if (await handleApi(request, response, url)) return;
    await serveStatic(request, response, url);
  } catch (error) {
    sendJson(response, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(port, () => {
  console.log(`DataNode local server running at http://localhost:${port}`);
});
