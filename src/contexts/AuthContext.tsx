import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { User, UserRole, RolePermissions, ROLE_PERMISSIONS } from '@/types/auth';
import { ensureStaffUsersSeeded, getStaffUsers, saveStaffUsers } from '@/lib/staffStore';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  permissions: RolePermissions | null;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithPin: (pin: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: keyof RolePermissions) => boolean;
  switchUser: (userId: string) => void;
  allUsers: User[];

  // Staff Admin (CRUD)
  createUser: (user: Omit<User, 'id' | 'createdAt'>) => User;
  updateUser: (userId: string, patch: Partial<Omit<User, 'id' | 'createdAt'>>) => void;
  deleteUser: (userId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const SESSION_USER_KEY = 'mthunzi.session.userId.v1';

  const [users, setUsers] = useState<User[]>(() => {
    ensureStaffUsersSeeded();
    return getStaffUsers();
  });

  const defaultUser = useMemo(() => users.find(u => u.role === 'owner') ?? users[0] ?? null, [users]);
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedId = localStorage.getItem(SESSION_USER_KEY);
      if (savedId) {
        const found = getStaffUsers().find(u => u.id === savedId);
        if (found && found.isActive) return found;
      }
    } catch {
      // ignore
    }
    return null;
  });

  useEffect(() => {
    // Keep current user in sync if edited/disabled.
    if (!user) {
      console.warn("AuthProvider: No user found in localStorage or users list.");
    }
    const refreshed = users.find(u => u.id === user.id) ?? null;
    if (refreshed && refreshed.isActive) setUser(refreshed);
    if (!refreshed || !refreshed.isActive) setUser(defaultUser);
  }, [users, user, defaultUser]);

  useEffect(() => {
    try {
      if (user?.id) localStorage.setItem(SESSION_USER_KEY, user.id);
      else localStorage.removeItem(SESSION_USER_KEY);
    } catch {
      // ignore
    }
  }, [user]);

  const permissions = user ? ROLE_PERMISSIONS[user.role] : null;
  
  const login = useCallback(async (email: string, _password: string): Promise<boolean> => {
    const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (foundUser && foundUser.isActive) {
      setUser(foundUser);
      return true;
    }
    return false;
  }, [users]);
  
  const loginWithPin = useCallback(async (pin: string): Promise<boolean> => {
    const foundUser = users.find(u => u.pin === pin);
    if (foundUser && foundUser.isActive) {
      setUser(foundUser);
      return true;
    }
    return false;
  }, [users]);
  
  const logout = useCallback(() => {
    setUser(null);
  }, []);
  
  const hasPermission = useCallback((permission: keyof RolePermissions): boolean => {
    if (!permissions) return false;
    return permissions[permission];
  }, [permissions]);
  
  const switchUser = useCallback((userId: string) => {
    const foundUser = users.find(u => u.id === userId);
    if (foundUser && foundUser.isActive) {
      setUser(foundUser);
    }
  }, [users]);

  const createUser = useCallback((newUser: Omit<User, 'id' | 'createdAt'>): User => {
    const created: User = {
      ...newUser,
      id: `u-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setUsers(prev => {
      const next = [created, ...prev];
      saveStaffUsers(next);
      return next;
    });
    return created;
  }, []);

  const updateUser = useCallback((userId: string, patch: Partial<Omit<User, 'id' | 'createdAt'>>) => {
    setUsers(prev => {
      const next = prev.map(u => (u.id === userId ? { ...u, ...patch } : u));
      saveStaffUsers(next);
      return next;
    });
  }, []);

  const deleteUser = useCallback((userId: string) => {
    setUsers(prev => {
      const next = prev.filter(u => u.id !== userId);
      saveStaffUsers(next);
      return next;
    });

    setUser(prev => (prev?.id === userId ? null : prev));
  }, []);
  
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        permissions,
        login,
        loginWithPin,
        logout,
        hasPermission,
        switchUser,
        allUsers: users,
        createUser,
        updateUser,
        deleteUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
