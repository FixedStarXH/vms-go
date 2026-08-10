import { post } from "@/utils/request";

export interface VerifyResult {
  recordNo: string;
  visitorName: string;
  phone: string;
  message: string;
  recordStatus: number;
}

// 门禁核销：POST /admin/record/verify
// qrContent 为二维码完整内容（含 HMAC 签名），扫码枪扫描或粘贴输入
export const verifyQR = (qrContent: string, gate: string) =>
  post(`/renren-fast/admin/record/verify`, { qrContent, gate });
