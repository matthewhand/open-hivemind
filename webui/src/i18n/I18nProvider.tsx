import React, { createContext, useState, useEffect } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectUser } from '../store/slices/authSlice';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid
} from '@mui/material';
import { 
  Language as LanguageIcon,
  Public as GlobeIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { AnimatedBox } from '../animations/AnimationComponents';

// Supported languages
export type SupportedLanguage = 
  | 'en' // English
  | 'es' // Spanish
  | 'fr' // French
  | 'de' // German
  | 'it' // Italian
  | 'pt' // Portuguese
  | 'ru' // Russian
  | 'zh' // Chinese (Simplified)
  | 'ja' // Japanese
  | 'ko' // Korean
  | 'ar' // Arabic
  | 'hi' // Hindi
  | 'nl' // Dutch
  | 'sv' // Swedish
  | 'pl' // Polish
  | 'tr' // Turkish
  | 'vi' // Vietnamese
  | 'th' // Thai
  | 'he' // Hebrew
  | 'fa'; // Persian

export interface Translation {
  [key: string]: string | Translation;
}

export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  direction: 'ltr' | 'rtl';
  locale: string;
  isActive: boolean;
  completion: number;
  translators: string[];
  lastUpdated: Date;
}

export interface I18nConfig {
  defaultLanguage: SupportedLanguage;
  fallbackLanguage: SupportedLanguage;
  supportedLanguages: LanguageConfig[];
  autoDetect: boolean;
  persistPreference: boolean;
  interpolation: {
    prefix: string;
    suffix: string;
  };
  pluralization: boolean;
  dateTimeFormat: {
    date: Intl.DateTimeFormatOptions;
    time: Intl.DateTimeFormatOptions;
    dateTime: Intl.DateTimeFormatOptions;
  };
  numberFormat: Intl.NumberFormatOptions;
  currency: {
    code: string;
    symbol: string;
  };
}

export interface TranslationKey {
  key: string;
  value: string;
  context?: string;
  plural?: string;
  description?: string;
}

export interface TranslationContextType {
  // Current state
  currentLanguage: SupportedLanguage;
  currentLocale: string;
  isRTL: boolean;
  translations: Record<SupportedLanguage, Translation>;
  
  // Language management
  languages: LanguageConfig[];
  availableLanguages: LanguageConfig[];
  defaultLanguage: SupportedLanguage;
  fallbackLanguage: SupportedLanguage;
  
  // Translation functions
  t: (key: string, params?: Record<string, string | number>) => string;
  tPlural: (key: string, count: number, params?: Record<string, string | number>) => string;
  tContext: (key: string, context: string, params?: Record<string, string | number>) => string;
  
