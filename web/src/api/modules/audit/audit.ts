import { get, put, del } from "@/utils/request";

export interface VisitorRecord {
  id: number;
  visitorId: number;
  visitorName: string;
  phone: string;
  idCard: string | null;
  visitUnit: string;
  vehiclePlate: string;
  reason: string;
  entryDate: string;
  entryStartTime: string;
  entryEndTime: string;
  slotId: number;
  companionCount: number;
  applicationNo: string;
  status: number;
  rejectReason: string | null;
  entryCode: string | null;
  attachmentUrl: string | null;
  approvalUserId: number | null;
  approvalTime: string | null;
  approvalRemark: string | null;
  cancelTime: string | null;
  cancelReason: string | null;
  createUserId: number | null;
  createTime: string;
  updateTime: string;
  deleted: number;
}

export interface AuditParams {
  visitorName?: string;
  phone?: string;
  pageNum?: number;
  pageSize?: number;
}

export interface AuditListResponse {
  list: VisitorRecord[];
  total: number;
}

export const getAuditList = async (params: AuditParams): Promise<AuditListResponse> => {
  const res: any = await get('/renren-fast/admin/application/list', { params });
  return res.data || res.page || res;
};

export const approveAudit = async (id: number): Promise<void> => {
  await get(`/renren-fast/admin/application/approve/${id}`);
};

export const rejectAudit = async (id: number, reason?: string): Promise<void> => {
  await put(`/renren-fast/admin/application/reject/${id}`, { reason });
};

export const getAuditDetail = async (id: number): Promise<VisitorRecord> => {
  const res: any = await get(`/renren-fast/admin/application/detail/${id}`);
  return res.data || res;
};

export const batchApproveAudit = async (ids: number[], remark?: string): Promise<void> => {
  await put('/renren-fast/admin/application/batch-approve', null, {
    params: { ids: JSON.stringify(ids), remark }
  });
};

export const batchDeleteAudit = async (ids: number[]): Promise<void> => {
  await del('/renren-fast/admin/application/batch-delete', {
    params: { ids: JSON.stringify(ids) }
  });
};

export const getPendingCount = async (): Promise<number> => {
  const res: any = await get('/renren-fast/admin/application/pending/count');
  return res.data || res;
};

export const getPendingList = async (params: AuditParams): Promise<AuditListResponse> => {
  const res: any = await get('/renren-fast/admin/application/pending/list', { params });
  return res.data || res.page || res;
};

export const batchRejectAudit = async (ids: number[], reason?: string): Promise<void> => {
  await put('/renren-fast/admin/application/batch-reject', null, {
    params: { ids: JSON.stringify(ids), reason }
  });
};
