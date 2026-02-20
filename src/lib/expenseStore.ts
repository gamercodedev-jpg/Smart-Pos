import type { Expense, ExpenseCategory } from '@/types';
import { logSensitiveAction } from '@/lib/systemAuditLog';

const STORAGE_KEY = 'mthunzi.expenses.v1';

type ExpenseStateV1 = {
  version: 1;
  expenses: Expense[];
};

type Listener = () => void;

const listeners = new Set<Listener>();
let cached: ExpenseStateV1 | null = null;

function emit() {
  for (const l of listeners) l();
}

function load(): ExpenseStateV1 {
  if (cached) return cached;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<ExpenseStateV1>;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.expenses)) {
        cached = { version: 1, expenses: parsed.expenses as Expense[] };
        return cached;
      }
    } catch {
      // ignore
    }
  }

  cached = { version: 1, expenses: [] };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  return cached;
}

function save(state: ExpenseStateV1) {
  cached = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  emit();
}

export function subscribeExpenses(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getExpensesSnapshot(): Expense[] {
  return load().expenses;
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function dateKeyLocal(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function addExpense(params: {
  date?: string;
  category: ExpenseCategory;
  amount: number;
  description?: string;
  createdBy?: string;
  createdById?: string;
}): Expense {
  const state = load();
  const now = new Date();

  const amount = round2(Number.isFinite(params.amount) ? params.amount : 0);

  const expense: Expense = {
    id: `exp-${crypto.randomUUID()}`,
    date: params.date ?? dateKeyLocal(now),
    category: params.category,
    amount,
    description: params.description?.trim() ? params.description.trim() : undefined,
    createdAt: now.toISOString(),
  };

  save({ ...state, expenses: [expense, ...state.expenses] });

  try {
    void logSensitiveAction({
      userId: params.createdById ?? (params.createdBy ? `user:${params.createdBy}` : 'system'),
      userName: params.createdBy ?? 'System',
      actionType: 'expense_add',
      reference: expense.id,
      newValue: expense.amount,
      notes: `${expense.date} • ${expense.category} • ${expense.description ?? 'Expense'}`,
      captureGeo: false,
    });
  } catch {
    // ignore
  }

  return expense;
}

export function updateExpense(expenseId: string, patch: Partial<Omit<Expense, 'id' | 'createdAt'>>) {
  const state = load();
  const before = state.expenses.find((e) => e.id === expenseId) ?? null;
  const next = state.expenses.map((e) => (e.id === expenseId ? { ...e, ...patch } : e));
  save({ ...state, expenses: next });

  try {
    const after = next.find((e) => e.id === expenseId) ?? null;
    if (before && after) {
      void logSensitiveAction({
        userId: 'system',
        userName: 'System',
        actionType: 'expense_update',
        reference: after.id,
        previousValue: before.amount,
        newValue: after.amount,
        notes: `${after.date} • ${after.category} updated`,
        captureGeo: false,
      });
    }
  } catch {
    // ignore
  }
}

export function deleteExpense(expenseId: string) {
  const state = load();
  const toDelete = state.expenses.find((e) => e.id === expenseId) ?? null;
  save({ ...state, expenses: state.expenses.filter((e) => e.id !== expenseId) });

  try {
    if (toDelete) {
      void logSensitiveAction({
        userId: 'system',
        userName: 'System',
        actionType: 'expense_delete',
        reference: toDelete.id,
        previousValue: toDelete.amount,
        notes: `${toDelete.date} • ${toDelete.category} deleted`,
        captureGeo: false,
      });
    }
  } catch {
    // ignore
  }
}

export function resetExpenses() {
  save({ version: 1, expenses: [] });
}
