import { useEffect, useRef } from 'react';
import { useChat } from '@/react-app/hooks/useChat';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { MessageSquare, Trash2, Settings } from 'lucide-react';
import { Link } from 'react-router';

export default function ChatContainer() {
  const { messages, isLoading, error, sendMessage, clearChat } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b shadow-sm">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-purple-500" />
          <h1 className="text-xl font-semibold text-gray-900">NewsBot</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Link
            to="/admin"
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Settings size={16} />
            Admin
          </Link>
          
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={16} />
              Clear Chat
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Welcome to NewsBot!
            </h2>
            <p className="text-gray-600 max-w-md">
              Ask me anything about the latest news. I'll search through our article database to provide you with accurate, up-to-date information.
            </p>
            <div className="mt-6 text-sm text-gray-500">
              Try asking: "What's happening in technology?" or "Tell me about recent politics"
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-red-700 text-sm">
          Error: {error}
        </div>
      )}

      {/* Input Area */}
      <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
    </div>
  );
}
