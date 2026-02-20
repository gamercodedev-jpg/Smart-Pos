import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBranding } from '@/contexts/BrandingContext';
import { cn } from '@/lib/utils';

const SESSION_KEY = 'mthunzi.welcome.seen.v1';

export function WelcomeGate() {
  const { settings } = useBranding();
  const location = useLocation();

  const shouldSkip = useMemo(() => {
    if (location.pathname.startsWith('/self-order/')) return true;
    if (location.search.includes('nowelcome=1')) return true;
    return false;
  }, [location.pathname, location.search]);

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (shouldSkip) return;
    try {
      const seen = sessionStorage.getItem(SESSION_KEY);
      setOpen(!seen);
    } catch {
      setOpen(true);
    }
  }, [shouldSkip]);

  const dismiss = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // ignore
    }
    setOpen(false);
  };

  if (shouldSkip || !open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0',
          'bg-[radial-gradient(1200px_circle_at_20%_30%,rgba(59,130,246,0.22),transparent_45%),radial-gradient(900px_circle_at_80%_60%,rgba(34,197,94,0.16),transparent_40%),linear-gradient(to_bottom_right,rgba(2,6,23,0.96),rgba(15,23,42,0.92))]'
        )}
      />
      <div className="absolute inset-0 backdrop-blur-[2px]" />

      {/* Content */}
      <div className="relative h-full w-full flex items-center justify-center p-6">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Mock tablet / POS visual */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative w-[min(520px,90vw)] aspect-[4/3] rounded-[28px] bg-white/10 border border-white/15 shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(600px_circle_at_30%_20%,rgba(255,255,255,0.16),transparent_55%),linear-gradient(to_bottom,rgba(255,255,255,0.10),rgba(255,255,255,0.03))]" />
              <div className="absolute inset-0 p-6">
                <div className="h-full rounded-2xl bg-black/30 border border-white/10 overflow-hidden">
                  <div className="h-12 border-b border-white/10 flex items-center justify-between px-4">
                    <div className="text-white/90 font-semibold">{settings.appName}</div>
                    <div className="h-7 w-24 rounded-md bg-white/10" />
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="h-24 rounded-lg bg-white/10" />
                        <div className="mt-3 h-3 w-2/3 rounded bg-white/15" />
                        <div className="mt-2 h-3 w-1/3 rounded bg-white/10" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Welcome bubble */}
          <div className="flex flex-col items-center lg:items-start">
            <div className="relative w-full max-w-xl">
              <div className="rounded-[22px] bg-white text-slate-900 shadow-2xl px-8 py-8">
                <div className="flex items-center gap-6">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
                    <UserRound className="h-8 w-8 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-4xl font-extrabold tracking-tight">Welcome!</div>
                    <div className="mt-1 text-slate-600 font-medium">{settings.appName}</div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 left-14 h-8 w-8 bg-white rotate-45 rounded-[6px] shadow-lg" />
            </div>

            <div className="mt-10 flex items-center gap-3">
              <Button
                onClick={dismiss}
                className="h-14 px-6 rounded-full bg-emerald-600 hover:bg-emerald-600/90 text-white"
              >
                <Check className="h-5 w-5 mr-2" />
                Enter
              </Button>
              <Button
                variant="outline"
                onClick={dismiss}
                className="h-14 px-6 rounded-full border-white/30 bg-white/10 text-white hover:bg-white/15"
              >
                Not now
              </Button>
            </div>

            <div className="mt-3 text-xs text-white/60">
              Tip: add `?nowelcome=1` to skip this screen.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
