import React, { createContext, useContext, useState } from 'react';
import { Card, Badge, Button, LoadingSpinner } from '../components/DaisyUI';
import { LanguageIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

type Language = 'en' | 'es' | 'fr' | 'de' | 'zh';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string>) => string;
  availableLanguages: { code: Language; name: string; flag: string }[];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const availableLanguages: { code: Language; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
];

// Minimal mock translations for demo purposes
const translations: Record<Language, Record<string, string>> = {
  en: {
    'app.title': 'Open Hivemind',
    'welcome': 'Welcome back, {name}',
    'status.online': 'Online',
    'status.offline': 'Offline',
  },
  es: {
    'app.title': 'Mente Colmena Abierta',
    'welcome': 'Bienvenido de nuevo, {name}',
    'status.online': 'En línea',
    'status.offline': 'Desconectado',
  },
  fr: {
    'app.title': 'Esprit de Ruche Ouvert',
    'welcome': 'Bon retour, {name}',
    'status.online': 'En ligne',
    'status.offline': 'Hors ligne',
  },
  de: {
    'app.title': 'Offenes Bienenvolk',
    'welcome': 'Willkommen zurück, {name}',
    'status.online': 'Online',
    'status.offline': 'Offline',
  },
  zh: {
    'app.title': '开放蜂巢思维',
    'welcome': '欢迎回来, {name}',
    'status.online': '在线',
    'status.offline': '离线',
  },
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');
  const [loading, setLoading] = useState(false);

  const changeLanguage = (lang: Language) => {
    setLoading(true);
    // Simulate async language loading
    setTimeout(() => {
      setLanguage(lang);
      setLoading(false);
    }, 300);
  };

  const t = (key: string, params?: Record<string, string>): string => {
    let text = translations[language][key] || key;

    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        text = text.replace(`{${paramKey}}`, paramValue);
      });
    }

    return text;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage: changeLanguage, t, availableLanguages }}>
      {children}

      {/* Language Switcher (Floating for demo) */}
      <div className="fixed bottom-4 right-20 z-50 group">
        <Button
          variant="ghost"
          className="btn-circle bg-base-100 shadow-lg border border-base-200"
        >
          {loading ? <LoadingSpinner size="xs" /> : <GlobeAltIcon className="w-6 h-6" />}
        </Button>

        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
          <Card className="w-40 shadow-xl bg-base-100 border border-base-200">
            <div className="p-2 space-y-1">
              {availableLanguages.map(lang => (
                <button
                  key={lang.code}
                  className={`w-full text-left px-3 py-2 rounded hover:bg-base-200 flex items-center justify-between text-sm ${language === lang.code ? 'bg-primary/10 text-primary font-bold' : ''
                    }`}
                  onClick={() => changeLanguage(lang.code)}
                >
                  <span>{lang.flag} {lang.name}</span>
                  {language === lang.code && <LanguageIcon className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
};

export default I18nProvider;