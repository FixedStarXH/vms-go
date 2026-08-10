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
}) => {
  return get("/renren-fast/admin/user/list", { params });
};

export const getManagerList = () => {
  return get("/renren-fast/admin/manager/list");
};

export const addManager = (data: AddManagerParams) => {
  return post("/renren-fast/admin/manager/add", data);
};

export const deleteManager = (id: number) => {
  return del(`/renren-fast/admin/manager/delete/${id}`);
};

export const updateUser = (data: {
  userId: number;
  username: string;
  mobile: string;
  status: number;
  email?: string;
  roleIdList?: number[];
}) => {
  return post("/renren-fast/admin/user/update", data);
};

export const blacklistUser = (data: {
  userId: number;
  action: "add" | "remove";
  reason?: string;
}) => {
  return put("/renren-fast/admin/manager/blacklist", data);
};

export const deleteUser = (id: number) => {
  return post("/renren-fast/admin/user/delete", { userIds: [id] });
};

export const changePassword = (data: { newPassword: string }) => {
  return post("/renren-fast/sys/password", data);
};
