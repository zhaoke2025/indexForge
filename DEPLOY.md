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
OPENAI_MODEL=deepseek-chat
API_PORT=8787
TRUST_PROXY=1
```

启动：

```bash
docker compose up -d --build
docker compose ps
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
