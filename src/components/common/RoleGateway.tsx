import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Crown, ShieldCheck, UserRound, Delete, X, Lock, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useBranding } from '@/contexts/BrandingContext';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/auth';
import { cn } from '@/lib/utils';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

const SESSION_KEY = 'mthunzi.gateway.seen.v1';
const SECURITY_LOG_KEY = 'mthunzi.security.log.v1';
const VIOLATIONS_KEY = 'mthunzi.security.violations.v1';

type GatewayRole = {
  id: 'owner' | 'manager' | 'waitron';
  label: string;
  accent: string;
  glow: string;
  ring: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  permissions: string[];
  route: string;
};

const ROLES: GatewayRole[] = [
  {
    id: 'owner',
    label: 'OWNER',
    accent: 'from-amber-300/35 via-sky-400/20 to-indigo-500/25',
    glow: 'shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_18px_70px_rgba(59,130,246,0.18),0_10px_40px_rgba(251,191,36,0.12)]',
    ring: 'focus-visible:ring-amber-200/50',
    icon: Crown,
    description: 'Full access to everything.',
    permissions: ['Dashboard', 'POS', 'Inventory', 'Staff', 'Reports', 'Settings'],
    route: '/admin/dashboard',
  },
  {
    id: 'manager',
    label: 'MANAGER',
    accent: 'from-emerald-400/25 via-teal-300/15 to-emerald-500/20',
    glow: 'shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_18px_60px_rgba(16,185,129,0.16)]',
    ring: 'focus-visible:ring-emerald-200/50',
    icon: ShieldCheck,
    description: 'POS + Inventory + Staff reports.',
    permissions: ['POS', 'Inventory', 'Reports'],
    route: '/management/inventory',
  },
  {
    id: 'waitron',
    label: 'WAITER',
    accent: 'from-slate-200/15 via-sky-300/15 to-blue-500/20',
    glow: 'shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_18px_60px_rgba(59,130,246,0.14)]',
    ring: 'focus-visible:ring-sky-200/50',
    icon: UserRound,
    description: 'POS Terminal only.',
    permissions: ['POS Terminal'],
    route: '/pos/terminal',
  },
];

type SecurityLogEntry = {
  id: string;
  role: GatewayRole['id'];
  name: string;
  at: string; // ISO
};

