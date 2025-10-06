import React, { useState, useEffect } from 'react';
import { PersonaCategory } from '../../types/bot';
import type {
  Persona,
  PersonaTrait,
  CreatePersonaRequest,
  UpdatePersonaRequest,
  PersonaModalState
} from '../../types/bot';
import { Modal, Button, Input, Textarea, Select, Badge, Card } from '../DaisyUI';
import {
  User as UserIcon,
  Plus as AddIcon,
  X as RemoveIcon,
  Save as SaveIcon,
  Sparkles as SparklesIcon
} from 'lucide-react';

interface PersonaConfigModalProps {
  modalState: PersonaModalState;
  onClose: () => void;
  onSubmit: (personaData: CreatePersonaRequest | UpdatePersonaRequest) => void;
}

const TRAIT_TYPES = [
  { value: 'tone', label: 'Tone' },
  { value: 'style', label: 'Style' },
  { value: 'behavior', label: 'Behavior' },
  { value: 'knowledge', label: 'Knowledge' },
  { value: 'personality', label: 'Personality' }
] as const;

const CATEGORIES: Array<{ value: PersonaCategory; label: string; description: string }> = [
  { value: 'general', label: 'General', description: 'General purpose assistants' },
  { value: 'customer_service', label: 'Customer Service', description: 'Customer support personas' },
  { value: 'creative', label: 'Creative', description: 'Creative and artistic personas' },
  { value: 'technical', label: 'Technical', description: 'Technical and scientific personas' },
  { value: 'educational', label: 'Educational', description: 'Teaching and learning personas' },
  { value: 'entertainment', label: 'Entertainment', description: 'Entertainment and gaming personas' },
  { value: 'professional', label: 'Professional', description: 'Business and professional personas' }
];

