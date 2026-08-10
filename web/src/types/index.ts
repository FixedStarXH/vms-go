// 分页参数
export interface PageParams {
  pageNum?: number
  pageSize?: number
}

// 分页结果
export interface PageResult<T> {
  list: T[]
  total: number
}

// API 响应结构
export interface ApiResponse<T = any> {
  code: number
  data: T
  msg: string
}

// 用户类型
export interface User {
  id: number
  username: string
  nickname?: string
  avatar?: string
  phone?: string
  email?: string
  roles?: string[]
  userType?: string
  tenantId?: number
  createdAt?: string
  updatedAt?: string
}

// ==================== 登录认证 ====================

export interface LoginParams {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  saasName: string
  permissions: string[]
  userInfo: {
    id: number
    username: string
    nickname: string
    avatar?: string
    roles?: string[]
    phone?: string
    email?: string
  }
}

// ==================== 系统管理 ====================

export interface Role {
  id: number
  name: string
  code: string
  description?: string
  menuIds?: number[]
  deptIds?: number[]
  status: number
  createdAt: string
  updatedAt?: string
}

export interface RoleParams extends PageParams {
  name?: string
  code?: string
  status?: number
}

export interface Menu {
  id: number
  parentId: number
  name: string
  path?: string
  icon?: string
  component?: string
  permission?: string
  type: number
  sort: number
  visible: number
  status: number
  children?: Menu[]
  createdAt: string
  updatedAt?: string
}

export interface Dept {
  id: number
  parentId: number
  name: string
  sort: number
  status: number
  children?: Dept[]
}

// ==================== 消息通知 ====================

export type MessageType = 'announcement' | 'notification' | 'message'

export type MessagePriority = 'normal' | 'important' | 'urgent'

export interface Message {
  id: number
  title: string
  content: string
  type: MessageType
  priority: MessagePriority
  senderId: number
  senderName: string
  senderAvatar?: string
  isRead: boolean
  createdAt: string
}

export interface MessageListParams extends PageParams {
  type?: MessageType
  isRead?: number
  keyword?: string
}

export interface UnreadCount {
  total: number
  announcement: number
  notification: number
  message: number
}

// ==================== 字典 ====================

export interface DictType {
  id: number
  code: string
  name: string
  remark?: string
}

export interface DictItem {
  id: number
  dictType: string
  value: string | number
  label: string
  color?: string
  sort?: number
}