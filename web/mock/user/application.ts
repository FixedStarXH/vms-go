import type { MockMethod } from 'vite-plugin-mock'

interface UserItem {
  id: number;
  username: string;
  password: string;
  phone: string;
  email: string;
  gender: number;
  userType: string;
  status: number;
  createTime: string;
}

const userStore: UserItem[] = [
  { id: 1, username: "admin", password: "123456", phone: "13800138000", email: "admin@example.com", gender: 0, userType: "admin", status: 1, createTime: "2024-01-01 10:00:00" },
  { id: 2, username: "viewer", password: "123456", phone: "13800138001", email: "viewer@example.com", gender: 0, userType: "viewer", status: 1, createTime: "2024-02-15 14:30:00" },
];

const applicationStore: any[] = []

export default [
  {
    url: '/api/user/login',
    method: 'post',
    response: ({ body }: { body: any }) => {
      const { username, password } = body;
      const user = userStore.find(item => item.username === username && item.password === password);
      
      if (user) {
        return {
          code: 200,
          msg: '登录成功',
          userId: user.id,
          username: user.username,
          token: `token_${user.username}_${Date.now()}`,
          userType: user.userType,
        };
      }
      
      return {
        code: 401,
        msg: '用户名或密码错误',
        userId: 0,
        username: '',
        token: '',
        userType: '',
      };
    },
  },
  {
    url: '/api/user/register',
    method: 'post',
    response: ({ body }: { body: any }) => {
      const { username, password, confirmPassword } = body;
      
      if (userStore.find(item => item.username === username)) {
        return {
          code: 400,
          msg: '用户名已存在',
        };
      }
      
      if (password !== confirmPassword) {
        return {
          code: 400,
          msg: '两次密码不一致',
        };
      }
      
      const newId = Math.max(...userStore.map(item => item.id)) + 1;
      const now = new Date();
      const createTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      
      userStore.push({
        id: newId,
        username,
        password,
        phone: body.phone || '',
        email: body.email || '',
        gender: body.gender || 0,
        userType: 'viewer',
        status: 1,
        createTime,
      });
      
      return {
        code: 0,
        msg: '注册成功',
      };
    },
  },
  {
    url: '/api/captcha',
    method: 'get',
    response: () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
      let code = "";
      for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      
      return {
        code: 200,
        msg: '获取成功',
        uuid: crypto.randomUUID(),
        captchaImage: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="44" style="background:#f5f5f5;border-radius:8px;"><text x="10" y="30" font-size="24" fill="#333">${code}</text></svg>`,
      };
    },
  },
  {
    url: '/api/user/logout',
    method: 'post',
    response: () => {
      return {
        code: 200,
        msg: '退出成功',
      };
    },
  },
  {
    url: '/api/application/submit',
    method: 'post',
    response: ({ body }: { body: any }) => {
      const application = {
        id: Date.now().toString(),
        ...body,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }

      applicationStore.push(application)

      return {
        code: 200,
        msg: '申请提交成功',
        data: application,
      }
    },
  },
  {
    url: '/api/application/list',
    method: 'get',
    response: () => {
      return {
        code: 200,
        msg: '获取成功',
        data: {
          list: applicationStore,
          total: applicationStore.length,
        },
      }
    },
  },
] as MockMethod[]
