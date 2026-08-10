import { get, post, put, del } from "@/utils/request";

export interface UserItem {
  userId: number;
  username: string;
  mobile: string;
  status: number;
  createTime: string;
  email?: string;
  roleIdList?: number[];
}

export interface ManagerItem {
  adminId: number;
  username: string;
  phone: string;
  createTime: string;
}

export interface AddManagerParams {
  username: string;
  phone: string;
  password: string;
}

export const getUserList = (params?: {
  username?: string;
  phone?: string;
  status?: number;
  pageNum?: number;
  pageSize?: number;
}) => {
  return get("/admin/user/list", { params });
};

export const getManagerList = () => {
  return get("/admin/manager/list");
};

export const addManager = (data: AddManagerParams) => {
  return post("/admin/manager/add", data);
};

export const deleteManager = (id: number) => {
  return del(`/admin/manager/delete/${id}`);
};

export const updateUser = (data: {
  userId: number;
  username: string;
  mobile: string;
  status: number;
  email?: string;
  roleIdList?: number[];
}) => {
  return post("/admin/user/update", data);
};

export const blacklistUser = (data: {
  userId: number;
  action: "add" | "remove";
  reason?: string;
}) => {
  return put("/admin/manager/blacklist", data);
};

export const deleteUser = (id: number) => {
  return post("/admin/user/delete", { userIds: [id] });
};

export const changePassword = (data: { newPassword: string }) => {
  return post("/sys/password", data);
};
