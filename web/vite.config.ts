import { defineConfig, loadEnv } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { viteMockServe } from "vite-plugin-mock";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** 构建时生成 version.json 到 dist 目录，用于前端版本更新检测 */
function versionPlugin(version: string): Plugin {
  return {
    name: "version-json",
    apply: "build",
    closeBundle() {
      const outDir = path.resolve(__dirname, "dist");
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(
        path.resolve(outDir, "version.json"),
        JSON.stringify({ version }),
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const pkg = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "package.json"), "utf-8"),
  );
  const appVersion = `${pkg.version}-${Date.now()}`;

  return {
    base: env.VITE_BASE_PATH || "/",
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
    plugins: [
      react(),
      viteMockServe({
        mockPath: "mock",
        // mock 仅由 VITE_USE_MOCK 显式开启，与 API 基址解耦（开发默认走 Vite 代理到 Go 后端）
        enable: mode === "development" && env.VITE_USE_MOCK === "true",
      }),
      versionPlugin(appVersion),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 3005,
      // 开发环境代理：前端请求全部走同源相对路径，由 Vite 转发到 Go 后端，
      // 避免浏览器跨源子资源请求被系统代理/网络策略拦截。
      // 注意：/admin 只能精确匹配后端 API 前缀（/admin/application 等），
      // 顶层 /admin 是前端管理端页面路由（/admin/audit 等），绝不能代理，否则页面 404。
      proxy: {
        "/api": { target: "http://localhost:8081", changeOrigin: true },
        "/sys": { target: "http://localhost:8081", changeOrigin: true },
        "/uploads": { target: "http://localhost:8081", changeOrigin: true },
        "/admin/application": { target: "http://localhost:8081", changeOrigin: true },
        "/admin/monitor": { target: "http://localhost:8081", changeOrigin: true },
        "/admin/visitor": { target: "http://localhost:8081", changeOrigin: true },
        "/admin/record": { target: "http://localhost:8081", changeOrigin: true },
        "/admin/user": { target: "http://localhost:8081", changeOrigin: true },
        "/admin/manager": { target: "http://localhost:8081", changeOrigin: true },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-antd": ["antd", "@ant-design/icons"],
            "vendor-pro": ["@ant-design/pro-components"],
            "vendor-query": ["@tanstack/react-query"],
            "vendor-i18n": ["i18next", "react-i18next"],
          },
        },
      },
    },
  };
});
