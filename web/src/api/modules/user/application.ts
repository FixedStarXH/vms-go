import { get, post, put } from "@/utils/request";

export interface SubmitApplicationParams {
  visitorName: string;
  phone: string;
  visitUnit: string;
  entryDate: string;
  entryStartTime: string;
  entryEndTime: string;
  reason: string;
  companionCount?: number;
  vehiclePlate?: string;
}

export interface ApplicationItem {
  id: string;
  visitorName: string;
  visitorPhone: string;
  visitDate: string;
  visitTime: string;
  department: string;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  createTime: string;
}

export const submitApplication = (data: SubmitApplicationParams) =>
  post("/api/application/submit", data);

export const getApplicationList = (params?: any) => {
  return get("/api/application/list", { params });
};

// 取消申请（仅待审核可取消，取消后释放名额）
export const cancelApplication = (id: string) =>
  put(`/api/application/cancel/${id}`);
