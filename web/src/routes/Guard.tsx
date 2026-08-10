import { memo } from "react";
import { Navigate, matchRoutes, useLocation } from "react-router-dom";
import { useUserStore } from "@/stores/useUserStore";
import { routes } from "./routes";

const WHITE_LIST = ["/login", "/403", "/404", "/user", "/admin"];

type RouteHandle = { permission?: string };

const getRequiredPermission = (pathname: string): string | undefined => {
  const matches = matchRoutes(routes, pathname);
  if (!matches) return undefined;

  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const handle = matches[i].route.handle as RouteHandle | undefined;
    if (handle?.permission) return handle.permission;
  }

  return undefined;
};

export const Guard = memo(function Guard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token, permissions, userInfo, _hasHydrated, permissionsLoaded } =
    useUserStore();
  const location = useLocation();
  const normalizedPath = location.pathname.replace(/\/+$/, "") || "/";

  if (!_hasHydrated) {
    return null;
  }

  if (!token && normalizedPath !== "/login") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (token && normalizedPath === "/login") {
    const userRoles = userInfo?.roles || [];
    const isAdmin =
      userRoles.includes("管理员") || userRoles.includes("超级管理员");
    const redirectPath = isAdmin ? "/admin" : "/user";
    return <Navigate to={redirectPath} replace />;
  }

  if (
    token &&
    !permissionsLoaded &&
    !WHITE_LIST.some((path) => normalizedPath.startsWith(path))
  ) {
    return null;
  }

  const userRoles = userInfo?.roles || [];
  const isUser = userRoles.includes("普通用户");
  const isAdmin =
    userRoles.includes("管理员") || userRoles.includes("超级管理员");

  if (token && isUser && normalizedPath.startsWith("/admin")) {
    return <Navigate to="/user" replace />;
  }

  if (token && isAdmin && normalizedPath === "/") {
    return <Navigate to="/admin" replace />;
  }

  if (
    token &&
    permissions.length > 0 &&
    !normalizedPath.startsWith("/user") &&
    !normalizedPath.startsWith("/admin")
  ) {
    const requiredPermission = getRequiredPermission(normalizedPath);
    if (requiredPermission && !permissions.includes(requiredPermission)) {
      return <Navigate to="/403" replace />;
    }
  }

  return <>{children}</>;
});
