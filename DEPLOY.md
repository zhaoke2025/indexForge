# IndexForge 部署说明

## 推荐方式：Docker Compose

服务器需要安装 Docker 与 Docker Compose。复制项目后：

```bash
cp .env.example .env
```

编辑 `.env`，至少设置：

```env
OPENAI_API_KEY=你的密钥
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_MODEL=deepseek-v4-flash
API_PORT=8787
TRUST_PROXY=1
ADMIN_USERNAME=admin
ADMIN_PASSWORD=高强度随机密码
ADMIN_SESSION_TTL_SECONDS=28800
INTEGRATION_API_TOKEN=外部系统专用高强度随机Token
```

DeepSeek 高峰期可能长时间保持请求连接，建议设置 `AI_REQUEST_TIMEOUT_MS=660000`。服务默认输出精简的结构化日志；只有临时排障确需查看完整提示词时才设置 `AI_LOG_PROMPTS=1`，排查完成后立即恢复为 `0`，避免业务内容进入日志。

启动：

```bash
docker compose up -d --build
docker compose ps
```

首次部署前创建SQLite持久化目录，并确保容器用户可写：

```bash
mkdir -p data backups
sudo chown -R 1000:1000 data backups
```

实体维度、硬性要求、母版和生成记录保存在 `data/indexforge.db`。重建容器不会删除该目录。

备份数据库：

```bash
cp data/indexforge.db backups/indexforge-$(date +%F-%H%M%S).db
```

应用默认监听服务器的 `8787` 端口，前端和 API 使用同一域名。建议只在防火墙中开放 80/443，由 Nginx 或云负载均衡反向代理到 `127.0.0.1:8787`。

## Nginx 示例

```nginx
server {
    listen 80;
    server_name indexforge.example.com;

    client_max_body_size 1m;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

配置 HTTPS 后，使用 Certbot 或云厂商证书，并将 HTTP 重定向至 HTTPS。

## 非 Docker 部署

要求 Node.js 20 或 22：

```bash
npm ci
npm run build
NODE_ENV=production npm start
```

可使用 systemd 或 PM2 托管进程。发布前执行：

```bash
npm test
npm run build
```

## 上线检查

- `.env` 不进入 Git、镜像和前端构建产物。
- 访问 `/api/health` 返回 `ok: true`。
- 公网只开放 80/443，8787 仅供反向代理访问。
- 如果前后端分域部署，在 `CORS_ORIGINS` 填写完整 HTTPS 来源。
- 定期轮换 AI API Key，并在供应商控制台设置额度告警。
- 当前业务配置存于用户浏览器，请使用“生成记录 → 导出备份”定期备份。

## 日志排查

实时查看请求和 AI 调用阶段：

```bash
docker compose logs -f --tail=200 indexforge
```

每条 API 响应都会返回 `X-Request-Id`；页面错误提示也会显示请求 ID。可按请求 ID 筛选一次生成涉及的全部日志：

```bash
docker compose logs --since 30m indexforge | grep '页面显示的请求ID'
```

常用事件包括 `http.request.start`、`ai.call.start`、`ai.call.success`、`ai.output.invalid`、`ai.call.error` 和 `http.request.finish`。AI 日志包含阶段、模型、调用次数、耗时、输出字符数及 Token 用量，不包含 API Key。
