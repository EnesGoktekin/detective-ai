import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
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
  console.log('[useCases] Hook initialized - DIRECT SUPABASE MODE');
  
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
        console.log('[useCases] Querying case_screen table directly...');
        const queryStartTime = Date.now();
        
        // Direct Supabase query to case_screen (RLS disabled, public access)
        const { data: caseScreenData, error: dbError } = await supabase
          .from('case_screen')
          .select('id, title, synopsis, case_number')
          .order('case_number', { ascending: true });
        
        const queryDuration = Date.now() - queryStartTime;
        console.log(`[useCases] Supabase query completed (${queryDuration}ms):`, {
          hasData: !!caseScreenData,
          dataLength: caseScreenData?.length || 0,
          hasError: !!dbError,
          error: dbError
        });
        
        if (dbError) {
          console.error('[useCases] Supabase error:', {
            message: dbError.message,
            details: dbError.details,
            hint: dbError.hint,
            code: dbError.code
          });
          throw new Error(dbError.message || 'Database query failed');
        }
        
        if (!caseScreenData || caseScreenData.length === 0) {
          console.warn('[useCases] No cases found in case_screen table');
          setData([]);
          setIsLoading(false);
          return;
        }
        
        console.log('[useCases] Cases fetched successfully:', {
          count: caseScreenData.length,
          cases: caseScreenData
        });
        
        // Map to frontend format
        const mappedCases: CaseSummary[] = caseScreenData.map(row => ({
          id: row.id,
          title: row.title,
          synopsis: row.synopsis,
          caseNumber: row.case_number
        }));
        
        console.log('[useCases] Mapped cases:', mappedCases);
        console.log('[useCases] Setting data state:', mappedCases);
        setData(mappedCases);
        
        console.log('[useCases] Setting isLoading=false (success)');
        setIsLoading(false);
        
      } catch (err: any) {
        console.error('[useCases] Error caught in catch block:', {
          error: err,
          message: err.message,
          stack: err.stack,
          name: err.name
        });
        
        const errorMessage = err.message || 'Unknown error';
        console.log('[useCases] Setting error state:', errorMessage);
        setError(errorMessage);
        
        console.log('[useCases] Setting isLoading=false (error)');
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
