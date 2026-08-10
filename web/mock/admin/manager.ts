import type { MockMethod } from 'vite-plugin-mock'

interface UserItem {
  id: number;
  username: string;
  phone: string;
  status: number;
  createTime: string;
}

interface ManagerItem {
  id: number;
  username: string;
  phone: string;
  createTime: string;
}

const userStore: UserItem[] = [
  { id: 1, username: "admin", phone: "13800138000", status: 1, createTime: "2024-01-01 10:00:00" },
  { id: 2, username: "viewer", phone: "13800138001", status: 1, createTime: "2024-02-15 14:30:00" },
  { id: 3, username: "zhangsan", phone: "13800138002", status: 1, createTime: "2024-03-01 09:00:00" },
  { id: 4, username: "lisi", phone: "13800138003", status: 1, createTime: "2024-03-05 11:30:00" },
  { id: 5, username: "wangwu", phone: "13800138004", status: 0, createTime: "2024-03-10 16:00:00" },
  { id: 6, username: "zhaoliu", phone: "13800138005", status: 1, createTime: "2024-03-15 08:45:00" },
  { id: 7, username: "sunqi", phone: "13800138006", status: 1, createTime: "2024-03-20 13:20:00" },
  { id: 8, username: "zhouba", phone: "13800138007", status: 0, createTime: "2024-03-25 10:10:00" },
  { id: 9, username: "wujiu", phone: "13800138008", status: 1, createTime: "2024-04-01 15:30:00" },
  { id: 10, username: "zhengshi", phone: "13800138009", status: 1, createTime: "2024-04-05 09:15:00" },
  { id: 11, username: "xiaoming", phone: "13800138010", status: 1, createTime: "2024-04-10 14:00:00" },
  { id: 12, username: "xiaohong", phone: "13800138011", status: 1, createTime: "2024-04-15 11:45:00" },
];

const managerStore: ManagerItem[] = [
  { id: 1, username: "admin", phone: "13800138000", createTime: "2024-01-01 10:00:00" },
  { id: 3, username: "zhangsan", phone: "13800138002", createTime: "2024-03-01 09:00:00" },
  { id: 4, username: "lisi", phone: "13800138003", createTime: "2024-03-05 11:30:00" },
  { id: 6, username: "zhaoliu", phone: "13800138005", createTime: "2024-03-15 08:45:00" },
  { id: 8, username: "zhouba", phone: "13800138007", createTime: "2024-03-25 10:10:00" },
  { id: 10, username: "zhengshi", phone: "13800138009", createTime: "2024-04-05 09:15:00" },
  { id: 12, username: "xiaohong", phone: "13800138011", createTime: "2024-04-15 11:45:00" },
];

export default [
  {
    url: '/admin/user/list',
    method: 'get',
    response: ({ query }: { query: any }) => {
      let filteredList = [...userStore];
      
      if (query.username) {
        filteredList = filteredList.filter(item => item.username.includes(query.username));
      }
      if (query.phone) {
        filteredList = filteredList.filter(item => item.phone.includes(query.phone));
      }
      if (query.status !== undefined && query.status !== '') {
        filteredList = filteredList.filter(item => item.status === Number(query.status));
      }
      
      return {
        code: 200,
        msg: '获取成功',
        data: {
          list: filteredList,
          total: filteredList.length,
        },
      };
    },
  },
  {
    url: '/admin/manager/list',
    method: 'get',
    response: () => {
      return {
        code: 200,
        msg: '获取成功',
        data: {
          list: managerStore,
          total: managerStore.length,
        },
      };
    },
  },
  {
    url: '/admin/manager/add',
    method: 'post',
    response: ({ body }: { body: any }) => {
      const newId = Math.max(...managerStore.map(item => item.id)) + 1;
      const now = new Date();
      const createTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      
      const newManager: ManagerItem = {
        id: newId,
        username: body.username,
        phone: body.phone,
        createTime,
      };
      
      managerStore.push(newManager);
      
      return {
        code: 200,
        msg: '添加成功',
        data: newManager,
      };
    },
  },
  {
    url: '/admin/manager/delete/:id',
    method: 'delete',
    response: ({ query }: { query: any }) => {
      const id = Number(query.id);
      const index = managerStore.findIndex(item => item.id === id);
      
      if (index > -1) {
        managerStore.splice(index, 1);
        return {
          code: 200,
          msg: '撤销成功',
        };
      }
      
      return {
        code: 404,
        msg: '管理员不存在',
      };
    },
  },
  {
    url: '/admin/manager/blacklist',
    method: 'post',
    response: ({ body }: { body: any }) => {
      const user = userStore.find(item => item.id === body.id);
      
      if (user) {
        user.status = body.status;
        return {
          code: 200,
          msg: body.status === 0 ? '已加入黑名单' : '已恢复正常',
        };
      }
      
      return {
        code: 404,
        msg: '用户不存在',
      };
    },
  },
  {
    url: '/sys/password',
    method: 'post',
    response: () => {
      return {
        code: 200,
        msg: '密码修改成功',
      };
    },
  },
] as MockMethod[]
