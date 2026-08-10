import { useRef, useState } from "react";
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  message,
  Typography,
  Result,
  Space,
  Alert,
} from "antd";
import { ScanOutlined, ClearOutlined } from "@ant-design/icons";
import { verifyQR, type VerifyResult } from "@/api/modules/verify/verify";

const { Title, Text } = Typography;

const GATES = ["东门", "南门", "西门", "北门"];

// 核销返回的 recordStatus：0 待入校 1 已入校 4 已完成
const statusMap: Record<number, { text: string; color: string }> = {
  0: { text: "待入校", color: "orange" },
  1: { text: "已入校", color: "blue" },
  4: { text: "已完成", color: "green" },
};

const VerifyPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const inputRef = useRef<any>(null);

  const handleVerify = async (values: any) => {
    const qrContent = (values.qrContent || "").trim();
    if (!qrContent) {
      message.warning("请输入或扫描二维码内容");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res: any = await verifyQR(qrContent, values.gate || "东门");
      const data: VerifyResult = res?.data || res;
      setResult(data);
      message.success(data?.message || "核销成功");
    } catch (error: any) {
      // 后端业务错误经请求拦截器 reject 为 Error，消息在 error.message（如"已过入校时段…"）；
      // 部分直出响应 msg 字段，兼容两者，避免错误被笼统的兜底文案吞掉
      message.error(error?.message || error?.msg || "核销失败，请检查二维码内容");
    } finally {
      setLoading(false);
    }
  };

  // 核销完清空输入，方便连续扫下一个码
  const handleNext = () => {
    setResult(null);
    form.setFieldValue("qrContent", "");
    inputRef.current?.focus();
  };

  const status = result ? statusMap[result.recordStatus] : null;

  return (
    <div style={{ minHeight: "100%", padding: 24, background: "#f0f2f5" }}>
      <Card>
        <Title level={4} style={{ marginBottom: 8 }}>
          门禁核销
        </Title>
        <Text type="secondary">
          访客到校时，用扫码枪扫描其手机上的入校凭证二维码；无扫码枪时可手动粘贴二维码内容。
        </Text>

        <Alert
          type="info"
          showIcon
          style={{ margin: "16px 0" }}
          message="二维码内容示例"
          description="内容形如 ERS|EC20260810000001|12|2026-08-10|签名。可在【审批申请】的详情中复制凭证编号对应的二维码内容。"
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleVerify}
          initialValues={{ gate: "东门" }}
          style={{ maxWidth: 560 }}
        >
          <Form.Item
            name="qrContent"
            label="二维码内容"
            rules={[{ required: true, message: "请扫描或输入二维码内容" }]}
          >
            <Input
              ref={inputRef}
              prefix={<ScanOutlined />}
              placeholder="扫码枪扫描自动输入，或手动粘贴（扫码枪输入后回车提交）"
              autoComplete="off"
              onPressEnter={() => form.submit()}
            />
          </Form.Item>

          <Form.Item name="gate" label="核销门禁">
            <Select style={{ width: 200 }}>
              {GATES.map((g) => (
                <Select.Option key={g} value={g}>
                  {g}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<ScanOutlined />}
                loading={loading}
              >
                核销
              </Button>
              <Button onClick={() => form.resetFields()} icon={<ClearOutlined />}>
                清空
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {result && (
          <Result
            status="success"
            title={result.message || "核销成功"}
            style={{ maxWidth: 560, padding: "24px 0" }}
            extra={[
              <Space key="info" direction="vertical" size={4}>
                <Text>
                  访客姓名：<Text strong>{result.visitorName}</Text>
                </Text>
                <Text>
                  联系电话：<Text strong>{result.phone}</Text>
                </Text>
                <Text>
                  入校状态：
                  <Text strong style={{ color: status?.color }}>
                    {status?.text || `状态${result.recordStatus}`}
                  </Text>
                </Text>
                <Text type="secondary">凭证编号：{result.recordNo}</Text>
              </Space>,
              <Button
                key="next"
                type="primary"
                onClick={handleNext}
                style={{ marginTop: 8 }}
              >
                核销下一位
              </Button>,
            ]}
          />
        )}
      </Card>
    </div>
  );
};

export default VerifyPage;