function readSecurityLog(): SecurityLogEntry[] {
  try {
    const raw = localStorage.getItem(SECURITY_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SecurityLogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSecurityLog(next: SecurityLogEntry[]) {
  try {
    localStorage.setItem(SECURITY_LOG_KEY, JSON.stringify(next.slice(0, 3)));
  } catch {
    // ignore
  }
}

function formatLogTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatNow(d: Date) {
  const date = d.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${date} • ${time}`;
}

function PinDots({ value, shake }: { value: string; shake: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-3',
        shake && 'animate-[shake_300ms_ease-in-out_1]'
      )}
    >
      {Array.from({ length: 4 }).map((_, idx) => {
        const filled = idx < value.length;
        return (
          <div
            key={idx}
            className={cn(
              'h-3.5 w-3.5 rounded-full border',
              filled ? 'bg-white border-white/70' : 'bg-white/10 border-white/25'
            )}
          />
        );
      })}
    </div>
  );
}

function KeyButton({
  children,
  onClick,
  variant = 'ghost',
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'ghost' | 'outline';
}) {
  return (
    <Button
      type="button"
      variant={variant}
      onClick={onClick}
      className={cn(
        'h-14 w-14 rounded-2xl',
        'bg-white/10 hover:bg-white/15 border border-white/10 text-white'
      )}
    >
      {children}
    </Button>
  );
}

function vibrateTick() {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(8);
    }
  } catch {
    // ignore
  }
}

function playSuccessChime() {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;

    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    o1.type = 'sine';
    o2.type = 'triangle';
    o1.frequency.setValueAtTime(880, now);
    o2.frequency.setValueAtTime(1320, now);
    o2.detune.setValueAtTime(-8, now);

    o1.connect(g);
    o2.connect(g);
    g.connect(ctx.destination);

    o1.start(now);
    o2.start(now);
    o1.stop(now + 0.23);
    o2.stop(now + 0.23);

    window.setTimeout(() => {
      void ctx.close();
    }, 300);
  } catch {
    // ignore
  }
}

function DashboardGhost() {
  return (
    <div className="relative w-[min(560px,92vw)] aspect-[4/3] rounded-[28px] bg-white/8 border border-white/12 shadow-2xl overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(700px_circle_at_30%_20%,rgba(255,255,255,0.14),transparent_55%),linear-gradient(to_bottom,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
      <div className="absolute inset-0 p-6">
        <div className="h-full rounded-2xl bg-black/25 border border-white/10 overflow-hidden">
          <div className="h-12 border-b border-white/10 flex items-center justify-between px-4">
            <div className="text-white/90 font-semibold">Management Overview</div>
            <div className="h-7 w-28 rounded-md bg-white/10" />
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="h-14 rounded-lg bg-white/10" />
                <div className="mt-3 h-3 w-2/3 rounded bg-white/15" />
                <div className="mt-2 h-3 w-1/3 rounded bg-white/10" />
              </div>
            ))}
            <div className="col-span-2 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="h-28 rounded-lg bg-white/10" />
              <div className="mt-3 h-3 w-1/2 rounded bg-white/12" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RoleGateway() {
  const { settings } = useBranding();
  const { allUsers, switchUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const shouldSkip = useMemo(() => {
    if (location.pathname.startsWith('/self-order/')) return true;
    if (location.search.includes('nogateway=1')) return true;
    return false;
  }, [location.pathname, location.search]);

  const [open, setOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<GatewayRole | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState<Record<GatewayRole['id'], number>>({ owner: 0, manager: 0, waitron: 0 });
  const [securityLog, setSecurityLog] = useState<SecurityLogEntry[]>(() => readSecurityLog());
  const [lockedOut, setLockedOut] = useState(false);
  const [showViolationHint, setShowViolationHint] = useState(false);
  const [captureBusy, setCaptureBusy] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const lockTimeoutRef = useRef<number | null>(null);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

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

  const closePin = () => {
    setSelectedRole(null);
    setPin('');
    setPinError(null);
    setShake(false);
    setShowViolationHint(false);
  };

  const appendDigit = useCallback(
    (d: string) => {
      if (lockedOut) return;
      vibrateTick();
      setPinError(null);
      setShake(false);
      setPin((prev) => {
        if (prev.length >= 4) return prev;
        return prev + d;
      });
    },
    [lockedOut]
  );

  const backspace = () => {
    if (lockedOut) return;
    vibrateTick();
    setPinError(null);
    setShake(false);
    setPin((prev) => prev.slice(0, -1));
  };

  const clear = () => {
    if (lockedOut) return;
    vibrateTick();
    setPinError(null);
    setShake(false);
    setPin('');
  };

  const recordSuccessfulLogin = useCallback((role: GatewayRole, name: string) => {
    const entry: SecurityLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      role: role.id,
      name,
      at: new Date().toISOString(),
    };
    const next = [entry, ...readSecurityLog()].slice(0, 3);
    writeSecurityLog(next);
    setSecurityLog(next);
  }, []);

  const recordSecurityViolation = useCallback(async (role: GatewayRole, reason: string, photoBase64?: string | null) => {
    const payload = {
      id: `v-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      role: role.id,
      reason,
      at: new Date().toISOString(),
      path: location.pathname,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      photo_base64: photoBase64 ?? null,
    };

    // Local fallback
    try {
      const raw = localStorage.getItem(VIOLATIONS_KEY);
      const list = raw ? (JSON.parse(raw) as any[]) : [];
      const next = [payload, ...(Array.isArray(list) ? list : [])].slice(0, 20);
      localStorage.setItem(VIOLATIONS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }

    // Optional Supabase write (if you later add a table)
    try {
      if (isSupabaseConfigured() && supabase) {
        await supabase.schema('erp').from('security_violations').insert({
          role: payload.role,
          reason: payload.reason,
          occurred_at: payload.at,
          path: payload.path,
          user_agent: payload.user_agent,
          photo_base64: payload.photo_base64,
        });
      }
    } catch {
      // ignore
    }
  }, [location.pathname]);

  const captureWebcamPhoto = useCallback(async (): Promise<string> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera is not available on this device/browser.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    try {
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();

      // Wait a moment for exposure/auto-focus.
      await new Promise((r) => window.setTimeout(r, 250));

      const w = Math.max(1, video.videoWidth || 640);
      const h = Math.max(1, video.videoHeight || 480);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Unable to capture camera frame.');
      ctx.drawImage(video, 0, 0, w, h);

      return canvas.toDataURL('image/jpeg', 0.72);
    } finally {
      stream.getTracks().forEach((t) => t.stop());
    }
  }, []);

  const tryUnlock = useCallback(
    (role: GatewayRole, entered: string) => {
      const match = allUsers.find((u) => u.role === (role.id as UserRole) && u.pin === entered && u.isActive);
      if (!match) {
        setAttempts((prev) => {
          const nextCount = (prev[role.id] ?? 0) + 1;
          // Lock out briefly after 3 failures to feel "bank-grade".
          if (nextCount >= 3) {
            setLockedOut(true);
            setShowViolationHint(true);
            void recordSecurityViolation(role, '3x incorrect PIN');
            if (lockTimeoutRef.current) window.clearTimeout(lockTimeoutRef.current);
            lockTimeoutRef.current = window.setTimeout(() => setLockedOut(false), 12_000);
          }
          return { ...prev, [role.id]: nextCount };
        });
        setPinError('Incorrect PIN');
        setShake(true);
        window.setTimeout(() => setShake(false), 350);
        setPin('');
        return;
      }

      switchUser(match.id);
      playSuccessChime();
      recordSuccessfulLogin(role, match.name);
      setAttempts((prev) => ({ ...prev, [role.id]: 0 }));
      dismiss();
      closePin();
      navigate(role.route);
    },
    [allUsers, dismiss, navigate, recordSuccessfulLogin, switchUser, recordSecurityViolation]
  );

  useEffect(() => {
    if (!selectedRole) return;
    if (pin.length !== 4) return;
    tryUnlock(selectedRole, pin);
  }, [pin, selectedRole, tryUnlock]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!selectedRole) return;
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        appendDigit(e.key);
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        backspace();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closePin();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [appendDigit, open, selectedRole]);

  useEffect(() => {
    return () => {
      if (lockTimeoutRef.current) window.clearTimeout(lockTimeoutRef.current);
    };
  }, []);

  if (shouldSkip || !open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Frosted overlay that blurs the live app underneath */}
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-xl" />
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_25%,rgba(59,130,246,0.25),transparent_55%),radial-gradient(900px_circle_at_85%_70%,rgba(16,185,129,0.18),transparent_50%),radial-gradient(800px_circle_at_55%_45%,rgba(251,191,36,0.12),transparent_60%)]" />

      {/* Corner clock */}
      <div className="absolute top-4 right-4 z-[101] text-white/80 text-xs sm:text-sm font-medium">
        {formatNow(now)}
      </div>

      {/* Security log */}
      <div className="absolute bottom-4 right-4 z-[101] w-[min(340px,92vw)]">
        <div className="rounded-2xl border border-white/12 bg-white/8 backdrop-blur-2xl p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="text-white/80 text-xs font-semibold tracking-[0.18em]">SECURITY LOG</div>
            <ShieldAlert className="h-4 w-4 text-white/60" />
          </div>
          <div className="mt-3 space-y-2">
            {securityLog.length === 0 ? (
              <div className="text-white/55 text-sm">No recent logins yet.</div>
            ) : (
              securityLog.slice(0, 3).map((e) => (
                <div key={e.id} className="flex items-center justify-between text-sm">
                  <div className="text-white/80 truncate">
                    <span className="font-semibold">{e.role.toUpperCase()}</span>{' '}
                    <span className="text-white/70">{e.name}</span>
                  </div>
                  <div className="text-white/55 tabular-nums">{formatLogTime(e.at)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative h-full w-full flex items-center justify-center p-6">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Blurred dashboard ghost */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              <div className="absolute -inset-4 blur-2xl opacity-40 bg-[radial-gradient(closest-side,rgba(59,130,246,0.25),transparent),radial-gradient(closest-side,rgba(16,185,129,0.22),transparent)]" />
              <div className="relative filter blur-[0.6px] saturate-125">
                <DashboardGhost />
              </div>
            </div>
          </div>

          {/* Gateway panel */}
          <div className="flex flex-col items-center lg:items-start">
            <div className="w-full max-w-xl">
              <div className="rounded-[26px] border border-white/15 bg-white/10 backdrop-blur-2xl shadow-2xl p-7">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
                    <Lock className="h-6 w-6 text-white/80" />
                  </div>
                  <div>
                    <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">Welcome!</div>
                    <div className="mt-1 text-white/65 font-medium">{settings.appName} • Select your role</div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {ROLES.map((r) => {
                    const Icon = r.icon;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setSelectedRole(r);
                          setPin('');
                          setPinError(null);
                          setShake(false);
                          setShowViolationHint(false);
                        }}
                        className={cn(
                          'group relative text-left rounded-2xl p-4 border border-white/15 bg-white/8 backdrop-blur-xl',
                          'transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25',
                          r.ring,
                          r.glow
                        )}
                      >
                        <div className={cn('absolute inset-0 rounded-2xl bg-gradient-to-br opacity-75', r.accent)} />
                        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-[radial-gradient(800px_circle_at_30%_20%,rgba(255,255,255,0.16),transparent_55%)]" />
                        <div className="relative">
                          <div className="flex items-center justify-between">
                            <div className="h-10 w-10 rounded-2xl bg-black/20 border border-white/15 flex items-center justify-center">
                              <Icon className="h-5 w-5 text-white/90" />
                            </div>
                            <div className="text-[10px] font-semibold tracking-[0.24em] text-white/80">{r.label}</div>
                          </div>
                          <div className="mt-3 text-sm font-semibold text-white">{r.description}</div>
                          <div className="mt-2 text-[11px] text-white/65 leading-5">
                            {r.permissions.join(' · ')}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={dismiss}
                    className="h-12 px-5 rounded-full border-white/25 bg-white/8 text-white hover:bg-white/12"
                  >
                    Not now
                  </Button>
                  <div className="text-xs text-white/55">Tip: add `?nogateway=1` to skip this screen.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PIN dialog */}
      <Dialog open={!!selectedRole} onOpenChange={(o) => (!o ? closePin() : undefined)}>
        <DialogContent className="max-w-md border-white/15 bg-white/10 backdrop-blur-2xl text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-white/70">Enter 4-digit PIN for</div>
              <div className="mt-1 text-2xl font-extrabold tracking-tight">{selectedRole?.label}</div>
            </div>
            <Button
              variant="ghost"
              onClick={closePin}
              className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/15 text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="mt-6">
            <PinDots value={pin} shake={shake} />
            {pinError ? (
              <div className="mt-3 text-sm text-rose-200">{pinError}</div>
            ) : (
              <div className="mt-3 text-sm text-white/55">Use keypad or keyboard</div>
            )}

            {selectedRole ? (
              <div className="mt-3 text-xs text-white/55">
                Attempts: <span className="text-white/75 tabular-nums">{attempts[selectedRole.id] ?? 0}</span>/3
              </div>
            ) : null}

            {lockedOut ? (
              <div className="mt-3 text-sm text-amber-100">Temporarily locked. Try again in a few seconds.</div>
            ) : null}

            {showViolationHint ? (
              <div className="mt-3 text-xs text-white/55 space-y-2">
                <div>A security incident was logged. You can optionally capture a photo (with permission) for evidence.</div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={captureBusy}
                    onClick={async () => {
                      if (!selectedRole) return;
                      setCaptureError(null);
                      setCaptureBusy(true);
                      try {
                        const photo = await captureWebcamPhoto();
                        await recordSecurityViolation(selectedRole, 'Manual camera capture after lockout', photo);
                      } catch (e) {
                        setCaptureError(e instanceof Error ? e.message : 'Camera capture failed.');
                      } finally {
                        setCaptureBusy(false);
                      }
                    }}
                    className="h-9 rounded-full border-white/25 bg-white/8 text-white hover:bg-white/12"
                  >
                    {captureBusy ? 'Capturing…' : 'Capture photo'}
                  </Button>
                </div>
                {captureError ? <div className="text-rose-200">{captureError}</div> : null}
              </div>
            ) : null}
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 justify-items-center">
            {[...'123456789'].map((d) => (
              <KeyButton key={d} onClick={() => appendDigit(d)}>
                <span className="text-lg font-semibold">{d}</span>
              </KeyButton>
            ))}
            <KeyButton onClick={clear}>
              <span className="text-xs font-semibold">CLEAR</span>
            </KeyButton>
            <KeyButton onClick={() => appendDigit('0')}>
              <span className="text-lg font-semibold">0</span>
            </KeyButton>
            <KeyButton onClick={backspace}>
              <Delete className="h-5 w-5" />
            </KeyButton>
          </div>
        </DialogContent>
      </Dialog>

      {/* Keyframes */}
      <style>{`
        @keyframes shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          50% { transform: translateX(6px); }
          75% { transform: translateX(-4px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
