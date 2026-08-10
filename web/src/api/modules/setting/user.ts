import { get, post, put } from "@/utils/request";

export interface RegisterParams {
  username: string;
  password: string;
  phone: string;
  email?: string;
}

export interface LoginParams {
  username: string;
  password: string;
}

export interface UserInfo {
  id: string;
  username: string;
  phone: string;
  email: string;
  avatar?: string;
  createTime: string;
}

export interface UpdateUserParams {
  phone?: string;
  email?: string;
  avatar?: string;
}

export interface UpdatePasswordParams {
  oldPassword: string;
  newPassword: string;
}

export interface DashboardData {
  totalVisits: number;
  pendingApplications: number;
  approvedApplications: number;
  todayVisits: number;
  recentRecords: Array<{
    id: string;
    visitDate: string;
    status: string;
  }>;
}

export interface CalendarEvent {
  date: string;
  count: number;
  events: Array<{
    id: string;
    title: string;
    time: string;
    status: string;
  }>;
}

export const register = async (params: RegisterParams): Promise<void> => {
  await post('/renren-fast/api/user/register', params);
};

export const login = async (params: LoginParams): Promise<{ token: string; user: UserInfo }> => {
  const res: any = await post('/renren-fast/api/user/login', params);
  return res.data || res;
};

export const getUserInfo = async (): Promise<UserInfo> => {
  const res: any = await get('/renren-fast/api/user/info');
  return res.data || res;
};

export const updateUserInfo = async (params: UpdateUserParams): Promise<void> => {
  await put('/renren-fast/api/user/update', params);
};

export const updatePassword = async (params: UpdatePasswordParams): Promise<void> => {
  await put('/renren-fast/api/user/password', params);
};

export const getDashboard = async (): Promise<DashboardData> => {
  const res: any = await get('/renren-fast/api/user/dashboard');
  return res.data || res;
};

export const getCalendar = async (month: string): Promise<CalendarEvent[]> => {
  const res: any = await get('/renren-fast/api/user/calendar', { params: { month } });
  return res.data || res;
};
