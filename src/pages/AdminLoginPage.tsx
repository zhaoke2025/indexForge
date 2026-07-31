import { FormEvent, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, LockKeyhole, LogIn, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { api } from '../core/api';

export default function AdminLoginPage({ configured, onLogin }: { configured: boolean; onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await api.login(username, password);
      setError('');
      onLogin();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 p-5 sm:p-8">
    <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full border-[48px] border-blue-100/70" />
    <div className="absolute -bottom-28 -right-20 h-80 w-80 rounded-full border-[56px] border-indigo-100/60" />
    <section className="relative grid w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)] md:grid-cols-[1.08fr_0.92fr]">
      <div className="relative hidden min-h-[520px] overflow-hidden bg-blue-600 p-12 text-white md:flex md:flex-col md:justify-between">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border-[42px] border-white/10" />
        <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full border-[48px] border-white/10" />
        <div className="relative">
          <div className="mb-12 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-sm font-bold text-blue-600 shadow-lg shadow-blue-900/20">IF</div>
            <div><div className="text-lg font-semibold">IndexForge</div><div className="text-sm text-blue-100">AI 页面生成工作台</div></div>
          </div>
          <h1 className="max-w-sm text-3xl font-semibold leading-tight">高效生成专业、可靠的系统页面</h1>
          <p className="mt-4 max-w-sm text-sm leading-7 text-blue-100">集中管理页面维度、硬性要求、母版和生成记录，让每次生成都有据可查。</p>
        </div>
        <div className="relative space-y-3 text-sm text-blue-50">
          <div className="flex items-center gap-2"><CheckCircle2 size={17} />AI 智能生成与持续调整</div>
          <div className="flex items-center gap-2"><ShieldCheck size={17} />后台数据与调用权限保护</div>
        </div>
      </div>
      <form className="flex min-h-[520px] flex-col justify-center p-8 sm:p-12" onSubmit={submit}>
        <div className="mb-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 md:hidden"><Sparkles size={23} /></div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">欢迎回来</h2>
          <p className="mt-2 text-sm text-slate-500">登录 IndexForge 后台管理系统</p>
        </div>
        {!configured && <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-700">服务器尚未配置管理员账号，请先设置 ADMIN_USERNAME 和 ADMIN_PASSWORD。</div>}
        <label className="control-label" htmlFor="adminUsername">用户名</label>
        <div className="relative mb-5">
          <UserRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input autoComplete="username" autoFocus className="text-input h-11 !pl-10" id="adminUsername" onChange={(event) => setUsername(event.target.value)} placeholder="请输入用户名" value={username} />
        </div>
        <label className="control-label" htmlFor="adminPassword">密码</label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input autoComplete="current-password" className="text-input h-11 !pl-10 !pr-10" id="adminPassword" onChange={(event) => setPassword(event.target.value)} placeholder="请输入密码" type={showPassword ? 'text' : 'password'} value={password} />
          <button aria-label={showPassword ? '隐藏密码' : '显示密码'} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" onClick={() => setShowPassword((visible) => !visible)} title={showPassword ? '隐藏密码' : '显示密码'} type="button">
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <button className="primary-button mt-7 h-11 w-full rounded-lg shadow-sm shadow-blue-200" disabled={loading || !configured} type="submit"><LogIn size={16} />{loading ? '登录中…' : '登录后台'}</button>
        <p className="mt-6 text-center text-xs text-slate-400">仅限授权管理员访问</p>
      </form>
    </section>
  </main>;
}
