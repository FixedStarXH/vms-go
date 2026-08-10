import { useState } from 'react'
import { Card, Form, Input, InputNumber, Button, DatePicker, Select, message, Space, Typography, Row, Col } from 'antd'
import { UserOutlined, PhoneOutlined, CalendarOutlined, TeamOutlined, CarOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { submitApplication } from '@/api/modules/user/application'

const { Title } = Typography
const { Option } = Select

const ApplyPage = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      const { visitUnit, visitorName, phone, entryDate, timeSlot, reason, companionCount, vehiclePlate } = values
      // 时段选择（上午/下午）→ 开始/结束时间，需与后端时段表匹配
      const [start, end] = timeSlot.split('-')
      const dateStr = dayjs(entryDate).format('YYYY-MM-DD')
      const params = {
        visitUnit,
        visitorName,
        phone,
        entryDate: dateStr,
        entryStartTime: `${dateStr} ${start}:00:00`,
        entryEndTime: `${dateStr} ${end}:00:00`,
        reason,
        companionCount: companionCount || 0,
        vehiclePlate: vehiclePlate || '',
      }
      await submitApplication(params)
      message.success('申请提交成功！')
      form.resetFields()
    } catch (error: any) {
      message.error(error?.msg || '申请提交失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100%', padding: '24px', background: '#f0f2f5' }}>
      <Card>
        <Title level={4} style={{ marginBottom: 24 }}>申请入校</Title>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ companionCount: 0 }}
        >
          <Card title="基本信息" style={{ marginBottom: 24 }}>
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="visitorName"
                  label="访客姓名"
                  rules={[{ required: true, message: '请输入访客姓名' }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="请输入访客姓名" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="phone"
                  label="联系电话"
                  rules={[{ required: true, message: '请输入联系电话' }]}
                >
                  <Input prefix={<PhoneOutlined />} placeholder="请输入联系电话" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="visitUnit"
              label="访问单位"
              rules={[{ required: true, message: '请输入访问单位' }]}
            >
              <Input placeholder="请输入访问单位" />
            </Form.Item>
          </Card>

          <Card title="访问信息" style={{ marginBottom: 24 }}>
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="entryDate"
                  label="入校日期"
                  rules={[{ required: true, message: '请选择入校日期' }]}
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    disabledDate={(current) => current && current < dayjs().startOf('day')}
                    prefix={<CalendarOutlined />}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="timeSlot"
                  label="入校时段"
                  rules={[{ required: true, message: '请选择入校时段' }]}
                >
                  <Select placeholder="请选择入校时段（上午 / 下午）">
                    <Option value="08:00-12:00">上午 08:00-12:00</Option>
                    <Option value="14:00-18:00">下午 14:00-18:00</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="companionCount"
                  label="陪同人数"
                  rules={[{ required: true, message: '请输入陪同人数' }]}
                >
                  <InputNumber style={{ width: '100%' }} min={0} placeholder="请输入陪同人数" prefix={<TeamOutlined />} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="vehiclePlate"
                  label="预约车牌号"
                >
                  <Input prefix={<CarOutlined />} placeholder="请输入车牌号（非必填）" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="reason"
              label="入校原因"
              rules={[{ required: true, message: '请输入入校原因' }]}
            >
              <Input.TextArea
                rows={4}
                placeholder="请详细描述入校事由"
              />
            </Form.Item>
          </Card>

          <Form.Item>
            <Space style={{ float: 'right' }}>
              <Button onClick={() => form.resetFields()}>重置</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                提交申请
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default ApplyPage
