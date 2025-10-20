import { useState, useEffect } from 'react';
import type { CaseSummary } from '../types/contracts.ts';

interface UseCasesResult {
  data: CaseSummary[] | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * useCases - Fetch case list directly from case_screen table
 * 
 * DIRECT SUPABASE QUERY - Bypasses backend completely
 * case_screen table has RLS DISABLED for public read access
 * This is the DEFINITIVE FIX for the "Failed to fetch cases" error
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

        const casesData = await resp.json();
        
        // Map snake_case from DB to camelCase for frontend
        const formattedData: CaseSummary[] = casesData.map((row: any) => ({
          id: row.case_id,
          title: row.title,
          synopsis: row.synopsis,
          caseNumber: row.case_number,
          isSolved: row.is_solved,
        }));

        setData(formattedData || []);
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