  // Formatting functions
  formatDate: (date: Date, format?: 'date' | 'time' | 'dateTime') => string;
  formatNumber: (number: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  formatRelativeTime: (date: Date) => string;
  
  // Language switching
  setLanguage: (language: SupportedLanguage) => Promise<void>;
  detectLanguage: () => SupportedLanguage;
  
  // Translation management
  addTranslation: (language: SupportedLanguage, key: string, value: string) => void;
  updateTranslation: (language: SupportedLanguage, key: string, value: string) => void;
  removeTranslation: (language: SupportedLanguage, key: string) => void;
  getMissingTranslations: (language: SupportedLanguage) => string[];
  
  // Bulk operations
  importTranslations: (language: SupportedLanguage, translations: Translation) => Promise<void>;
  exportTranslations: (language: SupportedLanguage) => Translation;
  
  // Quality assurance
  validateTranslations: (language: SupportedLanguage) => ValidationResult[];
  checkConsistency: () => ConsistencyIssue[];
  
  // Context and interpolation
  setContext: (context: Record<string, string>) => void;
  getContext: () => Record<string, string>;
  
  // Performance
  getPerformanceMetrics: () => PerformanceMetrics;
  clearCache: () => void;
}

export interface ValidationResult {
  key: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

export interface ConsistencyIssue {
  key: string;
  languages: SupportedLanguage[];
  issue: string;
  suggestion?: string;
}

export interface PerformanceMetrics {
  totalTranslations: number;
  cacheHitRate: number;
  averageLookupTime: number;
  memoryUsage: number;
  loadTime: number;
}

// Mock translations for demonstration
const mockTranslations: Partial<Record<SupportedLanguage, Translation>> = {
  en: {
    common: {
      welcome: 'Welcome to Open-Hivemind',
      dashboard: 'Dashboard',
      settings: 'Settings',
      logout: 'Logout',
      login: 'Login',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      update: 'Update',
      view: 'View',
      search: 'Search',
      filter: 'Filter',
      export: 'Export',
      import: 'Import',
      refresh: 'Refresh',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      warning: 'Warning',
      info: 'Information',
      confirm: 'Confirm',
      yes: 'Yes',
      no: 'No',
      ok: 'OK',
      close: 'Close',
      open: 'Open',
      closed: 'Closed',
      active: 'Active',
      inactive: 'Inactive',
      enabled: 'Enabled',
      disabled: 'Disabled',
      online: 'Online',
      offline: 'Offline',
      connected: 'Connected',
      disconnected: 'Disconnected',
    },
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Manage your bot network',
      bots: {
        title: 'Bot Management',
        total: 'Total Bots',
        active: 'Active Bots',
        inactive: 'Inactive Bots',
        status: 'Bot Status',
        health: 'Bot Health',
      },
      performance: {
        title: 'Performance Metrics',
        cpu: 'CPU Usage',
        memory: 'Memory Usage',
        network: 'Network Usage',
        disk: 'Disk Usage',
      },
      analytics: {
        title: 'Analytics',
        messages: 'Messages',
        users: 'Users',
        channels: 'Channels',
        commands: 'Commands',
      },
      recent_activity: 'Recent Activity',
      system_status: 'System Status',
    },
    bots: {
      title: 'Bot Management',
      create: 'Create Bot',
      edit: 'Edit Bot',
      delete: 'Delete Bot',
      name: 'Bot Name',
      type: 'Bot Type',
      status: 'Status',
      health: 'Health',
      last_seen: 'Last Seen',
      actions: 'Actions',
      configuration: 'Configuration',
      settings: 'Settings',
      logs: 'Logs',
      metrics: 'Metrics',
    },
    settings: {
      title: 'Settings',
      general: 'General Settings',
      appearance: 'Appearance',
      notifications: 'Notifications',
      security: 'Security',
      privacy: 'Privacy',
      language: 'Language',
      theme: 'Theme',
      save_changes: 'Save Changes',
      reset: 'Reset to Defaults',
    },
    errors: {
      unauthorized: 'You are not authorized to perform this action',
      not_found: 'The requested resource was not found',
      server_error: 'An internal server error occurred',
      network_error: 'Network error. Please check your connection',
      validation_error: 'Validation error. Please check your input',
      rate_limit: 'Too many requests. Please try again later',
    },
    time: {
      seconds: '{{count}} second',
      seconds_plural: '{{count}} seconds',
      minutes: '{{count}} minute',
      minutes_plural: '{{count}} minutes',
      hours: '{{count}} hour',
      hours_plural: '{{count}} hours',
      days: '{{count}} day',
      days_plural: '{{count}} days',
      weeks: '{{count}} week',
      weeks_plural: '{{count}} weeks',
      months: '{{count}} month',
      months_plural: '{{count}} months',
      years: '{{count}} year',
      years_plural: '{{count}} years',
    },
  },
  es: {
    common: {
      welcome: 'Bienvenido a Open-Hivemind',
      dashboard: 'Panel de Control',
      settings: 'Configuración',
      logout: 'Cerrar Sesión',
      login: 'Iniciar Sesión',
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      create: 'Crear',
      update: 'Actualizar',
      view: 'Ver',
      search: 'Buscar',
      filter: 'Filtrar',
      export: 'Exportar',
      import: 'Importar',
      refresh: 'Actualizar',
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
      warning: 'Advertencia',
      info: 'Información',
      confirm: 'Confirmar',
      yes: 'Sí',
      no: 'No',
      ok: 'OK',
      close: 'Cerrar',
      open: 'Abrir',
      closed: 'Cerrado',
      active: 'Activo',
      inactive: 'Inactivo',
      enabled: 'Habilitado',
      disabled: 'Deshabilitado',
      online: 'En Línea',
      offline: 'Fuera de Línea',
      connected: 'Conectado',
      disconnected: 'Desconectado',
    },
    dashboard: {
      title: 'Panel de Control',
      subtitle: 'Gestiona tu red de bots',
      bots: {
        title: 'Gestión de Bots',
        total: 'Total de Bots',
        active: 'Bots Activos',
        inactive: 'Bots Inactivos',
        status: 'Estado del Bot',
        health: 'Salud del Bot',
      },
      performance: {
        title: 'Métricas de Rendimiento',
        cpu: 'Uso de CPU',
        memory: 'Uso de Memoria',
        network: 'Uso de Red',
        disk: 'Uso de Disco',
      },
      analytics: {
        title: 'Análisis',
        messages: 'Mensajes',
        users: 'Usuarios',
        channels: 'Canales',
        commands: 'Comandos',
      },
      recent_activity: 'Actividad Reciente',
      system_status: 'Estado del Sistema',
    },
  },
  fr: {
    common: {
      welcome: 'Bienvenue sur Open-Hivemind',
      dashboard: 'Tableau de Bord',
      settings: 'Paramètres',
      logout: 'Déconnexion',
      login: 'Connexion',
      save: 'Sauvegarder',
      cancel: 'Annuler',
      delete: 'Supprimer',
      edit: 'Modifier',
      create: 'Créer',
      update: 'Mettre à Jour',
      view: 'Voir',
      search: 'Rechercher',
      filter: 'Filtrer',
      export: 'Exporter',
      import: 'Importer',
      refresh: 'Actualiser',
      loading: 'Chargement...',
      error: 'Erreur',
      success: 'Succès',
      warning: 'Avertissement',
      info: 'Information',
      confirm: 'Confirmer',
      yes: 'Oui',
      no: 'Non',
      ok: 'OK',
      close: 'Fermer',
      open: 'Ouvrir',
      closed: 'Fermé',
      active: 'Actif',
      inactive: 'Inactif',
      enabled: 'Activé',
      disabled: 'Désactivé',
      online: 'En Ligne',
      offline: 'Hors Ligne',
      connected: 'Connecté',
      disconnected: 'Déconnecté',
    },
  },
  de: {
    common: {
      welcome: 'Willkommen bei Open-Hivemind',
      dashboard: 'Dashboard',
      settings: 'Einstellungen',
      logout: 'Abmelden',
      login: 'Anmelden',
      save: 'Speichern',
      cancel: 'Abbrechen',
      delete: 'Löschen',
      edit: 'Bearbeiten',
      create: 'Erstellen',
      update: 'Aktualisieren',
      view: 'Anzeigen',
      search: 'Suchen',
      filter: 'Filtern',
      export: 'Exportieren',
      import: 'Importieren',
      refresh: 'Aktualisieren',
      loading: 'Laden...',
      error: 'Fehler',
      success: 'Erfolg',
      warning: 'Warnung',
      info: 'Information',
      confirm: 'Bestätigen',
      yes: 'Ja',
      no: 'Nein',
      ok: 'OK',
      close: 'Schließen',
      open: 'Öffnen',
      closed: 'Geschlossen',
      active: 'Aktiv',
      inactive: 'Inaktiv',
      enabled: 'Aktiviert',
      disabled: 'Deaktiviert',
      online: 'Online',
      offline: 'Offline',
      connected: 'Verbunden',
      disconnected: 'Getrennt',
    },
  },
  // Add more languages as needed...
};

const languageConfigs: LanguageConfig[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', direction: 'ltr', locale: 'en-US', isActive: true, completion: 100, translators: ['System'], lastUpdated: new Date() },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', direction: 'ltr', locale: 'es-ES', isActive: true, completion: 95, translators: ['Community'], lastUpdated: new Date() },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', direction: 'ltr', locale: 'fr-FR', isActive: true, completion: 90, translators: ['Community'], lastUpdated: new Date() },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', direction: 'ltr', locale: 'de-DE', isActive: true, completion: 85, translators: ['Community'], lastUpdated: new Date() },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', direction: 'ltr', locale: 'it-IT', isActive: true, completion: 80, translators: ['Community'], lastUpdated: new Date() },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', direction: 'ltr', locale: 'pt-PT', isActive: true, completion: 75, translators: ['Community'], lastUpdated: new Date() },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', direction: 'ltr', locale: 'ru-RU', isActive: true, completion: 70, translators: ['Community'], lastUpdated: new Date() },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '中文', flag: '🇨🇳', direction: 'ltr', locale: 'zh-CN', isActive: true, completion: 65, translators: ['Community'], lastUpdated: new Date() },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', direction: 'ltr', locale: 'ja-JP', isActive: true, completion: 60, translators: ['Community'], lastUpdated: new Date() },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', direction: 'ltr', locale: 'ko-KR', isActive: true, completion: 55, translators: ['Community'], lastUpdated: new Date() },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', direction: 'rtl', locale: 'ar-SA', isActive: true, completion: 50, translators: ['Community'], lastUpdated: new Date() },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', direction: 'ltr', locale: 'hi-IN', isActive: true, completion: 45, translators: ['Community'], lastUpdated: new Date() },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', direction: 'ltr', locale: 'nl-NL', isActive: true, completion: 40, translators: ['Community'], lastUpdated: new Date() },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', direction: 'ltr', locale: 'sv-SE', isActive: true, completion: 35, translators: ['Community'], lastUpdated: new Date() },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', direction: 'ltr', locale: 'pl-PL', isActive: true, completion: 30, translators: ['Community'], lastUpdated: new Date() },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', direction: 'ltr', locale: 'tr-TR', isActive: true, completion: 25, translators: ['Community'], lastUpdated: new Date() },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', direction: 'ltr', locale: 'vi-VN', isActive: true, completion: 20, translators: ['Community'], lastUpdated: new Date() },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', direction: 'ltr', locale: 'th-TH', isActive: true, completion: 15, translators: ['Community'], lastUpdated: new Date() },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', direction: 'rtl', locale: 'he-IL', isActive: true, completion: 10, translators: ['Community'], lastUpdated: new Date() },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', flag: '🇮🇷', direction: 'rtl', locale: 'fa-IR', isActive: true, completion: 5, translators: ['Community'], lastUpdated: new Date() },
];

