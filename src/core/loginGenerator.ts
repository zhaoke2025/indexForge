import type { DimensionConfig } from '../data/defaultDimensions';
import type { LoginConfig } from '../data/defaultLoginConfig';
import type { StylePreset } from '../data/stylePresets';

export type LoginGenerateResult = {
  html: string;
  fileName: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTitle(value: string): string {
  const safeTitle = escapeHtml(value.trim());
  const phrases = [
    '一体化',
    '智能化',
    '数字化',
    '信息化',
    '人工智能',
    '管理',
    '运营',
    '服务',
    '监管',
    '登记',
    '审批',
    '分析',
    '中心',
    '平台',
    '系统',
    '后台',
  ];

  return phrases.reduce((title, phrase) => title.split(phrase).join(`${phrase}<wbr>`), safeTitle);
}

function getDimensionValue(dimensions: DimensionConfig[] | undefined, id: string) {
  const dimension = dimensions?.find((item) => item.id === id && item.enabled);
  return dimension?.value;
}

function isCustomDimensionValue(value: string | boolean | undefined) {
  return typeof value === 'string' && value.startsWith('自定义:');
}

function unwrapCustomDimensionValue(value: string | boolean | undefined) {
  return typeof value === 'string' && isCustomDimensionValue(value) ? value.slice('自定义:'.length).trim() : value;
}

function hexToRgb(hex: string) {
  const normalized = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function isDarkHex(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance < 0.45;
}

function resolvePrimary(config: LoginConfig, preset: StylePreset, dimensions?: DimensionConfig[]) {
  if (config.colorMode === '独立品牌色') return preset.primary;
  if (config.colorMode === '纯黑白灰') return '#111827';
  const dimensionPrimary = getDimensionValue(dimensions, 'primary');
  return typeof dimensionPrimary === 'string' && dimensionPrimary.startsWith('#') ? dimensionPrimary : preset.primary;
}

function isDarkSystem(preset: StylePreset, dimensions?: DimensionConfig[]) {
  const mode = getDimensionValue(dimensions, 'mode');
  if (mode === '深色' || mode === '纯黑极客') return true;
  if (mode === '浅色') return false;
  if (isCustomDimensionValue(mode)) {
    const [pageBg = ''] = String(unwrapCustomDimensionValue(mode)).split(/\s+/);
    if (pageBg.startsWith('#')) return isDarkHex(pageBg);
  }
  return isDarkHex(preset.dark) || isDarkHex(preset.surface);
}

function resolveCardStyle(config: LoginConfig, preset: StylePreset, dimensions?: DimensionConfig[]) {
  if (config.cardStyle !== '跟随系统风格') return config.cardStyle;
  return isDarkSystem(preset, dimensions) ? '毛玻璃' : '纯白实心';
}

function isDarkCard(cardStyle: ReturnType<typeof resolveCardStyle>, preset: StylePreset, dimensions?: DimensionConfig[]) {
  return cardStyle === '深色实心' || (cardStyle === '毛玻璃' && isDarkSystem(preset, dimensions));
}

function inputClass(config: LoginConfig) {
  if (config.formStyle === '填充风格') return 'field field-filled';
  if (config.formStyle === '底部下划线') return 'field field-underline';
  return 'field';
}

function needsPassword(config: LoginConfig) {
  return config.loginMethod !== '手机验证码（无密码）';
}

function needsCaptcha(config: LoginConfig) {
  return config.loginMethod === '账号密码+图形验证码' || config.loginMethod === 'Tab切换（多方式）';
}

function needsSms(config: LoginConfig) {
  return config.loginMethod === '账号密码+短信验证码' || config.loginMethod === '手机验证码（无密码）' || config.loginMethod === 'Tab切换（多方式）';
}

function buildFooter(config: LoginConfig) {
  if (config.footer === '无') return '';
  const copyright = `© 2026 ${escapeHtml(config.systemName)}`;
  if (config.footer === '仅版权') return copyright;
  if (config.footer === '版权+版本号') return `${copyright} · ${escapeHtml(config.version)}`;
  return `${copyright} · 隐私政策 · 服务协议`;
}

function buildBackgroundCss(config: LoginConfig, primary: string, preset: StylePreset) {
  if (config.backgroundType === '左右分割') {
    return `background: linear-gradient(90deg, ${primary} 0%, ${primary} 42%, #f4f7fb 42%, #f4f7fb 100%);`;
  }
  if (config.backgroundType === '图片通铺') {
    if (config.backgroundImage) {
      return `background: #f4f7fb;
      background-image: linear-gradient(rgba(15,23,42,.20), rgba(15,23,42,.20)), url('${config.backgroundImage}');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;`;
    }
    return `background: #f4f7fb;
      /* 如需启用背景图，取消下一行注释并替换图片地址 */
      /* background-image: url('https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1800&q=80'); background-size: cover; background-position: center; */`;
  }
  if (config.backgroundType === '几何图案') {
    return `background:
      linear-gradient(135deg, rgba(255,255,255,.72), rgba(255,255,255,.42)),
      radial-gradient(circle at 18% 18%, ${primary}26 0, transparent 28%),
      radial-gradient(circle at 82% 22%, ${preset.secondary}22 0, transparent 26%),
      linear-gradient(135deg, #f8fafc, #eef2ff);`;
  }
  return `background: #f4f7fb;`;
}

function buildDecoration(config: LoginConfig, primary: string) {
  if (config.decoration === '背景光晕') return '<div class="glow glow-a"></div><div class="glow glow-b"></div>';
  if (config.decoration === '几何形状') return '<div class="shape shape-a"></div><div class="shape shape-b"></div>';
  if (config.decoration === '网格纹理') return '<div class="grid-texture"></div>';
  return '';
}

function buildBrand(config: LoginConfig) {
  const title = `<h1>${formatTitle(config.systemName)}</h1>`;
  if (config.brandMode === '标题+标语' && config.slogan.trim()) {
    return `${title}<p>${escapeHtml(config.slogan)}</p>`;
  }
  return title;
}

export function generateLoginHtml(config: LoginConfig, preset: StylePreset, dimensions?: DimensionConfig[]): LoginGenerateResult {
  const primary = resolvePrimary(config, preset, dimensions);
  const effectiveCardStyle = resolveCardStyle(config, preset, dimensions);
  const cardDark = isDarkCard(effectiveCardStyle, preset, dimensions);
  const cardClass = effectiveCardStyle === '毛玻璃' ? 'login-card glass' : effectiveCardStyle === '半透明' ? 'login-card translucent' : cardDark ? 'login-card dark-card' : 'login-card';
  const accountValue = config.demoAccount === '无' ? '' : config.demoAccount;
  const passwordValue = config.demoAccount === '无' ? '' : '123456';
  const footerText = buildFooter(config);
  const brand = buildBrand(config);
  const formInputClass = inputClass(config);
  const hasRegister = config.registerEntry === '有入口+注册页面';
  const layoutClass = config.layout === '偏右' ? 'login-shell split-layout' : 'login-shell center-layout';
  const showBrandPanel = config.layout === '偏右' || config.backgroundType === '左右分割';

  const tabs = config.loginMethod === 'Tab切换（多方式）'
    ? `<div class="login-tabs">
        <button class="login-tab active" type="button" data-tab="account">账号登录</button>
        <button class="login-tab" type="button" data-tab="phone">手机登录</button>
      </div>`
    : '';

  const accountLabel = config.loginMethod === '手机验证码（无密码）' ? '手机号' : '账号';
  const accountPlaceholder = config.loginMethod === '手机验证码（无密码）' ? '请输入手机号' : '请输入账号';

  const passwordField = needsPassword(config)
    ? `<label class="form-row password-row">
        <span>密码</span>
        <div class="${formInputClass} password-field">
          <input id="passwordInput" type="password" value="${escapeHtml(passwordValue)}" placeholder="请输入密码" autocomplete="current-password" />
          <button class="eye-button" type="button" aria-label="显示密码" id="togglePassword" data-visible="false">
            <svg class="eye-open" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.3 12.9a2 2 0 0 1 0-1.8C3.6 8.6 7 5 12 5s8.4 3.6 9.7 6.1a2 2 0 0 1 0 1.8C20.4 15.4 17 19 12 19s-8.4-3.6-9.7-6.1Z"/><circle cx="12" cy="12" r="3.2"/></svg>
            <svg class="eye-closed" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 10.6a2.8 2.8 0 0 0 3.8 3.8"/><path d="M9.9 5.3A9.8 9.8 0 0 1 12 5c5 0 8.4 3.6 9.7 6.1a2 2 0 0 1 0 1.8 13.7 13.7 0 0 1-2.1 2.9"/><path d="M6.6 6.8a13.4 13.4 0 0 0-4.3 4.3 2 2 0 0 0 0 1.8C3.6 15.4 7 19 12 19c1.4 0 2.7-.3 3.8-.8"/></svg>
          </button>
        </div>
      </label>`
    : '';

  const captchaField = needsCaptcha(config)
    ? `<label class="form-row">
        <span>图形验证码</span>
        <div class="inline-field">
          <div class="${formInputClass}"><input id="captchaInput" placeholder="请输入验证码" /></div>
          <button class="captcha-box" type="button" id="captchaBox" title="点击刷新验证码"></button>
        </div>
      </label>`
    : '';

  const smsField = needsSms(config)
    ? `<label class="form-row">
        <span>短信验证码</span>
        <div class="inline-field">
          <div class="${formInputClass}"><input id="smsInput" placeholder="请输入短信验证码" /></div>
          <button class="ghost-button" type="button" id="sendSms">获取验证码</button>
        </div>
      </label>`
    : '';

  const assist = config.assist !== '无'
    ? `<div class="assist-row">
        ${config.assist.includes('记住') ? `<label><input type="checkbox" /> ${escapeHtml(config.rememberText)}</label>` : '<span></span>'}
        ${config.assist.includes('忘记') ? `<button type="button" class="link-button" id="forgotButton">${escapeHtml(config.forgotText)}</button>` : ''}
      </div>`
    : '';

  const registerLink = hasRegister
    ? `<div class="register-row">还没有账号？<button type="button" class="link-button" id="openRegister">立即注册</button></div>`
    : '';

  const registerModal = hasRegister
    ? `<div class="modal-mask" id="registerModal" aria-hidden="true">
        <div class="register-modal">
          <div class="modal-header">
            <strong>注册账号</strong>
            <button type="button" id="closeRegister">×</button>
          </div>
          <label class="form-row"><span>用户名</span><div class="${formInputClass}"><input placeholder="请输入用户名" /></div></label>
          <label class="form-row"><span>手机号</span><div class="${formInputClass}"><input placeholder="请输入手机号" /></div></label>
          <label class="form-row"><span>验证码</span><div class="${formInputClass}"><input placeholder="请输入验证码" /></div></label>
          <label class="form-row"><span>密码</span><div class="${formInputClass}"><input type="password" placeholder="请输入密码" /></div></label>
          <label class="form-row"><span>确认密码</span><div class="${formInputClass}"><input type="password" placeholder="请再次输入密码" /></div></label>
          <button class="login-button" type="button">提交注册</button>
        </div>
      </div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(config.systemName)} - 登录</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: ${preset.fontStack};
      color: ${cardDark ? '#F8FAFC' : '#0F172A'};
      ${buildBackgroundCss(config, primary, preset)}
    }
    .page {
      position: relative;
      min-height: 100vh;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px;
    }
    .login-shell {
      position: relative;
      z-index: 1;
      width: min(1120px, 100%);
      display: grid;
      gap: 32px;
      align-items: center;
    }
    .center-layout { justify-content: center; }
    .split-layout { grid-template-columns: minmax(0, 1fr) 420px; }
    .brand-panel {
      color: ${showBrandPanel && config.backgroundType === '左右分割' ? '#fff' : '#0F172A'};
      max-width: 520px;
    }
    .brand-panel h1,
    .card-brand h1 {
      margin: 0;
      font-size: 30px;
      line-height: 1.35;
      max-width: 12em;
      overflow-wrap: normal;
      word-break: keep-all;
    }
    .brand-panel h1 { max-width: 14em; }
    .brand-panel p,
    .card-brand p {
      margin: 10px 0 0;
      color: ${showBrandPanel && config.backgroundType === '左右分割' ? 'rgba(255,255,255,.78)' : '#64748B'};
      font-size: 15px;
    }
    .login-card {
      width: 420px;
      max-width: calc(100vw - 48px);
      padding: 32px;
      border-radius: ${config.radius};
      background: #ffffff;
      border: 1px solid rgba(148, 163, 184, 0.24);
      box-shadow: 0 20px 48px rgba(15, 23, 42, 0.16);
    }
    .glass {
      background: ${cardDark
        ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.78), rgba(15, 23, 42, 0.54))'
        : 'linear-gradient(145deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.48))'};
      border-color: ${cardDark ? 'rgba(148, 163, 184, 0.34)' : 'rgba(255, 255, 255, 0.72)'};
      box-shadow: ${cardDark
        ? '0 24px 64px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.12)'
        : '0 24px 64px rgba(15, 23, 42, 0.20), inset 0 1px 0 rgba(255, 255, 255, 0.72)'};
      backdrop-filter: blur(22px) saturate(1.28);
      -webkit-backdrop-filter: blur(22px) saturate(1.28);
    }
    .translucent { background: rgba(255, 255, 255, 0.84); }
    .dark-card {
      background: rgba(15, 23, 42, 0.94);
      border-color: rgba(148, 163, 184, 0.28);
      color: #F8FAFC;
    }
    .card-brand { margin-bottom: 24px; }
    .login-tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 18px;
      padding: 4px;
      border-radius: ${config.radius};
      background: ${cardDark ? 'rgba(255,255,255,.08)' : '#F1F5F9'};
    }
    .login-tab {
      height: 34px;
      border: 0;
      border-radius: calc(${config.radius} - 4px);
      background: transparent;
      color: inherit;
      cursor: pointer;
    }
    .login-tab.active { background: ${primary}; color: #fff; }
    .form-row { display: block; margin-bottom: 16px; }
    .form-row > span {
      display: block;
      margin-bottom: 7px;
      font-size: 13px;
      color: ${cardDark ? '#CBD5E1' : '#475569'};
    }
    .field {
      height: 42px;
      display: flex;
      align-items: center;
      border: 1px solid ${cardDark ? '#334155' : '#CBD5E1'};
      border-radius: ${config.radius};
      background: ${cardDark ? '#0F172A' : '#fff'};
      overflow: hidden;
    }
    .field-filled {
      border-color: transparent;
      background: ${cardDark ? 'rgba(255,255,255,.08)' : '#F1F5F9'};
    }
    .field-underline {
      border-width: 0 0 1px 0;
      border-radius: 0;
      background: transparent;
    }
    .field input {
      width: 100%;
      height: 100%;
      border: 0;
      outline: 0;
      padding: 0 12px;
      color: inherit;
      background: transparent;
      font-size: 14px;
    }
    .inline-field {
      display: grid;
      grid-template-columns: 1fr 116px;
      gap: 10px;
    }
    .eye-button {
      width: 38px;
      height: 38px;
      border: 0;
      background: transparent;
      cursor: pointer;
      color: ${cardDark ? '#CBD5E1' : '#64748B'};
    }
    .eye-button svg {
      width: 18px;
      height: 18px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .eye-button[data-visible="false"] .eye-open,
    .eye-button[data-visible="true"] .eye-closed { display: none; }
    .captcha-box,
    .ghost-button {
      height: 42px;
      border: 1px solid ${cardDark ? '#334155' : '#CBD5E1'};
      border-radius: ${config.radius};
      background: ${cardDark ? '#111827' : '#F8FAFC'};
      color: inherit;
      cursor: pointer;
      font-weight: 600;
      letter-spacing: 1px;
    }
    .assist-row,
    .register-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin: 2px 0 18px;
      font-size: 13px;
      color: ${cardDark ? '#CBD5E1' : '#64748B'};
    }
    .link-button {
      border: 0;
      background: transparent;
      color: ${primary};
      cursor: pointer;
      padding: 0;
      font: inherit;
    }
    .login-button {
      width: 100%;
      height: 44px;
      border: 0;
      border-radius: ${config.radius};
      background: ${primary};
      color: #fff;
      cursor: pointer;
      font-size: 15px;
      font-weight: 700;
    }
    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      margin-right: 8px;
      border: 2px solid rgba(255,255,255,.45);
      border-top-color: #fff;
      border-radius: 999px;
      animation: spin .8s linear infinite;
      vertical-align: -2px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-text,
    .top-error {
      display: none;
      color: #DC2626;
      font-size: 13px;
      margin: -6px 0 14px;
    }
    .top-error {
      margin: 0 0 14px;
      padding: 10px 12px;
      border-radius: ${config.radius};
      background: #FEF2F2;
    }
    .footer {
      margin-top: 20px;
      text-align: center;
      font-size: 12px;
      color: ${cardDark ? '#94A3B8' : '#94A3B8'};
    }
    .glow {
      position: absolute;
      width: 320px;
      height: 320px;
      border-radius: 999px;
      background: ${primary}26;
      filter: blur(40px);
    }
    .glow-a { top: 8%; left: 8%; }
    .glow-b { right: 10%; bottom: 8%; }
    .shape {
      position: absolute;
      border: 1px solid ${primary}33;
      width: 180px;
      height: 180px;
      transform: rotate(18deg);
      border-radius: ${config.radius};
    }
    .shape-a { left: 8%; bottom: 12%; }
    .shape-b { right: 12%; top: 16%; }
    .grid-texture {
      position: absolute;
      inset: 0;
      background-image: linear-gradient(rgba(15,23,42,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.06) 1px, transparent 1px);
      background-size: 32px 32px;
    }
    .modal-mask {
      position: fixed;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(15, 23, 42, .42);
      z-index: 10;
    }
    .modal-mask.open { display: flex; }
    .register-modal {
      width: 420px;
      max-width: calc(100vw - 48px);
      padding: 24px;
      border-radius: ${config.radius};
      background: #fff;
      color: #0F172A;
      box-shadow: 0 24px 60px rgba(15, 23, 42, .22);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .modal-header button {
      border: 0;
      background: transparent;
      font-size: 24px;
      cursor: pointer;
    }
    @media (max-width: 860px) {
      .split-layout { grid-template-columns: 1fr; }
      .brand-panel { display: none; }
      .page { padding: 20px; }
      .login-card { width: 100%; }
    }
  </style>
</head>
<body>
  <main class="page">
    ${buildDecoration(config, primary)}
    <section class="${layoutClass}">
      ${showBrandPanel ? `<div class="brand-panel">${brand}</div>` : ''}
      <form class="${cardClass}" id="loginForm" novalidate>
        <div class="card-brand">${showBrandPanel ? '<h1>用户登录</h1>' : brand}</div>
        ${tabs}
        <div class="top-error" id="topError">账号或密码错误，请重新输入。</div>
        <label class="form-row">
          <span>${accountLabel}</span>
          <div class="${formInputClass}"><input id="accountInput" value="${escapeHtml(accountValue)}" placeholder="${accountPlaceholder}" autocomplete="username" /></div>
        </label>
        ${passwordField}
        ${captchaField}
        ${smsField}
        <div class="error-text" id="errorText">账号、密码或验证码不正确。</div>
        ${assist}
        <button class="login-button" type="submit" id="loginButton">登录</button>
        ${registerLink}
        ${footerText ? `<div class="footer">${footerText}</div>` : ''}
      </form>
    </section>
  </main>
  ${registerModal}
  <script>
    let captchaCode = '';

    function createCaptcha() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      captchaCode = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const captchaBox = document.getElementById('captchaBox');
      if (captchaBox) captchaBox.textContent = captchaCode;
    }

    function showError(message) {
      const mode = '${config.errorMode}';
      const topError = document.getElementById('topError');
      const errorText = document.getElementById('errorText');
      if (topError) topError.style.display = 'none';
      if (errorText) errorText.style.display = 'none';
      if (mode === '弹窗提示') {
        alert(message);
      } else if (mode === '顶部横幅' && topError) {
        topError.textContent = message;
        topError.style.display = 'block';
      } else if (errorText) {
        errorText.textContent = message;
        errorText.style.display = 'block';
      }
    }

    function setLoading(loading) {
      const button = document.getElementById('loginButton');
      if (!button) return;
      button.disabled = loading;
      if (!loading) {
        button.innerHTML = '登录';
        return;
      }
      const state = '${config.loadingState}';
      if (state === '旋转菊花') button.innerHTML = '<span class="spinner"></span>';
      else if (state === '两者都有') button.innerHTML = '<span class="spinner"></span>登录中...';
      else button.textContent = '登录中...';
    }

    document.addEventListener('DOMContentLoaded', () => {
      createCaptcha();

      const captchaBox = document.getElementById('captchaBox');
      if (captchaBox) captchaBox.addEventListener('click', createCaptcha);

      const togglePassword = document.getElementById('togglePassword');
      const passwordInput = document.getElementById('passwordInput');
      if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
          const visible = passwordInput.type === 'password';
          passwordInput.type = visible ? 'text' : 'password';
          togglePassword.dataset.visible = visible ? 'true' : 'false';
          togglePassword.setAttribute('aria-label', visible ? '隐藏密码' : '显示密码');
        });
      }

      const sendSms = document.getElementById('sendSms');
      if (sendSms) sendSms.addEventListener('click', () => { sendSms.textContent = '已发送'; });

      const forgotButton = document.getElementById('forgotButton');
      if (forgotButton) forgotButton.addEventListener('click', () => alert('${escapeHtml(config.forgotText)}'));

      const registerModal = document.getElementById('registerModal');
      const openRegister = document.getElementById('openRegister');
      const closeRegister = document.getElementById('closeRegister');
      if (openRegister && registerModal) openRegister.addEventListener('click', () => registerModal.classList.add('open'));
      if (closeRegister && registerModal) closeRegister.addEventListener('click', () => registerModal.classList.remove('open'));

      document.querySelectorAll('.login-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.login-tab').forEach((item) => item.classList.remove('active'));
          tab.classList.add('active');
        });
      });

      const form = document.getElementById('loginForm');
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const account = document.getElementById('accountInput').value.trim();
        const password = passwordInput ? passwordInput.value : '123456';
        const captchaInput = document.getElementById('captchaInput');
        if (!account) return showError('请输入账号或手机号。');
        if (${needsPassword(config)} && password !== '123456') return showError('密码错误，演示密码为 123456。');
        if (captchaInput && captchaInput.value.trim().toUpperCase() !== captchaCode) {
          createCaptcha();
          return showError('图形验证码不正确。');
        }
        setLoading(true);
        setTimeout(() => {
          setLoading(false);
          alert('登录校验通过，请在正式系统中接入真实接口。');
        }, 800);
      });
    });
  </script>
</body>
</html>`;

  return {
    html,
    fileName: 'login.html',
  };
}
