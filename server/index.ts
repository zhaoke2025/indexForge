import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import OpenAI from 'openai';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

type MenuSubItem = { name: string; file: string };
type MenuItemConfig = { id: string; name: string; icon: string; file?: string; subMenu: MenuSubItem[] };

const app = express();
const port = Number(process.env.API_PORT || process.env.PORT || 8787);
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean);

if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('该来源不允许访问 API'));
  },
}));
app.use(express.json({ limit: '128kb' }));

const aiLimiter = rateLimit({
  windowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS || 60_000),
  limit: Number(process.env.API_RATE_LIMIT_MAX || 20),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后重试' },
});

function slug(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return normalized || `menu-${Date.now()}`;
}

function normalizeMenuConfig(input: unknown): MenuItemConfig[] {
  if (!Array.isArray(input)) throw new Error('模型返回的 menuConfig 不是数组');
  return input.slice(0, 8).map((item, index) => {
    const source = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const name = String(source.name || `菜单${index + 1}`).slice(0, 24);
    const id = slug(String(source.id || name || `menu-${index + 1}`));
    const rawIcon = String(source.icon || 'fa-folder');
    const icon = rawIcon.startsWith('fa-') ? rawIcon : `fa-${rawIcon}`;
    const subMenuSource = Array.isArray(source.subMenu) ? source.subMenu : [];
    const subMenu = subMenuSource.slice(0, 8).map((sub, subIndex) => {
      const value = sub && typeof sub === 'object' ? sub as Record<string, unknown> : {};
      const subName = String(value.name || `子菜单${subIndex + 1}`).slice(0, 24);
      return { name: subName, file: slug(String(value.file || subName)) };
    });
    return { id, name, icon, file: subMenu.length ? undefined : slug(String(source.file || name)), subMenu };
  });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, hasApiKey: Boolean(process.env.OPENAI_API_KEY), model: process.env.OPENAI_MODEL || 'deepseek-chat' });
});

app.post('/api/generate-menu', aiLimiter, async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey?.trim()) return void res.status(503).json({ error: '服务端尚未配置 AI API Key' });
    const prompt = String(req.body?.prompt || '').trim().slice(0, 2000);
    const systemName = String(req.body?.systemName || '').trim().slice(0, 100);
    if (!prompt && !systemName) return void res.status(400).json({ error: '请提供系统名称或菜单生成说明' });

    const client = new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.deepseek.com',
      timeout: Number(process.env.AI_REQUEST_TIMEOUT_MS || 30_000),
      maxRetries: 1,
    });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'deepseek-chat', temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: '你是后台管理系统信息架构设计助手。只返回 JSON：{"menuConfig":[{"id":"english-id","name":"一级菜单名","icon":"fa-folder","file":"page-name","subMenu":[{"name":"子菜单名","file":"page-name"}]}]}。一级菜单 3-6 个，子菜单 0-6 个；标题用中文，id 和 file 用英文小写短横线。' },
        { role: 'user', content: `系统名称：${systemName || '未指定'}\n菜单需求：${prompt || '请根据系统名称生成常见后台菜单。'}` },
      ],
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}') as { menuConfig?: unknown };
    res.json({ menuConfig: normalizeMenuConfig(parsed.menuConfig) });
  } catch (error) {
    console.error('AI menu generation failed', error);
    res.status(502).json({ error: 'AI 菜单生成失败，请稍后重试' });
  }
});

if (isProduction) {
  const distPath = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distPath, { maxAge: '1d', etag: true }));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: isProduction ? '服务器内部错误' : error.message });
});

const server = app.listen(port, '0.0.0.0', () => console.log(`IndexForge listening on http://0.0.0.0:${port}`));
function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  server.close((error) => process.exit(error ? 1 : 0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
