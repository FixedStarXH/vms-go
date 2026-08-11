import { get, post, put, del } from "@/utils/request";

export interface TimeSlotItem {
  slotId: number;
  slotName: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  maxCount: number;
  currentCount: number;
  status: number; // 0 禁用 1 启用
  sort: number;
  remark?: string;
  createTime?: string;
  updateTime?: string;
}

export const getSlotList = () => {
  return get("/admin/slot/list");
};

export const saveSlot = (data: Partial<TimeSlotItem>) => {
  return post("/admin/slot/save", data);
};

export const toggleSlot = (id: number, status: number) => {
  return put(`/admin/slot/status/${id}`, { status });
};

export const deleteSlot = (id: number) => {
  return del(`/admin/slot/delete/${id}`);
};