const PersonaConfigModal: React.FC<PersonaConfigModalProps> = ({
  modalState,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    category: 'general' as PersonaCategory,
    traits: [] as PersonaTrait[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (modalState.persona) {
      setFormData({
        name: modalState.persona.name,
        description: modalState.persona.description,
        systemPrompt: modalState.persona.systemPrompt,
        category: modalState.persona.category,
        traits: [...modalState.persona.traits]
      });
    } else {
      // Reset form for new persona
      setFormData({
        name: '',
        description: '',
        systemPrompt: '',
        category: 'general',
        traits: [
          { name: 'Tone', value: 'Friendly', type: 'tone' },
          { name: 'Style', value: 'Professional', type: 'style' }
        ]
      });
    }
    setErrors({});
  }, [modalState.isOpen, modalState.persona]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Persona name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.systemPrompt.trim()) {
      newErrors.systemPrompt = 'System prompt is required';
    }

    if (formData.traits.length === 0) {
      newErrors.traits = 'At least one trait is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    const submitData = modalState.isEdit
      ? {
          name: formData.name,
          description: formData.description,
          systemPrompt: formData.systemPrompt,
          category: formData.category,
          traits: formData.traits
        } as UpdatePersonaRequest
      : {
          name: formData.name,
          description: formData.description,
          systemPrompt: formData.systemPrompt,
          category: formData.category,
          traits: formData.traits
        } as CreatePersonaRequest;

    onSubmit(submitData);
  };

  const addTrait = () => {
    setFormData(prev => ({
      ...prev,
      traits: [...prev.traits, { name: '', value: '', type: 'tone' }]
    }));
  };

  const updateTrait = (index: number, field: keyof PersonaTrait, value: string) => {
    setFormData(prev => ({
      ...prev,
      traits: prev.traits.map((trait, i) =>
        i === index ? { ...trait, [field]: value } : trait
      )
    }));
  };

  const removeTrait = (index: number) => {
    setFormData(prev => ({
      ...prev,
      traits: prev.traits.filter((_, i) => i !== index)
    }));
  };

  const generateSystemPrompt = () => {
    const traitsDescription = formData.traits
      .filter(trait => trait.name && trait.value)
      .map(trait => `${trait.name}: ${trait.value}`)
      .join(', ');

    const basePrompt = `You are ${formData.name || 'an AI assistant'}. ${formData.description || ''}.`
      .trim();

    const traitsPrompt = traitsDescription
      ? ` Your characteristics include: ${traitsDescription}.`
      : '';

    const fullPrompt = `${basePrompt}${traitsPrompt} Be consistent with these traits in your responses.`;

    setFormData(prev => ({
      ...prev,
      systemPrompt: fullPrompt
    }));
  };

  return (
    <Modal
      isOpen={modalState.isOpen}
      onClose={onClose}
      size="large"
      className="max-w-4xl"
    >
      <Modal.Header>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <Modal.Title>
              {modalState.isEdit ? 'Edit Persona' : 'Create New Persona'}
            </Modal.Title>
            <div className="text-sm text-base-content/60">
              {modalState.isEdit
                ? 'Modify persona settings and characteristics'
                : 'Design a new persona with custom traits and behaviors'
              }
            </div>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="space-y-6">
        {/* Basic Information */}
        <Card className="bg-base-100 border border-base-300">
          <div className="card-body p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              Basic Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Persona Name *
                </label>
                <Input
                  placeholder="e.g., Creative Writer, Technical Support"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  error={errors.name}
                  disabled={modalState.isEdit && modalState.persona?.isBuiltIn}
                />
                {modalState.isEdit && modalState.persona?.isBuiltIn && (
                  <div className="text-xs text-info mt-1">
                    Built-in persona names cannot be changed
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Category *
                </label>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    category: e.target.value as PersonaCategory
                  }))}
                  disabled={modalState.isEdit && modalState.persona?.isBuiltIn}
                  className="w-full"
                >
                  {CATEGORIES.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label} - {category.description}
                    </option>
                  ))}
                </Select>
                {modalState.isEdit && modalState.persona?.isBuiltIn && (
                  <div className="text-xs text-info mt-1">
                    Built-in persona categories cannot be changed
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">
                Description *
              </label>
              <Input
                placeholder="Brief description of this persona's purpose and characteristics"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                error={errors.description}
              />
            </div>
          </div>
        </Card>

        {/* System Prompt */}
        <Card className="bg-base-100 border border-base-300">
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <SparklesIcon className="w-4 h-4" />
                System Prompt *
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={generateSystemPrompt}
                className="text-xs"
              >
                <SparklesIcon className="w-3 h-3 mr-1" />
                Generate from Traits
              </Button>
            </div>

            <Textarea
              placeholder="Enter the system prompt that defines this persona's behavior and responses..."
              value={formData.systemPrompt}
              onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
              error={errors.systemPrompt}
              rows={6}
              className="font-mono text-sm"
            />
            <div className="text-xs text-base-content/50 mt-1">
              This prompt will be used to instruct the AI model on how to behave as this persona.
            </div>
          </div>
        </Card>

        {/* Traits */}
        <Card className="bg-base-100 border border-base-300">
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                Personality Traits *
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={addTrait}
                className="text-xs"
              >
                <AddIcon className="w-3 h-3 mr-1" />
                Add Trait
              </Button>
            </div>

            {errors.traits && (
              <div className="text-error text-sm mb-3">{errors.traits}</div>
            )}

            <div className="space-y-3">
              {formData.traits.map((trait, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-base-200/30 rounded-lg">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium mb-1">Type</label>
                      <Select
                        value={trait.type}
                        onChange={(e) => updateTrait(index, 'type', e.target.value)}
                        className="text-sm"
                      >
                        {TRAIT_TYPES.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1">Name</label>
                      <Input
                        placeholder="e.g., Tone, Style"
                        value={trait.name}
                        onChange={(e) => updateTrait(index, 'name', e.target.value)}
                        className="text-sm"
                      />
                    </div>

                    <div className="relative">
                      <label className="block text-xs font-medium mb-1">Value</label>
                      <Input
                        placeholder="e.g., Friendly, Professional"
                        value={trait.value}
                        onChange={(e) => updateTrait(index, 'value', e.target.value)}
                        className="text-sm pr-8"
                      />
                      {formData.traits.length > 1 && (
                        <button
                          onClick={() => removeTrait(index)}
                          className="absolute right-2 top-8 w-4 h-4 rounded-full bg-error/20 hover:bg-error/30 flex items-center justify-center"
                        >
                          <RemoveIcon className="w-3 h-3 text-error" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {formData.traits.length === 0 && (
                <div className="text-center py-6 text-base-content/50">
                  <UserIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <div className="text-sm">No traits defined yet</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addTrait}
                    className="mt-2"
                  >
                    <AddIcon className="w-4 h-4 mr-1" />
                    Add First Trait
                  </Button>
                </div>
              )}
            </div>

            <div className="text-xs text-base-content/50 mt-3">
              Traits define specific characteristics that make this persona unique and consistent.
            </div>
          </div>
        </Card>

        {/* Preview */}
        {formData.name && formData.description && (
          <Card className="bg-secondary/5 border border-secondary/20">
            <div className="card-body p-4">
              <h3 className="font-semibold mb-3">Persona Preview</h3>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-4 h-4 text-secondary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{formData.name}</div>
                  <div className="text-sm text-base-content/70 mb-2">
                    {formData.description}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge color="secondary" size="xs" variant="outline">
                      {CATEGORIES.find(c => c.value === formData.category)?.label}
                    </Badge>
                    {formData.traits
                      .filter(trait => trait.name && trait.value)
                      .slice(0, 3)
                      .map((trait, index) => (
                        <Badge key={index} color="ghost" size="xs" variant="outline">
                          {trait.name}: {trait.value}
                        </Badge>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </Modal.Body>

      <Modal.Actions>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit}>
          <SaveIcon className="w-4 h-4 mr-2" />
          {modalState.isEdit ? 'Update Persona' : 'Create Persona'}
        </Button>
      </Modal.Actions>
    </Modal>
  );
};

export default PersonaConfigModal;
