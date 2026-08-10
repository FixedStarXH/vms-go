import { type RouteObject } from "react-router-dom";
import { lazy, Suspense } from "react";
import { userRoutes } from "./modules/user";
import { adminRoutes } from "./modules/admin";
import UserLayout from "@/components/layout/UserLayout";
import { NotFoundPage } from "@/pages/exception/404";
import { ForbiddenPage } from "@/pages/exception/403";

const Login = lazy(() =>
  import("@/pages/login").then((m) => ({ default: m.LoginPage })),
);

const LoginFallback = () => null;

export const routes: RouteObject[] = [
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
