import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { getToken, removeUserInfo } from "@/utils/storage";
import { useUserStore } from "@/stores/useUserStore";

const request: AxiosInstance = axios.create({
  baseURL: "/",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRedirecting = false;

const handle401 = () => {
  if (isRedirecting) return;
  isRedirecting = true;
  removeUserInfo();
  useUserStore.getState().logout();
  setTimeout(() => {
    isRedirecting = false;
    window.location.href = "/login";
  }, 200);
};

request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token) {
      config.headers.token = token;
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

request.interceptors.response.use(
  (response: AxiosResponse) => {
    const res = response.data;

    if (!res || typeof res !== "object") {
      return res;
    }

    if (res.code === 401) {
      handle401();
      return Promise.reject(new Error(res.msg || "token失效，请重新登录"));
    }

    if (res.code === 0 || res.code === 200) {
      return res;
    }

    if (res.code !== undefined) {
      return Promise.reject(new Error(res.msg || "请求失败"));
    }

    return res;
  },
  (error) => {
    if (error.response?.status === 401) {
      handle401();
      return Promise.reject(new Error("token失效，请重新登录"));
    }
    return Promise.reject(error);
  },
);

export const get = <T = any>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> => {
  return request.get(url, config);
};

export const post = <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig,
): Promise<T> => {
  return request.post(url, data, config);
};

export const put = <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig,
): Promise<T> => {
  return request.put(url, data, config);
};

export const del = <T = any>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> => {
  return request.delete(url, config);
};

export default request;
