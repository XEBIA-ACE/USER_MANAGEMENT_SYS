import { Navigate, Outlet, useLocation } from "react-router";
import { getSessionToken } from "../lib/session";

export function RequireAuth() {
  const location = useLocation();
  const token = getSessionToken();

  if (!token) {
    return <Navigate to="/auth/idp-select" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
