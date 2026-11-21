import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';

export interface Resource<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
}

export function errorMessage(caught: unknown): string {
  return caught instanceof ApiError
    ? caught.message
    : 'Algo salió mal. Intenta de nuevo en un momento.';
}

export function useResource<T>(
  loader: () => Promise<T>,
  deps: readonly unknown[],
): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const latest = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async () => {
    const call = ++latest.current;
    setLoading(true);
    setError(null);
    try {
      const result = await loaderRef.current();
      if (call === latest.current) setData(result);
    } catch (caught) {
      if (call === latest.current) setError(errorMessage(caught));
    } finally {
      if (call === latest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, ...deps]);

  return { data, error, loading, reload };
}
