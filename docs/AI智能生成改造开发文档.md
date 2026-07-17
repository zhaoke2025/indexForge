# IndexForge AI 智能生成改造开发文档

## 1. 文档目的

本文档用于指导 IndexForge 从“手动选择预设和维度的本地生成器”改造为“AI 根据系统名称自动判断调性、选择维度并基于母版生成 HTML”的单实例内部工具。

本文档是当前阶段的开发口径。未写入本文档的账号、权限和多租户功能不在本期范围内。

## 2. 已确认的产品范围

### 2.1 本期目标

- 使用者输入系统名称、可选版本号和可选生成要求。
- AI 根据系统名称判断系统类型与视觉调性。
- AI 自动决定所有启用实体维度的取值。
- AI 自动生成与系统业务匹配的菜单。
- 本地生成器必须基于当前母版生成完整 `index.html`。
- 生成结果必须满足所有启用的硬性要求。
- 使用者可预览、查看源码、复制和下载结果。
- 使用者不满意时，可输入修改意见，基于当前结果重新生成。
- 实体维度和硬性要求均支持增删改查、启停和排序。
- 母版、规则和生成记录统一存入服务器 SQLite 数据库。

### 2.2 暂不开发

- 登录和账号体系。
- 管理员、普通用户等角色划分。
- 权限控制。
- 多租户和数据隔离。
- 实时聊天式交互。
- MySQL、PostgreSQL 等独立数据库服务。

当前系统是公司内部共享的单实例工具，所有访问者看到同一套维度、要求、母版和生成记录。

## 3. 核心业务流程

```text
维护实体维度、硬性要求和母版
              ↓
输入系统名称、版本号和生成要求
              ↓
AI 判断系统类型和视觉调性
              ↓
AI 决定所有启用维度的取值
              ↓
AI 生成业务菜单
              ↓
本地生成器基于母版生成完整 HTML
              ↓
服务端执行本地硬性校验
       ┌──────┴──────┐
     通过            失败
      ↓               ↓
预览/复制/下载     展示错误并禁止下载
      ↓               ↓
输入调整意见 ← 用户决定是否继续调整
      ↓
基于当前 HTML 重新生成并再次校验
```

## 4. 页面设计

### 4.1 首页智能生成

生成前仅展示以下主要输入：

- 系统名称：必填。
- 版本号：选填。
- 生成要求：选填，多行自然语言输入框。
- `AI 智能生成`按钮。

生成要求默认占位提示：

```text
请根据系统名称判断系统类型和视觉调性，生成与该系统匹配的后台首页。
```

用户可输入：

```text
整体简洁一些，使用绿色主色，侧边栏窄一点。
```

首页不再要求使用者选择风格预设。现有风格预设可以作为AI参考数据保留，但不作为必填交互。

### 4.2 生成结果

生成后展示：

- iframe 页面预览。
- HTML 源码。
- AI 判断的系统类型和视觉调性摘要。
- AI 选择的维度结果。
- AI 生成的菜单摘要。
- 硬性要求检查结果。
- 复制和下载按钮。
- 调整意见输入框。
- `根据意见重新生成`按钮。

校验未通过时，复制和下载按钮禁用。

### 4.3 生成后调整

调整意见示例：

```text
主色改成绿色，菜单间距缩小，右上角增加通知铃铛。
```

重新生成必须携带：

- 原始系统名称和版本号。
- 原始生成要求。
- 当前 HTML。
- 当前维度决策。
- 当前菜单。
- 本次调整意见。
- 当前启用的实体维度和硬性要求。
- 当前母版。

调整以当前结果为基础，不得与前一版完全无关。每次调整均生成新的历史记录，不覆盖旧记录。

### 4.4 实体维度管理

支持：

- 查询和分组展示。
- 新增。
- 编辑。
- 删除。
- 启用或停用。
- 上移、下移或拖动排序。
- 恢复系统默认维度。

字段：

