import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/** Standalone route redirects to admin tab */
const RolesPermissions = () => {
  const { hasPermission } = useAuth();
  if (!hasPermission("roles.manage")) return <Navigate to="/intern" replace />;
  return <Navigate to="/intern/verwaltung" replace />;
};

export default RolesPermissions;
