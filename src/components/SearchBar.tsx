import { useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface SearchBarProps {
  onSearch: (value: string) => void;
  onAIResults?: (results: any) => void;
  placeholder?: string;
  enableAI?: boolean;
}

export function SearchBar({ onSearch, onAIResults, placeholder = "Search...", enableAI = false }: SearchBarProps) {
  const [value, setValue] = useState('');
  const [isAISearching, setIsAISearching] = useState(false);
  const aiSearch = useAction(api.products.aiSearch);

  const handleAISearch = async () => {
    if (!value.trim() || !enableAI || !onAIResults) return;
    
    setIsAISearching(true);
    try {
      const results = await aiSearch({
        query: value.trim(),
        language: /[áéíóúñü]/.test(value) ? 'es' : 'en',
        limit: 20
      });
      onAIResults(results);
    } catch (error) {
      console.error('AI search failed:', error);
    } finally {
      setIsAISearching(false);
    }
  };
  return (
    <div className="relative max-w-2xl mx-auto">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg
          className="h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onSearch(e.target.value);
        }}
        placeholder={placeholder}
        className={`block w-full pl-10 ${enableAI ? 'pr-16' : 'pr-3'} py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}
      />
      {enableAI && (
        <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
          <button
            type="button"
            onClick={handleAISearch}
            disabled={isAISearching || !value.trim()}
            className="bg-orange-600 text-white px-2 py-1 rounded text-xs hover:bg-orange-700 disabled:opacity-50"
          >
            {isAISearching ? '...' : '🤖 AI'}
          </button>
        </div>
      )}
    </div>
  );
}
