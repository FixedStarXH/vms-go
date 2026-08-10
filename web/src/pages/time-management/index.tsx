import React, { useState, useEffect } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  Table,
  Pagination,
  message,
  DatePicker,
} from "antd";
import {
  SearchOutlined,
  DownloadOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  getUserRecordList,
  type UserQueryParams,
  type ApplicationRecord,
} from "@/api/modules/setting/record";
import styles from "./time-management.module.scss";

const { RangePicker } = DatePicker;

const TimeManagementPage: React.FC = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState<ApplicationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    fetchList(1);
  }, []);

  // 服务端分页 + 服务端筛选：姓名/日期范围一次交给后端，前端不再二次截断
  const fetchList = async (page: number) => {
    setLoading(true);
    try {
      const formValues = form.getFieldsValue();
      const dateRange = formValues.dateRange;

      let startDate: string | undefined;
      let endDate: string | undefined;
      if (dateRange && Array.isArray(dateRange) && dateRange.length === 2) {
        startDate = dateRange[0].format("YYYY-MM-DD");
        endDate = dateRange[1].format("YYYY-MM-DD");
      }

      const queryParams: UserQueryParams = {
        page,
        pageSize,
        keyword: String(formValues.name || "").trim() || undefined,
        startDate,
        endDate,
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
    fetchList(1);
    message.success("数据已刷新");
  };

  const handleQuery = () => {
    fetchList(1);
  };

  const handleExport = () => {
    const headers = [
      "访客姓名",
      "入校日期",
      "入校开始时间",
      "入校结束时间",
      "来访单位",
      "来访事由",
      "同行人数",
      "车牌号",
      "审批状态",
    ];
    const rows = data.map((item) => [
      item.visitorName,
      item.entryDate,
      item.entryStartTime,
      item.entryEndTime,
      item.visitUnit,
      item.reason,
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
      `时间管理表_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    message.success("报表导出成功");
  };

  const columns = [
    { title: "访客姓名", dataIndex: "visitorName", key: "visitorName" },
    { title: "入校日期", dataIndex: "entryDate", key: "entryDate" },
    {
      title: "入校开始时间",
      dataIndex: "entryStartTime",
      key: "entryStartTime",
    },
    { title: "入校结束时间", dataIndex: "entryEndTime", key: "entryEndTime" },
    { title: "来访单位", dataIndex: "visitUnit", key: "visitUnit" },
    { title: "来访事由", dataIndex: "reason", key: "reason" },
    { title: "同行人数", dataIndex: "companionCount", key: "companionCount" },
    { title: "车牌号", dataIndex: "vehiclePlate", key: "vehiclePlate" },
    {
      title: "审批状态",
      dataIndex: "status",
      key: "status",
      render: (status: number) => {
        const map: Record<number, string> = {
          0: "待审批",
          1: "已通过",
          2: "已拒绝",
          3: "已取消",
          4: "已爽约",
          5: "已完成",
        };
        return map[status] || `未知(${status})`;
      },
    },
  ];

  return (
    <div>
      <Card className={styles.pageCard}>
        <h2 className={styles.pageTitle}>时间管理表</h2>

        <Form
          form={form}
          layout="inline"
          onFinish={handleQuery}
          className={styles.queryForm}
        >
          <Form.Item name="name" label="姓名">
            <Input placeholder="姓名" />
          </Form.Item>

          <Form.Item name="dateRange" label="选择日期">
            <RangePicker
              format="YYYY-MM-DD"
              placeholder={["开始日期", "结束日期"]}
            />
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
          locale={{
            emptyText: (
              <div style={{ padding: "50px 0", color: "#999" }}>
                暂无时间记录
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

export default TimeManagementPage;
