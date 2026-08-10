import { useState, useEffect } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Form,
  Input,
  message,
  Modal,
  Image,
} from "antd";
import styles from "./index.module.scss";
import { CopyOutlined } from "@ant-design/icons";
import {
  getAuditList,
  approveAudit,
  rejectAudit,
  getAuditDetail,
  batchApproveAudit,
} from "@/api/modules/audit/audit";
import type { VisitorRecord, AuditParams } from "@/api/modules/audit/audit";

const AUDIT_STATUS_STORAGE_KEY = "audit_status_cache";

const AuditPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<VisitorRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<VisitorRecord | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getStatusCache = (): Record<number, number> => {
    try {
      const cache = localStorage.getItem(AUDIT_STATUS_STORAGE_KEY);
      return cache ? JSON.parse(cache) : {};
    } catch {
      return {};
    }
  };

  const saveStatusCache = (id: number, status: number) => {
    try {
      const cache = getStatusCache();
      cache[id] = status;
      localStorage.setItem(AUDIT_STATUS_STORAGE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error("保存状态缓存失败:", error);
    }
  };

  const applyStatusCache = (list: VisitorRecord[]): VisitorRecord[] => {
    const cache = getStatusCache();
    return list.map((item) => ({
      ...item,
      status: cache[item.id] !== undefined ? cache[item.id] : item.status,
    }));
  };

  const fetchData = async (params?: AuditParams) => {
    setLoading(true);
    try {
      const result: any = await getAuditList({
        ...params,
        pageNum: pagination.current,
        pageSize: pagination.pageSize,
      });

      let list: VisitorRecord[] | null = null;
      let totalCount = 0;

      if (result && typeof result === "object") {
        if (result.page?.list && Array.isArray(result.page.list)) {
          list = result.page.list;
          totalCount = result.page.totalCount || result.page.total || 0;
        } else if (result.page?.records && Array.isArray(result.page.records)) {
          list = result.page.records;
          totalCount = result.page.totalCount || result.page.total || 0;
        } else if (result.data?.list && Array.isArray(result.data.list)) {
          list = result.data.list;
          totalCount = result.data.totalCount || result.data.total || 0;
        } else if (result.list && Array.isArray(result.list)) {
          list = result.list;
          totalCount = result.totalCount || result.total || 0;
        }
      }

      if (list) {
        const listWithCache = applyStatusCache(list);
        setData(listWithCache);
        setTotal(totalCount);
      }
    } catch (error) {
      console.error("获取数据失败:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pagination.current, pagination.pageSize]);

  const getStatusTag = (status: number) => {
    // Go 后端状态：0待审批 1已通过 2已拒绝 3已取消 4已爽约 5已完成
    const statusMap: Record<number, { color: string; text: string }> = {
      0: { color: "default", text: "待审批" },
      1: { color: "success", text: "已通过" },
      2: { color: "error", text: "已拒绝" },
      3: { color: "warning", text: "已取消" },
      4: { color: "processing", text: "已爽约" },
      5: { color: "success", text: "已完成" },
    };
    const config = statusMap[status] || {
      color: "default",
      text: `状态${status}`,
    };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const handleSearch = async (values: any) => {
    const params: AuditParams = {};

    if (values.name) {
      params.visitorName = values.name;
    }
    if (values.phone) {
      params.phone = values.phone;
    }

    setPagination({ ...pagination, current: 1 });
    await fetchData(params);
  };

  const handleApprove = (record: VisitorRecord) => {
    Modal.confirm({
      title: "确认通过",
      content: `确定要通过 ${record.visitorName} 的入校申请吗？`,
      onOk: async () => {
        try {
          await approveAudit(record.id);
          message.success("审批通过");
          saveStatusCache(record.id, 1);
          setData((prevData) =>
            prevData.map((item) =>
              item.id === record.id ? { ...item, status: 1 } : item,
            ),
          );
        } catch (error) {
          console.error("审批失败:", error);
          message.error("审批失败");
        }
      },
    });
  };

  const handleReject = (record: VisitorRecord) => {
    Modal.confirm({
      title: "确认拒绝",
      content: `确定要拒绝 ${record.visitorName} 的入校申请吗？`,
      onOk: async () => {
        try {
          await rejectAudit(record.id, "不符合入校条件");
          message.success("审批拒绝");
          saveStatusCache(record.id, 2);
          setData((prevData) =>
            prevData.map((item) =>
              item.id === record.id ? { ...item, status: 2 } : item,
            ),
          );
        } catch (error) {
          message.error("审批失败");
        }
      },
    });
  };

  const handleBatchApprove = () => {
    if (selectedRowKeys.length === 0) {
      message.warning("请选择要审批的记录");
      return;
    }

    Modal.confirm({
      title: "批量审批通过",
      content: `确定要通过选中的 ${selectedRowKeys.length} 条记录吗？`,
      onOk: async () => {
        try {
          await batchApproveAudit(selectedRowKeys as number[]);
          message.success("批量审批成功");
          setSelectedRowKeys([]);
          fetchData();
        } catch (error) {
          message.error("批量审批失败");
        }
      },
    });
  };

  const handleViewDetail = async (record: VisitorRecord) => {
    try {
      const detail = await getAuditDetail(record.id);
      setSelectedRecord(detail);
      setIsModalOpen(true);
    } catch (error) {
      message.error("获取详情失败");
    }
  };

  const handleTableChange = (newPagination: any) => {
    setPagination({
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    });
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
    getCheckboxProps: (record: VisitorRecord) => ({
      disabled: record.status !== 0,
    }),
  };

  const columns = [
    {
      title: "申请编号",
      dataIndex: "applicationNo",
      key: "applicationNo",
      width: 150,
    },
    {
      title: "访客姓名",
      dataIndex: "visitorName",
      key: "visitorName",
      width: 90,
    },
    {
      title: "入校日期",
      dataIndex: "entryDate",
      key: "entryDate",
      width: 110,
    },
    {
      title: "入校时间",
      dataIndex: "entryStartTime",
      key: "entryStartTime",
      width: 160,
      render: (_: unknown, record: VisitorRecord) =>
        record.entryStartTime && record.entryEndTime
          ? `${record.entryStartTime.split(" ")[1] || record.entryStartTime} - ${record.entryEndTime.split(" ")[1] || record.entryEndTime}`
          : "-",
    },
    {
      title: "审批状态",
      dataIndex: "status",
      key: "status",
      width: 90,
      render: (status: number) => getStatusTag(status),
    },
    {
      title: "操作",
      key: "action",
      width: 150,
      render: (_: unknown, record: VisitorRecord) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => handleViewDetail(record)}
          >
            查看
          </Button>
          {record.status === 0 && (
            <>
              <Button
                type="link"
                size="small"
                style={{ color: "#52c41a" }}
                onClick={() => handleApprove(record)}
              >
                通过
              </Button>
              <Button
                type="link"
                size="small"
                danger
                onClick={() => handleReject(record)}
              >
                拒绝
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.auditPage}>
      <Card
        title="审核申请"
        extra={
          <Button
            type="primary"
            onClick={handleBatchApprove}
            disabled={selectedRowKeys.length === 0}
          >
            批量审批通过 ({selectedRowKeys.length})
          </Button>
        }
      >
        <Form
          form={form}
          layout="inline"
          onFinish={handleSearch}
          className={styles.searchForm}
        >
          <Form.Item label="姓名" name="name">
            <Input placeholder="姓名" style={{ width: 120 }} />
          </Form.Item>

          <Form.Item
            label="手机号"
            name="phone"
            rules={[
              { pattern: /^1[3-9]\d{9}$/, message: "请输入正确的手机号" },
            ]}
          >
            <Input placeholder="手机号" style={{ width: 130 }} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              查询
            </Button>
          </Form.Item>
        </Form>

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            total: total,
            current: pagination.current,
            pageSize: pagination.pageSize,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
          }}
          onChange={handleTableChange}
        />
      </Card>

      <Modal
        title="入校登记详情"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsModalOpen(false)}>
            关闭
          </Button>,
        ]}
        width={600}
      >
        {selectedRecord && (
          <div className={styles.detailContent}>
            <p>
              <strong>申请编号：</strong>
              {selectedRecord.applicationNo}
            </p>
            <p>
              <strong>访客姓名：</strong>
              {selectedRecord.visitorName}
            </p>
            <p>
              <strong>手机号：</strong>
              {selectedRecord.phone}
            </p>
            <p>
              <strong>身份证号：</strong>
              {selectedRecord.idCard || "-"}
            </p>
            <p>
              <strong>来访单位：</strong>
              {selectedRecord.visitUnit}
            </p>
            <p>
              <strong>车牌号：</strong>
              {selectedRecord.vehiclePlate || "-"}
            </p>
            <p>
              <strong>入校日期：</strong>
              {selectedRecord.entryDate}
            </p>
            <p>
              <strong>入校时间：</strong>
              {selectedRecord.entryStartTime} ~ {selectedRecord.entryEndTime}
            </p>
            <p>
              <strong>来访事由：</strong>
              {selectedRecord.reason}
            </p>
            <p>
              <strong>同行人数：</strong>
              {selectedRecord.companionCount}
            </p>
            <p>
              <strong>审批状态：</strong>
              {getStatusTag(selectedRecord.status)}
            </p>
            {selectedRecord.rejectReason && (
              <p>
                <strong>拒绝原因：</strong>
                {selectedRecord.rejectReason}
              </p>
            )}
            {selectedRecord.approvalRemark && (
              <p>
                <strong>审批备注：</strong>
                {selectedRecord.approvalRemark}
              </p>
            )}
            {selectedRecord.status === 1 && selectedRecord.entryCode && (
              <div
                style={{
                  marginTop: 16,
                  textAlign: "center",
                  padding: "16px",
                  background: "#fafafa",
                  borderRadius: 8,
                }}
              >
                <strong style={{ display: "block", marginBottom: 8 }}>
                  入校凭证二维码（门卫核销时扫描）
                </strong>
                <Image
                  src={`/renren-fast/uploads/qrcode/${selectedRecord.entryCode}.png`}
                  alt="入校凭证二维码"
                  width={200}
                  height={200}
                  style={{ border: "1px solid #eee", borderRadius: 8 }}
                />
                <p style={{ marginTop: 8, fontSize: 12, color: "#999" }}>
                  凭证编号：{selectedRecord.entryCode}
                </p>
                {selectedRecord.qrContent && (
                  <Button
                    type="link"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          selectedRecord.qrContent || "",
                        );
                        message.success("二维码内容已复制，可在【门禁核销】页粘贴");
                      } catch {
                        message.error("复制失败，请手动复制");
                      }
                    }}
                  >
                    复制二维码内容（用于核销演示）
                  </Button>
                )}
              </div>
            )}
            <p>
              <strong>创建时间：</strong>
              {selectedRecord.createTime}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AuditPage;
