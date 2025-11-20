import React, { createContext, useContext, useState } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectUser } from '../store/slices/authSlice';
import {
  Card,
  Select,
  Toggle
} from '../components/DaisyUI';
import {
  GlobeAltIcon as LanguageIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja';

export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  isActive: boolean;
}

export interface I18nConfig {
  defaultLanguage: SupportedLanguage;
  supportedLanguages: LanguageConfig[];
  autoDetect: boolean;
}

interface TranslationContextType {
  currentLanguage: SupportedLanguage;
  isRTL: boolean;
  languages: LanguageConfig[];
  config: I18nConfig;
  changeLanguage: (language: SupportedLanguage) => void;
  t: (key: string) => string;
  updateConfig: (updates: Partial<I18nConfig>) => void;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

const mockTranslations: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    'common.welcome': 'Welcome to Open-Hivemind',
    'common.dashboard': 'Dashboard',
    'common.settings': 'Settings',
  },
  es: {
    'common.welcome': 'Bienvenido a Open-Hivemind',
    'common.dashboard': 'Panel de Control',
    'common.settings': 'Configuración',
  },
  fr: {
    'common.welcome': 'Bienvenue à Open-Hivemind',
    'common.dashboard': 'Tableau de Bord',
    'common.settings': 'Paramètres',
  },
  de: {
    'common.welcome': 'Willkommen bei Open-Hivemind',
    'common.dashboard': 'Dashboard',
    'common.settings': 'Einstellungen',
  },
  zh: {
    'common.welcome': '欢迎使用 Open-Hivemind',
    'common.dashboard': '仪表板',
    'common.settings': '设置',
  },
  ja: {
    'common.welcome': 'Open-Hivemindへようこそ',
    'common.dashboard': 'ダッシュボード',
    'common.settings': '設定',
  },
};

const defaultLanguages: LanguageConfig[] = [
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr', isActive: true },
  { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr', isActive: true },
  { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr', isActive: true },
  { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr', isActive: true },
  { code: 'zh', name: 'Chinese', nativeName: '中文', direction: 'ltr', isActive: true },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr', isActive: true },
];

interface I18nProviderProps {
  children: React.ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const currentUser = useAppSelector(selectUser);
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en');
  const [config, setConfig] = useState<I18nConfig>({
    defaultLanguage: 'en',
    supportedLanguages: defaultLanguages,
    autoDetect: true,
  });

  const changeLanguage = (language: SupportedLanguage) => {
    setCurrentLanguage(language);
  };

  const t = (key: string): string => {
    return mockTranslations[currentLanguage]?.[key] || key;
  };

  const updateConfig = (updates: Partial<I18nConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const isRTL = config.supportedLanguages.find(l => l.code === currentLanguage)?.direction === 'rtl';

  const contextValue: TranslationContextType = {
    currentLanguage,
    isRTL,
    languages: config.supportedLanguages,
    config,
    changeLanguage,
    t,
    updateConfig,
  };

  if (!currentUser) {
    return (
      <div className="flex justify-center items-center min-h-96 p-6">
        <Card className="max-w-md text-center shadow-xl">
          <div className="p-8">
            <LanguageIcon className="w-16 h-16 mx-auto text-primary mb-4" />
            <h2 className="text-2xl font-bold mb-2">Internationalization</h2>
            <p className="opacity-70">Please log in to access language settings.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <TranslationContext.Provider value={contextValue}>
      <div className="w-full space-y-6">
        {/* Header */}
        <Card className="shadow-xl border-l-4 border-primary">
          <div className="p-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <LanguageIcon className="w-8 h-8 text-primary" />
                <div>
                  <h2 className="text-xl font-bold">Internationalization (i18n)</h2>
                  <p className="text-sm opacity-70">
                    Current: {config.supportedLanguages.find(l => l.code === currentLanguage)?.nativeName} • {config.supportedLanguages.length} languages
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Language Selection */}
        <Card className="shadow-xl">
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Language Selection</h3>
            <div className="max-w-md">
              <Select
                value={currentLanguage}
                onChange={(e) => changeLanguage(e.target.value as SupportedLanguage)}
                options={config.supportedLanguages.map(lang => ({
                  value: lang.code,
                  label: `${lang.nativeName} (${lang.name})`
                }))}
              />
            </div>
            <div className="mt-4 p-4 bg-base-200 rounded-lg">
              <p className="font-bold mb-2">Translation Preview:</p>
              <p>{t('common.welcome')}</p>
              <p>{t('common.dashboard')}</p>
              <p>{t('common.settings')}</p>
            </div>
          </div>
        </Card>

        {/* Supported Languages */}
        <Card className="shadow-xl">
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Supported Languages</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {config.supportedLanguages.map(lang => (
                <div
                  key={lang.code}
                  className={`flex items-center justify-between p-3 border border-base-300 rounded-lg ${lang.code === currentLanguage ? 'bg-primary/10 border-primary' : ''
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {lang.code === currentLanguage && (
                      <CheckCircleIcon className="w-5 h-5 text-success" />
                    )}
                    <div>
                      <p className="font-bold">{lang.nativeName}</p>
                      <p className="text-sm opacity-70">{lang.name}</p>
                    </div>
                  </div>
                  <span className="text-xs opacity-50">{lang.direction.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Configuration */}
        <Card className="shadow-xl">
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">i18n Configuration</h3>
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Auto-detect Language</span>
                <Toggle
                  checked={config.autoDetect}
                  onChange={(checked) => updateConfig({ autoDetect: checked })}
                />
              </label>
            </div>
          </div>
        </Card>
      </div>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
};

export default I18nProvider;