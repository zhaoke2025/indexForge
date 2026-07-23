import compression from 'compression';
import cors from 'cors';
import crypto from 'node:crypto';
import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import OpenAI from 'openai';
import { buildHtmlPrompt, buildRepairPrompt, extractCompleteHtml, htmlSystemPrompt } from './ai-html.js';
import { appliedDimensionDecisions, buildDimensionDecisionPrompt, parseDimensionPlan, type DimensionDecision, type DimensionDefinition } from './dimension-decisions.js';
import { applyFunctionalDimensions, ensureReferencedElementAliases, ensureSidebarToggleAccessible } from './html-features.js';
import { validateHtml, validateRequirementChecks } from './html-validator.js';
import { buildLoginPrompt, buildLoginRepairPrompt, extractLoginHtml, loginSystemPrompt, validateLoginHtml, validateLoginRequirementChecks } from './login-ai.js';
import { Store, type Row } from './store.js';
import { seedLoginDimensions, seedLoginRequirements } from './defaults.js';
import { enforcedIndexRequirements, protectedIndexRequirementIds } from './index-requirements.js';
import { repairUntilValid } from './repair-loop.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

type MenuSubItem = { name: string; file: string };
type MenuItemConfig = { id: string; name: string; icon: string; file?: string; subMenu: MenuSubItem[] };
type DimensionRow = Row & { id: string; name: string; group_name: string; description: string; value_type: string; default_value: string; options_json: string; enabled: number; sort_order: number };
type RequirementRow = Row & { id: string; name: string; description: string; level: string; validation_type: string; builtin_validator: string | null; enabled: number; sort_order: number };
type TemplateRow = Row & { id: string; name: string; html: string; validation_json: string; is_current: number };
type GenerationRow = Row & Record<string, string>;

const app = express();
const store = await Store.open();
const port = Number(process.env.API_PORT || process.env.PORT || 8787);
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean);
const maxRepairAttempts = Math.min(5, Math.max(1, Number(process.env.AI_REPAIR_MAX_ATTEMPTS || 3)));

if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin(origin, callback) {
  if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
  const error = new Error('该来源不允许访问 API') as Error & { status?: number };
  error.status = 403;
  callback(error);
} }));
app.use(express.json({ limit: '3mb' }));

const aiLimiter = rateLimit({
  windowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS || 60_000),
  limit: Number(process.env.API_RATE_LIMIT_MAX || 20), standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后重试' },
});
const asyncRoute = (handler: (req: express.Request, res: express.Response) => Promise<void>) =>
  (req: express.Request, res: express.Response, next: express.NextFunction) => { handler(req, res).catch(next); };

function slug(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || `menu-${Date.now()}`;
}

function normalizeMenuConfig(input: unknown): MenuItemConfig[] {
  if (!Array.isArray(input)) throw new Error('模型返回的 menuConfig 不是数组');
  return input.slice(0, 8).map((item, index) => {
    const source = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const name = String(source.name || `菜单${index + 1}`).slice(0, 24);
    const rawIcon = String(source.icon || 'fa-folder');
    const subMenu = (Array.isArray(source.subMenu) ? source.subMenu : []).slice(0, 8).map((sub, subIndex) => {
      const value = sub && typeof sub === 'object' ? sub as Record<string, unknown> : {};
      const subName = String(value.name || `子菜单${subIndex + 1}`).slice(0, 24);
      return { name: subName, file: slug(String(value.file || subName)) };
    });
    return { id: slug(String(source.id || name)), name, icon: rawIcon.startsWith('fa-') ? rawIcon : `fa-${rawIcon}`, file: subMenu.length ? undefined : slug(String(source.file || name)), subMenu };
  });
}

