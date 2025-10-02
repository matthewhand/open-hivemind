import React, { createContext, useState, useEffect } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectUser } from '../store/slices/authSlice';
import { AnimatedBox } from '../animations/AnimationComponents';

// Icon components using inline SVG for simplicity
const LanguageIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
  </svg>
);

const GlobeIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c-1.657 0-3-4.03-3-9s1.343-9 3-9m0 18c1.657 0 3-4.03 3-9s-1.343-9-3-9" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

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
  const [context, setContextData] = useState<Record<string, string>>({});
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
    const langTranslations = translations[language];

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

    if (langTranslations) {
      checkEmpty(langTranslations);
    }

    return results;
  };

  const checkConsistency = (): ConsistencyIssue[] => {
    const issues: ConsistencyIssue[] = [];
    
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
    return path.split('.').reduce((current: Translation | string | undefined, key: string) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Translation)[key];
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
    translations: translations as Record<SupportedLanguage, Translation>,
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
        className="p-3 flex justify-center items-center min-h-[400px]"
      >
        <div className="card w-full max-w-sm bg-base-100 shadow-xl">
          <div className="card-body items-center text-center">
            <GlobeIcon />
            <h2 className="card-title">{t('common.language')}</h2>
            <p>{t('common.loading')}</p>
          </div>
        </div>
      </AnimatedBox>
    );
  }

  return (
    <I18nContext.Provider value={contextValue}>
      <AnimatedBox
        animation={{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }}
        className="w-full"
      >
        {/* Language Header */}
        <div className="card bg-base-100 shadow-xl mb-6 border-l-4 border-primary">
          <div className="card-body">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <GlobeIcon className="text-primary" />
                <div>
                  <h3 className="font-bold text-lg">{t('common.language')}</h3>
                  <p className="text-base-content/70">
                    {languageConfigs.find(lang => lang.code === currentLanguage)?.nativeName} • {currentLocale}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="badge badge-primary">
                  {languageConfigs.filter(lang => lang.isActive).length} Languages
                </div>
                <div className="badge badge-outline">
                  {isRTL ? 'RTL' : 'LTR'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Current Language Selection */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h3 className="font-bold text-lg">Current Language</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-4xl">
                {languageConfigs.find(lang => lang.code === currentLanguage)?.flag}
              </div>
              <div>
                <h4 className="font-bold text-xl">
                  {languageConfigs.find(lang => lang.code === currentLanguage)?.name}
                </h4>
                <p className="text-base-content/70">
                  {languageConfigs.find(lang => lang.code === currentLanguage)?.nativeName}
                </p>
              </div>
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Language</span>
              </label>
              <select
                className="select select-bordered"
                value={currentLanguage}
                onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
              >
                {languageConfigs.filter(lang => lang.isActive).map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name} ({lang.completion}%)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Translation Preview */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h3 className="font-bold text-lg">Translation Preview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-base-content/70 mb-2">Common Phrases</p>
                <ul className="space-y-2">
                  <li>
                    <div className="font-medium">{t('common.welcome')}</div>
                    <div className="text-sm text-base-content/60">Welcome message</div>
                  </li>
                  <li>
                    <div className="font-medium">{t('common.dashboard')}</div>
                    <div className="text-sm text-base-content/60">Dashboard</div>
                  </li>
                  <li>
                    <div className="font-medium">{t('common.settings')}</div>
                    <div className="text-sm text-base-content/60">Settings</div>
                  </li>
                  <li>
                    <div className="font-medium">{t('common.logout')}</div>
                    <div className="text-sm text-base-content/60">Logout</div>
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-base-content/70 mb-2">Formatted Examples</p>
                <ul className="space-y-2">
                  <li>
                    <div className="font-medium">{formatDate(new Date())}</div>
                    <div className="text-sm text-base-content/60">Current date</div>
                  </li>
                  <li>
                    <div className="font-medium">{formatNumber(12345.67)}</div>
                    <div className="text-sm text-base-content/60">Number formatting</div>
                  </li>
                  <li>
                    <div className="font-medium">{formatCurrency(99.99)}</div>
                    <div className="text-sm text-base-content/60">Currency formatting</div>
                  </li>
                  <li>
                    <div className="font-medium">{formatRelativeTime(new Date(Date.now() - 3600000))}</div>
                    <div className="text-sm text-base-content/60">Relative time</div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Language Statistics */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h3 className="font-bold text-lg">Translation Statistics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {getPerformanceMetrics().totalTranslations}
                </div>
                <div className="text-sm text-base-content/70">
                  Total Translations
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-success">
                  {Math.round(getPerformanceMetrics().cacheHitRate * 100)}%
                </div>
                <div className="text-sm text-base-content/70">
                  Cache Hit Rate
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-info">
                  {getPerformanceMetrics().averageLookupTime.toFixed(2)}ms
                </div>
                <div className="text-sm text-base-content/70">
                  Avg Lookup Time
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-warning">
                  {languageConfigs.filter(lang => lang.isActive).length}
                </div>
                <div className="text-sm text-base-content/70">
                  Active Languages
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Available Languages */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="font-bold text-lg">
              Available Languages ({languageConfigs.filter(lang => lang.isActive).length})
            </h3>
            <div className="overflow-x-auto">
              <table className="table w-full">
                <tbody>
                  {languageConfigs.filter(lang => lang.isActive).map((lang) => (
                    <tr key={lang.code} className="hover">
                      <td>
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">{lang.flag}</div>
                          <div>
                            <div className="font-bold">{lang.name}</div>
                            <div className="text-sm opacity-50">
                              {lang.nativeName} • {lang.completion}% complete
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="badge badge-outline">{lang.direction.toUpperCase()}</div>
                        <div className="badge badge-outline">{lang.locale}</div>
                        <br />
                        <span className="text-xs opacity-50">
                          Updated {lang.lastUpdated.toLocaleDateString()}
                        </span>
                      </td>
                      <td>
                        <div
                          className={`badge ${
                            lang.completion > 80
                              ? 'badge-success'
                              : lang.completion > 50
                              ? 'badge-warning'
                              : 'badge-error'
                          }`}
                        >
                          {lang.completion}%
                        </div>
                      </td>
                      <th>
                        {lang.code === currentLanguage && (
                          <CheckIcon className="text-success" />
                        )}
                      </th>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AnimatedBox>
    </I18nContext.Provider>
  );
};

// Export types and utilities
export { I18nContext };

export default I18nProvider;