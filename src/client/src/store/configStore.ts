import { create } from 'zustand';

export interface ConfigSource {
  type: 'env' | 'file' | 'default';
  key: string;
  value: string;
  source: string;
  isSensitive: boolean;
}

export interface ConfigValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface ConfigState {
  sources: ConfigSource[];
  validation: ConfigValidation;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string;
  environment: string;
  configFiles: string[];
  overrides: Record<string, string>;
}

interface ConfigActions {
  setConfigSources: (sources: ConfigSource[]) => void;
  setConfigValidation: (validation: ConfigValidation) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setEnvironment: (environment: string) => void;
  setConfigFiles: (files: string[]) => void;
  setOverrides: (overrides: Record<string, string>) => void;
  addConfigSource: (source: ConfigSource) => void;
  removeConfigSource: (payload: { key: string; type: ConfigSource['type'] }) => void;
  updateConfigValue: (payload: { key: string; value: string; type: ConfigSource['type'] }) => void;
  markAsSensitive: (payload: { key: string; type: ConfigSource['type']; isSensitive: boolean }) => void;
  addValidationError: (error: string) => void;
  addValidationWarning: (warning: string) => void;
  clearValidationErrors: () => void;
  clearValidationWarnings: () => void;
  setLastUpdated: () => void;
  setGuardsConfig: (config: Record<string, unknown>) => void;
}

export const useConfigStore = create<ConfigState & ConfigActions>((set, get) => ({
  sources: [],
  validation: { isValid: true, errors: [], warnings: [] },
  isLoading: false,
  error: null,
  lastUpdated: new Date().toISOString(),
  environment: 'development',
  configFiles: [],
  overrides: {},

  setConfigSources: (sources) => set({ sources, lastUpdated: new Date().toISOString() }),

  setConfigValidation: (validation) => set({ validation }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  setEnvironment: (environment) => set({ environment }),

  setConfigFiles: (configFiles) => set({ configFiles }),

  setOverrides: (overrides) => set({ overrides }),

  addConfigSource: (source) => {
    const sources = [...get().sources];
    const existingIndex = sources.findIndex(
      (s) => s.key === source.key && s.type === source.type,
    );
    if (existingIndex !== -1) {
      sources[existingIndex] = source;
    } else {
      sources.push(source);
    }
    set({ sources, lastUpdated: new Date().toISOString() });
  },

  removeConfigSource: ({ key, type }) => {
    set({
      sources: get().sources.filter((s) => !(s.key === key && s.type === type)),
      lastUpdated: new Date().toISOString(),
    });
  },

  updateConfigValue: ({ key, value, type }) => {
    const sources = get().sources.map((s) =>
      s.key === key && s.type === type ? { ...s, value } : s,
    );
    set({ sources, lastUpdated: new Date().toISOString() });
  },

  markAsSensitive: ({ key, type, isSensitive }) => {
    const sources = get().sources.map((s) =>
      s.key === key && s.type === type ? { ...s, isSensitive } : s,
    );
    set({ sources, lastUpdated: new Date().toISOString() });
  },

  addValidationError: (error) => {
    const validation = {
      ...get().validation,
      errors: [...get().validation.errors, error],
      isValid: false,
    };
    set({ validation });
  },

  addValidationWarning: (warning) => {
    const validation = {
      ...get().validation,
      warnings: [...get().validation.warnings, warning],
    };
    set({ validation });
  },

  clearValidationErrors: () => {
    const validation = {
      ...get().validation,
      errors: [],
      isValid: get().validation.warnings.length === 0,
    };
    set({ validation });
  },

  clearValidationWarnings: () => {
    const validation = {
      ...get().validation,
      warnings: [],
      isValid: get().validation.errors.length === 0,
    };
    set({ validation });
  },

  setLastUpdated: () => set({ lastUpdated: new Date().toISOString() }),

  setGuardsConfig: (config) => {
    set({
      overrides: { ...get().overrides, ...(config as Record<string, string>) },
      lastUpdated: new Date().toISOString(),
    });
  },
}));

// Selector helpers
export const selectConfig = (s: ConfigState) => s;
export const selectConfigSources = (s: ConfigState) => s.sources;
export const selectConfigValidation = (s: ConfigState) => s.validation;
export const selectConfigIsLoading = (s: ConfigState) => s.isLoading;
export const selectConfigError = (s: ConfigState) => s.error;
export const selectEnvironment = (s: ConfigState) => s.environment;
export const selectOverrides = (s: ConfigState) => s.overrides;
