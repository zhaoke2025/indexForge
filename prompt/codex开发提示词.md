# 给 Codex 的开发提示词

请先阅读当前项目中的以下文件：

1. `docs/母版-index.html`
2. `docs/维度配置说明.txt`
3. `docs/硬性要求.txt`
4. `开发说明.md`
5. `docs/examples/` 下面的 DeepSeek 生成效果参考图

现在请帮我开发一个 React + TypeScript + Vite + Tailwind CSS Web 端后台工具，项目名称为 **IndexForge 首页母版生成器**。

## 项目目标

这个工具用于在浏览器中基于一个固定的 `index.html` 母版，结合软件名称、版本号、25 个可配置视觉维度、11 条硬性要求，自动生成新的 `index.html`，并支持预览、重新生成、复制源码和下载。

## 第一版 MVP 范围

第一版只需要先跑通基础闭环，不要一次性做太复杂。

必须实现：

1. 输入软件名称。
2. 输入版本号，默认 `V1.0`。
3. 如果软件名称没有版本号，自动追加 `V1.0`。
4. 如果软件名称已经包含 `V1.0`，不要重复追加。
5. 选择风格预设。
6. 配置右上角用户信息，包括用户名、角色、头像图标、是否显示角色标签。
7. 基于 `docs/母版-index.html` 生成新的 `index.html`。
8. 生成后在右侧 iframe 中预览。
9. 支持复制源码。
10. 支持下载 `index.html`。
11. 生成后必须运行 validator 校验 11 条硬性要求。
12. 校验失败时显示具体错误，不允许下载。

## 第二版再做

1. 25 个维度逐项编辑。
2. 母版上传和管理。
3. 生成历史记录。
4. 菜单结构自定义。
5. AI 辅助生成菜单。

## 核心硬性要求

生成结果必须遵守 `docs/硬性要求.txt` 中的 11 条规则，尤其是：

- 顶栏标题只能是纯文字。
- 必须完整保留 `tailwind.config`。
- 子菜单必须在当前一级菜单项下方以内联方式展开。
- 侧边栏必须在左侧。
- iframe 加载不存在页面时不能显示 404、页面建设中、暂无内容等占位。
- 不能添加主题切换器。
- 不得破坏 `menuConfig`、`renderPrimaryMenu`、`renderSubMenuInPlace`、`navigateToSub`、`loadPage`、`window.navigateTo`、`message` 监听等核心逻辑。

## 生成器原则

不要完全重写 HTML，而是基于母版做安全替换。

允许替换：

- `<title>`
- `<h1>` 纯文字标题
- `tailwind.config` 中的颜色、字体、圆角
- CSS 中的主要视觉变量
- `menuConfig` 的菜单名称、子菜单、文件名
- 右上角用户信息
- 视觉类名和样式

不允许破坏：

- 子菜单内联展开逻辑
- iframe 跳转逻辑
- 跨 iframe 的 `window.navigateTo` 和 `message` 监听

## 推荐内置风格预设

请先内置 8 套风格：

1. 企业蓝白风
2. 政务信息化风
3. 科技深色风
4. 绿色生态风
5. 金融稳重风
6. 工业控制风
7. 医疗清爽风
8. 极简文档风

每套风格本质上是 25 个维度的一组默认值。第一版可以先只实现影响最大的几个维度：配色、圆角、字体、明暗模式、阴影、侧边栏宽度、菜单激活态、用户信息。

## 推荐核心文件

请至少创建：

```text
src/core/generator.ts
src/core/validator.ts
src/core/version.ts
src/core/presets.ts
src/data/defaultDimensions.ts
src/data/defaultRequirements.ts
src/data/stylePresets.ts
```

## validator 要求

`validator.ts` 至少校验：

- 是否存在 `tailwind.config`。
- 是否存在 `<h1>`。
- `<h1>` 是否纯文字，不能包含 `<img>`、`<i>`、`svg`、Emoji 等。
- 是否存在 `iframe#contentFrame`。
- 是否存在 `menuConfig`。
- 是否存在 `renderPrimaryMenu`。
- 是否存在 `renderSubMenuInPlace`。
- 是否存在 `navigateToSub`。
- 是否存在 `loadPage`。
- 是否存在 `window.navigateTo`。
- 是否存在 `message` 监听。
- 是否存在 `insertAdjacentElement('afterend', wrapper)` 或双引号等价写法。
- 是否不存在主题切换器，如 `<select>`、`currentTheme` 等。
- 是否没有手动注入 “404”、“页面建设中”、“暂无内容”、“开发中” 等 iframe 占位文字。

## 最终交付

必须可以：

```bash
npm install
npm run dev
npm run build
```

完成后，工具要能跑通：

```text
输入软件名称 → 自动 V1.0 → 选择风格 → 生成 index.html → 校验 → 预览 → 下载
```
