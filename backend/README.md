Setup

1) Copy .env.example to .env and adjust values
2) Start Redis (default: redis://127.0.0.1:6379)
3) Install deps and run server

Commands

  npm install
  npm run dev

REST API

- POST /api/session {sessionId?} -> {sessionId}
- GET /api/sessions/:sessionId/history -> {sessionId, history}
- DELETE /api/sessions/:sessionId/history -> {ok: true}
- POST /api/sessions/:sessionId/persist -> {id, sessionId, count} (requires SQL)

Socket.IO events

- join {sessionId}
- history {sessionId, history}
- message {sessionId, role, content, meta}
- cleared {sessionId}


