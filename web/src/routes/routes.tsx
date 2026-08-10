import { type RouteObject } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";
import { userRoutes } from "./modules/user";
import { adminRoutes } from "./modules/admin";
import UserLayout from "@/components/layout/UserLayout";
import { NotFoundPage } from "@/pages/exception/404";
import { ForbiddenPage } from "@/pages/exception/403";

const Login = lazy(() =>
  import("@/pages/login").then((m) => ({ default: m.LoginPage })),
);

const LoginFallback = () => null;

// 根路径：统一进入登录页（登录成功后由登录页按角色跳转 /admin 或 /user）
const HomeRedirect = () => <Navigate to="/login" replace />;

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
