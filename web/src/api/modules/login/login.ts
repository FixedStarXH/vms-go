import { post, get } from "@/utils/request";

interface LoginParams {
  username: string;
  password: string;
  uuid: string;
  captcha: string;
}

interface RegisterParams {
  username: string;
  password: string;
  confirmPassword: string;
  mobile: string;
  email: string;
  gender: number;
  uuid: string;
  captcha: string;
}

interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

interface LoginResponse {
  code: number;
  msg: string;
  userId: number;
  username: string;
  token: string;
  userType: string;
}

interface TokenData {
  valid: boolean;
  userId: number;
  username: string;
  exp: number;
}

interface RefreshTokenData {
  token: string;
  refreshToken: string;
}

interface CaptchaData {
  code: number;
  msg: string;
  uuid: string;
  captchaImage: string;
}

export const loginApi = (data: LoginParams): Promise<any> => {
  return post<LoginResponse>("/api/user/login", data);
};

export const registerApi = (data: RegisterParams): Promise<ApiResponse> => {
  return post<ApiResponse>("/api/user/register", data);
};

export const verifyTokenApi = (): Promise<ApiResponse<TokenData>> => {
  return get<ApiResponse<TokenData>>("/api/user/auth/verify");
};

export const refreshTokenApi = (
  refreshToken: string,
): Promise<ApiResponse<RefreshTokenData>> => {
  return post<ApiResponse<RefreshTokenData>>(
    "/api/user/auth/refresh",
    {
      refreshToken,
    },
  );
};

export const getCaptchaApi = (): Promise<CaptchaData> => {
  return get("/api/captcha");
};

export const logoutApi = (): Promise<ApiResponse> => {
  return post<ApiResponse>("/api/user/logout");
};
