import { useState, useEffect } from 'react';
import type { CaseSummary } from '../types/contracts.ts';

interface UseCasesResult {
  data: CaseSummary[] | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * useCases - Fetch case list from secure backend endpoint
 * 
 * Uses GET /api/cases which bypasses RLS with SERVICE_ROLE_KEY
 * Environment variable VITE_API_URL should be set to backend URL in production
 */
export function useCases(): UseCasesResult {
  const [data, setData] = useState<CaseSummary[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    
    // Use environment variable for backend URL (works in dev and production)
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3004';
    
    fetch(`${API_URL}/api/cases`)
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
