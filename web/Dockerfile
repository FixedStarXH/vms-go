# ---------- 阶段 1：构建 Vite 产物 ----------
FROM node:20-alpine AS web-build
WORKDIR /app
# 先只拷依赖清单，npm ci 命中缓存就不用重装
COPY package.json package-lock.json ./
RUN npm config set registry https://registry.npmmirror.com && npm ci
# 拷源码构建（build = tsc + vite build，输出到 dist/）
COPY . .
# 关键：Docker 部署走真实后端，必须给 VITE_API_BASE_URL（非空）；
# 否则 main.tsx 会因"未配置 API 地址"启用 MSW mock，请求被 Service Worker 拦截返回假数据
# （局域网 IP 下 SW 注册失败更是直接 Network Error）。
# 传 "/" 表示同源：/api、/sys 等由 Nginx 反代到 Go 后端
ARG VITE_API_BASE_URL=/
RUN VITE_API_BASE_URL=${VITE_API_BASE_URL} npm run build

# ---------- 阶段 2：Nginx 托管静态资源 + 反向代理后端 API ----------
FROM nginx:1.27-alpine
COPY --from=web-build /app/dist /usr/share/nginx/html
# 反代规则：前端走同源相对路径（/api /sys /uploads /admin/*），由 Nginx 转发到 Go 后端
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
