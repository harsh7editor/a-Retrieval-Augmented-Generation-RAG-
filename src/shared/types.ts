import z from "zod";

// Article schema
export const ArticleSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string(),
  url: z.string().optional(),
  source: z.string().optional(),
  published_at: z.string().optional(),
  embedding_vector: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Article = z.infer<typeof ArticleSchema>;

// Chat message schema
export const ChatMessageSchema = z.object({
  id: z.number(),
  session_id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  sources: z.array(z.number()).optional(), // article IDs
  created_at: z.string(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// Chat session schema
export const ChatSessionSchema = z.object({
  id: z.number(),
  session_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ChatSession = z.infer<typeof ChatSessionSchema>;

// API request/response schemas
export const ChatRequestSchema = z.object({
  message: z.string().min(1),
  session_id: z.string().optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const ChatResponseSchema = z.object({
  message: z.string(),
  session_id: z.string(),
  sources: z.array(ArticleSchema).optional(),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export const ChatHistoryResponseSchema = z.object({
  messages: z.array(ChatMessageSchema),
  session_id: z.string(),
});

export type ChatHistoryResponse = z.infer<typeof ChatHistoryResponseSchema>;
