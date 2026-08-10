import { get, del } from "@/utils/request";

export interface ApplicationRecord {
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

export interface UserQueryParams {
  page?: number;
  pageSize?: number;
  visitorName?: string;
  phone?: string;
  status?: number;
  startDate?: string;
  endDate?: string;
}

export interface RecordSearchParams {
  keyword?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export const getMyRecords = async (params?: {
  page?: number;
  pageSize?: number;
}) => {
  const res: any = await get("/renren-fast/api/application/list", { params });
  return res;
};

export const getUserRecordList = async (params?: UserQueryParams) => {
  const res: any = await get("/renren-fast/admin/application/list", { params });
  return res;
};

export const getAdminRecordDetail = async (id: string) => {
  const res: any = await get(`/renren-fast/admin/application/detail/${id}`);
  return res.data || res;
};

export const deleteUserRecord = async (id: number): Promise<void> => {
  await del(`/renren-fast/admin/application/delete/${id}`);
};

export const exportRecords = async (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<Blob> => {
  const res: any = await get("/renren-fast/admin/application/export", {
    params,
    responseType: "blob",
  });
  return res;
};
