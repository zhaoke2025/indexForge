export type LoginConfig = {
  systemName: string;
  version: string;
  slogan: string;
  layout: '居中' | '偏右';
  backgroundType: '纯色' | '几何图案' | '图片通铺' | '左右分割';
  backgroundImage: string;
  colorMode: '继承系统主色' | '独立品牌色' | '纯黑白灰';
  brandColor: string;
  cardStyle: '跟随系统风格' | '纯白实心' | '毛玻璃' | '半透明' | '深色实心';
  radius: '8px' | '12px' | '16px';
  brandMode: '纯文字标题' | '标题+标语' | '纯文字（无标语）';
  loginMethod: '仅账号密码' | '账号密码+图形验证码' | '账号密码+短信验证码' | '手机验证码（无密码）' | 'Tab切换（多方式）';
  formStyle: '线框风格' | '填充风格' | '底部下划线';
  assist: '无' | '仅记住账号' | '仅忘记密码' | '记住+忘记';
  rememberText: '记住账号' | '记住账号（7天）' | '记住账号（30天）';
  forgotText: '忘记密码' | '忘记密码？请联系管理员' | '忘记密码？联系技术支持';
  registerEntry: '无' | '有入口+注册页面';
  loadingState: '按钮文字变化' | '旋转菊花' | '两者都有';
  errorMode: '弹窗提示' | '输入框下方文字' | '顶部横幅';
  footer: '无' | '仅版权' | '版权+版本号' | '版权+隐私政策+服务协议';
  decoration: '无' | '背景光晕' | '几何形状' | '网格纹理';
  captchaMode: '页面加载时自动生成随机验证码';
  demoAccount: '无' | 'admin' | 'test' | 'demo' | 'usertest' | 'companytest' | 'devtest' | 'autotest';
};

export const defaultLoginConfig: LoginConfig = {
  systemName: '智慧运营后台',
  version: 'V1.0',
  slogan: '统一身份认证入口',
  layout: '居中',
  backgroundType: '几何图案',
  backgroundImage: '',
  colorMode: '继承系统主色',
  brandColor: '#2563EB',
  cardStyle: '跟随系统风格',
  radius: '12px',
  brandMode: '标题+标语',
  loginMethod: '账号密码+图形验证码',
  formStyle: '线框风格',
  assist: '记住+忘记',
  rememberText: '记住账号',
  forgotText: '忘记密码？请联系管理员',
  registerEntry: '无',
  loadingState: '两者都有',
  errorMode: '输入框下方文字',
  footer: '版权+版本号',
  decoration: '背景光晕',
  captchaMode: '页面加载时自动生成随机验证码',
  demoAccount: 'admin',
};
