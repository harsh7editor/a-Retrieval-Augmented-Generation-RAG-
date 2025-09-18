import { useState, useEffect } from 'react';
import type { ChatMessage, ChatRequest, ChatResponse, ChatHistoryResponse, Article } from '@/shared/types';

export function useChat() {
  const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || '';
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Send a chat message
  const sendMessage = async (content: string): Promise<void> => {
    if (!content.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    // Add user message optimistically
    const userMessage: ChatMessage = {
      id: Date.now(),
      session_id: sessionId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const requestBody: ChatRequest = {
        message: content,
        session_id: sessionId || undefined,
      };

      const response = await fetch(`${apiBase}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data: ChatResponse = await response.json();
      
      // Update session ID if new
      if (!sessionId) {
        setSessionId(data.session_id);
      }

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: Date.now() + 1,
        session_id: data.session_id,
        role: 'assistant',
        content: data.message,
        sources: data.sources?.map(article => article.id),
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      // Remove the optimistic user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  // Load chat history
  const loadHistory = async (sessionId: string): Promise<void> => {
    try {
      const response = await fetch(`${apiBase}/api/chat/${sessionId}`);
      if (!response.ok) return;

      const data: ChatHistoryResponse = await response.json();
      setMessages(data.messages);
      setSessionId(data.session_id);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  // Clear chat session
  const clearChat = async (): Promise<void> => {
    if (!sessionId) return;

    try {
      await fetch(`${apiBase}/api/chat/${sessionId}`, {
        method: 'DELETE',
      });
      setMessages([]);
      setSessionId('');
    } catch (err) {
      console.error('Failed to clear chat:', err);
    }
  };

  return {
    messages,
    sessionId,
    isLoading,
    error,
    sendMessage,
    loadHistory,
    clearChat,
  };
}

export function useArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadArticles = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/articles`);
      if (response.ok) {
        const data = await response.json();
        setArticles(data);
      }
    } catch (err) {
      console.error('Failed to load articles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadArticles();
  }, []);

  return {
    articles,
    isLoading,
    loadArticles,
  };
}
