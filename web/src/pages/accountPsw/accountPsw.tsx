import React, { useState } from "react";
import { Card, Form, Input, Button, message, Space, Descriptions } from "antd";
import {
  LockOutlined,
  SaveOutlined,
  RollbackOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import styles from "./accountPsw.module.scss";
import { useUserStore } from "@/stores/useUserStore";
import { changePassword } from "@/api/modules/admin/manager";

const AccountPasswordPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { userInfo } = useUserStore();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      const res = (await changePassword({
        newPassword: values.newPassword,
      })) as any;
      if (res.code === 200) {
        message.success("密码修改成功");
        form.resetFields();
      } else {
        message.error(res.msg || "修改失败");
      }
    } catch (error) {
      console.error("表单验证失败:", error);
      message.error("修改失败");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
  };

  const handleBack = () => {
    navigate("/admin/account-list");
  };

  if (!userInfo) {
    return (
      <Card className={styles.pageCard}>
        <div className={styles.emptyState}>
          <p>无法获取当前用户信息</p>
          <Button type="primary" onClick={handleBack}>
            返回账号列表
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Card className={styles.pageCard}>
        <div className={styles.header}>
          <h2 className={styles.pageTitle}>修改密码</h2>
        </div>

        <Descriptions
          bordered
          column={1}
          className={styles.infoSection}
          style={{ maxWidth: 600, marginBottom: 24 }}
        >
          <Descriptions.Item label="用户名">
            {userInfo.username}
          </Descriptions.Item>
          <Descriptions.Item label="手机号">
            {userInfo.phone || "-"}
          </Descriptions.Item>
        </Descriptions>

        <Form
          form={form}
          layout="vertical"
          className={styles.form}
          style={{ maxWidth: 600 }}
        >
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: "请输入新密码" },
              { min: 6, max: 20, message: "密码长度为6-20个字符" },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入新密码"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "请确认新密码" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("两次输入的密码不一致"));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请再次输入新密码"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={loading}
                onClick={handleSubmit}
              >
                保存
              </Button>
              <Button icon={<RollbackOutlined />} onClick={handleReset}>
                重置
              </Button>
              <Button onClick={handleBack}>返回列表</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default AccountPasswordPage;
