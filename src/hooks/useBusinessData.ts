import { useCallback, useEffect, useState } from 'react';
import { fetchBusinessData } from '../lib/api';
import { errorMessage } from '../lib/format';
import type { BusinessData } from '../lib/types';

export function useBusinessData() {
  const [data, setData] = useState<BusinessData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchBusinessData());
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload };
}
