# 外部系统 API 对接

## 服务端配置

在 IndexForge 的 `.env` 中设置预分配的固定 Token：

```env
INTEGRATION_API_TOKEN=请替换为高强度随机Token
```

推荐使用 `openssl rand -hex 32` 生成 Token。部署新代码并修改配置后重建容器：

```bash
docker compose up -d --build --force-recreate
```

Token 由 IndexForge 管理方通过安全渠道交付给调用方。调用方无需登录换取 Token，每次请求直接携带该 Token。Token 只能通过 HTTPS 传输，不能写入浏览器前端代码或提交到代码仓库。

## 统一响应格式

四个外部接口统一使用 `code/message/data`。HTTP 状态码表示请求层结果；响应体中成功固定为 `code: 0`，任何错误固定为 `code: 1`，调用方通过 `message` 读取具体错误提示。

成功响应示例（HTTP `201`）：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "generation": {
      "id": "生成记录ID",
      "html": "<!DOCTYPE html>..."
    }
  }
}
```

失败响应示例（HTTP `401`）：

```json
{
  "code": 1,
  "message": "Token无效",
  "data": null
}
```

调用方通过 `response.data.generation.html` 读取完整 HTML，通过 `response.data.generation.id` 获取后续生成或调整使用的记录 ID。

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

成功时返回 HTTP `201`。`generation.id` 是生成记录 ID，`generation.html` 是完整首页源码，`generation.generatedAt` 是格式为 `YYYY-MM-DD HH:mm:ss` 的北京时间。

## 根据意见调整首页

```http
POST /api/integration/generations/{首页生成记录ID}/refine
Authorization: Bearer 随机Token
Content-Type: application/json

{
  "instruction": "主色改成绿色，侧边栏窄一点"
}
```

调整成功后会创建一条新记录并返回 HTTP `201`，原记录不会被覆盖。后续继续调整时，应使用最新返回的 `generation.id`。

## 生成登录页

```http
POST /api/integration/login-generations
Authorization: Bearer 随机Token
Content-Type: application/json

{
  "sourceGenerationId": "首页生成记录ID",
  "config": {
    "systemName": "人力资源薪酬智能核算系统",
    "backgroundImage": "data:image/jpeg;base64,/9j/4AAQSk..."
  },
  "instruction": "使用上传的图片作为全屏背景，按 cover 通铺；生成专业简洁的登录页面"
}
```

登录页必须参考一条已生成的首页记录，`sourceGenerationId` 为必填字段。缺失、空字符串或纯空格会返回 HTTP `400`、`code: 1`，提示 `sourceGenerationId不能为空`。

### 登录页背景图片

背景图片通过 `config.backgroundImage` 传递。该字段不是图片文件，也不使用 `multipart/form-data`，而是把图片转换成完整的 Base64 Data URL 后放入 JSON：

```text
data:image/jpeg;base64,/9j/4AAQSk...
data:image/png;base64,iVBORw0KGgo...
data:image/webp;base64,UklGR...
```

上面的 `...` 只是文档省略写法，不能直接用于测试。实际请求必须传入图片的全部 Base64 内容，中间不能省略、换成文件路径或只填写图片名称。

### 在 Apifox 中测试背景图

先在 Windows PowerShell 中执行以下命令，把本地 JPEG 图片转换成完整 Data URL 并复制到剪贴板：

```powershell
$imagePath = 'D:\test\background.jpg'
$base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($imagePath))
"data:image/jpeg;base64,$base64" | Set-Clipboard
```

如果使用 PNG 或 WebP，需要对应修改前缀：

```text
PNG：data:image/png;base64,
WebP：data:image/webp;base64,
```

然后在 Apifox 中：

1. 选择 `Body -> JSON`。
2. 将剪贴板中的完整内容粘贴到 `config.backgroundImage` 的字符串值中。
3. `instruction` 填写“使用上传的图片作为全屏背景，按 cover 通铺”。
4. 发送请求后，从 `data.generation.html` 获取登录页 HTML 并进行预览。

完整请求结构如下，其中 `这里粘贴完整Data URL` 必须替换成剪贴板中的实际内容：

```json
{
  "sourceGenerationId": "首页生成记录ID",
  "config": {
    "systemName": "人力资源薪酬智能核算系统",
    "backgroundImage": "这里粘贴完整Data URL"
  },
  "instruction": "使用上传的图片作为全屏背景，按 cover 通铺"
}
```

### 调用方正式对接流程

1. 调用方前端把图片上传到调用方自己的后台。
2. 调用方后台读取图片二进制内容，转换成 Base64，并拼接对应的 `data:image/...;base64,` 前缀。
3. 调用方后台把完整 Data URL 放入 `config.backgroundImage`，携带固定 Token 请求 IndexForge 接口。
4. IndexForge 返回内嵌该图片的完整 `login.html`。

调用方也可以从自己的文件存储或对象存储中读取图片后转换，无需一定经过前端上传。固定 Token 必须保存在调用方后台，不能暴露给浏览器前端。

例如，Node.js 调用方可以这样生成该字段：

```js
import fs from 'node:fs';

