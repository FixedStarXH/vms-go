import React, { useState, useEffect, useMemo } from "react";
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
  const [allData, setAllData] = useState<ApplicationRecord[]>([]);
  const [filteredData, setFilteredData] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageSize] = useState(7);

  useEffect(() => {
    fetchList();
  }, []);

  useEffect(() => {
    setFilteredData(allData);
  }, [allData]);

  const currentData = useMemo(() => {
    const start = (current - 1) * pageSize;
    const end = start + pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, current, pageSize]);

  const total = useMemo(() => filteredData.length, [filteredData]);

  const fetchList = async (params?: Partial<UserQueryParams>) => {
    setLoading(true);
    try {
      const res = await getUserRecordList(params || {});

      let dataList: any[] = [];
      const result = res as any;

      if (result?.page?.list && Array.isArray(result.page.list)) {
        dataList = result.page.list;
      } else if (result?.page?.records && Array.isArray(result.page.records)) {
        dataList = result.page.records;
      } else if (result?.data?.list && Array.isArray(result.data.list)) {
        dataList = result.data.list;
      } else if (result?.list && Array.isArray(result.list)) {
        dataList = result.list;
      } else if (Array.isArray(result)) {
        dataList = result;
      } else if (Array.isArray(result?.data)) {
        dataList = result.data;
      }

      if (dataList.length > 0) {
        dataList = dataList.filter(
          (item: any) => item.deleted !== 1 && item.deleted !== "1",
        );
      }

      setAllData(dataList);
      setFilteredData(dataList);
    } catch (err) {
      console.error("查询失败:", err);
      setAllData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setCurrent(1);
    form.resetFields();
    fetchList({});
    message.success("数据已刷新");
  };

  const handleQuery = () => {
    setCurrent(1);
    const formValues = form.getFieldsValue();

    const filtered = allData.filter((item) => {
      if (formValues.name && !item.visitorName?.includes(formValues.name)) {
        return false;
      }
      if (formValues.dateRange && formValues.dateRange.length === 2) {
        const startDate = formValues.dateRange[0].format("YYYY-MM-DD");
        const endDate = formValues.dateRange[1].format("YYYY-MM-DD");
        const itemDate = item.entryDate ? item.entryDate.split(" ")[0] : "";
        if (itemDate < startDate || itemDate > endDate) {
          return false;
        }
      }
      return true;
    });

    setFilteredData(filtered);
    message.success(`筛选完成，共找到 ${filtered.length} 条记录`);
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
    const rows = filteredData.map((item) => [
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
          dataSource={currentData}
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
            onChange={(page) => setCurrent(page)}
          />
        </div>
      </Card>
    </div>
  );
};

export default TimeManagementPage;
