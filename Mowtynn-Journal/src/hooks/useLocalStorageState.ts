import { useState, useEffect } from 'react';

export function useLocalStorageState<T>(
  key: string,
  defaultValue: T,
  delay: number = 300,
  skipSaveWhenUserPresent: boolean = false,
  user: any = null
) {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (err) {
      console.error(`Failed to load ${key} from localStorage:`, err);
    }
    return defaultValue;
  });

  useEffect(() => {
    if (skipSaveWhenUserPresent && user) return;

    const timer = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch (err) {
        console.error(`Failed to save ${key} to localStorage:`, err);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [state, key, delay, skipSaveWhenUserPresent, user]);

  return [state, setState] as const;
}
