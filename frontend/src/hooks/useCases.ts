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
 * Relative path works in Vercel (frontend and backend on same domain)
 */
export function useCases(): UseCasesResult {
  console.log('[useCases] Hook initialized');
  
  const [data, setData] = useState<CaseSummary[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[useCases] useEffect triggered - starting fetch');
    
    console.log('[useCases] Setting isLoading=true, error=null');
    setIsLoading(true);
    setError(null);
    
    console.log('[useCases] Calling fetch("/api/cases")...');
    const fetchStartTime = Date.now();
    
    // Relative path: Works in Vercel (same domain) and with Vite proxy (dev)
    fetch('/api/cases')
      .then((res) => {
        const fetchDuration = Date.now() - fetchStartTime;
        console.log(`[useCases] Fetch response received (${fetchDuration}ms):`, {
          ok: res.ok,
          status: res.status,
          statusText: res.statusText,
          headers: Object.fromEntries(res.headers.entries())
        });
        
        if (!res.ok) {
          console.error('[useCases] Response not OK, throwing error');
          throw new Error('Failed to fetch cases');
        }
        
        console.log('[useCases] Parsing JSON...');
        return res.json();
      })
      .then((json) => {
        console.log('[useCases] JSON parsed successfully:', {
          dataType: typeof json,
          isArray: Array.isArray(json),
          length: Array.isArray(json) ? json.length : 'N/A',
          data: json
        });
        
        console.log('[useCases] Setting data state:', json);
        setData(json);
        
        console.log('[useCases] Setting isLoading=false (success)');
        setIsLoading(false);
      })
      .catch((err) => {
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
      });
    
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
