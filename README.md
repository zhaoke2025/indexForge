# IndexForge 首页母版生成器

IndexForge 是一个 Web 端后台生成器，用于根据固定母版 `index.html`、软件名称、版本号、25 个可配置维度和 11 条硬性要求，自动生成新的后台首页 `index.html`。

当前版本支持由 AI 根据系统名称自动判断系统调性、选择启用维度、生成业务菜单和完整 HTML，并可根据修改意见继续调整。维度、要求、母版和历史记录统一保存在服务器 SQLite 数据库。

## 当前资料说明

```text
IndexForge/
├─ docs/
│  ├─ 母版-index.html              # 生成基础母版
│  ├─ 维度配置说明.txt             # 第一组：25 个可调维度
│  ├─ 硬性要求.txt                 # 第二组：11 条硬性要求
│  └─ examples/                    # DeepSeek 已生成效果参考图
├─ prompt/
│  └─ codex开发提示词.md            # 直接给 Codex 使用的总提示词
└─ 开发说明.md                      # 产品规划与开发阶段
```

## 是否需要放入 DeepSeek 的三个效果图？

建议放入，但只作为参考素材，不作为母版。

- `母版-index.html`：真正用于生成的基础模板。
- `维度配置说明.txt`：定义生成器可以怎么变化。
- `硬性要求.txt`：定义生成器绝对不能违反什么。
- `examples/DeepSeek生成效果参考-*.png`：帮助 Codex 理解你想要的视觉效果和变体方向。

## 第一版 MVP

1. 输入软件名称。
2. 版本号默认 `V1.0`。
3. 选择风格预设。
4. 配置右上角用户信息。
5. 基于母版生成新的 `index.html`。
6. 运行 11 条硬性要求校验。
7. 通过后支持 iframe 预览、复制源码和下载。

## 推荐技术栈

React + TypeScript + Vite + Tailwind CSS + Node.js API Proxy。

Electron 可作为后续桌面端封装方案，不作为 Web 端第一版必选项。

## 核心原则

只换视觉风格，不破坏母版骨架；只调整维度，不越过硬性要求。

## 母版与大模型分工

- 母版 `index.html` 是正式生成结果的页面骨架，用于保留 Tailwind 配置、菜单展开方式、iframe 跳转、跨页面通信等生产约束。
- 大模型不负责重写整页 HTML，主要根据软件名称和业务描述生成菜单模块 `menuConfig`。
- 生成器把软件标题、版本号、风格维度、用户信息和大模型菜单安全替换回母版，最终输出可用于集成到系统中的 `index.html`。

## 大模型配置

菜单配置页支持通过 DeepSeek 生成 `menuConfig`。API Key 只放在服务端环境变量中，不写入前端代码。

在项目根目录创建 `.env`：

```bash
OPENAI_API_KEY=你的 DeepSeek Key
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_MODEL=deepseek-chat
API_PORT=8787
```

启动开发环境：

```bash
npm install
npm run dev
```

`npm run dev` 会同时启动：

- Vite Web：`http://localhost:5173`
- 本地 API：`http://localhost:8787`

## 测试与生产部署

```bash
npm test
npm run build
npm start
```

生产环境由 Express 同时托管前端静态资源和 `/api`。Docker、Nginx、HTTPS 与上线检查参见 [DEPLOY.md](./DEPLOY.md)。