```ts
type Dimension = {
  id: string;
  name: string;
  groupName: string;
  description: string;
  valueType: 'text' | 'boolean' | 'single-select';
  defaultValue: string | boolean;
  options: string[];
  enabled: boolean;
  sortOrder: number;
};
```

AI必须对每个启用维度返回决策。管理员新增维度后，该维度会通过描述自动参与下一次AI生成，不要求同步修改前端生成器代码。

### 4.5 硬性要求管理

支持：

- 查询。
- 新增。
- 编辑。
- 删除。
- 启用或停用。
- 排序。
- 恢复系统默认要求。

字段：

```ts
type Requirement = {
  id: string;
  name: string;
  description: string;
  level: 'required' | 'recommended' | 'flexible';
  validationType: 'builtin' | 'ai';
  builtinValidator?: string;
  enabled: boolean;
  sortOrder: number;
};
```

`builtin` 表示已有本地程序可验证，`ai` 表示暂时只能由AI根据描述检查。新增要求默认使用 `ai`。

### 4.6 母版管理

- 保留当前上传、查看和结构检测能力。
- 通过检测后才允许设为当前母版。
- 每次生成记录保存所用母版ID和母版内容快照。
- 修改当前母版不影响历史记录的预览和下载。

## 5. AI生成协议

### 5.1 AI与本地生成器的职责

为避免完整HTML嵌入JSON后触达模型输出长度限制，本期AI只返回简短的结构化决策：

- 系统调性判断。
- 所有启用维度的决策。
- 菜单配置。
- 要求自查结果。

本地 `generator.ts` 根据维度决策和菜单修改母版、生成完整HTML；本地校验器继续作为最终安全检查。新增但本地生成器尚不认识的维度会参与AI判断和记录，但需要增加对应应用逻辑后才能直接改变HTML。

### 5.2 请求结构

```ts
type GenerateRequest = {
  systemName: string;
  version?: string;
  instruction?: string;
  templateId: string;
};

type RefineRequest = {
  recordId: string;
  instruction: string;
};
```

服务端根据 `templateId` 和数据库读取母版、启用维度及启用要求，前端不提交规则全文，避免规则被前端篡改或请求体重复膨胀。

### 5.3 AI响应结构

```ts
type AiGenerateResult = {
  systemType: string;
  toneSummary: string;
  dimensionDecisions: Array<{
    dimensionId: string;
    value: string | boolean;
    reason: string;
  }>;
  menuConfig: MenuItemConfig[];
  requirementChecks: Array<{
    requirementId: string;
    passed: boolean;
    detail: string;
  }>;
};
```

服务端必须验证：

- 响应为合法JSON。
- 每个启用维度都有决策。
- 每个启用要求都有检查结果。
- 本地生成出的HTML包含完整文档结构。
- 本地生成出的HTML通过现有校验器。

AI输出不合法时允许自动重试一次。重试仍失败则返回明确错误，不保存为成功记录。

### 5.4 提示词要求

系统提示词必须明确：

- 只能基于给定母版修改。
- 不得删除母版核心函数和通信逻辑。
- 必须逐项处理启用维度。
- 必须逐项检查硬性要求。
- 菜单必须与系统名称表达的业务匹配。
- `h1` 保持纯文字。
- 不生成不存在的业务页面正文。
- 返回指定JSON，不输出Markdown代码块。

调整提示词还必须包含当前HTML和用户本次修改意见，并要求只修改相关部分。

## 6. 版本号规则

- 系统名称已经包含 `V1.0`、`v2` 等版本号时不重复追加。
- 系统名称没有版本号且用户填写版本号时自动追加。
- 版本号未填写时不强制追加默认值。
- 历史记录同时保存原始系统名称、原始版本输入和最终展示名称。

注意：当前 `normalizeVersion` 会在空值时返回 `V1.0`，实施本需求时需要调整并补充测试。

## 7. SQLite数据设计

### 7.1 技术选择

