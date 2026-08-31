import { useCallback, useEffect, useState } from 'react';

export interface UseApiOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<T | null>;
}

export function useApi<T>(
  request: () => Promise<T>,
  options: UseApiOptions<T> = {},
): UseApiResult<T> {
  const { immediate = true, onSuccess, onError } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(immediate);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await request();
      setData(response);
      onSuccess?.(response);
      return response;
    } catch (caughtError) {
      const err = caughtError instanceof Error ? caughtError : new Error('Unknown API error');
      setError(err);
      onError?.(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [onError, onSuccess, request]);

  useEffect(() => {
    if (!immediate) {
      return;
    }

    void execute();
  }, [execute, immediate]);

  return {
    data,
    loading,
    error,
    refetch: execute,
  };
}
