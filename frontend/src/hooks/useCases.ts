import { useState, useEffect } from 'react';

// Backend'den gelen camelCase yapıya uyan temel arayüz
interface CaseSummary {
  id: string;
  caseNumber: number;
  title: string;
  synopsis: string;
  createdAt: string;
}

interface UseCasesResult {
  data: CaseSummary[] | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook to fetch case summaries from the backend API.
 */
export function useCases(): UseCasesResult {
  const [data, setData] = useState<CaseSummary[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/cases');

        if (!response.ok) {
          // Hata durumunda bile yanıtı okumayı dene
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch cases: ${response.status}`);
        }

        const casesData: CaseSummary[] = await response.json();
        setData(casesData);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching cases:", err);
        setError(err.message || 'An unexpected error occurred during fetch.');
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCases();
  }, []);

  return { data, isLoading, error };
}
