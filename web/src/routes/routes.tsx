import { type RouteObject } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";
import { userRoutes } from "./modules/user";
import { adminRoutes } from "./modules/admin";
import UserLayout from "@/components/layout/UserLayout";
import { NotFoundPage } from "@/pages/exception/404";
import { ForbiddenPage } from "@/pages/exception/403";
import { useUserStore } from "@/stores/useUserStore";

const Login = lazy(() =>
  import("@/pages/login").then((m) => ({ default: m.LoginPage })),
);

const LoginFallback = () => null;

// 根路径：按登录态与角色重定向（避免直接命中 404）
const HomeRedirect = () => {
  const { token, userInfo } = useUserStore();
  if (!token) return <Navigate to="/login" replace />;
  const roles = userInfo?.roles || [];
  const isAdmin = roles.includes("管理员") || roles.includes("超级管理员");
  return <Navigate to={isAdmin ? "/admin" : "/user"} replace />;
};

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <HomeRedirect />,
  },
  {
    path: "/login",
    element: (
      <Suspense fallback={<LoginFallback />}>
        <Login />
      </Suspense>
    ),
  },
  {
    path: "/403",
    element: <ForbiddenPage />,
  },
  ...adminRoutes,
  {
    path: "/user",
    element: <UserLayout />,
    children: userRoutes,
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
];
