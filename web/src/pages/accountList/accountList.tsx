import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Space,
  Modal,
  Form,
  Tag,
  Pagination,
  App,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import styles from "./accountList.module.scss";
import {
  getUserList,
  blacklistUser,
  deleteUser,
} from "@/api/modules/admin/manager";

const { Option } = Select;

const AccountListPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize] = useState(10);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [editForm] = Form.useForm();

  // 服务端分页：关键词（用户名/手机号）+ 状态 + 页码一次交给后端，前端不再二次截断
  const fetchData = async (
    page: number,
    params?: { username?: string; phone?: string; status?: number },
  ) => {
    try {
      setLoading(true);
      const res = (await getUserList({
        // 后端 keyword 同时匹配 用户名/手机号/姓名，取任一非空值传入
        username: params?.username || params?.phone || "",
        status: params?.status,
        pageNum: page,
        pageSize,
      })) as any;

      const list = res?.data?.list || res?.list || [];
      setAccounts(Array.isArray(list) ? list : []);
      setTotal(res?.data?.total ?? res?.total ?? 0);
      setCurrent(page);
    } catch (error) {
      console.error("获取数据失败:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
  }, []);

  const handleQuery = () => {
    const values = form.getFieldsValue();
    fetchData(1, values);
  };

  const handleRefresh = () => {
    form.resetFields();
    fetchData(1);
  };

  const handleDelete = async (userId: number, username: string) => {
    if (username === "admin") {
      message.warning("超级管理员账号不能删除");
      return;
    }
    modal.confirm({
      title: "确认删除",
      content: `确定要删除账号 "${username}" 吗？`,
      onOk: async () => {
        try {
          await deleteUser(userId);
          message.success("删除成功");
          fetchData(current);
        } catch (error: any) {
          console.error("删除失败:", error);
          message.error(error?.message || "删除失败");
        }
      },
    });
  };

  const handleEdit = (record: any) => {
    if (record.username === "admin") {
      message.warning("超级管理员账号信息不可修改");
      return;
    }
    setEditingAccount(record);
    editForm.setFieldsValue({
      username: record.username,
      mobile: record.mobile,
      status: record.status,
    });
    setEditModalVisible(true);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();

      if (editingAccount) {
        const action = values.status === 0 ? "add" : "remove";
        await blacklistUser({
          userId: editingAccount.userId,
          action,
          reason: "",
        });
      }
      setEditModalVisible(false);
      message.success("修改成功");
      fetchData(current);
    } catch (error: any) {
      if (error?.errorFields) return;
      console.error("操作失败:", error);
      message.error(error?.message || "修改失败");
    }
  };

  const getStatusTag = (status: number) => {
    return status === 1 ? (
      <Tag color="success">正常</Tag>
    ) : (
      <Tag color="error">黑名单</Tag>
    );
  };

  const columns = [
    { title: "ID", dataIndex: "userId", key: "userId", width: 80 },
    { title: "用户名", dataIndex: "username", key: "username", width: 150 },
    { title: "手机号", dataIndex: "mobile", key: "mobile", width: 150 },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: number) => getStatusTag(status),
    },
    {
      title: "创建时间",
      dataIndex: "createTime",
      key: "createTime",
      width: 180,
    },
    {
      title: "操作",
      key: "action",
      width: 150,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.userId, record.username)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card className={styles.pageCard}>
        <div className={styles.header}>
          <h2 className={styles.pageTitle}>用户账号列表</h2>
        </div>

        <Form form={form} layout="inline" className={styles.queryForm}>
          <Form.Item name="username" label="用户名">
            <Input placeholder="请输入用户名" allowClear />
          </Form.Item>
          <Form.Item name="phone" label="手机号">
            <Input placeholder="请输入手机号" allowClear />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="请选择状态" style={{ width: 120 }} allowClear>
              <Option value={1}>正常</Option>
              <Option value={0}>黑名单</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleQuery}
              loading={loading}
            >
              查询
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              style={{ marginLeft: 8 }}
            >
              重置
            </Button>
          </Form.Item>
        </Form>

        <Table
          columns={columns}
          dataSource={accounts}
          rowKey={(record: any) => record.userId || record.username}
          loading={loading}
          pagination={false}
          bordered
          size="middle"
          className={styles.table}
        />

        <div className={styles.pagination}>
          <Pagination
            current={current}
            pageSize={pageSize}
            total={total}
            showTotal={(t) => `共 ${t} 条`}
            showQuickJumper
            onChange={(page) => fetchData(page, form.getFieldsValue())}
          />
        </div>
      </Card>

      <Modal
        title="编辑账号"
        open={editModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => setEditModalVisible(false)}
        width={500}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="username" label="用户名">
            <Input disabled />
          </Form.Item>
          <Form.Item name="mobile" label="手机号">
            <Input disabled />
          </Form.Item>
          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: "请选择状态" }]}
          >
            <Select placeholder="请选择状态">
              <Option value={1}>正常</Option>
              <Option value={0}>黑名单</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AccountListPage;
