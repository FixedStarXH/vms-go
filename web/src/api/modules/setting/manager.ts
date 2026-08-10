import { get, post, put, del } from "@/utils/request";

export interface Manager {
  id: string;
  username: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  status: 'enabled' | 'disabled';
  lastLoginTime?: string;
  createTime: string;
}

export interface AddManagerParams {
  username: string;
  password: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
}

export interface UpdateManagerParams {
  name?: string;
  phone?: string;
  email?: string;
  role?: string;
}

export const getManagerList = async (params?: {
  keyword?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ list: Manager[]; total: number }> => {
  const res: any = await get('/renren-fast/admin/manager/list', { params });
  return res.data || res.page || res;
};

export const addManagerApi = async (params: AddManagerParams): Promise<void> => {
  await post('/renren-fast/admin/manager/add', params);
};

export const updateManager = async (id: string, params: UpdateManagerParams): Promise<void> => {
  await put(`/renren-fast/admin/manager/update/${id}`, params);
};

export const deleteManagerApi = async (id: string): Promise<void> => {
  await del(`/renren-fast/admin/manager/delete/${id}`);
};

export const toggleManagerStatus = async (id: string, status: 'enabled' | 'disabled'): Promise<void> => {
  await put(`/renren-fast/admin/manager/status/${id}`, { status });
};