function parseJson<T>(value: string, fallback: T): T { try { return JSON.parse(value) as T; } catch { return fallback; } }
function bool(value: unknown) { return value === true || value === 1 || value === '1'; }
function now() { return new Date().toISOString(); }
function dimensions() { return store.all<DimensionRow>('SELECT * FROM dimensions ORDER BY sort_order, created_at').map(dimensionDto); }
function requirements() { return store.all<RequirementRow>('SELECT * FROM requirements ORDER BY sort_order, created_at').map(requirementDto); }
function loginDimensions() { return store.all<DimensionRow>('SELECT * FROM login_dimensions ORDER BY sort_order, created_at').map(dimensionDto); }
function loginRequirements() { return store.all<RequirementRow>('SELECT * FROM login_requirements ORDER BY sort_order, created_at').map(requirementDto); }
function dimensionDto(row: DimensionRow) { return { id: row.id, name: row.name, group: row.group_name, description: row.description, valueType: row.value_type, options: parseJson<string[]>(row.options_json, []), enabled: bool(row.enabled), sortOrder: Number(row.sort_order) }; }
function requirementDto(row: RequirementRow) { return { id: row.id, name: row.name, description: row.description, level: row.level, validationType: row.validation_type, builtinValidator: row.builtin_validator || undefined, enabled: bool(row.enabled), sortOrder: Number(row.sort_order) }; }
function templateDto(row: TemplateRow) { const saved = parseJson<ReturnType<typeof validateHtml> | null>(row.validation_json, null); return { id: row.id, name: row.name, html: row.html, validation: saved && typeof saved.valid === 'boolean' ? saved : validateHtml(row.html), isCurrent: bool(row.is_current) }; }
function generationDto(row: GenerationRow) { return { id: row.id, parentId: row.parent_id || undefined, systemName: row.system_name, version: row.version_input || '', displayName: row.display_name, instruction: row.instruction || '', refinementInstruction: row.refinement_instruction || '', systemType: row.system_type || '', toneSummary: row.tone_summary || '', dimensions: parseJson(row.decisions_json, []), menuConfig: parseJson(row.menu_json, []), requirementChecks: parseJson(row.requirement_checks_json, []), validation: parseJson(row.validation_json, { valid: false, errors: [], warnings: [] }), html: ensureReferencedElementAliases(ensureSidebarToggleAccessible(row.html)), status: row.status, generatedAt: row.created_at }; }
function loginGenerationDto(row: GenerationRow) { return { id: row.id, parentId: row.parent_id || undefined, sourceGenerationId: row.source_generation_id, systemName: row.system_name, version: row.version_input || '', slogan: row.slogan || '', instruction: row.instruction || '', refinementInstruction: row.refinement_instruction || '', config: parseJson(row.config_json, {}), dimensions: parseJson(row.decisions_json, []), requirementChecks: parseJson(row.requirement_checks_json, []), validation: parseJson(row.validation_json, { valid: false, errors: [], warnings: [] }), html: row.html, status: row.status, generatedAt: row.created_at }; }

function validateId(value: unknown) {
  const id = String(value || '').trim();
  if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(id)) throw Object.assign(new Error('ID只能包含字母、数字、下划线和短横线，并以字母开头'), { status: 400 });
  return id;
}

function dimensionValue(body: Record<string, unknown>) {
  const valueType = String(body.valueType || 'text');
  const options = Array.isArray(body.options) ? body.options.map(String).map((item) => item.trim()).filter(Boolean) : [];
  if (valueType === 'single-select' && !options.length) throw Object.assign(new Error('单选维度必须配置至少一个可选项'), { status: 400 });
  return { valueType, options };
}

app.get('/api/health', (_req, res) => res.json({ ok: true, hasApiKey: Boolean(process.env.OPENAI_API_KEY), model: process.env.OPENAI_MODEL || 'deepseek-chat', database: true }));

