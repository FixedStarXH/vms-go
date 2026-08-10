import { get, post, put, del } from "@/utils/request";

export interface NotificationSettings {
  reminderDays: number;
  visitCount: number;
  blacklistDays: number;
  enableEmail: boolean;
  enableSms: boolean;
}

export interface NoShowConfig {
  enabled: boolean;
  threshold: number;
  blacklistDays: number;
}

export interface VisitTimeConfig {
  startTime: string;
  endTime: string;
  maxDuration: number;
}

export interface SpecialDate {
  id: number;
  date: string;
  type: number;
  description: string;
  startTime?: string;
  endTime?: string;
  createTime: string;
  updateTime: string;
}

export interface SpecialDateParams {
  pageNum?: number;
  pageSize?: number;
  type?: number;
  startDate?: string;
  endDate?: string;
}

export interface SpecialDateListResponse {
  list: SpecialDate[];
  total: number;
}

export interface AddSpecialDateParams {
  date: string;
  type: number;
  description: string;
  startTime?: string;
  endTime?: string;
}

export interface UpdateSpecialDateParams {
  date: string;
  type: number;
  description: string;
  startTime?: string;
  endTime?: string;
}

export interface UpdateUserInfoParams {
  realName?: string;
  phone?: string;
  email?: string;
  avatar?: string;
  gender?: number;
}

export interface ChangeUserPasswordParams {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  const res: any = await get('/renren-fast/api/settings/notification');
  return res.data || res;
};

export const saveNotificationSettings = async (data: NotificationSettings): Promise<void> => {
  await post('/renren-fast/api/settings/notification', data);
};

export const getNoShowConfig = async (): Promise<NoShowConfig> => {
  const res: any = await get('/renren-fast/admin/config/no-show');
  return res.data || res;
};

export const updateNoShowConfig = async (data: NoShowConfig): Promise<void> => {
  await put('/renren-fast/admin/config/no-show', data);
};

export const updateVisitTimeConfig = async (data: VisitTimeConfig): Promise<void> => {
  await put('/renren-fast/admin/config/visit-time', data);
};

export const getSpecialDateList = async (params: SpecialDateParams): Promise<SpecialDateListResponse> => {
  const res: any = await get('/renren-fast/admin/config/special-date/list', { params });
  return res.data || res.page || res;
};

export const addSpecialDate = async (data: AddSpecialDateParams): Promise<void> => {
  await post('/renren-fast/admin/config/special-date/add', data);
};

export const updateSpecialDate = async (id: number, data: UpdateSpecialDateParams): Promise<void> => {
  await put(`/renren-fast/admin/config/special-date/update/${id}`, data);
};

export const deleteSpecialDate = async (id: number): Promise<void> => {
  await del(`/renren-fast/admin/config/special-date/delete/${id}`);
};

export const updateUserInfo = async (data: UpdateUserInfoParams): Promise<void> => {
  await post('/renren-fast/api/user/update', data);
};

export const changeUserPassword = async (data: ChangeUserPasswordParams): Promise<void> => {
  await post('/renren-fast/api/user/password', data);
};
