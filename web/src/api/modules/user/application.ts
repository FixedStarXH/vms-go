import { get, post } from "@/utils/request";

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
  post("/renren-fast/api/application/submit", data);

export const getApplicationList = (params?: any) => {
  return get("/renren-fast/api/application/list", { params });
};
