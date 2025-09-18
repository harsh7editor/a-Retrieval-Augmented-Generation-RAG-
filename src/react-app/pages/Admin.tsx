import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import AdminPanel from '@/react-app/components/AdminPanel';

export default function Admin() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Chat
          </Link>
        </div>
        <AdminPanel />
      </div>
    </div>
  );
}
