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
    // Carry where they were headed. The Access denied screen uses it to name
    // the module and offer the demo logins that DO open it, which is far more
    // use than "your role doesn't have permission" on its own.
    const attempted = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/unauthorized" replace state={{ from: attempted }} />;
  }
  return <Outlet />;
}
