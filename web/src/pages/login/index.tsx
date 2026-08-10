import { useState, useRef } from "react";
import { Form, Input, Button, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import styles from "./index.module.scss";
import { ImageCaptcha, RegisterModal } from "./components";
import type { ImageCaptchaRef } from "./components/ImageCaptcha";
import { loginApi } from "@/api/modules/login/login";
import { useUserStore } from "@/stores/useUserStore";
import logoImage from "@/assets/images/logo.png";

function Login() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [captchaCode, setCaptchaCode] = useState("");
  const [registerOpen, setRegisterOpen] = useState(false);
  const captchaRef = useRef<ImageCaptchaRef>(null);
  const { setToken, setUserInfo, logout } = useUserStore();

  const handleLogin = async () => {
    if (!captchaCode.trim()) {
      message.warning("请输入验证码");
      return;
    }

    const isValid = captchaRef.current?.verify(captchaCode);
    if (!isValid) {
      message.error("验证码错误，请重新输入");
      captchaRef.current?.refresh();
      setCaptchaCode("");
      return;
    }

    try {
      const values = await form.validateFields();
      setLoading(true);

      logout();

      const uuid = captchaRef.current?.getUuid() || crypto.randomUUID();

      const res = await loginApi({
        username: values.username,
        password: values.password,
        uuid,
        captcha: captchaCode,
      });

      const loginData = res.data || res;

      if (loginData && loginData.token) {
        message.success("登录成功");

        const userId = loginData.userId || loginData.id || 0;
        // 注意：Go 后端返回 userType（super_admin/admin/viewer），
        // 不能用 userId===1 判断（访客自增 id 也可能是 1）
        const isSuperAdmin = loginData.userType === "super_admin" || loginData.username === "admin";
        const isAdminUser =
          isSuperAdmin ||
          loginData.userType === "admin";

        setToken(loginData.token);
        setUserInfo({
          id: userId || (loginData.username === "admin" ? 1 : 0),
          username: loginData.username,
          userType: isSuperAdmin ? "super_admin" : isAdminUser ? "admin" : "viewer",
          roles: isSuperAdmin ? ["超级管理员"] : isAdminUser ? ["管理员"] : ["普通用户"],
        });

        const redirectPath = isAdminUser ? "/admin" : "/user";

        setTimeout(() => {
          navigate(redirectPath, { replace: true });
          window.location.reload();
        }, 100);
      } else {
        message.error(res?.msg || "登录失败，请检查返回数据格式");
        captchaRef.current?.refresh();
        setCaptchaCode("");
      }
    } catch (error: any) {
      const errorMsg =
        error?.msg ||
        error?.response?.data?.msg ||
        error?.message ||
        "登录请求失败，请稍后重试";
      message.error(errorMsg);
      captchaRef.current?.refresh();
      setCaptchaCode("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <img src={logoImage} alt="Logo" className={styles.logo} />

        <h2 className={styles.title}>河南科技学院</h2>
        <p className={styles.desc}>入校登记管理系统</p>

        <Form
          form={form}
          layout="vertical"
          size="large"
          className={styles.form}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>

          <Form.Item label="验证码">
            <div className={styles.captchaRow}>
              <Input
                value={captchaCode}
                onChange={(e) => setCaptchaCode(e.target.value)}
                placeholder="请输入验证码"
                maxLength={5}
              />
              <ImageCaptcha ref={captchaRef} />
            </div>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              block
              loading={loading}
              onClick={handleLogin}
              className={styles.loginBtn}
            >
              登 录
            </Button>
          </Form.Item>
        </Form>

        <div className={styles.registerBtnWrapper}>
          <Button type="link" onClick={() => setRegisterOpen(true)}>
            新用户？注册账号
          </Button>
        </div>
      </div>

      <RegisterModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
      />
    </div>
  );
}

export { Login as LoginPage };
export default Login;
