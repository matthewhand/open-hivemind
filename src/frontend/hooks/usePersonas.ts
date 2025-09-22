import { useState, useEffect } from 'react';
import { getPersonas, Persona } from '../services/agentService';

export const usePersonas = () => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPersonas = async () => {
    try {
      setLoading(true);
      const personaData = await getPersonas();
      setPersonas(personaData);
    } catch {
      setError('Failed to fetch personas');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPersonas();
  }, []);

  return { personas, loading, error, refetch: fetchPersonas };
};
