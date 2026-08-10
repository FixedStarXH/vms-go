import { useState } from 'react'
import { Card, Form, Input, Button, Avatar, Typography, Space, Divider, Tabs, App } from 'antd'
import { UserOutlined, MailOutlined, PhoneOutlined, LockOutlined, EditOutlined, KeyOutlined } from '@ant-design/icons'
import { useUserStore } from '@/stores'
import { updateUserInfo, changeUserPassword } from '@/api/modules/setting/settings'

const { Title, Text } = Typography

const ProfilePage = () => {
  const { message } = App.useApp()
  const { userInfo, setUserInfo } = useUserStore()
  const [infoForm] = Form.useForm()
  const [pwdForm] = Form.useForm()
  const [infoLoading, setInfoLoading] = useState(false)
  const [pwdLoading, setPwdLoading] = useState(false)

  const handleInfoSubmit = async (values: any) => {
    setInfoLoading(true)
    try {
      await updateUserInfo({
        realName: values.realName,
        phone: values.phone,
        email: values.email,
        avatar: values.avatar,
        gender: values.gender,
      })
      setUserInfo({ ...userInfo, nickname: values.realName, email: values.email, phone: values.phone })
      message.success('个人信息修改成功！')
    } catch (error: any) {
      message.error(error?.message || '修改失败，请重试')
    } finally {
      setInfoLoading(false)
    }
  }

  const handlePwdSubmit = async (values: any) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的密码不一致')
      return
    }
    setPwdLoading(true)
    try {
      await changeUserPassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      })
      message.success('密码修改成功！')
      pwdForm.resetFields()
    } catch (error: any) {
      message.error(error?.message || '密码修改失败，请重试')
    } finally {
      setPwdLoading(false)
    }
  }

  const InfoTab = (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, padding: '20px 24px', background: '#fafafa', borderRadius: 8 }}>
        <Avatar size={72} icon={<UserOutlined />} style={{ backgroundColor: '#2d6a9f', flexShrink: 0 }} />
        <div>
          <Title level={4} style={{ margin: '0 0 4px' }}>{userInfo?.nickname || userInfo?.username}</Title>
          <Text type="secondary">账号：{userInfo?.username}</Text>
        </div>
      </div>

      <Form
        form={infoForm}
        layout="vertical"
        initialValues={{
          username: userInfo?.username,
          realName: userInfo?.nickname || (userInfo as any)?.realName,
          email: userInfo?.email,
          phone: userInfo?.phone,
        }}
        onFinish={handleInfoSubmit}
        style={{ maxWidth: 480 }}
      >
        <Form.Item name="username" label="账号">
          <Input prefix={<UserOutlined />} disabled />
        </Form.Item>

        <Form.Item
          name="realName"
          label="真实姓名"
          rules={[{ required: true, message: '请输入真实姓名' }]}
        >
          <Input prefix={<EditOutlined />} placeholder="请输入真实姓名" />
        </Form.Item>

        <Form.Item
          name="email"
          label="电子邮箱"
          rules={[
            { required: true, message: '请输入电子邮箱' },
            { type: 'email', message: '请输入正确的邮箱格式' },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="请输入电子邮箱" />
        </Form.Item>

        <Form.Item
          name="phone"
          label="联系电话"
          rules={[{ required: true, message: '请输入联系电话' }]}
        >
          <Input prefix={<PhoneOutlined />} placeholder="请输入联系电话" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={infoLoading}>
              保存修改
            </Button>
            <Button onClick={() => infoForm.resetFields()}>重置</Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  )

  const PasswordTab = (
    <div>
      <div style={{ marginBottom: 20, padding: '16px 20px', background: '#fffbe6', borderRadius: 8, border: '1px solid #ffe58f' }}>
        <Text style={{ color: '#ad6800' }}>修改密码后需要重新登录，请确保记住新密码。</Text>
      </div>

      <Form
        form={pwdForm}
        layout="vertical"
        onFinish={handlePwdSubmit}
        style={{ maxWidth: 480 }}
      >
        <Form.Item
          name="oldPassword"
          label="当前密码"
          rules={[{ required: true, message: '请输入当前密码' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="请输入当前密码" />
        </Form.Item>

        <Divider />

        <Form.Item
          name="newPassword"
          label="新密码"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '密码长度不能少于6位' },
          ]}
        >
          <Input.Password prefix={<KeyOutlined />} placeholder="请输入新密码（至少6位）" />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="确认新密码"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: '请确认新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve()
                }
                return Promise.reject(new Error('两次输入的密码不一致'))
              },
            }),
          ]}
        >
          <Input.Password prefix={<KeyOutlined />} placeholder="请再次输入新密码" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={pwdLoading}>
              修改密码
            </Button>
            <Button onClick={() => pwdForm.resetFields()}>重置</Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  )

  return (
    <div style={{ minHeight: '100%', padding: '24px', background: '#f0f2f5' }}>
      <Card>
        <Title level={4} style={{ marginBottom: 24 }}>个人账号</Title>
        <Tabs
          defaultActiveKey="info"
          items={[
            {
              key: 'info',
              label: (
                <span>
                  <EditOutlined style={{ marginRight: 6 }} />
                  基本信息
                </span>
              ),
              children: InfoTab,
            },
            {
              key: 'password',
              label: (
                <span>
                  <LockOutlined style={{ marginRight: 6 }} />
                  修改密码
                </span>
              ),
              children: PasswordTab,
            },
          ]}
        />
      </Card>
    </div>
  )
}

export default ProfilePage
