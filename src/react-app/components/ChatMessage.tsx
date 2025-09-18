import { User, Bot } from 'lucide-react';
import type { ChatMessage } from '@/shared/types';

interface ChatMessageProps {
  message: ChatMessage;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 p-4 ${isUser ? 'bg-gray-50' : 'bg-white'}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'
      }`}>
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900">
            {isUser ? 'You' : 'NewsBot'}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(message.created_at).toLocaleTimeString()}
          </span>
        </div>
        
        <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
          {message.content}
        </div>
        
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 text-xs text-gray-600">
            <span className="font-medium">Sources:</span> {message.sources.length} article{message.sources.length > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
