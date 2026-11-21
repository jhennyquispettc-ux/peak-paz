import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { MESSAGES, type Locale, type MessageKey } from './messages';

const STORAGE_KEY = 'peakpaz.locale';

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
  dateLocale: string;
  pick: (es: string, en: string) => string;
}

const I18nContext = createContext<I18nState | null>(null);

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch {
    return 'es';
  }
  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'es';
}

function buildState(
  locale: Locale,
  setLocale: (locale: Locale) => void,
): I18nState {
  return {
    locale,
    setLocale,
    dateLocale: locale === 'en' ? 'en-US' : 'es-BO',
    pick: (es, en) => (locale === 'en' ? en : es),
    t: (key, values = {}) =>
      MESSAGES[locale][key].replace(/\{(\w+)\}/g, (_, name: string) =>
        String(values[name] ?? ''),
      ),
  };
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      return;
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const value = useMemo(
    () => buildState(locale, setLocale),
    [locale, setLocale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function SpanishScope({ children }: { children: ReactNode }) {
  const parent = useI18n();
  const value = useMemo(
    () => buildState('es', parent.setLocale),
    [parent.setLocale],
  );
  useEffect(() => {
    document.documentElement.lang = 'es';
    return () => {
      document.documentElement.lang = parent.locale;
    };
  }, [parent.locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nState {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
