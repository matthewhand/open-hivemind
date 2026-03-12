/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-refresh/only-export-components, no-empty, no-case-declarations */
import React, { createContext, useContext, useState } from 'react';
import Card from '../components/DaisyUI/Card';
import Badge from '../components/DaisyUI/Badge';
import Button from '../components/DaisyUI/Button';
import { LoadingSpinner } from '../components/DaisyUI/Loading';
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
    'dashboard.welcome.title': 'Welcome to Open Hivemind',
    'dashboard.welcome.subtitle': 'Monitor and manage your AI agents across multiple platforms with real-time insights and comprehensive analytics.',
    'dashboard.welcome.description': 'Your multi-agent AI platform for seamless communication across platforms.',
    'dashboard.getting_started.subtitle': 'Let\'s get your multi-agent system up and running. Follow the steps below to configure your environment.',
    'status.online': 'Online',
    'status.offline': 'Offline',
    'nav.dashboard': 'Dashboard',
    'nav.bots': 'Bots',
    'nav.settings': 'Settings',
    'nav.monitoring': 'Monitoring',
    'nav.chat': 'Chat',
    'nav.personas': 'Personas',
  },
  es: {
    'app.title': 'Mente Colmena Abierta',
    'welcome': 'Bienvenido de nuevo, {name}',
    'dashboard.welcome.title': 'Bienvenido a Mente Colmena Abierta',
    'dashboard.welcome.subtitle': 'Supervise y administre sus agentes de IA en múltiples plataformas con información en tiempo real y análisis completos.',
    'dashboard.welcome.description': 'Su plataforma de IA multiagente para una comunicación fluida en todas las plataformas.',
    'dashboard.getting_started.subtitle': 'Pongamos en marcha su sistema multiagente. Siga los pasos a continuación para configurar su entorno.',
    'status.online': 'En línea',
    'status.offline': 'Desconectado',
    'nav.dashboard': 'Panel',
    'nav.bots': 'Bots',
    'nav.settings': 'Configuración',
    'nav.monitoring': 'Monitoreo',
    'nav.chat': 'Chat',
    'nav.personas': 'Personas',
  },
  fr: {
    'app.title': 'Esprit de Ruche Ouvert',
    'welcome': 'Bon retour, {name}',
    'dashboard.welcome.title': 'Bienvenue à Esprit de Ruche Ouvert',
    'dashboard.welcome.subtitle': 'Surveillez et gérez vos agents IA sur plusieurs plateformes avec des informations en temps réel et des analyses complètes.',
    'dashboard.welcome.description': 'Votre plateforme IA multi-agents pour une communication transparente entre les plateformes.',
    'dashboard.getting_started.subtitle': 'Mettons votre système multi-agents en marche. Suivez les étapes ci-dessous pour configurer votre environnement.',
    'status.online': 'En ligne',
    'status.offline': 'Hors ligne',
    'nav.dashboard': 'Tableau de bord',
    'nav.bots': 'Bots',
    'nav.settings': 'Paramètres',
    'nav.monitoring': 'Surveillance',
    'nav.chat': 'Chat',
    'nav.personas': 'Personas',
  },
  de: {
    'app.title': 'Offenes Bienenvolk',
    'welcome': 'Willkommen zurück, {name}',
    'dashboard.welcome.title': 'Willkommen bei Offenes Bienenvolk',
    'dashboard.welcome.subtitle': 'Überwachen und verwalten Sie Ihre KI-Agenten auf mehreren Plattformen mit Echtzeit-Einblicken und umfassenden Analysen.',
    'dashboard.welcome.description': 'Ihre Multi-Agenten-KI-Plattform für nahtlose Kommunikation über Plattformen hinweg.',
    'dashboard.getting_started.subtitle': 'Lassen Sie uns Ihr Multi-Agenten-System zum Laufen bringen. Befolgen Sie die nachstehenden Schritte, um Ihre Umgebung zu konfigurieren.',
    'status.online': 'Online',
    'status.offline': 'Offline',
    'nav.dashboard': 'Dashboard',
    'nav.bots': 'Bots',
    'nav.settings': 'Einstellungen',
    'nav.monitoring': 'Überwachung',
    'nav.chat': 'Chat',
    'nav.personas': 'Personas',
  },
  zh: {
    'app.title': '开放蜂巢思维',
    'welcome': '欢迎回来, {name}',
    'dashboard.welcome.title': '欢迎来到开放蜂巢思维',
    'dashboard.welcome.subtitle': '通过实时洞察和全面分析，跨多个平台监控和管理您的 AI 代理。',
    'dashboard.welcome.description': '您的多代理 AI 平台，实现跨平台的无缝通信。',
    'dashboard.getting_started.subtitle': '让我们启动并运行您的多代理系统。按照以下步骤配置您的环境。',
    'status.online': '在线',
    'status.offline': '离线',
    'nav.dashboard': '仪表板',
    'nav.bots': '机器人',
    'nav.settings': '设置',
    'nav.monitoring': '监控',
    'nav.chat': '聊天',
    'nav.personas': '角色',
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
  if (!context) {throw new Error('useI18n must be used within I18nProvider');}
  return context;
};

export default I18nProvider;