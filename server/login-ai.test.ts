import { describe, expect, it } from 'vitest';
import { buildLoginPrompt, validateLoginHtml } from './login-ai';

describe('登录页AI生成约束', () => {
  it('提示词明确本次调整意见优先于固定维度', () => {
    const prompt = buildLoginPrompt({ config: { systemName: '供应商系统' }, instruction: '登录框改到右侧', referenceHtml: '<!DOCTYPE html><html></html>', previousHtml: '<!DOCTYPE html><html></html>' });
    expect(prompt).toContain('本次调整意见（优先于固定维度，但不得违反硬性要求）');
    expect(prompt).toContain('登录框改到右侧');
    expect(prompt).toContain('硬性要求 > 本次调整意见 > 固定维度');
  });

  it('拒绝渐变、固定验证码和首页菜单结构', () => {
    const html = '<!DOCTYPE html><html><style>body{background:linear-gradient(#fff,#000)}</style><body><form><input type="password"></form><script>const menuConfig=[]</script></body></html>';
    const result = validateLoginHtml(html, { loginMethod: '账号密码+图形验证码', captchaMode: '随机字母', demoAccount: '不预填' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('禁止使用任何形式的渐变色');
    expect(result.errors).toContain('图形验证码必须动态随机生成');
    expect(result.errors).toContain('登录页不得复制首页菜单或iframe结构');
  });

  it('预填账号时强制使用统一密码', () => {
    const html = '<!DOCTYPE html><html><body><form><input value="admin"><input type="password" value="123456"><button id="passwordEye" type="button"></button></form></body></html>';
    const result = validateLoginHtml(html, { loginMethod: '仅账号密码', demoAccount: 'admin' });
    expect(result.errors).toContain('预填账号或统一密码未按配置生成');
  });
});
