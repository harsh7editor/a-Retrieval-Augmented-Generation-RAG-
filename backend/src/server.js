import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

// Environment
const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Optional SQL
const SQL_ENGINE = process.env.SQL_ENGINE; // 'postgres' | 'mysql'
let sqlPool = null;
async function initSql() {
  if (!SQL_ENGINE) return;
  if (SQL_ENGINE === 'postgres') {
    const { Pool } = await import('pg');
    sqlPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
    });
    await sqlPool.query(
      'CREATE TABLE IF NOT EXISTS chat_transcripts (id UUID PRIMARY KEY, session_id TEXT NOT NULL, transcript JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())'
    );
  } else if (SQL_ENGINE === 'mysql') {
    const mysql = await import('mysql2/promise');
    sqlPool = await mysql.createPool({
      uri: process.env.DATABASE_URL,
      connectionLimit: 5,
    });
    await sqlPool.query(
      'CREATE TABLE IF NOT EXISTS chat_transcripts (id CHAR(36) PRIMARY KEY, session_id VARCHAR(255) NOT NULL, transcript JSON NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)'
    );
  }
}

// Redis
const redis = new Redis(REDIS_URL);
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'] },
});

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '1mb' }));

// Helpers for Redis chat storage
function sessionKey(sessionId) {
  return `chat:session:${sessionId}`;
}

async function getHistory(sessionId) {
  const key = sessionKey(sessionId);
  const items = await redis.lrange(key, 0, -1);
  return items.map((s) => JSON.parse(s));
}

async function appendMessage(sessionId, message) {
  const key = sessionKey(sessionId);
  await redis.rpush(key, JSON.stringify(message));
  // Optional expiry
  const ttlSeconds = parseInt(process.env.CHAT_TTL_SECONDS || '0', 10);
  if (ttlSeconds > 0) await redis.expire(key, ttlSeconds);
}

async function clearHistory(sessionId) {
  await redis.del(sessionKey(sessionId));
}

// REST Endpoints
app.post('/api/session', async (req, res) => {
  const { sessionId } = req.body || {};
  const id = sessionId || uuidv4();
  res.json({ sessionId: id });
});

app.get('/api/sessions/:sessionId/history', async (req, res) => {
  try {
    const history = await getHistory(req.params.sessionId);
    res.json({ sessionId: req.params.sessionId, history });
  } catch (err) {
    res.status(500).json({ error: 'failed_to_fetch_history' });
  }
});

app.delete('/api/sessions/:sessionId/history', async (req, res) => {
  try {
    await clearHistory(req.params.sessionId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'failed_to_clear_history' });
  }
});

// Optional: persist transcript to SQL
app.post('/api/sessions/:sessionId/persist', async (req, res) => {
  if (!sqlPool) return res.status(501).json({ error: 'sql_not_configured' });
  try {
    const sessionId = req.params.sessionId;
    const history = await getHistory(sessionId);
    const id = uuidv4();
    if (SQL_ENGINE === 'postgres') {
      await sqlPool.query(
        'INSERT INTO chat_transcripts (id, session_id, transcript) VALUES ($1, $2, $3)',
        [id, sessionId, JSON.stringify(history)]
      );
    } else if (SQL_ENGINE === 'mysql') {
      await sqlPool.query(
        'INSERT INTO chat_transcripts (id, session_id, transcript) VALUES (?, ?, CAST(? AS JSON))',
        [id, sessionId, JSON.stringify(history)]
      );
    }
    res.json({ id, sessionId, count: history.length });
  } catch (err) {
    res.status(500).json({ error: 'failed_to_persist' });
  }
});

// Socket.IO for realtime chat
io.on('connection', (socket) => {
  socket.on('join', async ({ sessionId }) => {
    if (!sessionId) return;
    socket.join(sessionId);
    const history = await getHistory(sessionId);
    socket.emit('history', { sessionId, history });
  });

  socket.on('message', async ({ sessionId, role, content, meta }) => {
    if (!sessionId || !content) return;
    const msg = {
      id: uuidv4(),
      role: role || 'user',
      content,
      meta: meta || {},
      timestamp: new Date().toISOString(),
    };
    await appendMessage(sessionId, msg);
    io.to(sessionId).emit('message', { sessionId, message: msg });
  });

  socket.on('clear', async ({ sessionId }) => {
    if (!sessionId) return;
    await clearHistory(sessionId);
    io.to(sessionId).emit('cleared', { sessionId });
  });
});

async function start() {
  await initSql();
  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', err);
  process.exit(1);
});


