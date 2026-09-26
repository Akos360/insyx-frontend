import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";

export default function RequireAuth() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;

  return <Outlet />;
}
