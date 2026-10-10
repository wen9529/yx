import React, { useState, useEffect } from 'react';
import { authService, UserAccount, GiftTransaction } from '../services/authService';
import { sounds } from '../utils/sound';
import { Coins, Search, Gift, ShieldCheck, History, PhoneCall, Plus, Trash2, CheckCircle2, AlertCircle, Sparkles, X, User, ArrowRight, Wallet } from 'lucide-react';

interface PointsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPointsUpdated?: () => void;
}

export const PointsManagementModal: React.FC<PointsManagementModalProps> = ({
  isOpen,
  onClose,
  onPointsUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'gift' | 'history' | 'auth_pool'>('gift');
  
  // Search & Gift State
  const [searchPhone, setSearchPhone] = useState('');
  const [searchedUser, setSearchedUser] = useState<UserAccount | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isPhoneInAuthPool, setIsPhoneInAuthPool] = useState(false);

  // Gift Form State
  const [giftAmount, setGiftAmount] = useState<number>(10000);
  const [giftNote, setGiftNote] = useState('Bot管理员充值赠送');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // History & Authorized Pool State
  const [giftLedger, setGiftLedger] = useState<GiftTransaction[]>([]);
  const [authorizedPhones, setAuthorizedPhones] = useState<string[]>([]);
  const [newAuthPhone, setNewAuthPhone] = useState('');

  // Current logged in user info
  const currentUser = authService.getCurrentUser();

  const refreshData = () => {
    setGiftLedger(authService.getGiftLedger());
    setAuthorizedPhones(authService.getAuthorizedPhones());
    if (searchPhone.trim()) {
      const u = authService.findUserByPhone(searchPhone.trim());
      setSearchedUser(u);
      setIsPhoneInAuthPool(authService.isPhoneAuthorized(searchPhone.trim()));
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
      // If we don't have a search phone, default search the current user or first user for demo convenience
      if (!searchPhone) {
        const defaultPhone = currentUser ? currentUser.phone : '13800138000';
        setSearchPhone(defaultPhone);
        const u = authService.findUserByPhone(defaultPhone);
        setSearchedUser(u);
        setHasSearched(true);
        setIsPhoneInAuthPool(authService.isPhoneAuthorized(defaultPhone));
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Search player handler
  const handleSearch = (phoneToQuery?: string) => {
    const q = (phoneToQuery !== undefined ? phoneToQuery : searchPhone).trim();
    if (!q) {
      setErrorMessage('请输入要搜索的玩家手机号');
      setSearchedUser(null);
      setHasSearched(false);
      return;
    }

    sounds.playCardSelect();
    setErrorMessage(null);
    setSuccessMessage(null);
    setHasSearched(true);

    const user = authService.findUserByPhone(q);
    setSearchedUser(user);
    setIsPhoneInAuthPool(authService.isPhoneAuthorized(q));

    if (!user) {
      if (authService.isPhoneAuthorized(q)) {
        setErrorMessage(`手机号 ${q} 属于已授权号码，但该玩家尚未完成注册。`);
      } else {
        setErrorMessage(`未找到手机号为 ${q} 的玩家账号，且该号尚未获得 Bot 管理员授权。`);
      }
    }
  };

  // Gift points handler
  const handleGiftPoints = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchedUser) {
      setErrorMessage('请先搜索并选择有效的玩家账号');
      return;
    }

    if (giftAmount <= 0) {
      setErrorMessage('赠送积分数量必须大于 0');
      return;
    }

    const res = authService.giftPoints(searchedUser.phone, giftAmount, giftNote);
    if (res.success && res.user) {
      sounds.playChips();
      setSearchedUser(res.user);
      setSuccessMessage(res.message);
      setErrorMessage(null);
      refreshData();
      if (onPointsUpdated) onPointsUpdated();
    } else {
      setErrorMessage(res.message);
    }
  };

  // Add authorized phone handler
  const handleAddAuthorizedPhone = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newAuthPhone.trim();
    if (!clean) return;

    const res = authService.authorizePhone(clean);
    if (res.success) {
      sounds.playChips();
      setSuccessMessage(res.message);
      setErrorMessage(null);
      setNewAuthPhone('');
      refreshData();
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleRevokeAuthPhone = (phone: string) => {
    sounds.playCardSelect();
    const res = authService.revokeAuthorizedPhone(phone);
    if (res.success) {
      setSuccessMessage(res.message);
      refreshData();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-amber-500/50 rounded-2xl max-w-2xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Gold Accent Bar */}
        <div className="h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 w-full shrink-0" />

        {/* Modal Header */}
        <div className="p-5 pb-3 flex items-center justify-between border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center text-amber-400">
                <Coins className="w-5 h-5 animate-pulse" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>积分管理与发放中心</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Bot 管理员后台
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                通过搜索玩家手机号显示昵称，并一键完成充值与积分赠送
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-Tabs */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/70 p-2 gap-2 shrink-0">
          <button
            onClick={() => {
              sounds.playCardSelect();
              setActiveTab('gift');
              setSuccessMessage(null);
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'gift'
                ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>搜索手机号赠送积分</span>
          </button>

          <button
            onClick={() => {
              sounds.playCardSelect();
              setActiveTab('history');
              setSuccessMessage(null);
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>赠送明细流水 ({giftLedger.length})</span>
          </button>

          <button
            onClick={() => {
              sounds.playCardSelect();
              setActiveTab('auth_pool');
              setSuccessMessage(null);
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'auth_pool'
                ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Bot授权手机号池 ({authorizedPhones.length})</span>
          </button>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Feedback Alerts */}
          {successMessage && (
            <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-xl p-3 text-xs text-emerald-200 flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-sans">{successMessage}</div>
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-950/80 border border-red-500/50 rounded-xl p-3 text-xs text-red-200 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-sans">{errorMessage}</div>
            </div>
          )}

          {/* TAB 1: SEARCH PHONE & GIFT POINTS */}
          {activeTab === 'gift' && (
            <div className="space-y-5">

              {/* Search Box */}
              <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-4 space-y-3">
                <label className="text-xs font-bold text-neutral-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-amber-400" />
                    <span>通过手机号搜索玩家</span>
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    支持所有已授权或已注册的手机号查询
                  </span>
                </label>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchPhone}
                      onChange={(e) => setSearchPhone(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearch();
                        }
                      }}
                      placeholder="输入玩家手机号 (如: 13800138000)"
                      className="w-full bg-neutral-900 border border-neutral-700 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSearch()}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs text-neutral-950 bg-amber-500 hover:bg-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md shadow-amber-500/20"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>查询玩家</span>
                  </button>
                </div>

                {/* Quick Quick Player Tags */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-[11px] text-neutral-500">快捷查询:</span>
                  {[
                    { label: '雀圣至尊', phone: '13800138000' },
                    { label: '财神爷', phone: '18888888888' },
                    { label: '地主老财', phone: '13912345678' },
                    { label: '赌神高进', phone: '15888888888' }
                  ].map(p => (
                    <button
                      key={p.phone}
                      type="button"
                      onClick={() => {
                        setSearchPhone(p.phone);
                        handleSearch(p.phone);
                      }}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 hover:border-amber-500/40 transition-colors cursor-pointer font-mono"
                    >
                      {p.label} ({p.phone})
                    </button>
                  ))}
                </div>
              </div>

              {/* Searched Player Display Card (Crucial User Requirement: 显示该玩家昵称) */}
              {searchedUser ? (
                <div className="bg-gradient-to-r from-amber-950/30 via-neutral-900 to-neutral-950 border border-amber-500/40 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
                    <div className="flex items-center gap-3.5">
                      <img
                        src={searchedUser.avatar}
                        alt={searchedUser.nickname}
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-500/60 shadow-lg"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-white">
                            {searchedUser.nickname}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                            {searchedUser.role === 'admin' ? '系统管理员' : '正式玩家'}
                          </span>
                        </div>
                        <div className="text-xs text-neutral-400 font-mono mt-0.5 flex items-center gap-2">
                          <span>手机号: <b className="text-white font-mono">{searchedUser.phone}</b></span>
                          <span>·</span>
                          <span className="text-emerald-400 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Bot已授权认证</span>
                          </span>
                        </div>
                        <div className="text-[10px] text-neutral-500 mt-1">
                          注册时间: {searchedUser.createdAt}
                        </div>
                      </div>
                    </div>

                    {/* Current Points Badge */}
                    <div className="bg-neutral-950/90 border border-amber-700/50 rounded-2xl px-5 py-3 text-right">
                      <div className="text-[11px] text-neutral-400 flex items-center gap-1 justify-end">
                        <Wallet className="w-3.5 h-3.5 text-amber-400" />
                        <span>当前玩家积分余额</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-amber-300 font-mono tracking-tight mt-0.5">
                        {searchedUser.points.toLocaleString()}
                        <span className="text-xs text-amber-400/80 ml-1 font-sans">积分</span>
                      </div>
                    </div>
                  </div>

                  {/* Gift Action Form */}
                  <form onSubmit={handleGiftPoints} className="space-y-4 pt-1">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-neutral-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Gift className="w-3.5 h-3.5 text-amber-400" />
                          <span>赠送积分额度</span>
                        </span>
                        <span className="text-[11px] text-amber-400 font-mono">
                          赠送后预计余额: {(searchedUser.points + (Number(giftAmount) || 0)).toLocaleString()} 积分
                        </span>
                      </label>

                      {/* Quick Chips Preset Buttons */}
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {[
                          { label: '+1,000', val: 1000 },
                          { label: '+5,000', val: 5000 },
                          { label: '+10,000', val: 10000 },
                          { label: '+50,000', val: 50000 },
                          { label: '+100,000', val: 10000 },
                          { label: '+500,000', val: 500000 }
                        ].map((chip, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              sounds.playChips();
                              setGiftAmount(chip.val);
                            }}
                            className={`py-2 px-1 text-xs font-bold font-mono rounded-xl border transition-all cursor-pointer ${
                              giftAmount === chip.val
                                ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-md shadow-amber-500/20'
                                : 'bg-neutral-950/80 hover:bg-neutral-800 border-neutral-800 text-neutral-300 hover:text-white'
                            }`}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="text-[11px] text-neutral-400 block mb-1">自定义积分输入:</label>
                          <input
                            type="number"
                            min={1}
                            step={100}
                            value={giftAmount}
                            onChange={(e) => setGiftAmount(Math.max(1, parseInt(e.target.value) || 0))}
                            placeholder="输入积分数"
                            className="w-full bg-neutral-950 border border-neutral-700 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-neutral-400 block mb-1">赠送事由 / 附言备注:</label>
                          <input
                            type="text"
                            value={giftNote}
                            onChange={(e) => setGiftNote(e.target.value)}
                            placeholder="如: Bot管理员日常福利 / 比赛奖金"
                            className="w-full bg-neutral-950 border border-neutral-700 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-xl font-black text-sm tracking-wide text-neutral-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Gift className="w-4 h-4 text-neutral-950" />
                      <span>确认赠送 {giftAmount.toLocaleString()} 积分给 [{searchedUser.nickname}]</span>
                      <ArrowRight className="w-4 h-4 text-neutral-950" />
                    </button>
                  </form>
                </div>
              ) : hasSearched ? (
                <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-6 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-neutral-900 flex items-center justify-center text-neutral-500">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">未找到已注册玩家</h4>
                    <p className="text-xs text-neutral-400 max-w-md mx-auto">
                      手机号 <span className="font-mono text-amber-400">{searchPhone}</span> 尚未注册。
                      {isPhoneInAuthPool
                        ? '（该手机号已在 Bot 授权白名单中，玩家可直接在左上角「注册」新账号）'
                        : '（该手机号尚未授权，可切换至「Bot授权手机号池」进行一键授权）'}
                    </p>
                  </div>
                  {!isPhoneInAuthPool && searchPhone.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        const res = authService.authorizePhone(searchPhone.trim());
                        if (res.success) {
                          sounds.playChips();
                          setSuccessMessage(res.message);
                          setIsPhoneInAuthPool(true);
                          refreshData();
                        }
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>一键将 {searchPhone} 加入授权白名单</span>
                    </button>
                  )}
                </div>
              ) : null}

            </div>
          )}

          {/* TAB 2: GIFT HISTORY LEDGER */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>最近积分赠送操作审计记录 ({giftLedger.length} 条)</span>
                <span className="font-mono">实时原子入账</span>
              </div>

              {giftLedger.length === 0 ? (
                <div className="text-center py-10 text-neutral-500 text-xs">
                  暂无积分赠送流水记录
                </div>
              ) : (
                <div className="space-y-2">
                  {giftLedger.map((tx) => (
                    <div
                      key={tx.id}
                      className="bg-neutral-950/80 border border-neutral-800/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">
                            {tx.nickname}
                          </span>
                          <span className="font-mono text-neutral-400 text-[11px]">
                            ({tx.phone})
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-sans">
                            {tx.operator}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-400 flex items-center gap-2">
                          <span>备注: {tx.note}</span>
                          <span>·</span>
                          <span className="font-mono text-[10px] text-neutral-500">[{tx.timestamp}]</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-black font-mono text-emerald-400 text-base">
                          +{tx.amount.toLocaleString()} 积分
                        </div>
                        <div className="text-[10px] text-neutral-500 font-mono">
                          变动前 {tx.previousBalance.toLocaleString()} → 结余 {tx.newBalance.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BOT AUTHORIZED PHONES POOL */}
          {activeTab === 'auth_pool' && (
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs space-y-1 text-amber-200">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Bot 管理员授权白名单规则</span>
                </div>
                <p className="text-[11px] text-neutral-300 leading-relaxed font-sans">
                  只有被登记在此列表中的手机号，才具备在游戏大厅左上角注册新账号的权限。新玩家输入手机号注册时，系统将自动核查此授权白名单。
                </p>
              </div>

              {/* Add New Authorized Phone Form */}
              <form onSubmit={handleAddAuthorizedPhone} className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-3.5 space-y-2">
                <label className="text-xs font-bold text-neutral-200 block">
                  授权新手机号 (添加后该手机号可立即注册):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAuthPhone}
                    onChange={(e) => setNewAuthPhone(e.target.value)}
                    placeholder="输入要授权的手机号 (如 13500001234)"
                    className="flex-1 bg-neutral-900 border border-neutral-700 focus:border-amber-500 rounded-xl px-4 py-2 text-xs text-white placeholder-neutral-500 font-mono focus:outline-none"
                    required
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>添加授权</span>
                  </button>
                </div>
              </form>

              {/* Authorized Phones Grid */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-neutral-300 flex items-center justify-between">
                  <span>当前授权手机号池 ({authorizedPhones.length} 个)</span>
                  <span className="text-[10px] text-neutral-500">点击手机号可直接查询</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {authorizedPhones.map((p) => {
                    const user = authService.findUserByPhone(p);
                    return (
                      <div
                        key={p}
                        className="bg-neutral-950 border border-neutral-800/80 hover:border-neutral-700 rounded-xl p-3 flex items-center justify-between transition-colors"
                      >
                        <div
                          className="cursor-pointer"
                          onClick={() => {
                            setSearchPhone(p);
                            setActiveTab('gift');
                            handleSearch(p);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white text-xs">{p}</span>
                            {user ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                                已注册: {user.nickname}
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/30">
                                待注册
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-neutral-500 mt-0.5">
                            {user ? `结余: ${user.points.toLocaleString()} 积分` : '未完成大厅账号注册'}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRevokeAuthPhone(p)}
                          title="取消该手机号授权"
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-neutral-900 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between text-xs text-neutral-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>系统状态: 账本原子级防并发超发 · 实时对账</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold transition-colors cursor-pointer"
          >
            关闭窗口
          </button>
        </div>
      </div>
    </div>
  );
};
