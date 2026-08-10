import { useState, useRef } from "react";
import { Modal, Form, Input, message, Radio } from "antd";
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import { ImageCaptcha } from "./ImageCaptcha";
import type { ImageCaptchaRef } from "./ImageCaptcha";
import { registerApi } from "@/api/modules/login/login";

interface RegisterModalProps {
  open: boolean;
  onClose: () => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  open,
  onClose,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [captchaCode, setCaptchaCode] = useState("");
  const captchaRef = useRef<ImageCaptchaRef>(null);

  const handleSubmit = async () => {
    if (!captchaCode.trim()) {
      message.warning("请输入验证码");
      return;
    }

    try {
      const values = await form.validateFields();

      setLoading(true);

      const uuid = captchaRef.current?.getUuid() || crypto.randomUUID();
      const res = await registerApi({
        username: values.username,
        password: values.password,
        confirmPassword: values.confirmPassword,
        mobile: values.mobile || "",
        email: values.email || "",
        gender: values.gender ?? 0,
        uuid,
        captcha: captchaCode,
      });

      if (res.code === 0) {
        message.success("注册成功！请登录");
        form.resetFields();
        setCaptchaCode("");
        onClose();
      } else {
        message.error(res.msg || "注册失败");
        captchaRef.current?.refresh();
        setCaptchaCode("");
      }
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.msg ||
        error?.message ||
        "注册请求失败，请稍后重试";
      message.error(errorMsg);
      captchaRef.current?.refresh();
      setCaptchaCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setCaptchaCode("");
    onClose();
  };

  return (
    <Modal
      title="用户注册"
      open={open}
      onCancel={handleClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={440}
      styles={{ body: { padding: "24px" } }}
    >
      <Form form={form} layout="vertical" size="large">
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

        <Form.Item
          name="confirmPassword"
          dependencies={["password"]}
          rules={[
            { required: true, message: "请确认密码" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("两次密码输入不一致"));
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
        </Form.Item>

        <Form.Item name="email">
          <Input prefix={<MailOutlined />} placeholder="邮箱" />
        </Form.Item>

        <Form.Item name="mobile">
          <Input prefix={<PhoneOutlined />} placeholder="手机号" />
        </Form.Item>

        <Form.Item name="gender" label="性别" initialValue={0}>
          <Radio.Group>
            <Radio value={0}>男</Radio>
            <Radio value={1}>女</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item label="验证码" required>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <Input
              value={captchaCode}
              onChange={(e) => setCaptchaCode(e.target.value)}
              placeholder="验证码"
              maxLength={6}
              style={{ width: 120 }}
            />
            <ImageCaptcha ref={captchaRef} />
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};
