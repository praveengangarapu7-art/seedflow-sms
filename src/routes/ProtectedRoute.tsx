import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

import { hasPermission, type Permission } from '@/utils/permissions';

interface ProtectedRouteProps {
  permission?: Permission;
}

export function ProtectedRoute({ permission }: ProtectedRouteProps = {}) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Carry the attempted URL so signing in lands on it — this is what makes a
    // locked search result open straight after login.
    const attempted = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(attempted)}`} replace />;
  }

  if (permission && user && !hasPermission(user.role, permission)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <Outlet />;
}
