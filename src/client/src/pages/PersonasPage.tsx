import React, { useState } from 'react';
import { usePersonas } from '../hooks/usePersonas';
import { Persona, PersonaCategory, PersonaModalState } from '../types/bot';
import { Card, Button, Badge, Input, Modal } from '../components/DaisyUI';
import {
  User as UserIcon,
  Plus as AddIcon,
  Edit as EditIcon,
  Trash2 as DeleteIcon,
  Copy as DuplicateIcon,
  Search as SearchIcon,
  Filter as FilterIcon,
  XCircle as ClearIcon,
  Download as ExportIcon,
  Upload as ImportIcon,
  Sparkles as SparklesIcon
} from 'lucide-react';
import { Breadcrumbs } from '../components/DaisyUI';
import PersonaChip from '../components/BotManagement/PersonaChip';
import PersonaConfigModal from '../components/ProviderConfiguration/PersonaConfigModal';

const PersonasPage: React.FC = () => {
  const {
    personas,
    loading,
    error,
    createPersona,
    updatePersona,
    deletePersona,
    duplicatePersona,
    clearError
  } = usePersonas();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PersonaCategory | 'all'>('all');
  const [modalState, setModalState] = useState<PersonaModalState>({
    isOpen: false,
    persona: undefined,
    isEdit: false
  });

  const breadcrumbItems = [
    { label: 'Home', href: '/uber' },
    { label: 'Personas', href: '/uber/personas', isActive: true }
  ];

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

  const filteredPersonas = personas.filter(persona => {
    const matchesCategory = selectedCategory === 'all' || persona.category === selectedCategory;
    const matchesSearch = !searchQuery.trim() ||
      persona.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      persona.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      persona.traits.some(trait =>
        trait.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trait.value.toLowerCase().includes(searchQuery.toLowerCase())
      );
    return matchesCategory && matchesSearch;
  });

  const openCreateModal = () => {
    setModalState({
      isOpen: true,
      persona: undefined,
      isEdit: false
    });
  };

  const openEditModal = (persona: Persona) => {
    setModalState({
      isOpen: true,
      persona,
      isEdit: true
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      persona: undefined,
      isEdit: false
    });
  };

  const handlePersonaSubmit = (personaData: any) => {
    try {
      if (modalState.isEdit && modalState.persona) {
        updatePersona(modalState.persona.id, personaData);
      } else {
        createPersona(personaData);
      }
      closeModal();
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const handleDuplicatePersona = (persona: Persona) => {
    const newName = `${persona.name} (Copy)`;
    duplicatePersona(persona.id, newName);
  };

  const handleDeletePersona = (persona: Persona) => {
    if (window.confirm(`Are you sure you want to delete the persona "${persona.name}"? This action cannot be undone.`)) {
      deletePersona(persona.id);
    }
  };

  const handleExportPersona = (persona: Persona) => {
    const dataStr = JSON.stringify(persona, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `${persona.name.toLowerCase().replace(/\s+/g, '-')}-persona.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
  };

  return (
    <div className="p-6">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mt-4 mb-8">
        <h1 className="text-4xl font-bold mb-2">Persona Management</h1>
        <p className="text-base-content/70">
          Create and manage AI personas for your bots with custom personalities and behaviors
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
          <button className="btn btn-sm btn-ghost ml-auto" onClick={clearError}>
            ✕
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-primary/5 border border-primary/20">
          <div className="card-body p-4 text-center">
            <div className="text-primary mb-2">
              <AddIcon className="w-8 h-8 mx-auto" />
            </div>
            <h3 className="font-semibold mb-1">Create Persona</h3>
            <p className="text-xs text-base-content/60 mb-3">
              Design a new AI personality
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={openCreateModal}
              className="w-full"
            >
              Create New
            </Button>
          </div>
        </Card>

        <Card className="bg-secondary/5 border border-secondary/20">
          <div className="card-body p-4 text-center">
            <div className="text-secondary mb-2">
              <UserIcon className="w-8 h-8 mx-auto" />
            </div>
            <h3 className="font-semibold mb-1">Built-in Personas</h3>
            <p className="text-xs text-base-content/60 mb-3">
              Ready-to-use AI personalities
            </p>
            <div className="text-lg font-bold text-secondary">
              {personas.filter(p => p.isBuiltIn).length}
            </div>
          </div>
        </Card>

        <Card className="bg-accent/5 border border-accent/20">
          <div className="card-body p-4 text-center">
            <div className="text-accent mb-2">
              <SparklesIcon className="w-8 h-8 mx-auto" />
            </div>
            <h3 className="font-semibold mb-1">Custom Personas</h3>
            <p className="text-xs text-base-content/60 mb-3">
              Your personalized AI personalities
            </p>
            <div className="text-lg font-bold text-accent">
              {personas.filter(p => !p.isBuiltIn).length}
            </div>
          </div>
        </Card>

        <Card className="bg-success/5 border border-success/20">
          <div className="card-body p-4 text-center">
            <div className="text-success mb-2">
              <DuplicateIcon className="w-8 h-8 mx-auto" />
            </div>
            <h3 className="font-semibold mb-1">Total Usage</h3>
            <p className="text-xs text-base-content/60 mb-3">
              Across all personas
            </p>
            <div className="text-lg font-bold text-success">
              {personas.reduce((sum, p) => sum + p.usageCount, 0)}
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-base-100 border border-base-300 mb-6">
        <div className="card-body p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
              <Input
                placeholder="Search personas by name, description, or traits..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="px-3"
              >
                <ClearIcon className="w-4 h-4 mr-2" />
                Clear
              </Button>
              <Button
                variant="primary"
                onClick={openCreateModal}
              >
                <AddIcon className="w-4 h-4 mr-2" />
                Create Persona
              </Button>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mt-4">
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
                <span className="ml-1 text-xs opacity-70">
                  ({category.value === 'all'
                    ? personas.length
                    : personas.filter(p => p.category === category.value).length})
                </span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Persona Grid */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="loading loading-spinner loading-lg"></div>
          </div>
        ) : filteredPersonas.length === 0 ? (
          <Card className="bg-base-100/50 border border-dashed border-base-300">
            <div className="card-body text-center py-12">
              <UserIcon className="w-16 h-16 mx-auto mb-4 text-base-content/30" />
              <h3 className="text-xl font-semibold mb-2">No personas found</h3>
              <p className="text-base-content/60 mb-6">
                {searchQuery || selectedCategory !== 'all'
                  ? 'Try adjusting your filters or search query'
                  : 'Get started by creating your first custom persona'
                }
              </p>
              <Button
                variant="primary"
                onClick={openCreateModal}
              >
                <AddIcon className="w-4 h-4 mr-2" />
                Create Your First Persona
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredPersonas.map(persona => (
              <Card key={persona.id} className="bg-base-100 shadow-lg border border-base-300 hover:shadow-xl transition-shadow duration-200">
                <div className="card-body">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full bg-${categories.find(c => c.value === persona.category)?.color || 'neutral'}`} />
                        <h3 className="font-semibold text-lg">{persona.name}</h3>
                        {persona.isBuiltIn && (
                          <Badge color="info" size="xs" variant="outline">
                            BUILTIN
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-base-content/70 mb-3">
                        {persona.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-base-content/50">
                        <span>Category: {categories.find(c => c.value === persona.category)?.label}</span>
                        {persona.usageCount > 0 && (
                          <>
                            <span>•</span>
                            <span>{persona.usageCount} uses</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Traits */}
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-base-content/80 mb-2">Key Traits</h4>
                    <div className="flex flex-wrap gap-1">
                      {persona.traits.slice(0, 4).map((trait, index) => (
                        <Badge
                          key={index}
                          color="ghost"
                          size="xs"
                          variant="outline"
                        >
                          {trait.name}: {trait.value}
                        </Badge>
                      ))}
                      {persona.traits.length > 4 && (
                        <Badge color="ghost" size="xs" variant="outline">
                          +{persona.traits.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* System Prompt Preview */}
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-base-content/80 mb-2">System Prompt</h4>
                    <div className="text-xs text-base-content/60 bg-base-200/30 p-2 rounded line-clamp-3">
                      {persona.systemPrompt}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="card-actions justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicatePersona(persona)}
                      title="Duplicate persona"
                    >
                      <DuplicateIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExportPersona(persona)}
                      title="Export persona"
                    >
                      <ExportIcon className="w-4 h-4" />
                    </Button>
                    {!persona.isBuiltIn && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(persona)}
                          title="Edit persona"
                        >
                          <EditIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePersona(persona)}
                          className="text-error hover:bg-error/10"
                          title="Delete persona"
                        >
                          <DeleteIcon className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Persona Configuration Modal */}
      <PersonaConfigModal
        modalState={modalState}
        onClose={closeModal}
        onSubmit={handlePersonaSubmit}
      />
    </div>
  );
};

export default PersonasPage;