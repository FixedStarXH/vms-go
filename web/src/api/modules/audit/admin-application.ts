import { get, put } from "@/utils/request";
import type { ApplicationItem, ApplicationDetail } from './application';

export interface AdminApplicationSearchParams {
  keyword?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  department?: string;
  page?: number;
  pageSize?: number;
}

export interface ApproveParams {
  remark?: string;
  notifyVisitor?: boolean;
}

export interface RejectParams {
  reason: string;
  notifyVisitor?: boolean;
}

export interface BatchApproveParams {
  ids: string[];
  remark?: string;
}

export const getAdminApplicationList = async (params?: AdminApplicationSearchParams): Promise<{ list: ApplicationItem[]; total: number }> => {
  const res: any = await get('/renren-fast/admin/application/list', { params });
  return res.data || res.page || res;
};

export const getAdminApplicationDetail = async (id: string): Promise<ApplicationDetail> => {
  const res: any = await get(`/renren-fast/admin/application/detail/${id}`);
  return res.data || res;
};

export const approveApplication = async (id: string, params?: ApproveParams): Promise<void> => {
  await put(`/renren-fast/admin/application/approve/${id}`, params);
};

export const rejectApplication = async (id: string, params: RejectParams): Promise<void> => {
  await put(`/renren-fast/admin/application/reject/${id}`, params);
};

export const batchApproveApplications = async (params: BatchApproveParams): Promise<void> => {
  await put('/renren-fast/admin/application/batch-approve', params);
};
