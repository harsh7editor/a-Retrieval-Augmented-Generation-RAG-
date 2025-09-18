import OpenAI from 'openai';
import { generateEmbedding } from './rag';

// This script can be called to generate embeddings for articles that don't have them
export async function seedEmbeddings(env: Env): Promise<void> {
  const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });

  // Get articles without embeddings
  const stmt = env.DB.prepare('SELECT * FROM articles WHERE embedding_vector IS NULL');
  const result = await stmt.all();
  const articles = result.results;

  console.log(`Found ${articles.length} articles without embeddings`);

  for (const article of articles) {
    try {
      console.log(`Generating embedding for: ${article.title}`);
      
      // Create text for embedding (title + content excerpt)
      const textForEmbedding = `${article.title}\n\n${article.content}`;
      
      // Generate embedding
      const embedding = await generateEmbedding(textForEmbedding, openai);
      
      // Update article with embedding
      const updateStmt = env.DB.prepare('UPDATE articles SET embedding_vector = ? WHERE id = ?');
      await updateStmt.bind(JSON.stringify(embedding), article.id).run();
      
      console.log(`✓ Generated embedding for article ${article.id}`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`Failed to generate embedding for article ${article.id}:`, error);
    }
  }
  
  console.log('Embedding generation complete!');
}
