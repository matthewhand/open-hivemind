import React from 'react';
import { MagnifyingGlassIcon as SearchIcon } from '@heroicons/react/24/outline';
import Input from '../DaisyUI/Input';
import Select from '../DaisyUI/Select';

interface ToolFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  serverFilter: string;
  setServerFilter: (value: string) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  categories: string[];
  servers: Array<{ id: string; name: string }>;
}

export const ToolFilters: React.FC<ToolFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  categoryFilter,
  setCategoryFilter,
  serverFilter,
  setServerFilter,
  sortBy,
  setSortBy,
  categories,
  servers,
}) => {
  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <div className="form-control w-full md:w-auto md:flex-1 max-w-md">
        <div className="input-group">
          <div className="relative w-full">
            <Input
              type="text"
              placeholder="Search tools..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <SearchIcon className="w-5 h-5 absolute left-3 top-3 text-base-content/50" />
          </div>
        </div>
      </div>

      <Select
        className="select-bordered md:w-auto"
        value={categoryFilter}
        onChange={(e) => setCategoryFilter(e.target.value)}
      >
        <option value="all">All Categories</option>
        {categories.map(category => (
          <option key={category} value={category}>
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </option>
        ))}
      </Select>

      <Select
        className="select-bordered md:w-auto"
        value={serverFilter}
        onChange={(e) => setServerFilter(e.target.value)}
      >
        <option value="all">All Servers</option>
        {servers.map(server => (
          <option key={server.id} value={server.id}>
            {server.name}
          </option>
        ))}
      </Select>

      <Select
        className="select-bordered md:w-auto"
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
      >
        <option value="name">Sort: Name (A-Z)</option>
        <option value="usage">Sort: Usage Count</option>
        <option value="recent">Sort: Recently Used</option>
      </Select>
    </div>
  );
};
