/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useState, useCallback, useEffect } from 'react';
import type {
  Persona,
  PersonaCategory,
  CreatePersonaRequest,
  UpdatePersonaRequest,
} from '../types/bot';
import {
  PersonaTrait,
  BUILTIN_PERSONAS,
  DEFAULT_PERSONA,
} from '../types/bot';

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
  const [personas, setPersonas] = useState<Persona[]>([...BUILTIN_PERSONAS]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchPersonas = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/personas');
        if (!response.ok) {
          throw new Error('Failed to fetch personas');
        }
        const data = await response.json();
        const next = Array.isArray(data) ? data : [];
        if (isMounted && next.length > 0) {
          setPersonas(next);
        }
      } catch {
        // Keep built-in personas as fallback
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPersonas();
    return () => {
      isMounted = false;
    };
  }, []);

  const createPersona = useCallback((request: CreatePersonaRequest): Persona => {
    try {
      setLoading(true);
      setError(null);

      const newPersona: Persona = {
        id: `persona-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...request,
        isBuiltIn: false,
        createdAt: new Date().toISOString(),
        usageCount: 0,
      };

      setPersonas(prev => [...prev, newPersona]);
      setLoading(false);
      return newPersona;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create persona';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  }, []);

  const updatePersona = useCallback((id: string, request: UpdatePersonaRequest): Persona | null => {
    try {
      setLoading(true);
      setError(null);

      setPersonas(prev => prev.map(persona => {
        if (persona.id === id) {
          // Don't allow editing built-in personas' core identity
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
      }));

      setLoading(false);
      return getPersonaById(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update persona';
      setError(errorMessage);
      setLoading(false);
      return null;
    }
  }, []);

  const deletePersona = useCallback((id: string): boolean => {
    try {
      setLoading(true);
      setError(null);

      const persona = getPersonaById(id);
      if (!persona) {
        throw new Error('Persona not found');
      }

      if (persona.isBuiltIn) {
        throw new Error('Cannot delete built-in personas');
      }

      setPersonas(prev => prev.filter(p => p.id !== id));
      setLoading(false);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete persona';
      setError(errorMessage);
      setLoading(false);
      return false;
    }
  }, []);

  const getPersonaById = useCallback((id: string): Persona | null => {
    return personas.find(persona => persona.id === id) || null;
  }, [personas]);

  const getPersonasByCategory = useCallback((category: PersonaCategory): Persona[] => {
    return personas.filter(persona => persona.category === category);
  }, [personas]);

  const duplicatePersona = useCallback((id: string, newName: string): Persona | null => {
    try {
      const originalPersona = getPersonaById(id);
      if (!originalPersona) {
        throw new Error('Persona not found');
      }

      const duplicatedPersona: Persona = {
        ...originalPersona,
        id: `persona-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: newName,
        isBuiltIn: false,
        createdAt: new Date().toISOString(),
        usageCount: 0,
      };

      setPersonas(prev => [...prev, duplicatedPersona]);
      return duplicatedPersona;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to duplicate persona';
      setError(errorMessage);
      return null;
    }
  }, [getPersonaById]);

  const assignPersonaToBot = useCallback((botId: string, personaId: string) => {
    try {
      const persona = getPersonaById(personaId);
      if (!persona) {
        throw new Error('Persona not found');
      }

      // Increment usage count
      setPersonas(prev => prev.map(p =>
        p.id === personaId
          ? { ...p, usageCount: p.usageCount + 1 }
          : p,
      ));

      // In a real implementation, this would make an API call to update the bot
      console.log(`Assigning persona "${persona.name}" to bot "${botId}"`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign persona to bot';
      setError(errorMessage);
    }
  }, [getPersonaById]);

  const searchPersonas = useCallback((query: string): Persona[] => {
    if (!query.trim()) {
      return personas;
    }

    const lowercaseQuery = query.toLowerCase();
    return personas.filter(persona =>
      persona.name.toLowerCase().includes(lowercaseQuery) ||
      persona.description.toLowerCase().includes(lowercaseQuery) ||
      persona.category.toLowerCase().includes(lowercaseQuery) ||
      persona.traits.some(trait =>
        trait.name.toLowerCase().includes(lowercaseQuery) ||
        trait.value.toLowerCase().includes(lowercaseQuery),
      ),
    );
  }, [personas]);

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