app.get('/api/dimensions', (_req, res) => res.json({ dimensions: dimensions() }));
app.post('/api/dimensions', (req, res) => {
  dimensionValue(req.body || {});
  const id = validateId(req.body?.id); const name = String(req.body?.name || '').trim();
  if (!name) return void res.status(400).json({ error: '维度名称不能为空' });
  if (store.get('SELECT id FROM dimensions WHERE id=?', [id])) return void res.status(409).json({ error: '维度ID已存在' });
  const list = dimensions(); const created = now();
  store.run('INSERT INTO dimensions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, name, String(req.body?.group || '自定义'), String(req.body?.description || ''), String(req.body?.valueType || 'text'), 'null', JSON.stringify(Array.isArray(req.body?.options) ? req.body.options : []), bool(req.body?.enabled) ? 1 : 0, list.length, created, created]);
  res.status(201).json({ dimension: dimensions().find((item) => item.id === id) });
});
app.put('/api/dimensions/:id', (req, res) => {
  dimensionValue(req.body || {});
  const id = req.params.id; if (!store.get('SELECT id FROM dimensions WHERE id=?', [id])) return void res.status(404).json({ error: '维度不存在' });
  const name = String(req.body?.name || '').trim(); if (!name) return void res.status(400).json({ error: '维度名称不能为空' });
  store.run('UPDATE dimensions SET name=?,group_name=?,description=?,value_type=?,default_value=?,options_json=?,enabled=?,updated_at=? WHERE id=?', [name, String(req.body?.group || '自定义'), String(req.body?.description || ''), String(req.body?.valueType || 'text'), 'null', JSON.stringify(Array.isArray(req.body?.options) ? req.body.options : []), bool(req.body?.enabled) ? 1 : 0, now(), id]);
  res.json({ dimension: dimensions().find((item) => item.id === id) });
});
app.delete('/api/dimensions/:id', (req, res) => { if (!store.get('SELECT id FROM dimensions WHERE id=?', [req.params.id])) return void res.status(404).json({ error: '维度不存在' }); store.run('DELETE FROM dimensions WHERE id=?', [req.params.id]); res.status(204).end(); });
app.post('/api/dimensions/reorder', (req, res) => { const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : []; store.transaction(() => ids.forEach((id: string, index: number) => store.run('UPDATE dimensions SET sort_order=? WHERE id=?', [index, id]))); res.json({ dimensions: dimensions() }); });
app.post('/api/dimensions/reset', (_req, res) => { store.resetDimensions(); res.json({ dimensions: dimensions() }); });

app.get('/api/requirements', (_req, res) => res.json({ requirements: requirements() }));
app.post('/api/requirements', (req, res) => {
  const id = validateId(req.body?.id); const name = String(req.body?.name || '').trim(); if (!name) return void res.status(400).json({ error: '要求名称不能为空' });
  if (protectedIndexRequirementIds.has(id)) return void res.status(409).json({ error: 'R1-R3 是线上内置硬性要求，不能新建或覆盖' });
  if (store.get('SELECT id FROM requirements WHERE id=?', [id])) return void res.status(409).json({ error: '要求ID已存在' });
  const created = now(); store.run('INSERT INTO requirements VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, name, String(req.body?.description || ''), String(req.body?.level || 'required'), String(req.body?.validationType || 'ai'), req.body?.builtinValidator || null, bool(req.body?.enabled) ? 1 : 0, requirements().length, created, created]);
  res.status(201).json({ requirement: requirements().find((item) => item.id === id) });
});
app.put('/api/requirements/:id', (req, res) => {
  const id = req.params.id; if (!store.get('SELECT id FROM requirements WHERE id=?', [id])) return void res.status(404).json({ error: '要求不存在' });
  if (protectedIndexRequirementIds.has(id)) return void res.status(409).json({ error: 'R1-R3 是线上内置硬性要求，不能编辑或停用' });
  const name = String(req.body?.name || '').trim(); if (!name) return void res.status(400).json({ error: '要求名称不能为空' });
  store.run('UPDATE requirements SET name=?,description=?,level=?,validation_type=?,builtin_validator=?,enabled=?,updated_at=? WHERE id=?', [name, String(req.body?.description || ''), String(req.body?.level || 'required'), String(req.body?.validationType || 'ai'), req.body?.builtinValidator || null, bool(req.body?.enabled) ? 1 : 0, now(), id]);
  res.json({ requirement: requirements().find((item) => item.id === id) });
});
app.delete('/api/requirements/:id', (req, res) => { if (!store.get('SELECT id FROM requirements WHERE id=?', [req.params.id])) return void res.status(404).json({ error: '要求不存在' }); if (protectedIndexRequirementIds.has(req.params.id)) return void res.status(409).json({ error: 'R1-R3 是线上内置硬性要求，不能删除' }); store.run('DELETE FROM requirements WHERE id=?', [req.params.id]); res.status(204).end(); });
app.post('/api/requirements/reorder', (req, res) => { const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : []; store.transaction(() => ids.forEach((id: string, index: number) => store.run('UPDATE requirements SET sort_order=? WHERE id=?', [index, id]))); res.json({ requirements: requirements() }); });
app.post('/api/requirements/reset', (_req, res) => { store.resetRequirements(); res.json({ requirements: requirements() }); });

app.get('/api/login-dimensions', (_req, res) => res.json({ dimensions: loginDimensions() }));
app.post('/api/login-dimensions', (req, res) => {
  dimensionValue(req.body || {}); const id = validateId(req.body?.id); const name = String(req.body?.name || '').trim();
  if (!name) return void res.status(400).json({ error: '维度名称不能为空' }); if (store.get('SELECT id FROM login_dimensions WHERE id=?', [id])) return void res.status(409).json({ error: '维度ID已存在' });
  const created = now(); store.run('INSERT INTO login_dimensions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, name, String(req.body?.group || '自定义'), String(req.body?.description || ''), String(req.body?.valueType || 'text'), 'null', JSON.stringify(req.body?.options || []), bool(req.body?.enabled) ? 1 : 0, loginDimensions().length, created, created]); res.status(201).json({ dimension: loginDimensions().find((item) => item.id === id) });
});
app.put('/api/login-dimensions/:id', (req, res) => { dimensionValue(req.body || {}); const id = req.params.id; if (!store.get('SELECT id FROM login_dimensions WHERE id=?', [id])) return void res.status(404).json({ error: '登录页维度不存在' }); store.run('UPDATE login_dimensions SET name=?,group_name=?,description=?,value_type=?,default_value=?,options_json=?,enabled=?,updated_at=? WHERE id=?', [String(req.body?.name || ''), String(req.body?.group || ''), String(req.body?.description || ''), String(req.body?.valueType || 'text'), 'null', JSON.stringify(req.body?.options || []), bool(req.body?.enabled) ? 1 : 0, now(), id]); res.json({ dimension: loginDimensions().find((item) => item.id === id) }); });
app.delete('/api/login-dimensions/:id', (req, res) => { store.run('DELETE FROM login_dimensions WHERE id=?', [req.params.id]); res.status(204).end(); });
app.post('/api/login-dimensions/reorder', (req, res) => { const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : []; store.transaction(() => ids.forEach((id, index) => store.run('UPDATE login_dimensions SET sort_order=? WHERE id=?', [index, id]))); res.json({ dimensions: loginDimensions() }); });
app.post('/api/login-dimensions/reset', (_req, res) => { const created = now(); store.transaction(() => { store.run('DELETE FROM login_dimensions'); seedLoginDimensions.forEach((item, index) => store.run('INSERT INTO login_dimensions VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)', [item.id, item.name, item.groupName, item.description, item.valueType, 'null', JSON.stringify(item.options), index, created, created])); }); res.json({ dimensions: loginDimensions() }); });

app.get('/api/login-requirements', (_req, res) => res.json({ requirements: loginRequirements() }));
app.post('/api/login-requirements', (req, res) => { const id = validateId(req.body?.id); const created = now(); store.run('INSERT INTO login_requirements VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, String(req.body?.name || ''), String(req.body?.description || ''), String(req.body?.level || 'required'), String(req.body?.validationType || 'ai'), req.body?.builtinValidator || null, bool(req.body?.enabled) ? 1 : 0, loginRequirements().length, created, created]); res.status(201).json({ requirement: loginRequirements().find((item) => item.id === id) }); });
app.put('/api/login-requirements/:id', (req, res) => { const id = req.params.id; if (!store.get('SELECT id FROM login_requirements WHERE id=?', [id])) return void res.status(404).json({ error: '登录页要求不存在' }); store.run('UPDATE login_requirements SET name=?,description=?,level=?,validation_type=?,builtin_validator=?,enabled=?,updated_at=? WHERE id=?', [String(req.body?.name || ''), String(req.body?.description || ''), String(req.body?.level || 'required'), String(req.body?.validationType || 'ai'), req.body?.builtinValidator || null, bool(req.body?.enabled) ? 1 : 0, now(), id]); res.json({ requirement: loginRequirements().find((item) => item.id === id) }); });
app.delete('/api/login-requirements/:id', (req, res) => { store.run('DELETE FROM login_requirements WHERE id=?', [req.params.id]); res.status(204).end(); });
app.post('/api/login-requirements/reorder', (req, res) => { const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : []; store.transaction(() => ids.forEach((id, index) => store.run('UPDATE login_requirements SET sort_order=? WHERE id=?', [index, id]))); res.json({ requirements: loginRequirements() }); });
app.post('/api/login-requirements/reset', (_req, res) => { const created = now(); store.transaction(() => { store.run('DELETE FROM login_requirements'); seedLoginRequirements.forEach((item, index) => store.run('INSERT INTO login_requirements VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)', [item[0], item[1], item[2], item[3], item[4], item[5], index, created, created])); }); res.json({ requirements: loginRequirements() }); });

app.get('/api/templates', (_req, res) => res.json({ templates: store.all<TemplateRow>('SELECT * FROM templates ORDER BY created_at DESC').map(templateDto) }));
app.post('/api/templates', (req, res) => { const html = String(req.body?.html || ''); const validation = validateHtml(html); if (!validation.valid) return void res.status(400).json({ error: '母版结构校验失败', validation }); const id = crypto.randomUUID(); store.run('INSERT INTO templates VALUES (?, ?, ?, ?, 0, ?, ?)', [id, String(req.body?.name || 'index.html'), html, JSON.stringify(validation), now(), now()]); res.status(201).json({ template: templateDto(store.get<TemplateRow>('SELECT * FROM templates WHERE id=?', [id])!) }); });
app.put('/api/templates/:id/current', (req, res) => { if (!store.get('SELECT id FROM templates WHERE id=?', [req.params.id])) return void res.status(404).json({ error: '母版不存在' }); store.transaction(() => { store.run('UPDATE templates SET is_current=0'); store.run('UPDATE templates SET is_current=1,updated_at=? WHERE id=?', [now(), req.params.id]); }); res.json({ ok: true }); });
app.delete('/api/templates/:id', (req, res) => { const row = store.get<TemplateRow>('SELECT * FROM templates WHERE id=?', [req.params.id]); if (!row) return void res.status(404).json({ error: '母版不存在' }); store.run('DELETE FROM templates WHERE id=?', [req.params.id]); res.status(204).end(); });

function openAiClient() {
  const apiKey = process.env.OPENAI_API_KEY; if (!apiKey?.trim()) throw Object.assign(new Error('服务端尚未配置AI API Key'), { status: 503 });
  return new OpenAI({ apiKey, baseURL: process.env.OPENAI_BASE_URL || 'https://api.deepseek.com', timeout: Number(process.env.AI_REQUEST_TIMEOUT_MS || 120_000), maxRetries: 1 });
}

async function requestDimensionPlan(input: { systemName: string; instruction: string; dimensions: DimensionDefinition[]; page: 'index' | 'login'; previous?: DimensionDecision[]; resources?: string[] }) {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: '你是页面设计规划师。根据系统业务和用户自然语言要求评估全部启用维度，并严格返回JSON。用户本次要求优先于上一版方案、母版和可用资源；不得为了填写完整而把所有维度都标记为应用。' },
    { role: 'user', content: buildDimensionDecisionPrompt(input) },
  ];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const completion = await openAiClient().chat.completions.create({
      model: process.env.OPENAI_MODEL || 'deepseek-chat',
      temperature: 0.2,
      max_tokens: Number(process.env.AI_DIMENSION_MAX_TOKENS || 4096),
      response_format: { type: 'json_object' },
      messages,
    });
    const content = completion.choices[0]?.message?.content || '';
    try { return parseDimensionPlan(content, input.dimensions); }
    catch (error) {
      if (attempt === 1) throw error;
      messages.push(
        { role: 'assistant', content },
        { role: 'user', content: `上次维度评估不合规：${error instanceof Error ? error.message : '未知错误'}。请重新评估全部候选项，只保留少量对当前系统有显著价值且会实际落入HTML的维度，并严格遵守 applied 数量上限。` },
      );
    }
  }
  throw new Error('AI维度评估失败');
}

function displayName(systemName: string, version: string) {
  if (!version || /V\d+(\.\d+){0,2}/i.test(systemName)) return systemName;
  const normalized = /^v/i.test(version) ? version.toUpperCase() : /^\d/.test(version) ? `V${version}` : version;
  return `${systemName} ${normalized}`;
}

async function requestAi(input: { systemName: string; version: string; instruction: string; template: TemplateRow; current?: GenerationRow }) {
  const activeDimensions = dimensions().filter((item) => item.enabled);
  const activeRequirements = enforcedIndexRequirements(requirements());
  const activeDimensionIds = new Set(activeDimensions.map((item) => item.id));
  const previousDecisions = input.current ? parseJson<DimensionDecision[]>(input.current.decisions_json, []).filter((item) => activeDimensionIds.has(item.dimensionId)) : undefined;
  const plan = await requestDimensionPlan({ systemName: input.systemName, instruction: input.instruction, dimensions: activeDimensions, page: 'index', previous: previousDecisions });
  const selectedDecisions = appliedDimensionDecisions(plan.dimensions);
  const appliedDimensions = selectedDecisions.map((item) => ({ id: item.dimensionId, value: item.value }));
  const baseHtml = input.current?.html || input.template.html;
  const createHtml = async (userPrompt: string) => {
    const messages = [{ role: 'system' as const, content: htmlSystemPrompt }, { role: 'user' as const, content: userPrompt }];
    console.log(`\n========== AI REQUEST MESSAGES (${input.current ? 'refine' : 'generate'}) ==========`);
    console.log(JSON.stringify(messages, null, 2));
    console.log('========== END AI REQUEST MESSAGES ==========\n');
    const completion = await openAiClient().chat.completions.create({
      model: process.env.OPENAI_MODEL || 'deepseek-chat',
      temperature: 0.15,
      max_tokens: Number(process.env.AI_HTML_MAX_TOKENS || 16_384),
      messages,
    });
    if (completion.choices[0]?.finish_reason === 'length') throw new Error('AI输出HTML超出长度限制，请重试或使用输出能力更强的模型');
    return extractCompleteHtml(completion.choices[0]?.message?.content || '');
  };
  const inspect = (candidate: string) => {
    const validationContext = { requirements: activeRequirements, systemName: input.systemName };
    const validation = validateHtml(candidate, validationContext);
    const requirementChecks = validateRequirementChecks(candidate, activeRequirements, validationContext);
    const checkErrors = requirementChecks.filter((item) => !item.passed).map((item) => `${item.requirementId}：${item.detail}`);
    return { validation: { ...validation, valid: validation.valid && checkErrors.length === 0, errors: [...validation.errors, ...checkErrors.filter((error) => !validation.errors.includes(error))] }, requirementChecks };
  };
  const applyFeatures = (html: string) => ensureSidebarToggleAccessible(applyFunctionalDimensions(html, appliedDimensions, baseHtml));
  const initialHtml = applyFeatures(await createHtml(buildHtmlPrompt({ systemName: input.systemName, version: input.version, instruction: input.instruction, dimensions: activeDimensions, decisions: selectedDecisions, requirements: activeRequirements, baseHtml, refining: Boolean(input.current) })));
  const repaired = await repairUntilValid({
    initialHtml,
    inspect,
    maxAttempts: maxRepairAttempts,
    repair: async (html, errors) => applyFeatures(await createHtml(buildRepairPrompt(html, errors, selectedDecisions))),
  });
  const { html, inspection: inspected } = repaired;
  if (!inspected.validation.valid) {
    console.error(`AI首页自动修复 ${repaired.attempts} 次后仍未通过：${inspected.validation.errors.join('；')}`);
    throw Object.assign(new Error('生成结果暂未通过自动检查，系统已自动重试，请稍后再次生成'), { status: 422 });
  }
  return { html, validation: inspected.validation, requirementChecks: inspected.requirementChecks, activeDimensions, activeRequirements, plan };
}

async function saveGeneration(input: { systemName: string; version: string; instruction: string; refinementInstruction?: string; parentId?: string; template: TemplateRow; ai: Awaited<ReturnType<typeof requestAi>> }) {
  const id = crypto.randomUUID(); const created = now(); const name = displayName(input.systemName, input.version);
  store.run(`INSERT INTO generation_records VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, input.parentId || null, input.systemName, input.version || null, name, input.instruction || null, input.refinementInstruction || null, input.ai.plan.systemType || 'AI深度定制', input.ai.plan.toneSummary || (input.refinementInstruction ? 'AI基于上一版HTML按调整意见精准修改。' : 'AI根据系统业务自动适配实体维度。'), input.template.id, input.template.html, JSON.stringify(input.ai.activeDimensions), JSON.stringify(input.ai.plan.dimensions), '[]', JSON.stringify(input.ai.activeRequirements), JSON.stringify(input.ai.requirementChecks), JSON.stringify(input.ai.validation), input.ai.html, 'success', created]);
  return generationDto(store.get<GenerationRow>('SELECT * FROM generation_records WHERE id=?', [id])!);
}

app.post('/api/generations', aiLimiter, asyncRoute(async (req, res) => {
  const systemName = String(req.body?.systemName || '').trim().slice(0, 100); if (!systemName) return void res.status(400).json({ error: '系统名称不能为空' });
  const template = store.get<TemplateRow>('SELECT * FROM templates WHERE is_current=1'); if (!template) return void res.status(409).json({ error: '请先上传母版并将其设为当前母版' });
  const version = String(req.body?.version || '').trim().slice(0, 30); const instruction = String(req.body?.instruction || '').trim().slice(0, 2000);
  const ai = await requestAi({ systemName, version, instruction, template }); res.status(201).json({ generation: await saveGeneration({ systemName, version, instruction, template, ai }) });
}));
app.post('/api/generations/:id/refine', aiLimiter, asyncRoute(async (req, res) => {
  const recordId = String(req.params.id); const current = store.get<GenerationRow>('SELECT * FROM generation_records WHERE id=?', [recordId]); if (!current) return void res.status(404).json({ error: '生成记录不存在' });
  const instruction = String(req.body?.instruction || '').trim().slice(0, 2000); if (!instruction) return void res.status(400).json({ error: '调整意见不能为空' });
  const template = store.get<TemplateRow>('SELECT * FROM templates WHERE id=?', [current.template_id]); if (!template) return void res.status(409).json({ error: '历史母版不存在' });
  const ai = await requestAi({ systemName: current.system_name, version: current.version_input || '', instruction, template, current });
  res.status(201).json({ generation: await saveGeneration({ systemName: current.system_name, version: current.version_input || '', instruction: current.instruction || '', refinementInstruction: instruction, parentId: current.id, template, ai }) });
}));
app.get('/api/generations', (_req, res) => res.json({ generations: store.all<GenerationRow>('SELECT * FROM generation_records ORDER BY created_at DESC LIMIT 100').map(generationDto) }));
app.post('/api/generations/bulk-delete', (req, res) => { const ids = [...new Set<string>((Array.isArray(req.body?.ids) ? req.body.ids : []).map((id: unknown) => String(id)).filter(Boolean))].slice(0, 100); if (!ids.length) return void res.status(400).json({ error: '请选择需要删除的首页记录' }); store.transaction(() => ids.forEach((id) => store.run('DELETE FROM generation_records WHERE id=?', [id]))); res.json({ deleted: ids.length }); });
app.get('/api/generations/:id', (req, res) => { const row = store.get<GenerationRow>('SELECT * FROM generation_records WHERE id=?', [req.params.id]); if (!row) return void res.status(404).json({ error: '生成记录不存在' }); res.json({ generation: generationDto(row) }); });
app.delete('/api/generations/:id', (req, res) => { const id = String(req.params.id); if (!store.get('SELECT id FROM generation_records WHERE id=?', [id])) return void res.status(404).json({ error: '生成记录不存在' }); store.run('DELETE FROM generation_records WHERE id=?', [id]); res.status(204).end(); });

async function requestLoginAi(input: { config: Record<string, unknown>; instruction: string; referenceHtml: string; current?: GenerationRow }) {
  const activeRequirements = loginRequirements().filter((item) => item.enabled);
  const promptRequirements = activeRequirements.map((item) => `${item.id} ${item.name}：${item.description}`);
  const backgroundImage = String(input.config.backgroundType || '') === '图片通铺' ? String(input.config.backgroundImage || '') : '';
  const promptConfig = { ...input.config, backgroundImage: backgroundImage ? '已上传；使用__LOGIN_BACKGROUND_IMAGE__占位符，由后端注入' : '' };
  const previousHtml = input.current?.html.replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[a-zA-Z0-9+/=]+/g, '__LOGIN_BACKGROUND_IMAGE__');
  const createHtml = async (prompt: string) => {
    const messages = [{ role: 'system' as const, content: loginSystemPrompt }, { role: 'user' as const, content: prompt }];
    console.log(`\n========== AI LOGIN REQUEST MESSAGES (${input.current ? 'refine' : 'generate'}) ==========`);
    console.log(JSON.stringify(messages, null, 2));
    console.log('========== END AI LOGIN REQUEST MESSAGES ==========\n');
    const completion = await openAiClient().chat.completions.create({ model: process.env.OPENAI_MODEL || 'deepseek-chat', temperature: 0.15, max_tokens: Number(process.env.AI_HTML_MAX_TOKENS || 16_384), messages });
    if (completion.choices[0]?.finish_reason === 'length') throw new Error('AI输出登录页超出长度限制，请重试');
    return extractLoginHtml(completion.choices[0]?.message?.content || '');
  };
  const inspect = (candidate: string) => {
    const validation = validateLoginHtml(candidate, input.config, activeRequirements);
    const requirementChecks = validateLoginRequirementChecks(candidate, input.config, activeRequirements);
    const checkErrors = requirementChecks.filter((item) => !item.passed).map((item) => `${item.requirementId}：${item.detail}`);
    return { validation: { ...validation, valid: validation.valid && checkErrors.length === 0, errors: [...validation.errors, ...checkErrors] }, requirementChecks };
  };
  const repaired = await repairUntilValid({
    initialHtml: await createHtml(buildLoginPrompt({ config: promptConfig, requirements: promptRequirements, instruction: input.instruction, referenceHtml: input.referenceHtml, previousHtml })),
    inspect,
    maxAttempts: maxRepairAttempts,
    repair: (html, errors) => createHtml(buildLoginRepairPrompt(html, errors, promptConfig)),
  });
  let { html } = repaired;
  const inspected = repaired.inspection;
  if (!inspected.validation.valid) {
    console.error(`AI登录页自动修复 ${repaired.attempts} 次后仍未通过：${inspected.validation.errors.join('；')}`);
    throw Object.assign(new Error('登录页暂未通过自动检查，系统已自动重试，请稍后再次生成'), { status: 422 });
  }
  if (backgroundImage) {
    if (html.includes('__LOGIN_BACKGROUND_IMAGE__')) html = html.replaceAll('__LOGIN_BACKGROUND_IMAGE__', backgroundImage);
    else html = html.replace('</head>', `<style id="uploaded-login-background">html body{background-image:url("${backgroundImage}")!important;background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important}</style></head>`);
  }
  return { html, validation: inspected.validation, requirementChecks: inspected.requirementChecks, activeRequirements };
}

function saveLoginGeneration(input: { source: GenerationRow; config: Record<string, unknown>; dimensions: DimensionDefinition[]; plan: Awaited<ReturnType<typeof requestDimensionPlan>>; instruction: string; refinementInstruction?: string; parentId?: string; referenceHtml: string; ai: Awaited<ReturnType<typeof requestLoginAi>> }) {
  const id = crypto.randomUUID(); const created = now();
  store.run(`INSERT INTO login_generation_records (id,parent_id,source_generation_id,system_name,version_input,slogan,instruction,refinement_instruction,config_json,reference_html,dimensions_snapshot_json,decisions_json,requirements_snapshot_json,requirement_checks_json,validation_json,html,status,created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, input.parentId || null, input.source.id, String(input.config.systemName || input.source.system_name), String(input.config.version || ''), String(input.config.slogan || ''), input.instruction, input.refinementInstruction || null, JSON.stringify(input.config), input.referenceHtml, JSON.stringify(input.dimensions), JSON.stringify(input.plan.dimensions), JSON.stringify(input.ai.activeRequirements), JSON.stringify(input.ai.requirementChecks), JSON.stringify(input.ai.validation), input.ai.html, 'success', created]);
  return loginGenerationDto(store.get<GenerationRow>('SELECT * FROM login_generation_records WHERE id=?', [id])!);
}

app.post('/api/login-generations', aiLimiter, asyncRoute(async (req, res) => {
  const submitted = req.body?.config && typeof req.body.config === 'object' ? req.body.config as Record<string, unknown> : {};
  const sourceId = String(req.body?.sourceGenerationId || '');
  const source = sourceId ? store.get<GenerationRow>('SELECT * FROM generation_records WHERE id=?', [sourceId]) : store.get<GenerationRow>('SELECT * FROM generation_records ORDER BY created_at DESC LIMIT 1');
  if (!source) return void res.status(409).json({ error: '请先生成一个首页，登录页需要参考首页视觉风格' });
  const instruction = String(req.body?.instruction || '').trim().slice(0, 2000);
  const activeDimensions = loginDimensions().filter((item) => item.enabled);
  const systemName = String(submitted.systemName || source.system_name);
  const plan = await requestDimensionPlan({ systemName, instruction, dimensions: activeDimensions, page: 'login', resources: submitted.backgroundImage ? ['已上传一张可用的登录页背景图片'] : [] });
  const config = appliedDimensionDecisions(plan.dimensions).reduce<Record<string, unknown>>((result, item) => { result[item.dimensionId] = item.value; return result; }, { systemName, backgroundImage: submitted.backgroundImage });
  if (config.backgroundType !== '图片通铺') delete config.backgroundImage;
  const ai = await requestLoginAi({ config, instruction, referenceHtml: source.html });
  res.status(201).json({ generation: saveLoginGeneration({ source, config, dimensions: activeDimensions, plan, instruction, referenceHtml: source.html, ai }) });
}));
app.post('/api/login-generations/:id/refine', aiLimiter, asyncRoute(async (req, res) => {
  const current = store.get<GenerationRow>('SELECT * FROM login_generation_records WHERE id=?', [String(req.params.id)]);
  if (!current) return void res.status(404).json({ error: '登录页生成记录不存在' });
  const instruction = String(req.body?.instruction || '').trim().slice(0, 2000); if (!instruction) return void res.status(400).json({ error: '调整意见不能为空' });
  const source = store.get<GenerationRow>('SELECT * FROM generation_records WHERE id=?', [current.source_generation_id]); if (!source) return void res.status(409).json({ error: '参考首页记录不存在' });
  const submitted = req.body?.config && typeof req.body.config === 'object' ? req.body.config as Record<string, unknown> : {};
  const previousConfig = parseJson<Record<string, unknown>>(current.config_json, {});
  const submittedBackgroundImage = typeof submitted.backgroundImage === 'string' ? submitted.backgroundImage : String(previousConfig.backgroundImage || '');
  const activeDimensions = parseJson<DimensionDefinition[]>(current.dimensions_snapshot_json, loginDimensions().filter((item) => item.enabled));
  const previous = parseJson<DimensionDecision[]>(current.decisions_json, []);
  const plan = await requestDimensionPlan({ systemName: current.system_name, instruction, dimensions: activeDimensions, page: 'login', previous, resources: submittedBackgroundImage ? ['已上传一张可用的登录页背景图片'] : [] });
  const config = appliedDimensionDecisions(plan.dimensions).reduce<Record<string, unknown>>((result, item) => { result[item.dimensionId] = item.value; return result; }, { systemName: current.system_name, backgroundImage: submittedBackgroundImage });
  if (config.backgroundType !== '图片通铺') delete config.backgroundImage;
  const ai = await requestLoginAi({ config, instruction, referenceHtml: current.reference_html, current });
  res.status(201).json({ generation: saveLoginGeneration({ source, config, dimensions: activeDimensions, plan, instruction: current.instruction || '', refinementInstruction: instruction, parentId: current.id, referenceHtml: current.reference_html, ai }) });
}));
app.get('/api/login-generations', (_req, res) => res.json({ generations: store.all<GenerationRow>('SELECT * FROM login_generation_records ORDER BY created_at DESC LIMIT 100').map(loginGenerationDto) }));
app.post('/api/login-generations/bulk-delete', (req, res) => { const ids = [...new Set<string>((Array.isArray(req.body?.ids) ? req.body.ids : []).map((id: unknown) => String(id)).filter(Boolean))].slice(0, 100); if (!ids.length) return void res.status(400).json({ error: '请选择需要删除的登录页记录' }); store.transaction(() => ids.forEach((id) => store.run('DELETE FROM login_generation_records WHERE id=?', [id]))); res.json({ deleted: ids.length }); });
app.delete('/api/login-generations/:id', (req, res) => { const id = String(req.params.id); if (!store.get('SELECT id FROM login_generation_records WHERE id=?', [id])) return void res.status(404).json({ error: '登录页生成记录不存在' }); store.run('DELETE FROM login_generation_records WHERE id=?', [id]); res.status(204).end(); });

app.post('/api/generate-menu', aiLimiter, asyncRoute(async (req, res) => {
  const systemName = String(req.body?.systemName || '').trim().slice(0, 100); if (!systemName) return void res.status(400).json({ error: '请提供系统名称' });
  const completion = await openAiClient().chat.completions.create({ model: process.env.OPENAI_MODEL || 'deepseek-chat', temperature: 0.3, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: '只返回JSON：{"menuConfig":[]}，生成3-6个后台业务菜单。' }, { role: 'user', content: systemName }] });
  const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}') as { menuConfig?: unknown }; res.json({ menuConfig: normalizeMenuConfig(parsed.menuConfig) });
}));

if (isProduction) { const distPath = path.resolve(process.cwd(), 'dist'); app.use(express.static(distPath, { maxAge: '1d', etag: true })); app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html'))); }

app.use((error: Error & { status?: number; type?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error); const status = error.status || (error.type === 'entity.too.large' ? 413 : error instanceof SyntaxError ? 400 : 500);
  res.status(status).json({ error: status >= 500 && isProduction ? '服务器内部错误' : error.message });
});

const server = app.listen(port, '0.0.0.0', () => console.log(`IndexForge listening on http://0.0.0.0:${port}`));
function shutdown(signal: string) { console.log(`${signal} received, shutting down`); server.close((error) => process.exit(error ? 1 : 0)); setTimeout(() => process.exit(1), 10_000).unref(); }
process.on('SIGTERM', () => shutdown('SIGTERM')); process.on('SIGINT', () => shutdown('SIGINT'));
