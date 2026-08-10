import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { message } from 'antd'
import { removeUserInfo, getToken } from '@/utils/storage'
import { useUserStore } from '@/stores/useUserStore'
import { broadcastAuthEvent } from '@/utils/authChannel'
import i18n from '@/locales'
import type { ApiResponse } from '@/types'

// 测试用的固定 token（当真实后端接口需要时使用）
const TEST_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJzdWIiOiI1IiwiaWF0IjoxNzc3MDgxNTAzLCJleHAiOjE3Nzc2ODYzMDN9.Kxcn23D3cjM4Ix9eX01SxmXlAyoVp3RURnwJFmB9mQmIkZ59ee4X9p0Gjj8xVgXYVp7HNZYfYKaUh3kvyNN9XQ'

const AUTH_ENDPOINTS = [
  '/sys/login',
  '/sys/logout',
]
const isAuthFlowRequest = (url?: string) => AUTH_ENDPOINTS.some((ep) => url?.includes(ep))

let isHandlingUnauthorized = false
function handleUnauthorized() {
  if (isHandlingUnauthorized) return
  isHandlingUnauthorized = true

  removeUserInfo()
  useUserStore.getState().logout()
  message.error(i18n.t('common:loginExpired'))

  broadcastAuthEvent('logout')

  const loginPath = import.meta.env.MODE === 'demo'
    ? `${import.meta.env.VITE_BASE_PATH || ''}/#/login`
    : `${import.meta.env.VITE_BASE_PATH || ''}/login`
  window.location.replace(loginPath)
}

const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
})

service.interceptors.request.use(
  (config) => {
    config.headers = config.headers ?? {}

    // 优先使用存储的 token，没有的话使用测试 token
    const token = getToken() || TEST_TOKEN
    if (token) {
      config.headers.token = token
    }

    return config
  },
  (error) => Promise.reject(error),
)

service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const res = response.data

    if (!res || typeof res !== 'object') {
      message.error(i18n.t('common:responseError'))
      return Promise.reject(res)
    }

    const { code, msg, data } = res as ApiResponse

    // 同时支持 renren-fast (code === 0) 和 mock (code === 200)
    if (code === 0 || code === 200) {
      return data
    }

    if (code === 401) {
      if (!isAuthFlowRequest(response.config.url)) {
        handleUnauthorized()
      }
      return Promise.reject(res)
    }

    message.error(msg || i18n.t('common:requestFailed'))
    return Promise.reject(res)
  },
  (error) => {
    if (error?.response?.status === 401) {
      if (!isAuthFlowRequest(error?.config?.url)) {
        handleUnauthorized()
      }
      return Promise.reject(error)
    }

    message.error(error?.message || i18n.t('common:networkError'))
    return Promise.reject(error)
  },
)

const request = <T = unknown>(config: AxiosRequestConfig) => service.request<ApiResponse, T>(config)

export default request
