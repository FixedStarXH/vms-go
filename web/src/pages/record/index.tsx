import React, { useState, useEffect } from "react";
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Table,
  Pagination,
  App,
} from "antd";
import {
  SearchOutlined,
  DownloadOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  getUserRecordList,
  deleteUserRecord,
  type UserQueryParams,
  type ApplicationRecord,
} from "@/api/modules/setting/record";
import styles from "./record.module.scss";

const { Option } = Select;

const FILTER_STORAGE_KEY = "visitor_filter";

const getFilterFromStorage = (): Record<string, unknown> => {
  try {
    const stored = localStorage.getItem(FILTER_STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const saveFilterToStorage = (filter: Record<string, unknown>) => {
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filter));
  } catch (error) {
    console.error("保存筛选条件失败:", error);
  }
};

const StatusTag: React.FC<{ status: string | number }> = ({ status }) => {
  // Go 后端状态：0待审批 1已通过 2已拒绝 3已取消 4已爽约 5已完成
  const statusMap: Record<string | number, { color: string; text: string }> = {
    0: { color: "#faad14", text: "待审批" },
    1: { color: "#52c41a", text: "已通过" },
    2: { color: "#f5222d", text: "已拒绝" },
    3: { color: "#999", text: "已取消" },
    4: { color: "#722ed1", text: "已爽约" },
    5: { color: "#1890ff", text: "已完成" },
  };

  const config = statusMap[status] || {
    color: "#999",
    text: `未知(${status})`,
  };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "4px",
        backgroundColor: config.color,
        color: "white",
        fontSize: "12px",
      }}
    >
      {config.text}
    </span>
  );
};

const RecordPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const [data, setData] = useState<ApplicationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    const savedFilter = getFilterFromStorage();
    if (Object.keys(savedFilter).length > 0) {
      form.setFieldsValue(savedFilter);
    }
    fetchList(1);
  }, []);

  // 关键词取"最精确"的一项：记录编号 > 手机号 > 姓名（后端 keyword 同时匹配三字段）
  const buildKeyword = (v: any): string => {
    const recordNo = String(v.recordNo || "").trim();
    if (recordNo) return recordNo;
    const phone = String(v.phone || "").trim();
    if (phone) return phone;
    return String(v.name || "").trim();
  };

  // 服务端分页 + 服务端筛选：页码/关键词/状态/日期一次交给后端，前端不再二次截断
  const fetchList = async (page: number, extra?: Partial<UserQueryParams>) => {
    setLoading(true);
    try {
      const formValues = form.getFieldsValue();
      const queryParams: UserQueryParams = {
        page,
        pageSize,
        keyword: buildKeyword({ ...formValues, ...(extra?.keyword ? { keyword: extra.keyword } : {}) }),
        status: formValues.status || undefined,
        startDate: extra?.startDate,
        endDate: extra?.endDate,
      };

      const res = (await getUserRecordList(queryParams)) as any;
      const list = res?.data?.list || res?.list || [];
      setData(
        Array.isArray(list)
          ? list.filter((item: any) => item.deleted !== 1 && item.deleted !== "1")
          : [],
      );
      setTotal(res?.data?.total ?? res?.total ?? 0);
      setCurrent(page);
    } catch (err) {
      console.error("查询失败:", err);
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    form.resetFields();
    localStorage.removeItem(FILTER_STORAGE_KEY);
    fetchList(1);
    message.success("数据已刷新");
  };

  const handleQuery = () => {
    const formValues = form.getFieldsValue();
    saveFilterToStorage(formValues);
    fetchList(1);
  };

  const handleTodayQuery = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    form.setFieldsValue({
      name: undefined,
      phone: undefined,
      recordNo: undefined,
      status: undefined,
    });
    fetchList(1, { startDate: todayStr, endDate: todayStr });
  };

  const handleExport = () => {
    const headers = [
      "申请编号",
      "访客姓名",
      "手机号",
      "来访单位",
      "来访事由",
      "入校日期",
      "入校时间",
      "离校时间",
      "同行人数",
      "车牌号",
      "审批状态",
      "创建时间",
    ];
    const rows = data.map((item) => [
      item.applicationNo,
      item.visitorName,
      item.phone,
      item.visitUnit,
      item.reason,
      item.entryDate,
      item.entryStartTime,
      item.entryEndTime,
      item.companionCount,
      item.vehiclePlate || "",
      item.status === 0
        ? "待审批"
        : item.status === 1
          ? "已通过"
          : item.status === 2
            ? "已拒绝"
            : item.status === 3
              ? "已取消"
              : item.status === 4
                ? "已爽约"
                : "已完成",
      item.createTime,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `入校记录报表_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    message.success("报表导出成功");
  };

  const handleDelete = (id: number) => {
    modal.confirm({
      title: "确认删除",
      content: "确定要删除这条入校记录吗？删除后无法恢复",
      onOk: async () => {
        try {
          await deleteUserRecord(id);
          message.success("删除成功");
          fetchList(current);
        } catch (err: any) {
          console.error("删除失败:", err);
          message.error("删除失败");
        }
      },
    });
  };

  const columns = [
    {
      title: "申请编号",
      dataIndex: "applicationNo",
      key: "applicationNo",
      width: 180,
    },
    {
      title: "访客姓名",
      dataIndex: "visitorName",
      key: "visitorName",
      width: 100,
    },
    { title: "手机号", dataIndex: "phone", key: "phone", width: 130 },
    { title: "来访单位", dataIndex: "visitUnit", key: "visitUnit", width: 150 },
    { title: "来访事由", dataIndex: "reason", key: "reason", width: 120 },
    { title: "入校日期", dataIndex: "entryDate", key: "entryDate", width: 120 },
    {
      title: "入校时间",
      key: "entryTime",
      width: 180,
      render: (_: unknown, record: ApplicationRecord) =>
        record.entryStartTime && record.entryEndTime
          ? `${record.entryStartTime.split(" ")[1] || record.entryStartTime} - ${record.entryEndTime.split(" ")[1] || record.entryEndTime}`
          : "-",
    },
    {
      title: "同行人数",
      dataIndex: "companionCount",
      key: "companionCount",
      width: 80,
    },
    {
      title: "车牌号",
      dataIndex: "vehiclePlate",
      key: "vehiclePlate",
      width: 110,
    },
    {
      title: "审批状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: number) => <StatusTag status={status} />,
    },
    {
      title: "操作",
      key: "action",
      width: 80,
      render: (_: unknown, record: ApplicationRecord) => (
        <div style={{ display: "flex", gap: "8px" }}>
          <a
            style={{ color: "#f5222d" }}
            onClick={() => handleDelete(record.id)}
          >
            <DeleteOutlined /> 删除
          </a>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Card className={styles.pageCard}>
        <h2 className={styles.pageTitle}>查询入校记录</h2>

        <Form
          form={form}
          layout="inline"
          onFinish={handleQuery}
          className={styles.queryForm}
        >
          <Form.Item name="name" label="姓名">
            <Input
              placeholder="姓名"
              style={{ paddingLeft: 8, textIndent: 0 }}
            />
          </Form.Item>

          <Form.Item name="phone" label="手机号">
            <Input
              placeholder="手机号"
              style={{ paddingLeft: 8, textIndent: 0 }}
            />
          </Form.Item>

          <Form.Item name="recordNo" label="记录编号">
            <Input
              placeholder="记录编号"
              style={{ paddingLeft: 8, textIndent: 0 }}
            />
          </Form.Item>

          <Form.Item name="status" label="审批状态">
            <Select placeholder="审批状态" style={{ width: 140 }}>
              <Option value="0">待审批</Option>
              <Option value="1">已通过</Option>
              <Option value="2">已拒绝</Option>
              <Option value="3">已取消</Option>
              <Option value="4">已爽约</Option>
              <Option value="5">已完成</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
              查询
            </Button>
            <Button
              type="default"
              onClick={handleRefresh}
              icon={<ReloadOutlined />}
              style={{ marginLeft: 8 }}
            >
              刷新数据
            </Button>
            <Button
              type="primary"
              onClick={handleTodayQuery}
              style={{ marginLeft: 8 }}
            >
              一键筛选当天入校
            </Button>
            <Button
              type="primary"
              onClick={handleExport}
              icon={<DownloadOutlined />}
              style={{ marginLeft: 8 }}
            >
              生成数据报表
            </Button>
          </Form.Item>
        </Form>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={false}
          bordered
          size="middle"
          expandable={{
            expandedRowRender: (record: ApplicationRecord) => (
              <div style={{ padding: "10px 20px" }}>
                <p>身份证号：{record.idCard || "-"}</p>
                <p>拒绝原因：{record.rejectReason || "-"}</p>
                <p>审批备注：{record.approvalRemark || "-"}</p>
                <p>创建时间：{record.createTime}</p>
                <p>更新时间：{record.updateTime}</p>
              </div>
            ),
          }}
          locale={{
            emptyText: (
              <div style={{ padding: "50px 0", color: "#999" }}>
                暂无入校记录
              </div>
            ),
          }}
          className={styles.table}
        />

        <div className={styles.pagination}>
          <Pagination
            current={current}
            pageSize={pageSize}
            total={total}
            showTotal={(t) => `共 ${t} 条`}
            showQuickJumper
            onChange={(page) => fetchList(page)}
          />
        </div>
      </Card>
    </div>
  );
};

export default RecordPage;
