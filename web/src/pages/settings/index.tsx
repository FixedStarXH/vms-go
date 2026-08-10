import { useState } from "react";
import {
  Form,
  InputNumber,
  Button,
  message,
  Tabs,
  DatePicker,
  TimePicker,
  Input,
  Table,
} from "antd";
import type { TabsProps } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import styles from "./index.module.scss";

const { RangePicker: DateRangePicker } = DatePicker;
const { RangePicker: TimeRangePicker } = TimePicker;

// 爽约设置
interface NoShowSettings {
  lateMinutes: number;
  noShowCount: number;
  blacklistDays: number;
}

// 入校时间设置
interface VisitTimeSetting {
  id: string;
  dateRange: [dayjs.Dayjs, dayjs.Dayjs];
  timeRange: [dayjs.Dayjs, dayjs.Dayjs];
  remark: string;
}

const SettingsPage = () => {
  const [noShowForm] = Form.useForm();
  const [timeForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [timeSettings, setTimeSettings] = useState<VisitTimeSetting[]>([
    {
      id: "1",
      dateRange: [dayjs("2025-07-01"), dayjs("2025-08-31")],
      timeRange: [dayjs("08:30", "HH:mm"), dayjs("17:30", "HH:mm")],
      remark: "入校时间",
    },
  ]);

  // 保存爽约设置
  const handleSaveNoShow = async (values: NoShowSettings) => {
    setLoading(true);
    try {
      console.log("保存爽约设置:", values);
      message.success("保存成功");
    } catch (error) {
      message.error("保存失败");
    } finally {
      setLoading(false);
    }
  };

  // 添加入校时间
  const handleAddTimeSetting = () => {
    const values = timeForm.getFieldsValue();
    if (!values.dateRange || !values.timeRange) {
      message.error("请填写完整信息");
      return;
    }
    const newSetting: VisitTimeSetting = {
      id: Date.now().toString(),
      dateRange: values.dateRange,
      timeRange: values.timeRange,
      remark: values.remark || "",
    };
    setTimeSettings([...timeSettings, newSetting]);
    timeForm.resetFields();
    message.success("添加成功");
  };

  // 删除入校时间
  const handleDeleteTimeSetting = (id: string) => {
    setTimeSettings(timeSettings.filter((item) => item.id !== id));
    message.success("删除成功");
  };

  const timeColumns = [
    {
      title: "日期范围",
      key: "dateRange",
      render: (_: unknown, record: VisitTimeSetting) =>
        `${record.dateRange[0].format("YYYY-MM-DD")} 至 ${record.dateRange[1].format("YYYY-MM-DD")}`,
    },
    {
      title: "时间范围",
      key: "timeRange",
      render: (_: unknown, record: VisitTimeSetting) =>
        `${record.timeRange[0].format("HH:mm")} 至 ${record.timeRange[1].format("HH:mm")}`,
    },
    {
      title: "备注",
      dataIndex: "remark",
      key: "remark",
    },
    {
      title: "操作",
      key: "action",
      render: (_: unknown, record: VisitTimeSetting) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteTimeSetting(record.id)}
        >
          删除
        </Button>
      ),
    },
  ];

  const items: TabsProps["items"] = [
    {
      key: "noshow",
      label: "爽约设置",
      children: (
        <Form
          form={noShowForm}
          layout="horizontal"
          onFinish={handleSaveNoShow}
          initialValues={{
            lateMinutes: 11,
            noShowCount: 7,
            blacklistDays: 4,
          }}
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
        >
          <Form.Item
            label="迟到多少分钟算爽约"
            name="lateMinutes"
            rules={[{ required: true, message: "请输入分钟数" }]}
          >
            <InputNumber min={1} max={120} style={{ width: 120 }} />
          </Form.Item>

          <Form.Item
            label="爽约多少次进黑名单"
            name="noShowCount"
            rules={[{ required: true, message: "请输入次数" }]}
          >
            <InputNumber min={1} max={100} style={{ width: 120 }} />
          </Form.Item>

          <Form.Item
            label="黑名单限制天数"
            name="blacklistDays"
            rules={[{ required: true, message: "请输入天数" }]}
          >
            <InputNumber min={1} max={365} style={{ width: 120 }} />
          </Form.Item>

          <Form.Item wrapperCol={{ offset: 6, span: 18 }}>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存设置
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: "visittime",
      label: "入校时间设置",
      children: (
        <div>
          <Form form={timeForm} layout="inline" style={{ marginBottom: 24 }}>
            <Form.Item
              label="开始日期"
              name="dateRange"
              rules={[{ required: true, message: "请选择日期" }]}
            >
              <DateRangePicker placeholder={["开始日期", "结束日期"]} />
            </Form.Item>

            <Form.Item
              label="开始时间"
              name="timeRange"
              rules={[{ required: true, message: "请选择时间" }]}
            >
              <TimeRangePicker
                format="HH:mm"
                placeholder={["开始时间", "结束时间"]}
              />
            </Form.Item>

            <Form.Item label="备注名称" name="remark">
              <Input placeholder="请输入备注" style={{ width: 150 }} />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddTimeSetting}
              >
                新增
              </Button>
            </Form.Item>
          </Form>

          <Table
            columns={timeColumns}
            dataSource={timeSettings}
            rowKey="id"
            pagination={false}
          />
        </div>
      ),
    },
  ];

  return (
    <div className={styles.settingsPage}>
      <Tabs items={items} />
    </div>
  );
};

export default SettingsPage;
