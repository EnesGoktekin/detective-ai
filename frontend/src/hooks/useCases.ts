import { useState, useEffect } from 'react';

// contracts.ts dosyasında CaseSummary interface'inin tanımlandığını varsayıyoruz.
// Bu interface, Backend'den gelen camelCase veriyi yansıtmalıdır.
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
          // Backend'den gelen hata mesajını yakalamaya çalış
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch cases: ${response.status}`);
        }

        const casesData: CaseSummary[] = await response.json();
        setData(casesData);
        setError(null); // Başarılı olduğunda hatayı temizle
      } catch (err: any) {
        console.error("Error fetching cases:", err);
        // Hata nesnesinden mesajı güvenli şekilde al
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