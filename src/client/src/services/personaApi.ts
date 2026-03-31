import { baseClient } from './baseClient';
import type { Persona } from './apiTypes';

export const personaApi = {
  getPersonas: async (): Promise<Persona[]> => {
    return baseClient.get<Persona[]>('/api/personas');
  },

  getPersona: async (id: string): Promise<Persona> => {
    return baseClient.get<Persona>(`/api/personas/${id}`);
  },

  createPersona: async (data: Omit<Persona, 'id' | 'createdAt' | 'updatedAt'>): Promise<Persona> => {
    return baseClient.post<Persona>('/api/personas', data);
  },

  updatePersona: async (id: string, data: Partial<Persona>): Promise<Persona> => {
    return baseClient.put<Persona>(`/api/personas/${id}`, data);
  },

  clonePersona: async (id: string, overrides?: Partial<Persona>): Promise<Persona> => {
    return baseClient.post<Persona>(`/api/personas/${id}/clone`, overrides);
  },

  deletePersona: async (id: string): Promise<{ success: boolean }> => {
    return baseClient.delete<{ success: boolean }>(`/api/personas/${id}`);
  }
};
