import { memo, useMemo, useState } from "react";
import { Layout, Menu, Avatar, Dropdown, Button, message } from "antd";
import {
  UserOutlined,
  HomeOutlined,
  FormOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useUserStore } from "@/stores/useUserStore";
import { logoutApi } from "@/api/modules/login/login";
import logo from "@/assets/images/logo.png";
import styles from "./UserLayout.module.scss";

const { Header, Sider, Content } = Layout;

const UserLayout = () => {
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
      label: "退出登录",
      onClick: handleLogout,
    },
  ];

  const menuItems = useMemo(() => [
    {
      key: "/user",
      icon: <HomeOutlined />,
      label: <Link to="/user">首页</Link>,
    },
    {
      key: "/user/apply",
      icon: <FormOutlined />,
      label: <Link to="/user/apply">申请预约</Link>,
    },
    {
      key: "/user/my-applications",
      icon: <UnorderedListOutlined />,
      label: <Link to="/user/my-applications">我的申请</Link>,
    },
    {
      key: "/user/profile",
      icon: <UserOutlined />,
      label: <Link to="/user/profile">个人账号</Link>,
    },
  ], []);

  const selectedKey = useMemo(() => {
    const pathname = location.pathname;
    if (pathname === "/user") return "/user";
    if (pathname.startsWith("/user/apply")) return "/user/apply";
    if (pathname.startsWith("/user/my-applications"))
      return "/user/my-applications";
    if (pathname.startsWith("/user/profile")) return "/user/profile";
    return "/user";
  }, [location.pathname]);

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

export default memo(UserLayout);
