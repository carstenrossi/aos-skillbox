import { SupportedLanguage } from '../types';

export interface TranslationKeys {
  title: string;
  subtitle: string;
  assistants: {
    narrative: {
      title: string;
      description: string;
    };
    csrd: {
      title: string;
      description: string;
    };
    adoption: {
      title: string;
      description: string;
    };
  };
  chat: {
    title: string;
    placeholder: string;
    send: string;
    typing: string;
    welcome: string;
    error: string;
    retry: string;
    close: string;
    upload: string;
    uploading: string;
    downloadFile: string;
  };
  auth: {
    login: string;
    logout: string;
    register: string;
    username: string;
    password: string;
    email: string;
    firstName: string;
    lastName: string;
    confirmPassword: string;
    forgotPassword: string;
    resetPassword: string;
    loginButton: string;
    registerButton: string;
    loginTitle: string;
    registerTitle: string;
  };
  errors: {
    required: string;
    invalid: string;
    tooShort: string;
    tooLong: string;
    passwordMismatch: string;
    networkError: string;
    serverError: string;
    unauthorized: string;
    fileTooBig: string;
    fileNotAllowed: string;
  };
  footer: {
    poweredBy: string;
    privacy: string;
    terms: string;
    support: string;
  };
  common: {
    loading: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    back: string;
    next: string;
    previous: string;
    search: string;
    filter: string;
    sort: string;
    yes: string;
    no: string;
  };
}

export const translations: Record<SupportedLanguage, TranslationKeys> = {
  de: {
    title: 'AssistantOS Skillbox',
    subtitle: 'Wähle Deinen persönlichen Assistenten',
    assistants: {
      narrative: {
        title: 'Narrative Assistant',
        description: 'Spezialisiert auf Storytelling, Kommunikation und narrative Entwicklung für Unternehmen und Personen',
      },
      csrd: {
        title: 'CSRD Assistant',
        description: 'Ihr Experte für Nachhaltigkeitsberichterstattung und CSRD-Compliance (Corporate Sustainability Reporting Directive)',
      },
      adoption: {
        title: 'Adoption Assistant',
        description: 'Unterstützt bei Veränderungsprozessen, Technologie-Adoption und organisatorischer Transformation',
      },
    },
    chat: {
      title: 'Chat',
      placeholder: 'Schreiben Sie Ihre Nachricht...',
      send: 'Senden',
      typing: 'tippt...',
      welcome: 'Hallo! Ich bin bereit, Ihnen zu helfen. Wie kann ich Sie unterstützen?',
      error: 'Entschuldigung, es gab einen Fehler. Bitte versuchen Sie es erneut.',
      retry: 'Erneut versuchen',
      close: 'Schließen',
      upload: 'Datei hochladen',
      uploading: 'Hochladen...',
      downloadFile: 'Datei herunterladen',
    },
    auth: {
      login: 'Anmelden',
      logout: 'Abmelden',
      register: 'Registrieren',
      username: 'Benutzername',
      password: 'Passwort',
      email: 'E-Mail',
      firstName: 'Vorname',
      lastName: 'Nachname',
      confirmPassword: 'Passwort bestätigen',
      forgotPassword: 'Passwort vergessen?',
      resetPassword: 'Passwort zurücksetzen',
      loginButton: 'Anmelden',
      registerButton: 'Konto erstellen',
      loginTitle: 'AssistantOS Skillbox',
      registerTitle: 'Neues Konto erstellen',
    },
    errors: {
      required: 'Dieses Feld ist erforderlich',
      invalid: 'Ungültige Eingabe',
      tooShort: 'Zu kurz',
      tooLong: 'Zu lang',
      passwordMismatch: 'Passwörter stimmen nicht überein',
      networkError: 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.',
      serverError: 'Serverfehler. Bitte versuchen Sie es später erneut.',
      unauthorized: 'Nicht autorisiert. Bitte melden Sie sich an.',
      fileTooBig: 'Datei ist zu groß',
      fileNotAllowed: 'Dateityp nicht erlaubt',
    },
    footer: {
      poweredBy: 'Powered by',
      privacy: 'Datenschutz',
      terms: 'AGB',
      support: 'Support',
    },
    common: {
      loading: 'Laden...',
      save: 'Speichern',
      cancel: 'Abbrechen',
      delete: 'Löschen',
      edit: 'Bearbeiten',
      back: 'Zurück',
      next: 'Weiter',
      previous: 'Zurück',
      search: 'Suchen',
      filter: 'Filtern',
      sort: 'Sortieren',
      yes: 'Ja',
      no: 'Nein',
    },
  },
  en: {
    title: 'AssistantOS Skillbox',
    subtitle: 'Choose your personal assistant',
    assistants: {
      narrative: {
        title: 'Narrative Assistant',
        description: 'Specialized in storytelling, communication and narrative development for businesses and individuals',
      },
      csrd: {
        title: 'CSRD Assistant',
        description: 'Your expert for sustainability reporting and CSRD compliance (Corporate Sustainability Reporting Directive)',
      },
      adoption: {
        title: 'Adoption Assistant',
        description: 'Supports change processes, technology adoption and organizational transformation',
      },
    },
    chat: {
      title: 'Chat',
      placeholder: 'Type your message...',
      send: 'Send',
      typing: 'is typing...',
      welcome: 'Hello! I am ready to help you. How can I assist you?',
      error: 'Sorry, there was an error. Please try again.',
      retry: 'Try again',
      close: 'Close',
      upload: 'Upload file',
      uploading: 'Uploading...',
      downloadFile: 'Download file',
    },
    auth: {
      login: 'Sign In',
      logout: 'Sign Out',
      register: 'Sign Up',
      username: 'Username',
      password: 'Password',
      email: 'Email',
      firstName: 'First Name',
      lastName: 'Last Name',
      confirmPassword: 'Confirm Password',
      forgotPassword: 'Forgot Password?',
      resetPassword: 'Reset Password',
      loginButton: 'Sign In',
      registerButton: 'Create Account',
      loginTitle: 'Sign in to your account',
      registerTitle: 'Create a new account',
    },
    errors: {
      required: 'This field is required',
      invalid: 'Invalid input',
      tooShort: 'Too short',
      tooLong: 'Too long',
      passwordMismatch: 'Passwords do not match',
      networkError: 'Network error. Please check your internet connection.',
      serverError: 'Server error. Please try again later.',
      unauthorized: 'Unauthorized. Please sign in.',
      fileTooBig: 'File is too large',
      fileNotAllowed: 'File type not allowed',
    },
    footer: {
      poweredBy: 'Powered by',
      privacy: 'Privacy',
      terms: 'Terms',
      support: 'Support',
    },
    common: {
      loading: 'Loading...',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      search: 'Search',
      filter: 'Filter',
      sort: 'Sort',
      yes: 'Yes',
      no: 'No',
    },
  },
}; 