const defaultI18nConfig: I18nConfig = {
  defaultLanguage: 'en',
  fallbackLanguage: 'en',
  supportedLanguages: languageConfigs.filter(lang => lang.isActive),
  autoDetect: true,
  persistPreference: true,
  interpolation: {
    prefix: '{{',
    suffix: '}}',
  },
  pluralization: true,
  dateTimeFormat: {
    date: { year: 'numeric', month: 'long', day: 'numeric' },
    time: { hour: '2-digit', minute: '2-digit', second: '2-digit' },
    dateTime: { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
  },
  numberFormat: {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  },
  currency: {
    code: 'USD',
    symbol: '$',
  },
};

interface I18nProviderProps {
  children: React.ReactNode;
}

const I18nContext = createContext<TranslationContextType | undefined>(undefined);

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const currentUser = useAppSelector(selectUser);
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en');
  const [currentLocale, setCurrentLocale] = useState<string>('en-US');
  const [isRTL, setIsRTL] = useState<boolean>(false);
  const [translations, setTranslations] = useState<Partial<Record<SupportedLanguage, Translation>>>(mockTranslations);
  const [config] = useState<I18nConfig>(defaultI18nConfig);
  const [cache, setCache] = useState<Map<string, string>>(new Map());
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    totalTranslations: 0,
    cacheHitRate: 0,
    averageLookupTime: 0,
    memoryUsage: 0,
    loadTime: 0,
  });

  // Initialize language detection and preference loading
  useEffect(() => {
    const initializeLanguage = async () => {
      const startTime = performance.now();
      
      // Try to load user preference
      const savedLanguage = localStorage.getItem('i18n_language') as SupportedLanguage;
      const detectedLanguage = config.autoDetect ? detectLanguage() : config.defaultLanguage;
      
      const language = savedLanguage || detectedLanguage || config.defaultLanguage;
      await setLanguage(language);
      
      const endTime = performance.now();
      setPerformanceMetrics(prev => ({
        ...prev,
        loadTime: endTime - startTime,
      }));
    };

    initializeLanguage();
  }, []);

  // Core translation function
  const t = (key: string, params?: Record<string, string | number>): string => {
    const startTime = performance.now();
    const cacheKey = `${currentLanguage}:${key}:${JSON.stringify(params)}:${JSON.stringify(context)}`;
    
    // Check cache first
    if (cache.has(cacheKey)) {
      setPerformanceMetrics(prev => ({
        ...prev,
        cacheHitRate: ((prev.cacheHitRate * prev.totalTranslations + 1) / (prev.totalTranslations + 1)),
        totalTranslations: prev.totalTranslations + 1,
      }));
      return cache.get(cacheKey)!;
    }

    // Get translation value
    let value = getNestedValue(translations[currentLanguage], key) || getNestedValue(translations[config.fallbackLanguage], key) || key;
    
    // Apply context
    if (context[key]) {
      value = context[key];
    }
    
    // Apply interpolation
    if (params) {
      value = interpolate(value, params);
    }
    
    // Cache result
    setCache(prev => new Map(prev.set(cacheKey, value)));
    
    const endTime = performance.now();
    setPerformanceMetrics(prev => ({
      ...prev,
      totalTranslations: prev.totalTranslations + 1,
      averageLookupTime: ((prev.averageLookupTime * prev.totalTranslations + (endTime - startTime)) / (prev.totalTranslations + 1)),
    }));
    
    return value;
  };

  // Pluralization function
  const tPlural = (key: string, count: number, params?: Record<string, string | number>): string => {
    const pluralKey = count === 1 ? key : `${key}_plural`;
    return t(pluralKey, { ...params, count });
  };

  // Context-aware translation
  const tContext = (key: string, context: string, params?: Record<string, string | number>): string => {
    const contextKey = `${key}_${context}`;
    return t(contextKey, params) || t(key, params);
  };

  // Formatting functions
  const formatDate = (date: Date, format: 'date' | 'time' | 'dateTime' = 'dateTime'): string => {
    const locale = currentLocale;
    const options = config.dateTimeFormat[format];
    return new Intl.DateTimeFormat(locale, options).format(date);
  };

  const formatNumber = (number: number, options?: Intl.NumberFormatOptions): string => {
    const locale = currentLocale;
    const formatOptions = { ...config.numberFormat, ...options };
    return new Intl.NumberFormat(locale, formatOptions).format(number);
  };

  const formatCurrency = (amount: number, currency = config.currency.code): string => {
    const locale = currentLocale;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (Math.abs(days) > 0) {
      return tPlural('time.days', Math.abs(days), { count: Math.abs(days) });
    } else if (Math.abs(hours) > 0) {
      return tPlural('time.hours', Math.abs(hours), { count: Math.abs(hours) });
    } else if (Math.abs(minutes) > 0) {
      return tPlural('time.minutes', Math.abs(minutes), { count: Math.abs(minutes) });
    } else {
      return tPlural('time.seconds', Math.abs(seconds), { count: Math.abs(seconds) });
    }
  };

  // Language switching
  const setLanguage = async (language: SupportedLanguage): Promise<void> => {
    if (!config.supportedLanguages.find(lang => lang.code === language)) {
      throw new Error(`Language ${language} is not supported`);
    }
    
    const langConfig = languageConfigs.find(lang => lang.code === language);
    if (!langConfig) {
      throw new Error(`Language configuration for ${language} not found`);
    }
    
    setCurrentLanguage(language);
    setCurrentLocale(langConfig.locale);
    setIsRTL(langConfig.direction === 'rtl');
    
    // Update document direction
    document.documentElement.setAttribute('dir', langConfig.direction);
    document.documentElement.setAttribute('lang', language);
    
    // Persist preference
    if (config.persistPreference) {
      localStorage.setItem('i18n_language', language);
    }
    
    // Clear cache for new language
    setCache(new Map());
  };

  const detectLanguage = (): SupportedLanguage => {
    // Browser language detection
    const browserLang = navigator.language.split('-')[0] as SupportedLanguage;
    if (config.supportedLanguages.find(lang => lang.code === browserLang)) {
      return browserLang;
    }
    
    // Default to English if browser language not supported
    return config.defaultLanguage;
  };

  // Translation management
  const addTranslation = (language: SupportedLanguage, key: string, value: string): void => {
    setTranslations(prev => ({
      ...prev,
      [language]: setNestedValue(prev[language], key, value),
    }));
    // Clear cache for updated language
    setCache(prev => {
      const newCache = new Map(prev);
      for (const [cacheKey] of newCache.entries()) {
        if (cacheKey.startsWith(`${language}:`)) {
          newCache.delete(cacheKey);
        }
      }
      return newCache;
    });
  };

  const updateTranslation = (language: SupportedLanguage, key: string, value: string): void => {
    addTranslation(language, key, value);
  };

  const removeTranslation = (language: SupportedLanguage, key: string): void => {
    setTranslations(prev => {
      const newTranslations = { ...prev };
      deleteNestedValue(newTranslations[language], key);
      return newTranslations;
    });
  };

  const getMissingTranslations = (language: SupportedLanguage): string[] => {
    const missing: string[] = [];
    const defaultTranslations = translations[config.defaultLanguage];
    const targetTranslations = translations[language];
    
    function checkMissing(obj: Translation, path: string = '') {
      for (const key in obj) {
        const fullPath = path ? `${path}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          checkMissing(obj[key] as Translation, fullPath);
        } else if (!getNestedValue(targetTranslations, fullPath)) {
          missing.push(fullPath);
        }
      }
    }
    
    checkMissing(defaultTranslations);
    return missing;
  };

  // Bulk operations
  const importTranslations = async (language: SupportedLanguage, newTranslations: Translation): Promise<void> => {
    setTranslations(prev => ({
      ...prev,
      [language]: { ...prev[language], ...newTranslations },
    }));
    // Clear cache for updated language
    setCache(prev => {
      const newCache = new Map(prev);
      for (const [cacheKey] of newCache.entries()) {
        if (cacheKey.startsWith(`${language}:`)) {
          newCache.delete(cacheKey);
        }
      }
      return newCache;
    });
  };

  const exportTranslations = (language: SupportedLanguage): Translation => {
    return translations[language] || {};
  };

  // Quality assurance
  const validateTranslations = (language: SupportedLanguage): ValidationResult[] => {
    const results: ValidationResult[] = [];
    const targetTranslations = translations[language];
    
    // Check for missing translations
    const missing = getMissingTranslations(language);
    missing.forEach(key => {
      results.push({
        key,
        severity: 'error',
        message: 'Missing translation',
        suggestion: `Add translation for ${key}`,
      });
    });
    
    // Check for empty translations
    function checkEmpty(obj: Translation, path: string = '') {
      for (const key in obj) {
        const fullPath = path ? `${path}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          checkEmpty(obj[key] as Translation, fullPath);
        } else if (obj[key] === '') {
          results.push({
            key: fullPath,
            severity: 'warning',
            message: 'Empty translation',
            suggestion: `Consider adding a translation for ${fullPath}`,
          });
        }
      }
    }
    
    const targetTranslations = translations[language];
    if (targetTranslations) {
      checkEmpty(targetTranslations);
    }
    
    return results;
  };

  const checkConsistency = (): ConsistencyIssue[] => {
    const issues: ConsistencyIssue[] = [];
    const defaultTranslations = translations[config.defaultLanguage];
    
    Object.keys(translations).forEach(language => {
      if (language === config.defaultLanguage) return;
      
      const missing = getMissingTranslations(language as SupportedLanguage);
      if (missing.length > 0) {
        issues.push({
          key: 'general',
          languages: [language as SupportedLanguage],
          issue: `Missing ${missing.length} translations`,
          suggestion: 'Complete missing translations',
        });
      }
    });
    
    return issues;
  };

  // Context management
  const setContext = (newContext: Record<string, string>): void => {
    setContextData(newContext);
    // Clear cache when context changes
    setCache(new Map());
  };

  const getContext = (): Record<string, string> => {
    return context;
  };

  // Performance metrics
  const getPerformanceMetrics = (): PerformanceMetrics => {
    return performanceMetrics;
  };

  const clearCache = (): void => {
    setCache(new Map());
    setPerformanceMetrics(prev => ({ ...prev, cacheHitRate: 0 }));
  };

  // Utility functions
  const getNestedValue = (obj: Translation, path: string): string | undefined => {
    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object' && key in current) {
        return current[key];
      }
      return undefined;
    }, obj) as string | undefined;
  };

  const setNestedValue = (obj: Translation, path: string, value: string): Translation => {
    const keys = path.split('.');
    const result = { ...obj };
    let current = result;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key] as Translation;
    }
    
    current[keys[keys.length - 1]] = value;
    return result;
  };

  const deleteNestedValue = (obj: Translation, path: string): void => {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (current[key] && typeof current[key] === 'object') {
        current = current[key] as Translation;
      } else {
        return;
      }
    }
    
    delete current[keys[keys.length - 1]];
  };

  const interpolate = (template: string, params: Record<string, string | number>): string => {
    let result = template;
    for (const [key, value] of Object.entries(params)) {
      const placeholder = `${config.interpolation.prefix}${key}${config.interpolation.suffix}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }
    return result;
  };

  const contextValue: TranslationContextType = {
    currentLanguage,
    currentLocale,
    isRTL,
    translations,
    languages: languageConfigs,
    availableLanguages: languageConfigs.filter(lang => lang.isActive),
    defaultLanguage: config.defaultLanguage,
    fallbackLanguage: config.fallbackLanguage,
    t,
    tPlural,
    tContext,
    formatDate,
    formatNumber,
    formatCurrency,
    formatRelativeTime,
    setLanguage,
    detectLanguage,
    addTranslation,
    updateTranslation,
    removeTranslation,
    getMissingTranslations,
    importTranslations,
    exportTranslations,
    validateTranslations,
    checkConsistency,
    setContext,
    getContext,
    getPerformanceMetrics,
    clearCache,
  };

  if (!currentUser) {
    return (
      <AnimatedBox
        animation={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}
        sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}
      >
        <Card sx={{ maxWidth: 400, textAlign: 'center' }}>
          <CardContent>
            <GlobeIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              {t('common.language')}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              {t('common.loading')}
            </Typography>
          </CardContent>
        </Card>
      </AnimatedBox>
    );
  }

  return (
    <I18nContext.Provider value={contextValue}>
      <AnimatedBox
        animation={{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }}
        sx={{ width: '100%' }}
      >
        {/* Language Header */}
        <Card sx={{ mb: 3, borderLeft: 4, borderColor: 'primary.main' }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={2}>
                <GlobeIcon color="primary" />
                <Box>
                  <Typography variant="h6">
                    {t('common.language')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {languageConfigs.find(lang => lang.code === currentLanguage)?.nativeName} • {currentLocale}
                  </Typography>
                </Box>
              </Box>
              
              <Box display="flex" alignItems="center" gap={1}>
                <Chip
                  label={`${languageConfigs.filter(lang => lang.isActive).length} Languages`}
                  size="small"
                  color="primary"
                />
                <Chip
                  label={isRTL ? 'RTL' : 'LTR'}
                  size="small"
                  variant="outlined"
                />
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Current Language Selection */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Current Language
            </Typography>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Typography variant="h4">
                {languageConfigs.find(lang => lang.code === currentLanguage)?.flag}
              </Typography>
              <Box>
                <Typography variant="h6">
                  {languageConfigs.find(lang => lang.code === currentLanguage)?.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {languageConfigs.find(lang => lang.code === currentLanguage)?.nativeName}
                </Typography>
              </Box>
            </Box>
            
            <FormControl fullWidth size="small">
              <InputLabel>Language</InputLabel>
              <Select
                value={currentLanguage}
                onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                startAdornment={<LanguageIcon />}
              >
                {languageConfigs.filter(lang => lang.isActive).map((lang) => (
                  <MenuItem key={lang.code} value={lang.code}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                      <Typography variant="caption" color="text.secondary">
                        ({lang.completion}%)
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </CardContent>
        </Card>

        {/* Translation Preview */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Translation Preview
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Common Phrases
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary={t('common.welcome')}
                      secondary="Welcome message"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary={t('common.dashboard')}
                      secondary="Dashboard"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary={t('common.settings')}
                      secondary="Settings"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary={t('common.logout')}
                      secondary="Logout"
                    />
                  </ListItem>
                </List>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Formatted Examples
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary={formatDate(new Date())}
                      secondary="Current date"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary={formatNumber(12345.67)}
                      secondary="Number formatting"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary={formatCurrency(99.99)}
                      secondary="Currency formatting"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary={formatRelativeTime(new Date(Date.now() - 3600000))}
                      secondary="Relative time"
                    />
                  </ListItem>
                </List>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Language Statistics */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Translation Statistics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary.main">
                    {getPerformanceMetrics().totalTranslations}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Translations
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main">
                    {Math.round(getPerformanceMetrics().cacheHitRate * 100)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cache Hit Rate
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="info.main">
                    {getPerformanceMetrics().averageLookupTime.toFixed(2)}ms
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Lookup Time
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="warning.main">
                    {languageConfigs.filter(lang => lang.isActive).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Languages
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Available Languages */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Available Languages ({languageConfigs.filter(lang => lang.isActive).length})
            </Typography>
            <List sx={{ p: 0 }}>
              {languageConfigs.filter(lang => lang.isActive).map((lang) => (
                <ListItem key={lang.code} divider>
                  <ListItemIcon>
                    <span style={{ fontSize: '24px' }}>{lang.flag}</span>
                  </ListItemIcon>
                  <ListItemText
                    primary={lang.name}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {lang.nativeName} • {lang.completion}% complete
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                          <Chip
                            label={lang.direction.toUpperCase()}
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            label={lang.locale}
                            size="small"
                            variant="outlined"
                          />
                          <Typography variant="caption" color="text.secondary">
                            Updated {lang.lastUpdated.toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip
                      label={`${lang.completion}%`}
                      size="small"
                      color={lang.completion > 80 ? 'success' : lang.completion > 50 ? 'warning' : 'error'}
                    />
                    {lang.code === currentLanguage && (
                      <CheckIcon color="success" />
                    )}
                  </Box>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </AnimatedBox>
    </I18nContext.Provider>
  );
};

// Export types and utilities
export type { SupportedLanguage, Translation, LanguageConfig, I18nConfig, TranslationKey, TranslationContextType };
export { I18nContext };

export default I18nProvider;