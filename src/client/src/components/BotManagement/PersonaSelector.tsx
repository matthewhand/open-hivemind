import React, { useState, useMemo } from 'react';
import { Persona, PersonaCategory, DEFAULT_PERSONA } from '../../types/bot';
import { Card, Button, Input, Badge } from '../DaisyUI';
import {
  Search as SearchIcon,
  User as UserIcon,
  Plus as AddIcon,
  Filter as FilterIcon,
  XCircle as ClearIcon
} from 'lucide-react';
import PersonaChip from './PersonaChip';

interface PersonaSelectorProps {
  personas: Persona[];
  selectedPersonaId?: string;
  onPersonaSelect: (personaId: string) => void;
  onCreatePersona?: () => void;
  allowCreate?: boolean;
  showUsage?: boolean;
  placeholder?: string;
  size?: 'compact' | 'full';
}

const PersonaSelector: React.FC<PersonaSelectorProps> = ({
  personas,
  selectedPersonaId,
  onPersonaSelect,
  onCreatePersona,
  allowCreate = true,
  showUsage = false,
  placeholder = 'Select a persona...',
  size = 'full'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PersonaCategory | 'all'>('all');
  const [isExpanded, setIsExpanded] = useState(false);

  const categories: Array<{ value: PersonaCategory | 'all'; label: string; color: string }> = [
    { value: 'all', label: 'All Personas', color: 'neutral' },
    { value: 'general', label: 'General', color: 'neutral' },
    { value: 'customer_service', label: 'Customer Service', color: 'primary' },
    { value: 'creative', label: 'Creative', color: 'secondary' },
    { value: 'technical', label: 'Technical', color: 'accent' },
    { value: 'educational', label: 'Educational', color: 'info' },
    { value: 'entertainment', label: 'Entertainment', color: 'warning' },
    { value: 'professional', label: 'Professional', color: 'success' }
  ];

  const filteredPersonas = useMemo(() => {
    let filtered = personas;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(persona => persona.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(persona =>
        persona.name.toLowerCase().includes(query) ||
        persona.description.toLowerCase().includes(query) ||
        persona.traits.some(trait =>
          trait.name.toLowerCase().includes(query) ||
          trait.value.toLowerCase().includes(query)
        )
      );
    }

    return filtered;
  }, [personas, selectedCategory, searchQuery]);

  const selectedPersona = personas.find(p => p.id === selectedPersonaId) || DEFAULT_PERSONA;

  const handlePersonaClick = (personaId: string) => {
    onPersonaSelect(personaId);
    if (size === 'compact') {
      setIsExpanded(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
  };

  if (size === 'compact') {
    return (
      <div className="relative">
        {/* Compact selector button */}
        <div
          className={`
            flex items-center gap-2 p-3 border rounded-lg cursor-pointer
            bg-base-100 border-base-300 hover:bg-base-200 transition-colors
          `}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <UserIcon className="w-4 h-4 text-base-content/60" />
          <span className="flex-1 text-sm">
            {selectedPersona.name}
          </span>
          <div className="text-xs text-base-content/50">
            {filteredPersonas.length} available
          </div>
        </div>

        {/* Expanded dropdown */}
        {isExpanded && (
          <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto">
            <div className="p-4">
              {/* Search and filters */}
              <div className="flex gap-2 mb-3">
                <div className="flex-1 relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
                  <Input
                    placeholder="Search personas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    size="sm"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="px-2"
                >
                  <ClearIcon className="w-4 h-4" />
                </Button>
              </div>

              {/* Category filter */}
              <div className="flex flex-wrap gap-1 mb-3">
                {categories.map(category => (
                  <button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    className={`
                      px-2 py-1 text-xs rounded-full border transition-colors
                      ${selectedCategory === category.value
                        ? `bg-${category.color} text-${category.color}-content border-${category.color}`
                        : 'border-base-300 hover:bg-base-200'
                      }
                    `}
                  >
                    {category.label}
                  </button>
                ))}
              </div>

              {/* Persona list */}
              <div className="space-y-2">
                {filteredPersonas.length === 0 ? (
                  <div className="text-center py-4 text-base-content/50 text-sm">
                    No personas found
                  </div>
                ) : (
                  filteredPersonas.map(persona => (
                    <div
                      key={persona.id}
                      className={`
                        p-2 rounded-lg border cursor-pointer transition-colors
                        ${selectedPersonaId === persona.id
                          ? 'border-primary bg-primary/10'
                          : 'border-base-300 hover:bg-base-100'
                        }
                      `}
                      onClick={() => handlePersonaClick(persona.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`
                              w-2 h-2 rounded-full
                              bg-${categories.find(c => c.value === persona.category)?.color || 'neutral'}
                            `}
                          />
                          <span className="font-medium text-sm">{persona.name}</span>
                          {persona.isBuiltIn && (
                            <Badge variant="info" size="xs" variant="outline">
                              BUILTIN
                            </Badge>
                          )}
                        </div>
                        {showUsage && persona.usageCount > 0 && (
                          <Badge variant="neutral" size="xs" variant="ghost">
                            {persona.usageCount}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-base-content/60 mt-1">
                        {persona.description}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Create persona button */}
              {allowCreate && onCreatePersona && (
                <div className="mt-3 pt-3 border-t border-base-300">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCreatePersona}
                    className="w-full"
                  >
                    <AddIcon className="w-4 h-4 mr-2" />
                    Create New Persona
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    );
  }

  // Full size selector
  return (
    <Card className="bg-base-100 border border-base-300">
      <div className="card-body p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base-content">
            Select Persona
          </h3>
          {allowCreate && onCreatePersona && (
            <Button
              variant="primary"
              size="sm"
              onClick={onCreatePersona}
            >
              <AddIcon className="w-4 h-4 mr-2" />
              Create New
            </Button>
          )}
        </div>

        {/* Current selection */}
        {selectedPersonaId && (
          <div className="mb-4 p-3 bg-base-200/50 rounded-lg">
            <div className="text-xs text-base-content/60 mb-1">Currently selected:</div>
            <PersonaChip
              persona={selectedPersona}
              showUsage={showUsage}
              size="lg"
            />
          </div>
        )}

        {/* Search and filters */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
            <Input
              placeholder="Search personas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="ghost"
            onClick={clearFilters}
            className="px-3"
          >
            <FilterIcon className="w-4 h-4" />
          </Button>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map(category => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`
                px-3 py-1 text-sm rounded-full border transition-colors
                ${selectedCategory === category.value
                  ? `bg-${category.color} text-${category.color}-content border-${category.color}`
                  : 'border-base-300 hover:bg-base-200'
                }
              `}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* Persona grid */}
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {filteredPersonas.length === 0 ? (
            <div className="text-center py-8 text-base-content/50">
              <UserIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <div>No personas found</div>
              <div className="text-sm mt-1">Try adjusting your filters or create a new persona</div>
            </div>
          ) : (
            filteredPersonas.map(persona => (
              <div
                key={persona.id}
                className={`
                  p-4 rounded-lg border cursor-pointer transition-all
                  ${selectedPersonaId === persona.id
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-base-300 hover:bg-base-100 hover:shadow-sm'
                  }
                `}
                onClick={() => handlePersonaClick(persona.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={`
                          w-3 h-3 rounded-full
                          bg-${categories.find(c => c.value === persona.category)?.color || 'neutral'}
                        `}
                      />
                      <h4 className="font-semibold">{persona.name}</h4>
                      {persona.isBuiltIn && (
                        <Badge variant="info" size="xs" variant="outline">
                          BUILTIN
                        </Badge>
                      )}
                      {showUsage && persona.usageCount > 0 && (
                        <Badge variant="neutral" size="xs" variant="ghost">
                          {persona.usageCount} uses
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-base-content/70 mb-2">
                      {persona.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {persona.traits.slice(0, 3).map((trait, index) => (
                        <Badge
                          key={index}
                          color="ghost"
                          size="xs"
                          variant="outline"
                        >
                          {trait.name}: {trait.value}
                        </Badge>
                      ))}
                      {persona.traits.length > 3 && (
                        <Badge variant="ghost" size="xs" variant="outline">
                          +{persona.traits.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
};

export default PersonaSelector;