- 数据库：SQLite。
- Node访问库：`sql.js`（纯WASM，避免Windows和Alpine原生编译依赖）。
- 数据库路径：`DATA_DIR/indexforge.db`，默认 `/app/data/indexforge.db`。
- 启动时执行数据库迁移和默认数据初始化。
- Docker镜像需验证原生依赖兼容性，必要时从 Alpine 改为 Debian slim 基础镜像。

### 7.2 数据表

#### dimensions

```sql
CREATE TABLE dimensions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  group_name TEXT NOT NULL,
  description TEXT NOT NULL,
  value_type TEXT NOT NULL,
  default_value TEXT NOT NULL,
  options_json TEXT NOT NULL DEFAULT '[]',
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

#### requirements

```sql
CREATE TABLE requirements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  level TEXT NOT NULL,
  validation_type TEXT NOT NULL DEFAULT 'ai',
  builtin_validator TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

#### templates

```sql
CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  html TEXT NOT NULL,
  validation_json TEXT NOT NULL,
  is_current INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

#### generation_records

```sql
CREATE TABLE generation_records (
  id TEXT PRIMARY KEY,
  parent_id TEXT,
  system_name TEXT NOT NULL,
  version_input TEXT,
  display_name TEXT NOT NULL,
  instruction TEXT,
  refinement_instruction TEXT,
  system_type TEXT,
  tone_summary TEXT,
  template_id TEXT NOT NULL,
  template_snapshot TEXT NOT NULL,
  dimensions_snapshot_json TEXT NOT NULL,
  decisions_json TEXT NOT NULL,
  menu_json TEXT NOT NULL,
  requirements_snapshot_json TEXT NOT NULL,
  requirement_checks_json TEXT NOT NULL,
  validation_json TEXT NOT NULL,
  html TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(parent_id) REFERENCES generation_records(id)
);
```

`parent_id` 用于关联“根据意见重新生成”的版本链。

#### schema_migrations

```sql
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);
```

## 8. 服务端API

### 8.1 维度

```text
GET    /api/dimensions
POST   /api/dimensions
PUT    /api/dimensions/:id
DELETE /api/dimensions/:id
POST   /api/dimensions/reorder
POST   /api/dimensions/reset
```

### 8.2 硬性要求

```text
GET    /api/requirements
POST   /api/requirements
PUT    /api/requirements/:id
DELETE /api/requirements/:id
POST   /api/requirements/reorder
POST   /api/requirements/reset
```

### 8.3 母版

```text
GET    /api/templates
POST   /api/templates
PUT    /api/templates/:id/current
DELETE /api/templates/:id
```

### 8.4 生成与调整

```text
POST /api/generations
POST /api/generations/:id/refine
GET  /api/generations
GET  /api/generations/:id
DELETE /api/generations/:id
```

所有写接口必须执行服务端字段校验。即使本期没有登录，也不能信任前端输入。

## 9. 前端改造

### 9.1 状态来源

以下数据由 `localStorage` 改为服务端API：

- 维度。
- 硬性要求。
- 母版。
- 菜单配置。
- 生成历史。

`localStorage` 仅保留不重要的界面状态，例如当前导航页和未提交草稿。

### 9.2 兼容迁移

首次升级时提供一次性导入：

- 读取现有 `indexforge.dimensions`。
- 读取现有 `indexforge.template`。
- 读取现有 `indexforge.history`。
- 用户确认后导入服务端。
- 服务端已有数据时不自动覆盖。

如果无需保留现有浏览器数据，可以省略迁移界面，仅使用默认数据初始化数据库。

## 10. Docker和备份

`docker-compose.yml` 增加持久化目录：

```yaml
services:
  indexforge:
    volumes:
      - ./data:/app/data
