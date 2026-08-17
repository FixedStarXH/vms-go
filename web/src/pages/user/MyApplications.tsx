import { useState, useEffect } from 'react'
import { Card, Table, Tag, Button, Space, Modal, Typography, message, Form, Select, DatePicker, Input, Image } from 'antd'
import { EyeOutlined, DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { getApplicationList, cancelApplication } from '@/api/modules/user/application'

const { RangePicker } = DatePicker

const { Title, Text, Paragraph } = Typography

interface ApplicationRecord {
  id: string
  visitUnit: string
  visitorName: string
  phone: string
  entryDate: string
  entryStartTime: string
  entryEndTime: string
  reason: string
  companionCount: number
  vehiclePlate?: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'no_show' | 'done'
  entryCode?: string
  createdAt: string
}

const statusMap: Record<string, { color: string; text: string }> = {
  pending: { color: 'gold', text: '待审核' },
  approved: { color: 'green', text: '已通过' },
  rejected: { color: 'red', text: '已拒绝' },
  cancelled: { color: 'default', text: '已取消' },
  no_show: { color: 'purple', text: '已爽约' },
  done: { color: 'blue', text: '已完成' },
}

const MyApplicationsPage = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [data, setData] = useState<ApplicationRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [currentRecord, setCurrentRecord] = useState<ApplicationRecord | null>(null)
  const [pagination, setPagination] = useState({ pageNum: 1, pageSize: 10 })

  // 页码显式传入，避免 setState 异步导致闭包里读到旧页码（翻页恒为第 1 页的 bug）
  const fetchList = async (page: number, params?: any) => {
    setLoading(true)
    try {
      const res = await getApplicationList({
        pageNum: page,
        pageSize: pagination.pageSize,
        ...params,
      })
      setData(Array.isArray(res?.list) ? res.list : [])
      setTotal(res?.total || 0)
    } catch (error) {
      console.error('获取申请列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList(1)
  }, [])

  const handleSearch = (values: any) => {
    const params: any = {
      status: values.status,
    }
    if (values.dateRange && values.dateRange.length === 2) {
      params.startTime = values.dateRange[0].format('YYYY-MM-DD')
      params.endTime = values.dateRange[1].format('YYYY-MM-DD')
    }
    if (values.visitorName) {
      params.visitorName = values.visitorName
    }
    setPagination({ ...pagination, pageNum: 1 })
    fetchList(1, params)
  }

  const handleReset = () => {
    form.resetFields()
    setPagination({ ...pagination, pageNum: 1 })
    fetchList(1)
  }

  const handleTableChange = (page: any) => {
    setPagination({ pageNum: page.current, pageSize: page.pageSize })
    fetchList(page.current)
  }

  const handleView = (record: ApplicationRecord) => {
    setCurrentRecord(record)
    setDetailVisible(true)
  }

  // 取消申请（真实调后端）：仅待审核可取消，取消后释放名额
  const handleCancel = (id: string) => {
    Modal.confirm({
      title: '确认取消',
      content: '确定要取消这条待审核的申请吗？取消后将释放该时段名额。',
      okText: '确定',
      cancelText: '再想想',
      onOk: async () => {
        try {
          await cancelApplication(id)
          message.success('已取消申请')
          fetchList(pagination.pageNum)
        } catch (error: any) {
          message.error(error?.message || '取消失败')
        }
      },
    })
  }

  const columns = [
    {
      title: '入校日期',
      dataIndex: 'entryDate',
      key: 'entryDate',
      width: 140,
    },
    {
      title: '入校时间',
      key: 'entryTime',
      width: 200,
      render: (_: any, record: ApplicationRecord) => `${record.entryStartTime} - ${record.entryEndTime}`,
    },
    {
      title: '访客姓名',
      dataIndex: 'visitorName',
      key: 'visitorName',
      width: 120,
    },
    {
      title: '访问单位',
      dataIndex: 'visitUnit',
      key: 'visitUnit',
      width: 160,
    },
    {
      title: '车牌号',
      dataIndex: 'vehiclePlate',
      key: 'vehiclePlate',
      width: 120,
    },
    {
      title: '陪同人数',
      dataIndex: 'companionCount',
      key: 'companionCount',
      width: 100,
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const { color, text } = statusMap[status] || { color: 'default', text: '未知' }
        return <Tag color={color}>{text}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: unknown, record: ApplicationRecord) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleView(record)}>
            查看
          </Button>
          {record.status === 'pending' && (
            <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleCancel(record.id)}>
              取消
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ minHeight: '100%', padding: '24px', background: '#f0f2f5' }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>我的申请</Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/user/apply')}>
            新建申请
          </Button>
        </div>

        <Form
          form={form}
          layout="inline"
          onFinish={handleSearch}
          style={{ marginBottom: 16 }}
        >
          <Form.Item name="visitorName" label="访客姓名">
            <Input placeholder="请输入" prefix={<SearchOutlined />} style={{ width: 160 }} />
          </Form.Item>

          <Form.Item name="status" label="状态">
            <Select placeholder="请选择" style={{ width: 140 }} allowClear>
              <Select.Option value="pending">待审核</Select.Option>
              <Select.Option value="approved">已通过</Select.Option>
              <Select.Option value="rejected">已拒绝</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="dateRange" label="申请时间">
            <RangePicker style={{ width: 280 }} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                查询
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            current: pagination.pageNum,
            pageSize: pagination.pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (totalCount) => `共 ${totalCount} 条记录`,
          }}
          onChange={handleTableChange}
        />
      </Card>

      <Modal
        title="申请详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={560}
      >
        {currentRecord && (
          <div style={{ padding: '8px 0' }}>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>申请状态</Text>
              <div style={{ marginTop: 4 }}>
                <Tag color={statusMap[currentRecord.status]?.color} style={{ fontSize: 14, padding: '2px 12px' }}>
                  {statusMap[currentRecord.status]?.text}
                </Tag>
              </div>
            </div>

            <Title level={5} style={{ marginTop: 16, marginBottom: 12, color: '#2d6a9f' }}>基本信息</Title>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', marginBottom: 16 }}>
              <div><Text type="secondary">访客姓名：</Text><Text>{currentRecord.visitorName}</Text></div>
              <div><Text type="secondary">联系电话：</Text><Text>{currentRecord.phone}</Text></div>
              <div><Text type="secondary">访问单位：</Text><Text>{currentRecord.visitUnit}</Text></div>
              <div><Text type="secondary">陪同人数：</Text><Text>{currentRecord.companionCount}人</Text></div>
              <div><Text type="secondary">车牌号：</Text><Text>{currentRecord.vehiclePlate || '无'}</Text></div>
            </div>

            <Title level={5} style={{ marginTop: 16, marginBottom: 12, color: '#2d6a9f' }}>访问信息</Title>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', marginBottom: 16 }}>
              <div><Text type="secondary">入校日期：</Text><Text>{currentRecord.entryDate}</Text></div>
              <div><Text type="secondary">入校时段：</Text><Text>{`${currentRecord.entryStartTime} - ${currentRecord.entryEndTime}`}</Text></div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">入校原因：</Text>
              <Paragraph style={{ marginTop: 4 }}>{currentRecord.reason}</Paragraph>
            </div>
            {currentRecord.status === 'approved' && currentRecord.entryCode && (
              <div style={{ marginBottom: 16, textAlign: 'center', padding: '16px', background: '#fafafa', borderRadius: 8 }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                  入校凭证（到校时出示，管理员扫码核销）
                </Text>
                <Image
                  src={`/uploads/qrcode/${currentRecord.entryCode}.png`}
                  alt="入校凭证二维码"
                  width={200}
                  height={200}
                  style={{ border: '1px solid #eee', borderRadius: 8 }}
                />
                <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                  凭证编号：{currentRecord.entryCode}
                </Text>
              </div>
            )}
            <div>
              <Text type="secondary">申请时间：</Text><Text>{new Date(currentRecord.createdAt).toLocaleString('zh-CN')}</Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default MyApplicationsPage
