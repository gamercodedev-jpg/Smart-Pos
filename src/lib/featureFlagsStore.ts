const STORAGE_KEY = 'mthunzi.featureFlags.v1';

type Listener = () => void;

export type FeatureFlagKey = 'intelligenceWorkspace';

export type FeatureFlagsStateV1 = {
  version: 1;
  flags: Partial<Record<FeatureFlagKey, boolean>>;
};

const DEFAULTS: FeatureFlagsStateV1 = {
  version: 1,
  flags: {
    intelligenceWorkspace: false,
  },
};

let state: FeatureFlagsStateV1 | null = null;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

function load(): FeatureFlagsStateV1 {
  if (state) return state;

  if (typeof window === 'undefined') {
    state = { ...DEFAULTS, flags: { ...DEFAULTS.flags } };
    return state;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<FeatureFlagsStateV1>;
      if (parsed?.version === 1 && parsed.flags && typeof parsed.flags === 'object') {
        state = {
          version: 1,
          flags: { ...DEFAULTS.flags, ...(parsed.flags as any) },
        };
        return state;
      }
    }
  } catch {
    // ignore
  }

  state = { ...DEFAULTS, flags: { ...DEFAULTS.flags } };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
  return state;
}

function save(next: FeatureFlagsStateV1) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  emit();
}

export function subscribeFeatureFlags(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getFeatureFlagsSnapshot(): FeatureFlagsStateV1 {
  return load();
}

export function isFeatureEnabled(key: FeatureFlagKey): boolean {
  return Boolean(load().flags[key]);
}

export function setFeatureEnabled(key: FeatureFlagKey, enabled: boolean) {
  const cur = load();
  const next: FeatureFlagsStateV1 = {
    version: 1,
    flags: {
      ...cur.flags,
      [key]: enabled,
    },
  };
  save(next);
}

// Cross-tab sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;

    const nextRaw = e.newValue;
    if (!nextRaw) {
      state = { ...DEFAULTS, flags: { ...DEFAULTS.flags } };
      emit();
      return;
    }

    try {
      const parsed = JSON.parse(nextRaw) as Partial<FeatureFlagsStateV1>;
      if (parsed?.version === 1 && parsed.flags && typeof parsed.flags === 'object') {
        state = {
          version: 1,
          flags: { ...DEFAULTS.flags, ...(parsed.flags as any) },
        };
        emit();
      }
    } catch {
      // ignore
    }
  });
}