```

环境变量：

```env
DATA_DIR=/app/data
```

数据库文件不得打入镜像或提交Git：

```gitignore
data/
backups/
*.db
*.db-shm
*.db-wal
```

备份示例：

```bash
mkdir -p backups
cp data/indexforge.db backups/indexforge-$(date +%F-%H%M%S).db
```

正式使用后建议每天备份一次，并至少保留最近7天。

## 11. 安全与稳定性

- AI API Key 只存在服务器 `.env`，不得发送到前端或写入数据库。
- AI接口继续使用限流、超时和请求大小限制。
- 生成请求不允许客户端直接指定任意文件路径。
- 上传母版限制为HTML文本并限制文件大小。
- 本地生成的HTML只能在受限iframe中预览。
- 下载前必须通过本地校验。
- SQLite写入在单个Node进程内串行执行，并通过临时文件原子替换完成持久化。
- 数据库写操作使用事务。
- 错误日志不得输出API Key、完整提示词或敏感环境变量。

## 12. 开发实施顺序

### 阶段一：数据库与规则CRUD

- 引入SQLite和迁移机制。
- 初始化27个默认维度和9条默认要求。
- 实现维度CRUD、启停和排序。
- 实现硬性要求CRUD、启停和排序。
- 前端配置页面改为调用API。

验证：重启服务和重建容器后数据仍存在；所有CRUD接口测试通过。

### 阶段二：母版与历史持久化

- 母版迁移到SQLite。
- 历史记录迁移到SQLite。
- 保存母版、维度和要求快照。

验证：修改当前规则后，旧记录仍可按原HTML预览和下载。

### 阶段三：AI智能生成

- 增加生成要求输入框。
- 扩展AI接口和结构化响应。
- AI读取当前母版、启用维度、启用要求和用户输入，直接返回完整HTML；后端提取完整文档并执行本地校验。
- 执行本地校验并保存生成记录。
- 移除首页强制风格预设。

验证：不同类型系统产生不同调性、维度和业务菜单；全部启用要求均有检查结果。

### 阶段四：根据意见重新生成

- 增加调整意见输入框。
- 实现 `refine` API。
- 建立生成记录父子关系。
- 每次调整重新执行校验。

验证：调整后的结果确实基于上一版本，历史版本均可回看。

### 阶段五：部署与验收

- 更新Docker持久化配置。
- 增加数据库备份说明。
- 运行自动化测试、生产构建和容器健康检查。
- 完成浏览器人工验收。

## 13. 测试要求

### 13.1 单元测试

- 版本号拼接与空版本处理。
- 维度和要求字段校验。
- 默认数据初始化幂等性。
- AI响应结构校验。
- 本地HTML硬性校验。

### 13.2 API测试

- 维度和要求完整CRUD。
- 重复ID、空名称和非法选项拒绝。
- 删除不存在记录返回404。
- 排序接口保持唯一顺序。
- AI超时、非法JSON和缺少字段处理。
- 校验失败时记录状态正确且不可下载。

### 13.3 集成测试

- 新增维度后下一次AI请求包含该维度。
- 新增要求后下一次AI请求包含该要求。
- 生成记录保存完整快照。
- 修改规则不影响历史记录。
- 容器删除并重建后SQLite数据仍存在。

## 14. 验收标准

1. 使用者只输入系统名称即可生成后台首页。
2. 版本号和生成要求均可选。
3. 首页不再强制选择风格预设。
4. AI对每个启用维度返回取值和原因。
5. AI生成的菜单与系统业务匹配。
6. 页面基于当前母版生成且核心结构不被破坏。
7. 每个启用要求都有检查结果。
8. 本地校验不通过时禁止下载。
9. 维度和要求支持增删改查、启停及排序。
10. 新增维度和要求自动参与下一次生成。
11. 使用者可以输入调整意见并基于当前结果重新生成。
12. 每次生成和调整均保存独立历史记录。
13. 重启服务和重建Docker容器后数据不丢失。
14. API Key 不出现在前端、数据库、日志和Git仓库中。

## 15. 非目标和后续方向

以下内容留待后续明确需要时再开发：

- 登录、角色和权限。
- 操作审计和多人协作冲突处理。
- PostgreSQL迁移。
- 域名和HTTPS。
- 多套母版按系统类型自动选择。
- 流式展示AI生成过程。
