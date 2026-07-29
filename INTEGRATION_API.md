# 软著系统 API 对接

## 服务端配置

在 IndexForge 的 `.env` 中设置软著系统专用账号：

```env
INTEGRATION_API_USERNAME=ruanzhu-system
INTEGRATION_API_PASSWORD=请替换为高强度随机密码
INTEGRATION_TOKEN_TTL_SECONDS=7200
```

部署新代码并修改配置后重建容器：

```bash
docker compose up -d --build --force-recreate
```

Token 保存在 IndexForge 当前服务进程内，默认两小时失效。容器重启后旧 Token 会失效，调用方应在收到 `401` 后重新登录。
账号密码和 Token 只能通过 HTTPS 传输，正式对接时不要继续使用公网明文 HTTP。

## 获取 Token

```http
POST /api/integration/auth/login
Content-Type: application/json

{
  "username": "ruanzhu-system",
  "password": "配置的密码"
}
```

成功返回：

```json
{
  "accessToken": "随机Token",
  "tokenType": "Bearer",
  "expiresIn": 7200
}
```

## 生成首页

```http
POST /api/integration/generations
Authorization: Bearer 随机Token
Content-Type: application/json

{
  "systemName": "人力资源薪酬智能核算系统",
  "version": "V1.0",
  "instruction": "采用专业、清晰的蓝色风格"
}
```

成功时返回 HTTP `201`。`generation.id` 是生成记录 ID，`generation.html` 是完整首页源码。

## 生成登录页

```http
POST /api/integration/login-generations
Authorization: Bearer 随机Token
Content-Type: application/json

{
  "sourceGenerationId": "首页生成记录ID",
  "config": {
    "systemName": "人力资源薪酬智能核算系统"
  },
  "instruction": "生成专业简洁的登录页面"
}
```

登录页必须参考一条已生成的首页记录，建议始终明确传递 `sourceGenerationId`。

## 状态码

- `200`：登录成功。
- `201`：生成成功。
- `400`：请求参数错误。
- `401`：账号密码错误，或 Token 无效/已过期。
- `409`：缺少当前母版或参考首页。
- `429`：请求过于频繁。
- `503`：对接账号尚未配置。

现有网页继续使用 `/api/generations` 和 `/api/login-generations`，不受对接 Token 影响。
