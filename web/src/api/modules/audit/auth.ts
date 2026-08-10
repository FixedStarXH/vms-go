import { get, post } from "@/utils/request";

export interface LoginParams {
  username: string;
  password: string;
  captcha?: string;
  captchaKey?: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface RefreshTokenParams {
  refreshToken: string;
}

export interface VerifyTokenResult {
  valid: boolean;
  userId?: string;
  username?: string;
  roles?: string[];
  exp?: number;
}

export const authLogin = async (params: LoginParams): Promise<any> => {
  const res: any = await post("/sys/login", params);
  return res.data || res;
};

export const authLogout = async (): Promise<void> => {
  await post("/sys/logout");
};

export const refreshToken = async (
  params: RefreshTokenParams,
): Promise<LoginResult> => {
  const res: any = await post("/sys/refresh", params);
  return res.data || res;
};

export const verifyToken = async (token: string): Promise<VerifyTokenResult> => {
  const res: any = await get("/sys/verify", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data || res;
};
