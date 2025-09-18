import OpenAI from 'openai';
import type { Article } from '@/shared/types';

// Simple cosine similarity function for vector comparison
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// Simple embedding function using OpenAI's text-embedding-3-small
export async function generateEmbedding(text: string, openai: OpenAI): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

// Find similar articles based on query embedding
export function findSimilarArticles(
  queryEmbedding: number[],
  articles: Article[],
  topK: number = 3
): { article: Article; score: number }[] {
  const similarities = articles
    .filter(article => article.embedding_vector)
    .map(article => {
      const embedding = JSON.parse(article.embedding_vector!);
      const score = cosineSimilarity(queryEmbedding, embedding);
      return { article, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return similarities;
}

// Generate RAG response using OpenAI
export async function generateRAGResponse(
  query: string,
  relevantArticles: Article[],
  openai: OpenAI
): Promise<string> {
  const context = relevantArticles
    .map(article => `Title: ${article.title}\nContent: ${article.content.substring(0, 1000)}...`)
    .join('\n\n');

  const messages = [
    {
      role: 'system' as const,
      content: `You are NewsBot, an AI assistant that helps users understand news and current events. You have access to a collection of news articles and should provide accurate, helpful responses based on the provided context. 

Guidelines:
- Use the provided news articles as your primary source of information
- If the question cannot be answered from the provided articles, say so clearly
- Provide specific details and quotes when relevant
- Be conversational but informative
- Always cite which articles you're referencing when possible`
    },
    {
      role: 'user' as const,
      content: `Based on the following news articles, please answer this question: ${query}

Relevant Articles:
${context}`
    }
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 800,
      temperature: 0.7,
    });

    return completion.choices[0].message.content || 'I apologize, but I was unable to generate a response.';
  } catch (error) {
    console.error('Error generating RAG response:', error);
    throw new Error('Failed to generate response');
  }
}
