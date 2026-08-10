import React, { useState, useEffect, useMemo } from "react";
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
  const [allData, setAllData] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageSize] = useState(7);
  const [filteredData, setFilteredData] = useState<ApplicationRecord[]>([]);

  useEffect(() => {
    setFilteredData(allData);
  }, [allData]);

  const currentData = useMemo(() => {
    const start = (current - 1) * pageSize;
    const end = start + pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, current, pageSize]);

  const total = useMemo(() => filteredData.length, [filteredData]);

  useEffect(() => {
    const savedFilter = getFilterFromStorage();
    if (Object.keys(savedFilter).length > 0) {
      form.setFieldsValue(savedFilter);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, []);

  const fetchList = async (params?: Partial<UserQueryParams>) => {
    setLoading(true);
    try {
      const formValues = form.getFieldsValue();
      const queryParams: UserQueryParams =
        params && Object.keys(params).length > 0
          ? (params as UserQueryParams)
          : {
            visitorName: formValues.name,
            phone: formValues.phone,
            status: formValues.status,
          };

      const res = await getUserRecordList(queryParams);

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
      setCurrent(1);
    } catch (err) {
      console.error("查询失败:", err);
      setAllData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setCurrent(1);
    form.resetFields();
    localStorage.removeItem(FILTER_STORAGE_KEY);
    fetchList({});
    message.success("数据已刷新");
  };

  const handleQuery = () => {
    setCurrent(1);
    const formValues = form.getFieldsValue();
    saveFilterToStorage(formValues);

    const filtered = allData.filter((item) => {
      if (formValues.name && !item.visitorName?.includes(formValues.name)) {
        return false;
      }
      if (formValues.phone && !item.phone?.includes(formValues.phone)) {
        return false;
      }
      if (
        formValues.recordNo &&
        !item.applicationNo?.includes(formValues.recordNo)
      ) {
        return false;
      }
      if (
        formValues.status !== undefined &&
        formValues.status !== "" &&
        formValues.status !== null
      ) {
        if (item.status?.toString() !== formValues.status?.toString()) {
          return false;
        }
      }
      return true;
    });

    setFilteredData(filtered);
    message.success(`筛选完成，共找到 ${filtered.length} 条记录`);
  };

  const handleTodayQuery = () => {
    setCurrent(1);
    const todayStr = new Date().toISOString().split("T")[0];

    const filtered = allData.filter((item) => {
      if (!item.entryDate) return false;
      const itemDate = item.entryDate.split(" ")[0];
      return itemDate === todayStr;
    });

    setFilteredData(filtered);
    form.setFieldsValue({
      name: undefined,
      phone: undefined,
      recordNo: undefined,
      status: undefined,
    });

    message.success(`今天共找到 ${filtered.length} 条入校记录`);
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
    const rows = filteredData.map((item) => [
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
          fetchList();
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
          dataSource={currentData}
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
            onChange={(page) => setCurrent(page)}
          />
        </div>
      </Card>
    </div>
  );
};

export default RecordPage;
