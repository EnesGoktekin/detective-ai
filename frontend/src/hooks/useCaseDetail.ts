import { useEffect, useState } from 'react';
import type { CaseDetail } from '../types/contracts';

interface UseCaseDetailResult {
  data: CaseDetail | null;
  isLoading: boolean;
  error: string | null;
}

export function useCaseDetail(caseId: string): UseCaseDetailResult {
  const [data, setData] = useState<CaseDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!caseId) {
      setData(null);
      setIsLoading(false);
      setError('No caseId provided');
      return;
    }

    let cancelled = false;

    async function fetchDetail() {
      setIsLoading(true);
      setError(null);
      try {
  const res = await fetch(`/api/cases/${caseId}`);
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `Failed to fetch case ${caseId}`);
        }
        const json: CaseDetail = await res.json();
        if (!cancelled) {
          setData(json);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? 'Unknown error');
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchDetail();

    return () => {
      cancelled = true;
    };
  }, [caseId]);

  return { data, isLoading, error };
}
