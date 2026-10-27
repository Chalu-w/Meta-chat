import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, TranslationKeys } from './translations.js';
import { LanguageCode } from '../types.js';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKeys) => string;
  languageNames: Record<LanguageCode, { label: string; native: string }>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LANGUAGE_METADATA: Record<LanguageCode, { label: string; native: string }> = {
  en: { label: 'English', native: 'English' },
  om: { label: 'Afaan Oromoo', native: 'Afaan Oromoo' },
  am: { label: 'Amharic', native: 'አማርኛ' },
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('metachat_lang') || localStorage.getItem('oromochat_lang');
    return saved === 'en' || saved === 'om' || saved === 'am' ? (saved as LanguageCode) : 'en';
  });

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem('metachat_lang', lang);
  };

  const toggleLanguage = () => {
    // Cycle: en -> om -> am -> en
    if (language === 'en') setLanguage('om');
    else if (language === 'om') setLanguage('am');
    else setLanguage('en');
  };

  const t = (key: TranslationKeys): string => {
    const dict = translations[language] || translations.en;
    return dict[key] || translations.en[key] || key;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        languageNames: LANGUAGE_METADATA,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
};
