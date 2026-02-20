import { useAuth } from '@/contexts/AuthContext';
import type { RolePermissions } from '@/types/auth';

type Props = {
  permission: keyof RolePermissions;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export default function RequirePermission({ permission, children, fallback = null }: Props) {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) return <>{fallback}</>;
  return <>{children}</>;
}
