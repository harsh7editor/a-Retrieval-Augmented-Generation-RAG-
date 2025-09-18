import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { cors } from "hono/cors";
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import {
  ChatRequestSchema,
  type Article,
  type ChatMessage
} from '@/shared/types';
import { generateEmbedding, findSimilarArticles, generateRAGResponse } from './rag';
import { seedEmbeddings } from './seed-embeddings';

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for frontend requests
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type'],
}));

// Initialize OpenAI client
function getOpenAIClient(env: Env): OpenAI {
  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });
}

// Get all articles from database
async function getArticles(env: Env): Promise<Article[]> {
  const stmt = env.DB.prepare('SELECT * FROM articles ORDER BY created_at DESC');
  const result = await stmt.all();
  return result.results as Article[];
}

// Get chat history for a session
async function getChatHistory(sessionId: string, env: Env): Promise<ChatMessage[]> {
  const stmt = env.DB.prepare('SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC');
  const result = await stmt.bind(sessionId).all();
  
  return result.results.map((row: any) => ({
    ...row,
    sources: row.sources ? JSON.parse(row.sources) : undefined
  })) as ChatMessage[];
}

// Save chat message to database
async function saveChatMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  sources: number[] | undefined,
  env: Env
): Promise<void> {
  // Ensure session exists
  await env.DB.prepare('INSERT OR IGNORE INTO chat_sessions (session_id) VALUES (?)')
    .bind(sessionId).run();

  // Save message
  const stmt = env.DB.prepare(`
    INSERT INTO chat_messages (session_id, role, content, sources)
    VALUES (?, ?, ?, ?)
  `);
  
  await stmt.bind(
    sessionId,
    role,
    content,
    sources ? JSON.stringify(sources) : null
  ).run();
}

// Chat endpoint
app.post('/api/chat', zValidator('json', ChatRequestSchema), async (c) => {
  try {
    const { message, session_id } = c.req.valid('json');
    const sessionId = session_id || uuidv4();
    
    const openai = getOpenAIClient(c.env);
    
    // Save user message
    await saveChatMessage(sessionId, 'user', message, undefined, c.env);
    
    // Get all articles
    const articles = await getArticles(c.env);
    
    if (articles.length === 0) {
      const response = "I don't have any news articles available yet. Please check back later!";
      await saveChatMessage(sessionId, 'assistant', response, undefined, c.env);
      
      return c.json({
        message: response,
        session_id: sessionId,
        sources: []
      });
    }
    
    // Generate embedding for user query
    const queryEmbedding = await generateEmbedding(message, openai);
    
    // Find similar articles
    const similarArticles = findSimilarArticles(queryEmbedding, articles, 3);
    const relevantArticles = similarArticles.map(item => item.article);
    
    // Generate RAG response
    const response = await generateRAGResponse(message, relevantArticles, openai);
    
    // Save assistant response with sources
    const sourceIds = relevantArticles.map(article => article.id);
    await saveChatMessage(sessionId, 'assistant', response, sourceIds, c.env);
    
    return c.json({
      message: response,
      session_id: sessionId,
      sources: relevantArticles
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    return c.json({ error: 'Failed to process chat message' }, 500);
  }
});

// Get chat history endpoint
app.get('/api/chat/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const messages = await getChatHistory(sessionId, c.env);
    
    return c.json({
      messages,
      session_id: sessionId
    });
    
  } catch (error) {
    console.error('Get chat history error:', error);
    return c.json({ error: 'Failed to get chat history' }, 500);
  }
});

// Clear chat session endpoint
app.delete('/api/chat/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    
    // Delete messages for session
    await c.env.DB.prepare('DELETE FROM chat_messages WHERE session_id = ?')
      .bind(sessionId).run();
    
    // Delete session
    await c.env.DB.prepare('DELETE FROM chat_sessions WHERE session_id = ?')
      .bind(sessionId).run();
    
    return c.json({ success: true });
    
  } catch (error) {
    console.error('Clear chat error:', error);
    return c.json({ error: 'Failed to clear chat session' }, 500);
  }
});

// Get articles endpoint
app.get('/api/articles', async (c) => {
  try {
    const articles = await getArticles(c.env);
    return c.json(articles);
  } catch (error) {
    console.error('Get articles error:', error);
    return c.json({ error: 'Failed to get articles' }, 500);
  }
});

// Seed embeddings endpoint (for initial setup)
app.post('/api/seed-embeddings', async (c) => {
  try {
    await seedEmbeddings(c.env);
    return c.json({ success: true, message: 'Embeddings generated successfully' });
  } catch (error) {
    console.error('Seed embeddings error:', error);
    return c.json({ error: 'Failed to generate embeddings' }, 500);
  }
});

export default app;
