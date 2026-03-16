/**
 * Custom Next.js server that attaches a WebSocket server to the same HTTP port.
 * WebSocket connections to /ws/live are handled by the Gemini Live session handler.
 *
 * Run with:  npx tsx server.ts
 */
import { loadEnvConfig } from '@next/env';

// Load .env.local before anything else so GEMINI_API_KEY is available everywhere
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production');

import { createServer } from 'http';
import next from 'next';
import { WebSocketServer } from 'ws';
import { handleLiveConnection } from './lib/liveSession';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST ?? 'localhost';
const port = parseInt(process.env.PORT ?? '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Global error handlers to prevent server crashes
process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled rejection:', reason);
});

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    try {
      const parsedUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? hostname}`);
      handle(req, res, { pathname: parsedUrl.pathname, query: Object.fromEntries(parsedUrl.searchParams) } as any);
    } catch (err) {
      console.error('[server] Error handling HTTP request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // Attach a WebSocket server — no port of its own, piggybacks on httpServer
  const wss = new WebSocketServer({ noServer: true, clientTracking: true });

  httpServer.on('upgrade', (req, socket, head) => {
    try {
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? hostname}`);
      if (url.pathname === '/ws/live') {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req);
        });
      } else {
        socket.destroy();
      }
    } catch (err) {
      console.error('[server] Error during WebSocket upgrade:', err);
      socket.destroy();
    }
  });

  wss.on('connection', (ws, req) => {
    try {
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? hostname}`);
      const problem = url.searchParams.get('problem') ?? undefined;
      handleLiveConnection(ws, problem).catch((err) => {
        console.error('[server] Unhandled error in live connection:', err);
        try {
          ws.close(1011, 'Internal server error');
        } catch {}
      });
    } catch (err) {
      console.error('[server] Error in WebSocket connection handler:', err);
      try {
        ws.close(1011, 'Connection handler error');
      } catch {}
    }
  });

  wss.on('error', (err) => {
    console.error('[server] WebSocket server error:', err);
  });

  httpServer.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[server] Port ${port} is already in use`);
      process.exit(1);
    } else {
      console.error('[server] HTTP server error:', err);
    }
  });

  httpServer.listen(port, hostname, () => {
    console.log(`✓ Ready on http://${hostname}:${port}`);
    console.log(`✓ WebSocket live endpoint: ws://${hostname}:${port}/ws/live`);
    console.log(`✓ Press Ctrl+C to stop`);
  });
});
