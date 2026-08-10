import { get, put, del } from "@/utils/request";

export interface Visitor {
  id: string;
  name: string;
  phone: string;
  idCard: string;
  visitCount: number;
  lastVisitDate?: string;
  status: 'normal' | 'blacklist';
  createTime: string;
}

export interface VisitorDetail extends Visitor {
  visitHistory: Array<{
    id: string;
    visitDate: string;
    department: string;
    reason: string;
    status: string;
  }>;
}

export interface UpdateVisitorParams {
  name?: string;
  phone?: string;
  status?: 'normal' | 'blacklist';
}

export interface BlacklistParams {
  reason: string;
  days?: number;
}

export interface PromoteCheckResult {
  canPromote: boolean;
  currentLevel: number;
  requiredVisits: number;
  actualVisits: number;
  message: string;
}

export const getVisitorList = async (params?: {
  keyword?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ list: Visitor[]; total: number }> => {
  const res: any = await get('/renren-fast/admin/visitor/list', { params });
  return res.data || res.page || res;
};

export const getVisitorDetail = async (id: string): Promise<VisitorDetail> => {
  const res: any = await get(`/renren-fast/admin/visitor/detail/${id}`);
  return res.data || res;
};

export const updateVisitor = async (id: string, params: UpdateVisitorParams): Promise<void> => {
  await put(`/renren-fast/admin/visitor/update/${id}`, params);
};

export const deleteVisitor = async (id: string): Promise<void> => {
  await del(`/renren-fast/admin/visitor/delete/${id}`);
};

export const toggleBlacklist = async (id: string, params: BlacklistParams): Promise<void> => {
  await put(`/renren-fast/admin/visitor/blacklist`, { id, ...params });
};

export const checkPromote = async (id: string): Promise<PromoteCheckResult> => {
  const res: any = await get(`/renren-fast/admin/visitor/promote-check`, { params: { id } });
  return res.data || res;
};
