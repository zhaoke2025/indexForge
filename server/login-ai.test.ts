import { describe, expect, it } from 'vitest';
import { buildLoginPrompt, validateLoginHtml, validateLoginRequirementChecks } from './login-ai';

describe('登录页AI生成约束', () => {
  it('提示词明确本次调整意见优先于AI维度方案', () => {
    const prompt = buildLoginPrompt({ config: { systemName: '供应商系统' }, instruction: '登录框改到右侧', referenceHtml: '<!DOCTYPE html><html></html>', previousHtml: '<!DOCTYPE html><html></html>' });
    expect(prompt).toContain('本次调整意见（优先于AI维度方案，但不得违反硬性要求）');
    expect(prompt).toContain('登录框改到右侧');
    expect(prompt).toContain('硬性要求 > 本次调整意见 > AI维度方案');
  });

  it('includes every active login requirement in the HTML generation prompt', () => {
    const requirements = [
      'LR1 标题纯文字：标题只能显示中文纯文字。',
      'LR3 禁止渐变：页面禁止任何形式的渐变色。',
      'LR15 密码可见性切换：密码框必须带可点击的小眼睛。',
    ];
    const prompt = buildLoginPrompt({ config: { systemName: '医疗管理系统' }, requirements, instruction: '', referenceHtml: '<!DOCTYPE html><html></html>' });
    requirements.forEach((requirement) => expect(prompt).toContain(requirement));
  });

  it('requires the exact reference primary color when inheritance is selected', () => {
    const prompt = buildLoginPrompt({ config: { systemName: '信贷系统', colorMode: '继承系统主色' }, instruction: '', referenceHtml: '<script>tailwind.config={theme:{extend:{colors:{brand:"#1A3A5C"}}}}</script>' });
    expect(prompt).toContain('必须从参考index.html');
    expect(prompt).toContain('使用完全相同的颜色值');
    expect(prompt).toContain('禁止自行改色或使用通用默认蓝色');
    expect(prompt).toContain('#1A3A5C');
  });

  it('只执行已配置的默认内置要求，不额外校验页面维度', () => {
    const html = '<!DOCTYPE html><html><style>body{background:linear-gradient(#fff,#000)}</style><body><form><input type="password"></form><script>const menuConfig=[]</script></body></html>';
    const result = validateLoginHtml(html, { loginMethod: '账号密码+图形验证码', captchaMode: '随机字母', demoAccount: '不预填' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('禁止使用任何形式的渐变色');
    expect(result.errors).toContain('图形验证码必须动态随机生成');
    expect(result.errors).not.toContain('登录页不得复制首页菜单或iframe结构');
  });

  it('不对预填账号维度执行后台校验', () => {
    const html = '<!DOCTYPE html><html><body><form><input value="admin"><input type="password" value="123456"><button id="passwordEye" type="button"></button></form></body></html>';
    const result = validateLoginHtml(html, { loginMethod: '仅账号密码', demoAccount: 'admin' });
    expect(result.errors).not.toContain('预填账号或统一密码未按配置生成');
  });

  it('AI检查要求只进入提示词，不执行后台校验', () => {
    const result = validateLoginHtml('<div>任意AI生成内容</div>', {}, [{ id: 'LR2', validationType: 'ai' }]);
    expect(result).toEqual({ valid: true, errors: [], warnings: [] });
  });

  it('逐项执行登录页内置要求', () => {
    const html = '<!DOCTYPE html><html><body><h1>供应商系统</h1><form></form></body></html>';
    expect(validateLoginRequirementChecks(html, {}, [
      { id: 'LR1', validationType: 'builtin', builtinValidator: 'login-title' },
      { id: 'LR3', validationType: 'builtin', builtinValidator: 'no-gradient' },
    ])).toEqual([
      { requirementId: 'LR1', passed: true, detail: '内置校验通过' },
      { requirementId: 'LR3', passed: true, detail: '内置校验通过' },
    ]);
  });

  it('accepts a plain Chinese system title in a semantic div', () => {
    const html = '<!DOCTYPE html><html><body><div class="system-title">医疗管理系统</div><form></form></body></html>';
    expect(validateLoginRequirementChecks(html, { systemName: '医疗管理系统' }, [
      { id: 'LR1', validationType: 'builtin', builtinValidator: 'login-title' },
    ])[0]).toEqual({ requirementId: 'LR1', passed: true, detail: '内置校验通过' });
  });

  it('finds a semantic system title inside nested div containers', () => {
    const html = '<!DOCTYPE html><html><body><div class="login-wrapper"><div class="login-card"><div class="login-header"><div class="system-title">医疗管理系统</div><div class="welcome-text">欢迎登录</div></div><form></form></div></div></body></html>';
    expect(validateLoginRequirementChecks(html, { systemName: '医疗管理系统' }, [
      { id: 'LR1', validationType: 'builtin', builtinValidator: 'login-title' },
    ])[0]).toEqual({ requirementId: 'LR1', passed: true, detail: '内置校验通过' });
  });

  it('still rejects icons or English inside the login title', () => {
    const html = '<!DOCTYPE html><html><body><div class="system-title"><span>Logo</span>医疗管理系统</div><form></form></body></html>';
    expect(validateLoginRequirementChecks(html, { systemName: 'Logo医疗管理系统' }, [
      { id: 'LR1', validationType: 'builtin', builtinValidator: 'login-title' },
    ])[0].passed).toBe(false);
  });
});
