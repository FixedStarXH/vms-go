import type { RouteObject } from "react-router-dom";
import { generateRoutes } from "@/config/routes/types";
import type { AppRouteConfig } from "@/config/routes/types";
import { lazy } from "react";
import {
  UserOutlined,
  HomeOutlined,
  FormOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import i18n from "@/locales";

const UserDashboard = lazy(() => import("@/pages/user/Dashboard"));
const UserApply = lazy(() => import("@/pages/user/Apply"));
const UserMyApplications = lazy(() => import("@/pages/user/MyApplications"));
const UserProfile = lazy(() => import("@/pages/user/Profile"));

const userRouteConfig: AppRouteConfig[] = [
  {
    index: true,
    component: UserDashboard,
    name: i18n.t("user:home"),
    icon: <HomeOutlined />,
    permission: "user",
  },
  {
    path: "apply",
    component: UserApply,
    name: i18n.t("user:apply"),
    icon: <FormOutlined />,
    permission: "user",
  },
  {
    path: "my-applications",
    component: UserMyApplications,
    name: i18n.t("user:myApplications"),
    icon: <UnorderedListOutlined />,
    permission: "user",
  },
  {
    path: "profile",
    component: UserProfile,
    name: i18n.t("user:profile"),
    icon: <UserOutlined />,
    permission: "user",
  },
];

export const userRoutes: RouteObject[] = generateRoutes(userRouteConfig);
