import React, { useState, useEffect } from "react";
import { Card, Form, Input, Button, Space, Table, Popconfirm, App } from "antd";
import {
  UserOutlined,
  LockOutlined,
  PhoneOutlined,
  SaveOutlined,
  ReloadOutlined,
  UserDeleteOutlined,
} from "@ant-design/icons";
import styles from "./accountAdd.module.scss";
import {
  getManagerList,
  addManager,
  deleteManager,
} from "@/api/modules/admin/manager";

const AccountAddPage: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [adminList, setAdminList] = useState<any[]>([]);
  const [tableLoading, setTableLoading] = useState(false);

  const fetchManagerList = async () => {
    try {
      setTableLoading(true);
      const res = (await getManagerList()) as any;

      let listData: any[] = [];

      if (res) {
        if (res.page?.list && Array.isArray(res.page.list)) {
          listData = res.page.list;
        } else if (res.page?.records && Array.isArray(res.page.records)) {
          listData = res.page.records;
        } else if (res.data?.list && Array.isArray(res.data.list)) {
          listData = res.data.list;
        } else if (res.data && Array.isArray(res.data)) {
          listData = res.data;
        } else if (res.list && Array.isArray(res.list)) {
          listData = res.list;
        } else if (Array.isArray(res)) {
          listData = res;
        }
      }

      setAdminList(listData);
    } catch (error) {
      console.error("获取管理员列表失败:", error);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchManagerList();
  }, []);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      await addManager(values);
      message.success("管理员账号添加成功");
      form.resetFields();
      fetchManagerList();
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      console.error("添加失败:", error);
      message.error(error?.message || "添加失败");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
  };

  const handleRevokeAdmin = async (record: any) => {
    if (record.username === "admin") {
      message.warning("超级管理员不能撤销");
      return;
    }
    try {
      await deleteManager(record.adminId);
      message.success(`已撤销 ${record.username} 的管理员权限`);
      fetchManagerList();
    } catch (error: any) {
      console.error("撤销失败:", error);
      message.error(error?.message || "撤销失败");
    }
  };

  const columns = [
    { title: "ID", dataIndex: "adminId", key: "adminId", width: 80 },
    { title: "用户名", dataIndex: "username", key: "username", width: 150 },
    { title: "手机号", dataIndex: "phone", key: "phone", width: 150 },
    {
      title: "创建时间",
      dataIndex: "createTime",
      key: "createTime",
      width: 180,
    },
    {
      title: "操作",
      key: "action",
      width: 120,
      render: (_: any, record: any) => {
        if (record.username === "admin") {
          return <span style={{ color: "#999" }}>-</span>;
        }
        return (
          <Popconfirm
            title="确认撤销"
            description={`确定要撤销 ${record.username} 的管理员权限吗？`}
            onConfirm={() => handleRevokeAdmin(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<UserDeleteOutlined />}
            >
              撤销
            </Button>
          </Popconfirm>
        );
      },
    },
  ];

  return (
    <div>
      <Card className={styles.pageCard}>
        <div className={styles.header}>
          <h2 className={styles.pageTitle}>添加管理员账号</h2>
        </div>

        <Form form={form} layout="inline" className={styles.form}>
          <Form.Item
            name="username"
            rules={[
              { required: true, message: "请输入用户名" },
              { min: 3, max: 20, message: "用户名长度为3-20个字符" },
              {
                pattern: /^[a-zA-Z0-9_]+$/,
                message: "用户名只能包含字母、数字和下划线",
              },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              style={{ width: 180 }}
            />
          </Form.Item>

          <Form.Item
            name="phone"
            rules={[
              { required: true, message: "请输入手机号" },
              { pattern: /^1[3-9]\d{9}$/, message: "请输入正确的手机号" },
            ]}
          >
            <Input
              prefix={<PhoneOutlined />}
              placeholder="手机号"
              style={{ width: 180 }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: "请输入密码" },
              { min: 6, max: 20, message: "密码长度为6-20个字符" },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              style={{ width: 180 }}
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
                添加
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <div className={styles.tableSection}>
          <h3 className={styles.sectionTitle}>管理员列表</h3>
          <Table
            columns={columns}
            dataSource={adminList}
            rowKey={(record) => record.adminId || record.username}
            loading={tableLoading}
            pagination={{ pageSize: 10 }}
            size="middle"
          />
        </div>
      </Card>
    </div>
  );
};

export default AccountAddPage;
