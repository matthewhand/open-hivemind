import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface ConfigSource {
  type: 'env' | 'file' | 'default';
  key: string;
  value: string;
  source: string;
  isSensitive: boolean;
}

interface ConfigValidation {
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

const initialState: ConfigState = {
  sources: [],
  validation: { isValid: true, errors: [], warnings: [] },
  isLoading: false,
  error: null,
  lastUpdated: new Date().toISOString(),
  environment: 'development',
  configFiles: [],
  overrides: {},
};

const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    setConfigSources: (state, action: PayloadAction<ConfigSource[]>) => {
      state.sources = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    setConfigValidation: (state, action: PayloadAction<ConfigValidation>) => {
      state.validation = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    setEnvironment: (state, action: PayloadAction<string>) => {
      state.environment = action.payload;
    },
    setConfigFiles: (state, action: PayloadAction<string[]>) => {
      state.configFiles = action.payload;
    },
    setOverrides: (state, action: PayloadAction<Record<string, string>>) => {
      state.overrides = action.payload;
    },
    addConfigSource: (state, action: PayloadAction<ConfigSource>) => {
      const existingIndex = state.sources.findIndex(
        source => source.key === action.payload.key && source.type === action.payload.type
      );
      if (existingIndex !== -1) {
        state.sources[existingIndex] = action.payload;
      } else {
        state.sources.push(action.payload);
      }
      state.lastUpdated = new Date().toISOString();
    },
    removeConfigSource: (state, action: PayloadAction<{ key: string; type: ConfigSource['type'] }>) => {
      state.sources = state.sources.filter(
        source => !(source.key === action.payload.key && source.type === action.payload.type)
      );
      state.lastUpdated = new Date().toISOString();
    },
    updateConfigValue: (state, action: PayloadAction<{ key: string; value: string; type: ConfigSource['type'] }>) => {
      const { key, value, type } = action.payload;
      const source = state.sources.find(s => s.key === key && s.type === type);
      if (source) {
        source.value = value;
        state.lastUpdated = new Date().toISOString();
      }
    },
    markAsSensitive: (state, action: PayloadAction<{ key: string; type: ConfigSource['type']; isSensitive: boolean }>) => {
      const { key, type, isSensitive } = action.payload;
      const source = state.sources.find(s => s.key === key && s.type === type);
      if (source) {
        source.isSensitive = isSensitive;
        state.lastUpdated = new Date().toISOString();
      }
    },
    addValidationError: (state, action: PayloadAction<string>) => {
      state.validation.errors.push(action.payload);
      state.validation.isValid = false;
    },
    addValidationWarning: (state, action: PayloadAction<string>) => {
      state.validation.warnings.push(action.payload);
    },
    clearValidationErrors: (state) => {
      state.validation.errors = [];
      state.validation.isValid = state.validation.warnings.length === 0;
    },
    clearValidationWarnings: (state) => {
      state.validation.warnings = [];
      state.validation.isValid = state.validation.errors.length === 0;
    },
    setLastUpdated: (state) => {
      state.lastUpdated = new Date().toISOString();
    },
    setGuardsConfig: (state, action: PayloadAction<Record<string, unknown>>) => {
      state.overrides = { ...state.overrides, ...action.payload };
      state.lastUpdated = new Date().toISOString();
    },
  },
});

export const {
  setConfigSources,
  setConfigValidation,
  setLoading,
  setError,
  setEnvironment,
  setConfigFiles,
  setOverrides,
  addConfigSource,
  removeConfigSource,
  updateConfigValue,
  markAsSensitive,
  addValidationError,
  addValidationWarning,
  clearValidationErrors,
  clearValidationWarnings,
  setLastUpdated,
  setGuardsConfig,
} = configSlice.actions;

export default configSlice.reducer;

// Selectors
export const selectConfig = (state: { config: ConfigState }) => state.config;
export const selectConfigSources = (state: { config: ConfigState }) => state.config.sources;
export const selectConfigValidation = (state: { config: ConfigState }) => state.config.validation;
export const selectIsLoading = (state: { config: ConfigState }) => state.config.isLoading;
export const selectConfigError = (state: { config: ConfigState }) => state.config.error;
export const selectEnvironment = (state: { config: ConfigState }) => state.config.environment;
export const selectConfigFiles = (state: { config: ConfigState }) => state.config.configFiles;
export const selectOverrides = (state: { config: ConfigState }) => state.config.overrides;
export const selectLastUpdated = (state: { config: ConfigState }) => state.config.lastUpdated;

// Computed selectors
export const selectEnvVars = (state: { config: ConfigState }) =>
  state.config.sources.filter(source => source.type === 'env');

export const selectFileConfigs = (state: { config: ConfigState }) =>
  state.config.sources.filter(source => source.type === 'file');

export const selectDefaultConfigs = (state: { config: ConfigState }) =>
  state.config.sources.filter(source => source.type === 'default');

export const selectSensitiveConfigs = (state: { config: ConfigState }) =>
  state.config.sources.filter(source => source.isSensitive);

export const selectConfigByKey = (key: string) => (state: { config: ConfigState }) =>
  state.config.sources.find(source => source.key === key);

export const selectConfigByType = (type: ConfigSource['type']) => (state: { config: ConfigState }) =>
  state.config.sources.filter(source => source.type === type);

export const selectConfigSummary = (state: { config: ConfigState }) => ({
  totalSources: state.config.sources.length,
  envVars: state.config.sources.filter(s => s.type === 'env').length,
  fileConfigs: state.config.sources.filter(s => s.type === 'file').length,
  defaults: state.config.sources.filter(s => s.type === 'default').length,
  sensitive: state.config.sources.filter(s => s.isSensitive).length,
  errors: state.config.validation.errors.length,
  warnings: state.config.validation.warnings.length,
  isValid: state.config.validation.isValid,
});