const backgroundImage = `data:image/jpeg;base64,${fs.readFileSync('background.jpg').toString('base64')}`;
```

首次生成时，如需使用背景图，建议同时满足以下两点：

1. 在 `config.backgroundImage` 中传入完整 Data URL，不能只传纯 Base64 内容。
2. 在 `instruction` 中明确写明“使用上传的图片作为全屏背景，按 cover 通铺”，避免 AI 选择纯色、纹理或几何图案背景。

图片会直接内嵌到返回的 `login.html` 中，不需要调用方另外托管图片。生成结果使用 `background-size: cover`、居中且不重复；由于图片已内嵌，返回的 HTML 体积也会相应增大。

接口 JSON 请求体总上限为 `3MB`。考虑 Base64 编码会增大体积，建议原始图片小于 `2MB`，推荐使用经过压缩的 JPEG、PNG 或 WebP 图片。

不需要背景图时，可以省略 `backgroundImage`：

```json
{
  "sourceGenerationId": "首页生成记录ID",
  "config": {
    "systemName": "人力资源薪酬智能核算系统"
  },
  "instruction": "使用简洁的纯色背景"
}
```

## 根据意见调整登录页

```http
POST /api/integration/login-generations/{登录页生成记录ID}/refine
Authorization: Bearer 随机Token
Content-Type: application/json

{
  "instruction": "登录卡片调整到页面右侧"
}
```

继续调整时，背景图片按以下规则处理：

| `config.backgroundImage` | 处理结果 |
| --- | --- |
| 不传 `config` 或不传 `backgroundImage` | 保留上一版背景图片 |
| 传入新的完整 Base64 Data URL | 替换为新背景图片 |
| 传入空字符串 `""`，并在 `instruction` 中要求改为纯色等非图片背景 | 移除上一版背景图片 |

替换背景图片示例：

```json
{
  "instruction": "替换为新上传的背景图并按 cover 通铺，登录卡片调整到页面右侧",
  "config": {
    "backgroundImage": "data:image/webp;base64,UklGR..."
  }
}
```

移除背景图片示例：

```json
{
  "instruction": "移除背景图片，改成简洁的纯色背景",
  "config": {
    "backgroundImage": ""
  }
}
```

调整成功后会创建一条新记录并返回 HTTP `201`，原记录不会被覆盖。后续继续调整时，应使用最新返回的 `generation.id`。

## 状态码

| HTTP 状态码 | 业务 `code` | 说明 |
| --- | ---: | --- |
| `201` | `0` | 生成成功 |
| `400` | `1` | 请求参数错误 |
| `401` | `1` | Token 无效 |
| `404` | `1` | 指定的生成记录不存在 |
| `409` | `1` | 缺少当前母版或参考首页 |
| `410` | `1` | 旧的账号密码换 Token 接口已停用 |
| `413` | `1` | 请求体过大 |
| `422` | `1` | AI 生成结果未通过自动校验 |
| `429` | `1` | 请求过于频繁 |
| `500` | `1` | 服务器内部错误 |
| `503` | `1` | 外部 Token、AI Key 未配置或上游模型不可用 |

IndexForge 后台网页使用独立的管理员登录和会话 Cookie，不使用外部 API Token。
