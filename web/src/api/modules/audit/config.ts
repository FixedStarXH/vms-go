import { get, post, put, del } from "@/utils/request";

export interface NoShowConfig {
  enabled: boolean;
  threshold: number;
  blacklistDays: number;
}

export interface VisitTimeConfig {
  startTime: string;
  endTime: string;
  timeSlotDuration: number;
  maxVisitorsPerSlot: number;
  allowWeekend: boolean;
  allowHoliday: boolean;
}

export interface SpecialDate {
  id: string;
  date: string;
  type: 'holiday' | 'workday';
  name: string;
  description?: string;
}

export interface AddSpecialDateParams {
  date: string;
  type: 'holiday' | 'workday';
  name: string;
  description?: string;
}

export const getNoShowConfig = async (): Promise<NoShowConfig> => {
  const res: any = await get('/renren-fast/admin/config/no-show');
  return res.data || res;
};

export const updateNoShowConfig = async (params: NoShowConfig): Promise<void> => {
  await put('/renren-fast/admin/config/no-show', params);
};

export const getVisitTimeConfig = async (): Promise<VisitTimeConfig> => {
  const res: any = await get('/renren-fast/admin/config/visit-time');
  return res.data || res;
};

export const updateVisitTimeConfig = async (params: VisitTimeConfig): Promise<void> => {
  await put('/renren-fast/admin/config/visit-time', params);
};

export const addSpecialDate = async (params: AddSpecialDateParams): Promise<void> => {
  await post('/renren-fast/admin/config/special-date', params);
};

export const getSpecialDateList = async (params?: {
  year?: string;
  type?: string;
}): Promise<SpecialDate[]> => {
  const res: any = await get('/renren-fast/admin/config/special-date', { params });
  return res.data || res;
};

export const deleteSpecialDate = async (id: string): Promise<void> => {
  await del(`/renren-fast/admin/config/special-date/${id}`);
};
