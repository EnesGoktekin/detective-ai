import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { CaseSummary } from '../types/contracts.ts';

interface UseCasesResult {
  data: CaseSummary[] | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * useCases - Fetch case list from case_screen table
 * 
 * Uses direct Supabase query to case_screen (RLS-disabled public table)
 * Contains only safe, public data: id, title, synopsis, case_number
 * Actual game data (cases, clues) remains secure behind RLS
 */
export function useCases(): UseCasesResult {
  const [data, setData] = useState<CaseSummary[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCases = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Query case_screen table (RLS-disabled, public ANON_KEY access)
        const { data: cases, error: supabaseError } = await supabase
          .from('case_screen')
          .select('id, title, synopsis, case_number')
          .order('case_number', { ascending: true });
        
        if (supabaseError) {
          throw supabaseError;
        }
        
        // Map to frontend format
        const mappedCases = (cases || []).map((c) => ({
          id: c.id,
          title: c.title,
          synopsis: c.synopsis,
          caseNumber: c.case_number,
        }));
        
        setData(mappedCases);
      } catch (err) {
        console.error('[useCases] Error fetching cases:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch cases');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCases();
  }, []);

  return { data, isLoading, error };
}
