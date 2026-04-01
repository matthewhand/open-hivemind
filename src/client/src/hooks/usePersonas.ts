import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import {
  BUILTIN_PERSONAS,
  type CreatePersonaRequest,
  type Persona,
  type PersonaCategory,
  type UpdatePersonaRequest,
} from '../types';
import { apiService } from '../services/api';
import Debug from 'debug';
const debug = Debug('app:client:hooks:usePersonas');

interface UsePersonasReturn {
  personas: Persona[];
  loading: boolean;
  error: string | null;
  createPersona: (request: CreatePersonaRequest) => Persona;
  updatePersona: (id: string, request: UpdatePersonaRequest) => Persona | null;
  deletePersona: (id: string) => boolean;
  getPersonaById: (id: string) => Persona | null;
  getPersonasByCategory: (category: PersonaCategory) => Persona[];
  duplicatePersona: (id: string, newName: string) => Persona | null;
  assignPersonaToBot: (botId: string, personaId: string) => void;
  clearError: () => void;
  searchPersonas: (query: string) => Persona[];
}

export const usePersonas = (): UsePersonasReturn => {
  const [localPersonas, setLocalPersonas] = useState<Persona[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  const {
    data: fetchedPersonas,
    isLoading: loading,
    error: queryError,
    refetch: _refetch,
  } = useQuery<Persona[]>({
    queryKey: ['personas'],
    queryFn: async () => {
      const data = await apiService.get<any>('/api/personas');
      const next = Array.isArray(data) ? data : [];
      return next.length > 0 ? next : [...BUILTIN_PERSONAS];
    },
    initialData: [...BUILTIN_PERSONAS],
  });

  // Merge fetched personas with any locally-created ones
  const personas = localPersonas.length > 0
    ? [...fetchedPersonas, ...localPersonas]
    : fetchedPersonas;

  const error = localError || (queryError instanceof Error ? queryError.message : null);

  const clearError = useCallback(() => {
    setLocalError(null);
  }, []);

  const createPersona = useCallback((request: CreatePersonaRequest): Persona => {
    try {
      setLocalError(null);

      const newPersona: Persona = {
        id: `persona-${Date.now()}-${uuidv4()}`,
        ...request,
        isBuiltIn: false,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setLocalPersonas((prev) => [...prev, newPersona]);
      return newPersona;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create persona';
      setLocalError(errorMessage);
      throw err;
    }
  }, []);

  const updatePersona = useCallback((id: string, request: UpdatePersonaRequest): Persona | null => {
    try {
      setLocalError(null);

      setLocalPersonas((prev) =>
        prev.map((persona) => {
          if (persona.id === id) {
            if (persona.isBuiltIn && (request.name || request.category)) {
              throw new Error('Cannot modify name or category of built-in personas');
            }

            return {
              ...persona,
              ...request,
              updatedAt: new Date().toISOString(),
            };
          }
          return persona;
        })
      );

      return getPersonaById(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update persona';
      setLocalError(errorMessage);
      return null;
    }
  }, []);

  const deletePersona = useCallback((id: string): boolean => {
    try {
      setLocalError(null);

      const persona = getPersonaById(id);
      if (!persona) {
        throw new Error('Persona not found');
      }

      if (persona.isBuiltIn) {
        throw new Error('Cannot delete built-in personas');
      }

      setLocalPersonas((prev) => prev.filter((p) => p.id !== id));
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete persona';
      setLocalError(errorMessage);
      return false;
    }
  }, []);

  const getPersonaById = useCallback(
    (id: string): Persona | null => {
      return personas.find((persona) => persona.id === id) || null;
    },
    [personas]
  );

  const getPersonasByCategory = useCallback(
    (category: PersonaCategory): Persona[] => {
      return personas.filter((persona) => persona.category === category);
    },
    [personas]
  );

  const duplicatePersona = useCallback(
    (id: string, newName: string): Persona | null => {
      try {
        const originalPersona = getPersonaById(id);
        if (!originalPersona) {
          throw new Error('Persona not found');
        }

        const duplicatedPersona: Persona = {
          ...originalPersona,
          id: `persona-${Date.now()}-${uuidv4()}`,
          name: newName,
          isBuiltIn: false,
          usageCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setLocalPersonas((prev) => [...prev, duplicatedPersona]);
        return duplicatedPersona;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to duplicate persona';
        setLocalError(errorMessage);
        return null;
      }
    },
    [getPersonaById]
  );

  const assignPersonaToBot = useCallback(
    (botId: string, personaId: string) => {
      try {
        const persona = getPersonaById(personaId);
        if (!persona) {
          throw new Error('Persona not found');
        }

        setLocalPersonas((prev) =>
          prev.map((p) => (p.id === personaId ? { ...p, usageCount: p.usageCount + 1 } : p))
        );

        debug(`Assigning persona "${persona.name}" to bot "${botId}"`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to assign persona to bot';
        setLocalError(errorMessage);
      }
    },
    [getPersonaById]
  );

  const searchPersonas = useCallback(
    (query: string): Persona[] => {
      if (!query.trim()) {
        return personas;
      }

      const lowercaseQuery = query.toLowerCase();
      return personas.filter(
        (persona) =>
          persona.name.toLowerCase().includes(lowercaseQuery) ||
          persona.description.toLowerCase().includes(lowercaseQuery) ||
          persona.category.toLowerCase().includes(lowercaseQuery) ||
          persona.traits.some(
            (trait) =>
              trait.name.toLowerCase().includes(lowercaseQuery) ||
              trait.value.toLowerCase().includes(lowercaseQuery)
          )
      );
    },
    [personas]
  );

  return {
    personas,
    loading,
    error,
    createPersona,
    updatePersona,
    deletePersona,
    getPersonaById,
    getPersonasByCategory,
    duplicatePersona,
    assignPersonaToBot,
    clearError,
    searchPersonas,
  };
};
