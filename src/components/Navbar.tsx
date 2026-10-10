import React from 'react';
import { Volume2, VolumeX, Coins, Plus, Server, Layers, Cpu, Code2, Bot } from 'lucide-react';
import { sounds } from '../utils/sound';

interface NavbarProps {
  coins: number;
  onAddCoins: () => void;
  activeTab: 'lobby' | 'table' | 'telegram' | 'architecture' | 'code' | 'deploy';
  setActiveTab: (tab: 'lobby' | 'table' | 'telegram' | 'architecture' | 'code' | 'deploy') => void;
  hasActiveGame: boolean;
  gameTypeTitle?: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  coins,
  onAddCoins,
  activeTab,
  setActiveTab,
  hasActiveGame,
  gameTypeTitle,
  soundEnabled,
  onToggleSound
}) => {
  return (
    <header className="sticky top-0 z-50 bg-neutral-900/95 backdrop-blur border-b border-amber-900/40 text-neutral-100 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-300 p-0.5 shadow-lg shadow-amber-500/20">
            <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center font-black text-amber-400 text-lg">
              🀄
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg tracking-wide bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 bg-clip-text text-transparent">
                Go 棋牌游戏大厅
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                Monolith v1.0
              </span>
            </div>
            <div className="text-[11px] text-neutral-400 hidden sm:block">
              gRPC 跨服务通信 · Redis 状态同步 · 无锁高并发匹配
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('lobby')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'lobby'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>游戏大厅</span>
          </button>

          <button
            onClick={() => setActiveTab('table')}
            disabled={!hasActiveGame}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 relative ${
              activeTab === 'table'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : hasActiveGame
                ? 'text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800/60'
                : 'text-neutral-600 cursor-not-allowed'
            }`}
          >
            <span className="text-base">♠️</span>
            <span>实时牌桌</span>
            {hasActiveGame && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            )}
            {hasActiveGame && gameTypeTitle && (
              <span className="hidden md:inline text-[10px] text-amber-400/80">({gameTypeTitle})</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('telegram')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'telegram'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
            }`}
          >
            <Bot className="w-4 h-4 text-sky-400" />
            <span>TG 管理员</span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'architecture'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span className="hidden sm:inline">高并发与</span>Redis监控
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'code'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Go 源码</span>
          </button>

          <button
            onClick={() => setActiveTab('deploy')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'deploy'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
            }`}
          >
            <Server className="w-4 h-4 text-emerald-400" />
            <span>多端部署</span>
          </button>
        </nav>

        {/* Right Section: Coins, Sound, Server Status */}
        <div className="flex items-center gap-3">
          {/* Real-time Server Ping */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-950/70 border border-neutral-800 text-[11px] text-neutral-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <Server className="w-3 h-3 text-emerald-400" />
            <span>gRPC: <span className="text-emerald-400 font-mono">0.6ms</span></span>
            <span className="text-neutral-600">|</span>
            <span>Redis: <span className="text-amber-400 font-mono">0.2ms</span></span>
          </div>

          {/* User Chips Wallet */}
          <div className="flex items-center gap-1.5 bg-neutral-950/90 border border-amber-700/50 rounded-full px-3 py-1 shadow-inner">
            <Coins className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-xs sm:text-sm font-bold text-amber-300 font-mono tracking-tight">
              {coins.toLocaleString()}
            </span>
            <button
              onClick={() => {
                sounds.playChips();
                onAddCoins();
              }}
              title="补充金币 (+10,000)"
              className="ml-1 w-5 h-5 rounded-full bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 flex items-center justify-center transition-colors text-xs font-bold"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Audio toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? '音效开启' : '音效静音'}
            className="p-2 rounded-lg text-neutral-400 hover:text-amber-300 hover:bg-neutral-800/60 transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-neutral-500" />}
          </button>
        </div>

      </div>
    </header>
  );
};
