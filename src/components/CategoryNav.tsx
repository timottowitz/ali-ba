import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface CategoryNavProps {
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
}

export function CategoryNav({ selectedCategory, onCategorySelect }: CategoryNavProps) {
  const categories = useQuery(api.categories.list, {});

  if (!categories) {
    return (
      <div className="mb-6">
        <div className="flex space-x-4 overflow-x-auto pb-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-24 h-8 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex space-x-4 overflow-x-auto pb-2">
        <button
          onClick={() => onCategorySelect(null)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selectedCategory === null
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Categories
        </button>
        {categories.map((category) => (
          <button
            key={category._id}
            onClick={() => onCategorySelect(category._id)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === category._id
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {typeof category.name === 'string' ? category.name : category.name.en}
          </button>
        ))}
      </div>
    </div>
  );
}
