## NewsBot – RAG-Powered Chatbot

This repository contains a full-stack RAG (Retrieval-Augmented Generation) chatbot: React frontend, Cloudflare Worker API for RAG, and a Node.js/Express backend with Socket.IO and Redis for session chat. Optional SQL persistence is available.

### Tech Stack
- Frontend: React + Vite + TailwindCSS
- RAG API: Cloudflare Worker (Hono) with D1 (SQLite) for articles and chat logs
- Embeddings: OpenAI `text-embedding-3-small` (swap-friendly)
- LLM: OpenAI `gpt-4o-mini` for responses (swap-friendly)
- Realtime/Backend (optional): Node.js (Express) + Socket.IO
- Cache/Sessions: Redis (in-memory chat buffers)
- Database (optional): Postgres or MySQL for transcript persistence (backend)

> You can replace OpenAI with Gemini or others by editing `src/worker/rag.ts` and `src/worker/seed-embeddings.ts`.

---

## 1) Prerequisites
- Node.js 18+
- npm
- Cloudflare Wrangler (`npm i -g wrangler` or npx)
- Redis (for backend session storage), e.g. Redis Stack or Docker

Optional:
- Postgres (with `pgvector`) or MySQL if you want durable transcript storage from backend

---

## 2) Environment Variables

Create `.dev.vars` at repository root for the Worker API:
```
OPENAI_API_KEY=sk-...
```

Backend (optional) uses `.env` inside `backend/`:
```
PORT=4000
CORS_ORIGIN=http://localhost:5173
REDIS_URL=redis://127.0.0.1:6379

# Optional SQL persistence from backend
# SQL_ENGINE=postgres   # or mysql
# DATABASE_URL=postgres://user:pass@localhost:5432/db
# DATABASE_URL=mysql://user:pass@localhost:3306/db
```

---

## 3) Install and Run (Frontend + Worker API)
```
npm install
npm run dev
```
Vite dev server will start (e.g., http://localhost:5173). The Cloudflare Worker runs via the Vite integration and exposes API routes under `/api/*`.

### Initialize Local DB (D1)
Run migrations:
```
wrangler d1 execute 01995703-774a-79d5-8f68-8af2ffa1093c --local --file=./migrations/1.sql
wrangler d1 execute 01995703-774a-79d5-8f68-8af2ffa1093c --local --file=./migrations/2.sql
```

### Seed Embeddings
Generate embeddings for articles (requires `OPENAI_API_KEY`):
```
curl -X POST http://localhost:5173/api/seed-embeddings
```

---

## 4) Backend (Express + Socket.IO + Redis)

The optional backend provides REST + WebSocket for chat sessions using Redis, with optional SQL transcript persistence.

### Install & Run
```
cd backend
npm install
npm run dev
```
Server runs at `http://localhost:4000`.

### REST Endpoints
- POST `/api/session` → `{ sessionId }`
- GET `/api/sessions/:sessionId/history` → `{ sessionId, history }`
- DELETE `/api/sessions/:sessionId/history` → `{ ok: true }`
- POST `/api/sessions/:sessionId/persist` → `{ id, sessionId, count }` (requires SQL)

### Socket.IO Events
- Client → `join` `{ sessionId }`
- Server → `history` `{ sessionId, history }`
- Client → `message` `{ sessionId, role, content, meta? }`
- Server → `message` `{ sessionId, message }`
- Client → `clear` `{ sessionId }`
- Server → `cleared` `{ sessionId }`

---

## 5) RAG API (Worker) Endpoints
- POST `/api/chat` `{ message, session_id? }` → `{ message, session_id, sources }`
- GET `/api/chat/:sessionId` → `{ messages, session_id }`
- DELETE `/api/chat/:sessionId` → `{ success: true }`
- GET `/api/articles` → `Article[]`
- POST `/api/seed-embeddings` → `{ success, message }`

---

## 6) Switching Providers (Embeddings/LLM)
- Edit `src/worker/rag.ts` to swap embedding model and chat model.
- Edit `src/worker/seed-embeddings.ts` if using a different embeddings SDK.
- For Gemini, replace OpenAI SDK calls with Google’s SDK and set corresponding environment variables.

---

## 7) Troubleshooting
- Failed to send message: ensure D1 tables are migrated and `OPENAI_API_KEY` is set in `.dev.vars`.
- Failed to generate embeddings: verify API key/billing and retry seeding.
- Port conflicts: Vite will auto-increment; update `CORS_ORIGIN` in backend `.env` if needed.
- Redis not reachable: check `REDIS_URL` and that Redis is running.

