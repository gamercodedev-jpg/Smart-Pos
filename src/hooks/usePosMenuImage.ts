import { useEffect, useState } from 'react';
import { resolvePosMenuImage } from '@/lib/posMenuImages';

export function usePosMenuImage(src?: string) {
  const [resolved, setResolved] = useState<string | undefined>(src);

  useEffect(() => {
    let cancelled = false;

    if (!src) {
      setResolved(undefined);
      return;
    }

    // Optimistically render original, then resolve if needed.
    setResolved(src);

    void (async () => {
      try {
        const next = await resolvePosMenuImage(src);
        if (!cancelled) setResolved(next);
      } catch {
        if (!cancelled) setResolved(src);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src]);

  return resolved;
}
