import { get } from "@/utils/request";

export interface TodayOverview {
  totalAppointments: number;
  checkedIn: number;
  notCheckedIn: number;
  noShow: number;
  currentInCampus: number;
  departmentStats: Array<{
    department: string;
    count: number;
  }>;
  hourlyStats: Array<{
    hour: string;
    count: number;
  }>;
}

export const getTodayOverview = async (): Promise<TodayOverview> => {
  const res: any = await get('/renren-fast/admin/monitor/today-overview');
  return res.data || res;
};
