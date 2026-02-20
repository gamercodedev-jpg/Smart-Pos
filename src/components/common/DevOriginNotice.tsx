import { useMemo, useState } from 'react';
import { Wifi } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

function isLocalhostHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
}

export function DevOriginNotice() {
  const [dismissed, setDismissed] = useState(false);

  const info = useMemo(() => {
    if (typeof window === 'undefined') return null;
    if (import.meta.env.PROD) return null;

    const { protocol, hostname, port, pathname, search, hash } = window.location;

    // Only show if using an IP/host that isn't localhost. This avoids confusion about
    // why POS menu items "disappear" (storage is per-origin).
    if (isLocalhostHost(hostname)) return null;

    const localhostUrl = `${protocol}//localhost${port ? `:${port}` : ''}${pathname}${search}${hash}`;
    const origin = `${protocol}//${hostname}${port ? `:${port}` : ''}`;

    return { localhostUrl, origin };
  }, []);

  if (!info || dismissed) return null;

  return (
    <div className="p-4 md:p-6">
      <Alert className="border-primary/25 bg-primary/5">
        <Wifi className="h-4 w-4" />
        <AlertTitle>Using a network URL (dev)</AlertTitle>
        <AlertDescription>
          <div className="space-y-3">
            <p>
              You opened the app on <span className="font-medium">{info.origin}</span>. POS menu data is stored per URL, so
              products saved on <span className="font-medium">localhost</span> won’t appear here (and vice-versa).
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => (window.location.href = info.localhostUrl)}>
                Open on localhost
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDismissed(true)}>
                Dismiss
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
