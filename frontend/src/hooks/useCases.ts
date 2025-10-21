import { useState, useEffect } from 'react';
import type { CaseSummary } from '../types/contracts.ts';

interface UseCasesResult {
  data: CaseSummary[] | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * useCases - Fetches case summaries from the backend API.
 *
 * This hook calls the `/api/cases` endpoint. The backend is responsible
 * for fetching data from the database and handling any RLS policies.
 */
export function useCases(): UseCasesResult {
  console.log('[useCases] Hook initialized - fetching from backend /api/cases');

  const [data, setData] = useState<CaseSummary[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[useCases] useEffect triggered - starting DIRECT Supabase query');

    console.log('[useCases] Setting isLoading=true, error=null');
    setIsLoading(true);
    setError(null);

    const fetchCases = async () => {
      try {
        console.log('[useCases] Fetching /api/cases from backend');
        setIsLoading(true);
        setError(null);

        const resp = await fetch('/api/cases');
        if (!resp.ok) throw new Error(`Failed to fetch /api/cases: ${resp.status}`);

        const casesData: CaseSummary[] = await resp.json();
        setData(casesData || []);
        setIsLoading(false);
      } catch (err: any) {
        console.error('[useCases] Error fetching /api/cases:', err);
        setError(err?.message || 'Failed to load cases');
        setIsLoading(false);
      }
    };

    fetchCases();

    // Cleanup function
    return () => {
      console.log('[useCases] useEffect cleanup called');
    };
  }, []);

  console.log('[useCases] Returning state:', {
    hasData: data !== null,
    dataLength: data?.length || 0,
    isLoading,
    error
  });

  return { data, isLoading, error };
}
