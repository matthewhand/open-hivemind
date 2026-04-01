import type { ApiService } from './core';
import type { Persona } from './types';

export function personasMixin(api: ApiService) {
  return {
    getPersonas(): Promise<Persona[]> {
      return api.request<Persona[]>('/api/personas');
    },

    getPersona(id: string): Promise<Persona> {
      return api.request<Persona>(`/api/personas/${id}`);
    },

    createPersona(data: Omit<Persona, 'id' | 'createdAt' | 'updatedAt'>): Promise<Persona> {
      return api.request<Persona>('/api/personas', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    updatePersona(id: string, data: Partial<Persona>): Promise<Persona> {
      return api.request<Persona>(`/api/personas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    clonePersona(id: string, overrides?: Partial<Persona>): Promise<Persona> {
      return api.request<Persona>(`/api/personas/${id}/clone`, {
        method: 'POST',
        body: JSON.stringify(overrides),
      });
    },

    deletePersona(id: string): Promise<{ success: boolean }> {
      return api.request<{ success: boolean }>(`/api/personas/${id}`, {
        method: 'DELETE',
      });
    },
  };
}
