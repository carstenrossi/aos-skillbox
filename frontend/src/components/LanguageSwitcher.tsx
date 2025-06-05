import React from 'react';
import { LanguageSwitcherProps, SupportedLanguage } from '../types';

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  currentLanguage,
  onLanguageChange,
  className = '',
}) => {
  const languages: { code: SupportedLanguage; label: string; flag: string }[] = [
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
  ];

  return (
    <div className={`language-switch ${className}`}>
      {languages.map((language) => (
        <button
          key={language.code}
          onClick={() => onLanguageChange(language.code)}
          className={`language-option ${
            currentLanguage === language.code ? 'active' : ''
          }`}
          aria-label={`Switch to ${language.label}`}
        >
          <span className="mr-1">{language.flag}</span>
          <span className="hidden sm:inline">{language.label}</span>
          <span className="sm:hidden">{language.code.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher; 