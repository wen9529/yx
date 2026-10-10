import React, { useState } from 'react';
import { authService, UserAccount } from '../services/authService';
import { sounds } from '../utils/sound';
import { ShieldCheck, UserCheck, KeyRound, Smartphone, AlertCircle, CheckCircle2, UserPlus, LogIn, Sparkles, X, ShieldAlert } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserAccount) => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login'
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [phone, setPhone] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isAuthorizingCurrentPhone, setIsAuthorizingCurrentPhone] = useState(false);

  if (!isOpen) return null;

  const handleTabChange = (newMode: 'login' | 'register') => {
    sounds.playCardSelect();
    setMode(newMode);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleQuickFill = (accPhone: string, accPass: string) => {
    sounds.playChips();
    setPhone(accPhone);
    setPassword(accPass);
    setErrorMsg(null);
  };

  const handleAuthorizeThisPhone = () => {
    if (!phone.trim()) {
      setErrorMsg('请先输入要授权的手机号');
      return;
    }
    const res = authService.authorizePhone(phone.trim());
    if (res.success) {
      sounds.playChips();
      setSuccessMsg(`✅ 已将手机号 ${phone.trim()} 添加入 Bot 管理员授权白名单！现在可以继续注册。`);
      setErrorMsg(null);
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (mode === 'login') {
      const res = authService.login(phone, password);
      if (res.success && res.user) {
        sounds.playChips();
        setSuccessMsg(res.message);
        setTimeout(() => {
          onSuccess(res.user!);
          onClose();
        }, 500);
      } else {
        sounds.playError();
        setErrorMsg(res.message);
      }
    } else {
      // Register Mode
      // Validation: password must be exactly 6 characters
      if (password.length !== 6) {
        setErrorMsg('密码必须为精准6位字符（不限大小写字母、数字或符号）');
        return;
      }

      const res = authService.register(phone, nickname, password);
      if (res.success && res.user) {
        sounds.playChips();
        setSuccessMsg(res.message);
        setTimeout(() => {
          onSuccess(res.user!);
          onClose();
        }, 800);
      } else {
        sounds.playError();
        setErrorMsg(res.message);
      }
    }
  };

  const isCurrentPhoneAuthorized = phone.trim() ? authService.isPhoneAuthorized(phone.trim()) : false;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-amber-500/40 rounded-2xl max-w-md w-full shadow-2xl relative overflow-hidden flex flex-col">
        {/* Top Gold Accent Bar */}
        <div className="h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 w-full" />

        {/* Modal Header */}
        <div className="p-5 pb-3 flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
              {mode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>{mode === 'login' ? '玩家账号登录' : '新玩家注册'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  安全验证
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                {mode === 'login' ? '凭授权手机号与6位数密码直接进入游戏大厅' : 'Bot管理员授权手机号专享注册通道'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/60 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => handleTabChange('login')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'login'
                ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>玩家登录</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('register')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'register'
                ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>新玩家注册</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* Registration Rules Notice */}
          {mode === 'register' && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs space-y-1.5 text-amber-200/90">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>注册重要规则说明</span>
              </div>
              <ul className="text-[11px] list-disc list-inside space-y-0.5 text-neutral-300 font-sans">
                <li><b className="text-amber-300">Bot管理员授权</b>：必须经 Bot 管理员授权的手机号方可注册</li>
                <li><b className="text-emerald-400">免验证码</b>：无需验证手机号真实性与短信码，直接输入注册</li>
                <li><b className="text-amber-300">昵称与密码</b>：须设置玩家昵称，密码须为<span className="underline decoration-amber-400">精准6位字符</span>（不限大小写字母、数字与符号）</li>
              </ul>
            </div>
          )}

          {/* Phone Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span>手机号</span>
              </span>
              {mode === 'register' && phone.trim() && (
                <span className={`text-[11px] font-mono flex items-center gap-1 ${
                  isCurrentPhoneAuthorized ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {isCurrentPhoneAuthorized ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Bot已授权</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-3 h-3" />
                      <span>未获Bot授权</span>
                    </>
                  )}
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.trim());
                  setErrorMsg(null);
                }}
                placeholder="请输入手机号 (如: 13800138000)"
                required
                className="w-full bg-neutral-950 border border-neutral-700 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none font-mono"
              />
            </div>
            {/* If registering and phone is not authorized, offer one-click test authorization */}
            {mode === 'register' && phone.trim() && !isCurrentPhoneAuthorized && (
              <div className="mt-1 flex items-center justify-between bg-rose-950/40 border border-rose-500/30 rounded-lg p-2 text-xs">
                <span className="text-rose-300 text-[11px]">该号未获授权，可一键添加测试授权</span>
                <button
                  type="button"
                  onClick={handleAuthorizeThisPhone}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded text-[11px] cursor-pointer transition-colors"
                >
                  一键授权此号
                </button>
              </div>
            )}
          </div>

          {/* Nickname Input (Only in Register mode) */}
          {mode === 'register' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>玩家昵称 (2-12字符)</span>
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="如: 雀圣至尊 / 牌坛赌圣"
                required
                maxLength={12}
                className="w-full bg-neutral-950 border border-neutral-700 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none"
              />
            </div>
          )}

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>密码 ({mode === 'register' ? '精准6位数，不限大小写字母字符' : '6位数密码'})</span>
              </span>
              <span className={`text-[10px] font-mono ${password.length === 6 ? 'text-emerald-400' : 'text-neutral-500'}`}>
                {password.length}/6位
              </span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="请输入6位密码 (如: 666666, Abc123, 888888)"
              maxLength={6}
              required
              className="w-full bg-neutral-950 border border-neutral-700 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none font-mono"
            />
          </div>

          {/* Alerts */}
          {errorMsg && (
            <div className="bg-red-950/80 border border-red-500/50 rounded-xl p-3 text-xs text-red-200 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed whitespace-pre-wrap">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-xl p-3 text-xs text-emerald-200 flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{successMsg}</div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 rounded-xl font-black text-sm tracking-wide text-neutral-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4 text-neutral-950" />
                <span>立即登录进入大厅</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 text-neutral-950" />
                <span>确认注册账号并进入大厅</span>
              </>
            )}
          </button>

          {/* Quick Demo Accounts Selection */}
          <div className="pt-2 border-t border-neutral-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span>{mode === 'login' ? '💡 快捷登录体验账号 (点击直接填入):' : '💡 已授权手机号推荐 (点击填入测试注册):'}</span>
            </div>
            {mode === 'login' ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickFill('13800138000', '666666')}
                  className="p-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/40 text-left transition-colors cursor-pointer"
                >
                  <div className="font-bold text-amber-300 text-xs">雀圣至尊</div>
                  <div className="text-[10px] text-neutral-400 font-mono">13800138000 / 666666</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('18888888888', '888888')}
                  className="p-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/40 text-left transition-colors cursor-pointer"
                >
                  <div className="font-bold text-amber-300 text-xs">财神爷 (管理员)</div>
                  <div className="text-[10px] text-neutral-400 font-mono">18888888888 / 888888</div>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setPhone('13666666666');
                    setNickname('跑牌天王');
                    setPassword('111222');
                    setErrorMsg(null);
                  }}
                  className="p-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/40 text-left transition-colors cursor-pointer"
                >
                  <div className="font-bold text-emerald-400 text-xs">已授权号 A</div>
                  <div className="text-[10px] text-neutral-400 font-mono">13666666666 (已授权)</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhone('17700001111');
                    setNickname('十三水霸王');
                    setPassword('654321');
                    setErrorMsg(null);
                  }}
                  className="p-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/40 text-left transition-colors cursor-pointer"
                >
                  <div className="font-bold text-emerald-400 text-xs">已授权号 B</div>
                  <div className="text-[10px] text-neutral-400 font-mono">17700001111 (已授权)</div>
                </button>
              </div>
            )}
          </div>

        </form>
      </div>
    </div>
  );
};
