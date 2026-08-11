# ---------- 阶段 1：构建 Go 静态二进制 ----------
FROM golang:1.26-alpine AS go-build
WORKDIR /app
# 先只拷 go.mod/go.sum 下载依赖（利用 Docker 层缓存，改源码不重装依赖）
COPY go.mod go.sum ./
ENV GOPROXY=https://goproxy.cn,direct
RUN go mod download
# 拷全部源码构建；CGO_ENABLED=0 产出纯静态二进制，alpine 可直接运行
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o ers-server .

# ---------- 阶段 2：精简运行镜像 ----------
FROM alpine:3.20
# tzdata + TZ：DSN 里 loc=Local 依赖系统时区，否则入库时间全是 UTC
RUN apk add --no-cache tzdata
ENV TZ=Asia/Shanghai
WORKDIR /app
COPY --from=go-build /app/ers-server .
# 运行期挂载卷：上传文件 / 二维码图片，从宿主机挂进来持久化
RUN mkdir -p uploads
EXPOSE 8081
# 配置全部由环境变量注入（ERS_ 前缀，见 config/config.go），无 config.yaml 也可启动
CMD ["./ers-server"]
