import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/** Standalone route redirects to admin tab */
const AuditLog = () => {
  const { hasPermission } = useAuth();
  if (!hasPermission("audit.view")) return <Navigate to="/intern" replace />;
  return <Navigate to="/intern/verwaltung" replace />;
};

export default AuditLog;
