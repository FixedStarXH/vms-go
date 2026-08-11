import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  TimePicker,
  message,
  Switch,
  Popconfirm,
} from "antd";
import dayjs from "dayjs";
import { PlusOutlined } from "@ant-design/icons";
import {
  getSlotList,
  saveSlot,
  toggleSlot,
  deleteSlot,
  type TimeSlotItem,
} from "@/api/modules/setting/slot";

// 系统设置：入校时段配置（对接 ers_time_slot，抢名额/核销时间窗均以此为准）
const SlotSettings = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState<TimeSlotItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<TimeSlotItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await getSlotList();
      const list = res?.data ?? res?.list ?? [];
      setData(list);
    } catch (error: any) {
      message.error(error?.message || "获取时段列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const openModal = (record?: TimeSlotItem) => {
    setEditing(record || null);
    form.resetFields();
    if (record) {
      form.setFieldsValue({
        ...record,
        startTime: dayjs(record.startTime, "HH:mm"),
        endTime: dayjs(record.endTime, "HH:mm"),
      });
    } else {
      form.setFieldsValue({ maxCount: 100, sort: 0, status: 1 });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    let values: any;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    try {
      await saveSlot({
        ...values,
        slotId: editing?.slotId || 0,
        // TimePicker 返回 dayjs 对象，转成 HH:mm 字符串再提交
        startTime: (values.startTime as dayjs.Dayjs).format("HH:mm"),
        endTime: (values.endTime as dayjs.Dayjs).format("HH:mm"),
      });
      message.success(editing ? "时段已更新" : "时段已创建");
      setModalOpen(false);
      fetchList();
    } catch (error: any) {
      message.error(error?.message || "保存失败");
    }
  };

  const handleToggle = async (record: TimeSlotItem, checked: boolean) => {
    try {
      await toggleSlot(record.slotId, checked ? 1 : 0);
      message.success(checked ? "时段已启用" : "时段已停用");
      fetchList();
    } catch (error: any) {
      message.error(error?.message || "操作失败");
      fetchList(); // 失败回滚状态
    }
  };

  const handleDelete = async (record: TimeSlotItem) => {
    try {
      await deleteSlot(record.slotId);
      message.success("时段已删除");
      fetchList();
    } catch (error: any) {
      message.error(error?.message || "删除失败");
    }
  };

  const columns = [
    {
      title: "时段名称",
      dataIndex: "slotName",
      key: "slotName",
      width: 140,
    },
    {
      title: "入校时间",
      key: "time",
      width: 160,
      render: (_: unknown, record: TimeSlotItem) => (
        <span>
          {record.startTime} - {record.endTime}
        </span>
      ),
    },
    {
      title: "名额上限",
      dataIndex: "maxCount",
      key: "maxCount",
      width: 100,
    },
    {
      title: "已用名额",
      dataIndex: "currentCount",
      key: "currentCount",
      width: 100,
      render: (v: number, record: TimeSlotItem) => (
        <Tag color={v >= record.maxCount ? "error" : "default"}>{v}</Tag>
      ),
    },
    {
      title: "状态",
      key: "status",
      width: 110,
      render: (_: unknown, record: TimeSlotItem) => (
        <Switch
          checked={record.status === 1}
          checkedChildren="启用"
          unCheckedChildren="停用"
          onChange={(checked) => handleToggle(record, checked)}
        />
      ),
    },
    {
      title: "排序",
      dataIndex: "sort",
      key: "sort",
      width: 80,
    },
    {
      title: "备注",
      dataIndex: "remark",
      key: "remark",
      ellipsis: true,
    },
    {
      title: "操作",
      key: "action",
      width: 130,
      render: (_: unknown, record: TimeSlotItem) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => openModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该时段？"
            description="已有申请的时段不允许删除"
            onConfirm={() => handleDelete(record)}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="系统设置 · 入校时段配置"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          新增时段
        </Button>
      }
    >
      <Table
        rowKey="slotId"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={false}
      />

      <Modal
        title={editing ? "编辑时段" : "新增时段"}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={480}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 12 }}
          preserve={false}
        >
          <Form.Item
            name="slotName"
            label="时段名称"
            rules={[{ required: true, message: "请输入时段名称" }]}
          >
            <Input placeholder="如：上午时段" maxLength={50} />
          </Form.Item>
          <Space size="large">
            <Form.Item
              name="startTime"
              label="开始时间"
              rules={[{ required: true, message: "请选择开始时间" }]}
            >
              <TimePicker format="HH:mm" minuteStep={5} style={{ width: 160 }} placeholder="开始时间" />
            </Form.Item>
            <Form.Item
              name="endTime"
              label="结束时间"
              rules={[{ required: true, message: "请选择结束时间" }]}
            >
              <TimePicker format="HH:mm" minuteStep={5} style={{ width: 160 }} placeholder="结束时间" />
            </Form.Item>
          </Space>
          <Space size="large">
            <Form.Item
              name="maxCount"
              label="名额上限"
              rules={[{ required: true, message: "请输入名额上限" }]}
            >
              <InputNumber min={1} max={10000} style={{ width: 180 }} />
            </Form.Item>
            <Form.Item name="sort" label="排序">
              <InputNumber min={0} max={999} style={{ width: 180 }} />
            </Form.Item>
          </Space>
          <Form.Item name="remark" label="备注">
            <Input maxLength={255} placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default SlotSettings;
