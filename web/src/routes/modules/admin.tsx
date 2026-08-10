import type { RouteObject } from "react-router-dom";
import { lazy } from "react";
import AdminLayout from "@/layouts/AdminLayout";

const Home = lazy(() => import("@/pages/home"));
const AccountList = lazy(() => import("@/pages/accountList/accountList"));
const AccountAdd = lazy(() => import("@/pages/accountAdd/accountAdd"));
const AccountPassword = lazy(() => import("@/pages/accountPsw/accountPsw"));
const QueryRecord = lazy(() => import("@/pages/record"));
const TimeManagement = lazy(() => import("@/pages/time-management"));
const Settings = lazy(() => import("@/pages/settings"));
const Audit = lazy(() => import("@/pages/audit"));

export const adminRoutes: RouteObject[] = [
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "account-list",
        element: <AccountList />,
      },
      {
        path: "account-add",
        element: <AccountAdd />,
      },
      {
        path: "account-password",
        element: <AccountPassword />,
      },
      {
        path: "query-record",
        element: <QueryRecord />,
      },
      {
        path: "time-management",
        element: <TimeManagement />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      {
        path: "audit",
        element: <Audit />,
      },
    ],
  },
];
