import { useState } from 'react';
import { useArticles } from '@/react-app/hooks/useChat';
import { Database, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

export default function AdminPanel() {
  const { articles, loadArticles } = useArticles();
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedingResult, setSeedingResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSeedEmbeddings = async () => {
    setIsSeeding(true);
    setSeedingResult(null);

    try {
      const response = await fetch('/api/seed-embeddings', {
        method: 'POST',
      });

      const result = await response.json();
      
      if (response.ok) {
        setSeedingResult({ success: true, message: result.message });
        loadArticles(); // Refresh articles list
      } else {
        setSeedingResult({ success: false, message: result.error || 'Failed to generate embeddings' });
      }
    } catch (error) {
      setSeedingResult({ success: false, message: 'Network error occurred' });
    } finally {
      setIsSeeding(false);
    }
  };

  const articlesWithEmbeddings = articles.filter(article => article.embedding_vector);
  const articlesWithoutEmbeddings = articles.filter(article => !article.embedding_vector);

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Database className="w-6 h-6 text-blue-500" />
        <h2 className="text-2xl font-bold text-gray-900">NewsBot Admin Panel</h2>
      </div>

      {/* Articles Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{articles.length}</div>
          <div className="text-sm text-blue-700">Total Articles</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{articlesWithEmbeddings.length}</div>
          <div className="text-sm text-green-700">With Embeddings</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{articlesWithoutEmbeddings.length}</div>
          <div className="text-sm text-orange-700">Need Embeddings</div>
        </div>
      </div>

      {/* Seed Embeddings Section */}
      <div className="border rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-3">Generate Embeddings</h3>
        <p className="text-gray-600 mb-4">
          Generate AI embeddings for articles to enable semantic search and RAG functionality.
        </p>
        
        <button
          onClick={handleSeedEmbeddings}
          disabled={isSeeding || articlesWithoutEmbeddings.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSeeding ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Database className="w-4 h-4" />
          )}
          {isSeeding ? 'Generating...' : 'Generate Embeddings'}
        </button>

        {seedingResult && (
          <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${
            seedingResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {seedingResult.success ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {seedingResult.message}
          </div>
        )}
      </div>

      {/* Articles List */}
      <div className="border rounded-lg">
        <h3 className="text-lg font-semibold p-4 border-b">Articles</h3>
        <div className="max-h-96 overflow-y-auto">
          {articles.length === 0 ? (
            <div className="p-4 text-gray-500 text-center">No articles found</div>
          ) : (
            articles.map((article) => (
              <div key={article.id} className="p-4 border-b last:border-b-0 flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">{article.title}</h4>
                  <p className="text-sm text-gray-600 mb-2">{article.content.substring(0, 150)}...</p>
                  <div className="text-xs text-gray-500">
                    {article.source} • {new Date(article.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="ml-4">
                  {article.embedding_vector ? (
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <CheckCircle className="w-3 h-3" />
                      Embedded
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-orange-600 text-xs">
                      <AlertCircle className="w-3 h-3" />
                      No Embedding
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
