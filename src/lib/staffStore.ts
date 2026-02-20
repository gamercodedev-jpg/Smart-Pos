import type { User } from '@/types/auth';

const STORAGE_KEY = 'pmx.staffUsers.v1';

export const DEFAULT_STAFF_USERS: User[] = [
  { id: '1', name: 'John K Mumba', email: 'john@bravo.zm', role: 'owner', pin: '1234', isActive: true, createdAt: '2025-01-01' },
  { id: '2', name: 'Mary Manager', email: 'mary@bravo.zm', role: 'manager', pin: '5678', isActive: true, createdAt: '2025-01-01' },
  { id: '3', name: 'jannifer c', email: 'jannifer@bravo.zm', role: 'waitron', pin: '1111', isActive: true, createdAt: '2025-01-01' },
  { id: '4', name: 'charles-driv', email: 'charles@bravo.zm', role: 'waitron', pin: '2222', isActive: true, createdAt: '2025-01-01' },
  { id: '5', name: 'Kitchen Lead', email: 'kitchen@bravo.zm', role: 'kitchen_staff', pin: '3333', isActive: true, createdAt: '2025-01-01' },
  { id: '6', name: 'Bar Staff', email: 'bar@bravo.zm', role: 'bar_staff', pin: '4444', isActive: true, createdAt: '2025-01-01' },
];

export const getStaffUsers = (): User[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STAFF_USERS;
    const parsed = JSON.parse(raw) as User[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_STAFF_USERS;
  } catch {
    return DEFAULT_STAFF_USERS;
  }
};

export const saveStaffUsers = (users: User[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
};

export const ensureStaffUsersSeeded = () => {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) saveStaffUsers(DEFAULT_STAFF_USERS);
};
