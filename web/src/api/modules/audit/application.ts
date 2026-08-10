import { get, post, put } from "@/utils/request";

export interface SubmitApplicationParams {
  visitorName: string;
  visitorPhone: string;
  idCard: string;
  visitDate: string;
  visitTime: string;
  department: string;
  reason: string;
  accompanyCount?: number;
  remark?: string;
}

export interface ApplicationItem {
  id: string;
  visitorName: string;
  visitorPhone: string;
  visitDate: string;
  visitTime: string;
  department: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createTime: string;
  approveTime?: string;
  rejectReason?: string;
}

export interface ApplicationDetail extends ApplicationItem {
  idCard: string;
  accompanyCount: number;
  remark: string;
  approverName?: string;
}

export interface TimelineEvent {
  time: string;
  title: string;
  description: string;
  status: 'success' | 'processing' | 'error' | 'default';
}

export const submitApplication = async (params: SubmitApplicationParams): Promise<void> => {
  await post('/renren-fast/api/application/submit', params);
};

export const getApplicationList = async (params?: {
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ list: ApplicationItem[]; total: number }> => {
  const res: any = await get('/renren-fast/api/application/list', { params });
  return res.data || res.page || res;
};

export const getApplicationDetail = async (id: string): Promise<ApplicationDetail> => {
  const res: any = await get(`/renren-fast/api/application/detail/${id}`);
  return res.data || res;
};

export const getApplicationTimeline = async (id: string): Promise<TimelineEvent[]> => {
  const res: any = await get(`/renren-fast/api/application/timeline/${id}`);
  return res.data || res;
};

export const cancelApplication = async (id: string): Promise<void> => {
  await put(`/renren-fast/api/application/cancel/${id}`);
};
