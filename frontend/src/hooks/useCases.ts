import { useState, useEffect } from 'react';
// TODO: Update the import path if contracts.ts is elsewhere
import type { CaseSummary } from '../types/contracts.ts';

interface UseCasesResult {
  data: CaseSummary[] | null;
  isLoading: boolean;
  error: string | null;
}

export function useCases(): UseCasesResult {
  const [data, setData] = useState<CaseSummary[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
  fetch('/api/cases')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch cases');
        return res.json();
      })
      .then((json) => {
        setData(json);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Unknown error');
        setIsLoading(false);
      });
  }, []);

  return { data, isLoading, error };
}
