import {
  useEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useState,
} from "react";
import { theme as antTheme, Spin } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { getCaptchaApi } from "@/api/modules/login/login";

export interface ImageCaptchaRef {
  refresh: () => void;
  verify: (input: string) => boolean;
  getUuid: () => string;
}

interface ImageCaptchaProps {
  style?: React.CSSProperties;
}

const generateLocalBase64Captcha = (): { base64: string; code: string } => {
  const canvas = document.createElement("canvas");
  canvas.width = 150;
  canvas.height = 44;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { base64: "", code: "" };

  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(0, 0, w, h);

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    const c = chars[Math.floor(Math.random() * chars.length)];
    code += c;
    ctx.font = `${20 + Math.random() * 6}px Arial`;
    ctx.fillStyle = `rgb(${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)})`;
    ctx.save();
    ctx.translate(15 + i * 28, 28 + Math.random() * 8);
    ctx.rotate((Math.random() - 0.5) * 0.4);
    ctx.fillText(c, 0, 0);
    ctx.restore();
  }

  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = `rgba(${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)}, 0.5)`;
    ctx.beginPath();
    ctx.moveTo(Math.random() * w, Math.random() * h);
    ctx.lineTo(Math.random() * w, Math.random() * h);
    ctx.stroke();
  }

  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.3)`;
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  const base64 = canvas.toDataURL("image/png");
  return { base64, code };
};

export const ImageCaptcha = forwardRef<ImageCaptchaRef, ImageCaptchaProps>(
  ({ style }, ref) => {
    const { token: themeToken } = antTheme.useToken();
    const captchaCodeRef = useRef("");
    const uuidRef = useRef("");
    const [loading, setLoading] = useState(false);
    const [base64Image, setBase64Image] = useState<string>("");

    const fetchCaptcha = useCallback(async () => {
      setLoading(true);
      try {
        const res = await getCaptchaApi();

        if (res.uuid && res.captchaImage) {
          uuidRef.current = res.uuid;

          let imageData = res.captchaImage;

          if (
            imageData.startsWith("data:image/png;base64,") &&
            imageData.includes("http")
          ) {
            const { base64, code } = generateLocalBase64Captcha();
            setBase64Image(base64);
            captchaCodeRef.current = code;
          } else if (imageData.startsWith("data:image")) {
            setBase64Image(imageData);
            captchaCodeRef.current = "";
          } else if (/^[A-Za-z0-9+/=]+$/.test(imageData)) {
            setBase64Image(`data:image/png;base64,${imageData}`);
            captchaCodeRef.current = "";
          } else {
            const { base64, code } = generateLocalBase64Captcha();
            setBase64Image(base64);
            captchaCodeRef.current = code;
          }
        } else {
          const { base64, code } = generateLocalBase64Captcha();
          setBase64Image(base64);
          captchaCodeRef.current = code;
        }
      } catch (error) {
        const { base64, code } = generateLocalBase64Captcha();
        setBase64Image(base64);
        captchaCodeRef.current = code;
      } finally {
        setLoading(false);
      }
    }, []);

    useImperativeHandle(ref, () => ({
      refresh: fetchCaptcha,
      verify: (input) => {
        if (captchaCodeRef.current) {
          return input === captchaCodeRef.current;
        }
        return input.trim().length > 0;
      },
      getUuid: () => uuidRef.current,
    }));

    useEffect(() => {
      fetchCaptcha();
    }, [fetchCaptcha]);

    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center", ...style }}>
        {loading ? (
          <div
            style={{
              width: 150,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              border: `1px solid ${themeToken.colorBorderSecondary}`,
            }}
          >
            <Spin size="small" />
          </div>
        ) : (
          base64Image && (
            <img
              src={base64Image}
              alt="验证码"
              width={150}
              height={44}
              style={{
                borderRadius: 8,
                cursor: "pointer",
                border: `1px solid ${themeToken.colorBorderSecondary}`,
              }}
              onClick={fetchCaptcha}
            />
          )
        )}
        <div
          onClick={fetchCaptcha}
          style={{
            color: themeToken.colorPrimary,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
          }}
        >
          <ReloadOutlined />
          <span>刷新</span>
        </div>
      </div>
    );
  },
);

ImageCaptcha.displayName = "ImageCaptcha";
