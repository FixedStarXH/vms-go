import { memo, useMemo, useState } from "react";
import { Layout, Menu, Avatar, Dropdown, Button, message } from "antd";
import {
  UserOutlined,
  SettingOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  LogoutOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useUserStore } from "@/stores/useUserStore";
import { logoutApi } from "@/api/modules/login/login";
import styles from "./AdminLayout.module.scss";
import logo from "@/assets/images/logo.png";

const { Header, Sider, Content } = Layout;

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { userInfo, logout } = useUserStore();

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch (error) {
      console.error("退出登录接口调用失败:", error);
    } finally {
      logout();
      message.success("已退出登录");
      navigate("/login");
    }
  };

  const userMenuItems = [
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: handleLogout,
    },
  ];

  const menuItems = useMemo(() => {
    const accountChildren = [
      {
        key: "/admin/account-list",
        label: <Link to="/admin/account-list">用户账号列表</Link>,
      },
    ];

    if (userInfo?.id === 1 || userInfo?.userType === "super_admin") {
      accountChildren.push({
        key: "/admin/account-add",
        label: <Link to="/admin/account-add">添加管理员账号</Link>,
      });
    }

    accountChildren.push({
      key: "/admin/account-password",
      label: <Link to="/admin/account-password">修改密码</Link>,
    });

    return [
      {
        key: "/admin",
        icon: <HomeOutlined />,
        label: <Link to="/admin">系统首页</Link>,
      },
      {
        key: "account",
        icon: <UserOutlined />,
        label: "账号管理",
        children: accountChildren,
      },
      {
        key: "query",
        icon: <BarChartOutlined />,
        label: "查询与统计",
        children: [
          {
            key: "/admin/query-record",
            label: <Link to="/admin/query-record">查询入校记录</Link>,
          },
          {
            key: "/admin/time-management",
            label: <Link to="/admin/time-management">时间管理表</Link>,
          },
        ],
      },
      {
        key: "/admin/settings",
        icon: <SettingOutlined />,
        label: <Link to="/admin/settings">系统设置</Link>,
      },
      {
        key: "/admin/audit",
        icon: <CheckCircleOutlined />,
        label: <Link to="/admin/audit">审批申请</Link>,
      },
    ];
  }, [userInfo?.userType]);

  const selectedKey = useMemo(() => {
    const pathname = location.pathname;
    if (pathname === "/admin") return "/admin";
    if (pathname.startsWith("/admin/account-list"))
      return "/admin/account-list";
    if (pathname.startsWith("/admin/account-add")) return "/admin/account-add";
    if (pathname.startsWith("/admin/account-password"))
      return "/admin/account-password";
    if (pathname.startsWith("/admin/query-record"))
      return "/admin/query-record";
    if (pathname.startsWith("/admin/time-management"))
      return "/admin/time-management";
    if (pathname.startsWith("/admin/settings")) return "/admin/settings";
    if (pathname.startsWith("/admin/audit")) return "/admin/audit";
    return "/admin";
  }, [location.pathname]);

  const defaultOpenKeys = useMemo(() => {
    if (selectedKey.startsWith("/admin/account")) return ["account"];
    if (
      selectedKey.startsWith("/admin/query") ||
      selectedKey.startsWith("/admin/time")
    )
      return ["query"];
    return [];
  }, [selectedKey]);

  return (
    <Layout className={styles.commonLayout}>
      <Sider
        width={200}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        className={styles.sider}
      >
        <div className={styles.logoArea}>
          <div className={styles.logoBox}>
            <img src={logo} alt="管理系统" className={styles.logoImg} />
            {!collapsed && <h1 className={styles.logoText}>ERS</h1>}
          </div>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={defaultOpenKeys}
          className={styles.menu}
          items={menuItems}
          inlineCollapsed={collapsed}
        />
      </Sider>

      <Layout>
        <Header className={styles.header}>
          <div className={styles.systemName}>
            河南科技学院--入校登记系统v1.0.0
          </div>

          <div className={styles.userArea}>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Button type="text" className={styles.welcomeText}>
                欢迎您，{userInfo?.nickname || userInfo?.username || "admin"}
              </Button>
            </Dropdown>
            <Avatar
              src={userInfo?.avatar}
              icon={<UserOutlined />}
              className={styles.avatar}
            />
          </div>
        </Header>

        <Content className={styles.content}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default memo(AdminLayout);
