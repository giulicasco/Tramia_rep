import { useQuery } from "@tanstack/react-query";
import { authApi } from "./api";

// Hook to get current user and organization
export function useAuth() {
  return useQuery({
    queryKey: ["/auth/me"],
    queryFn: authApi.getMe,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

// Hook to check if user has required role
export function useHasRole(requiredRole: string) {
  const { data: auth } = useAuth();
  const role = auth?.user?.role;
  return role === requiredRole || role === "admin" || false;
}

// Hook to check if user can perform action
export function useCanPerform(action: string) {
  const { data: auth } = useAuth();
  const role = auth?.user?.role;
  
  // Simple permission mapping - in production this would be more sophisticated
  const permissions = {
    "view:conversations": ["viewer", "operator", "admin"],
    "edit:agents": ["operator", "admin"],
    "manage:integrations": ["admin"],
    "view:reports": ["viewer", "operator", "admin"],
    "manage:settings": ["admin"],
  };

  const allowedRoles = permissions[action as keyof typeof permissions] || [];
  return allowedRoles.includes(role) || false;
}

// Utility function to get display name initials
export function getInitials(name?: string): string {
  if (!name) return "U";
  return name
    .split(" ")
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

// Utility function to format user role for display
export function formatRole(role: string): string {
  const roleMap = {
    admin: "Administrador",
    operator: "Operador",
    viewer: "Visualizador",
  };
  return roleMap[role as keyof typeof roleMap] || role;
}
