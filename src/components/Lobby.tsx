import React, { useState, useEffect } from 'react';
import { GameType } from '../types/game';
import { authService, UserAccount } from '../services/authService';
import { sounds } from '../utils/sound';
import { AuthModal } from './AuthModal';
import { PointsManagementModal } from './PointsManagementModal';
import {
  Coins,
  LogIn,
  UserPlus,
  LogOut,
  Sparkles,
  Users,
  Zap,
  ShieldCheck,
  Play,
  Swords,
  X,
  Volume2,
  VolumeX,
  ChevronRight,
  Flame,
  Award
} from 'lucide-react';

interface LobbyProps {
  onStartGame: (gameType: GameType, tier: 'novice' | 'mid' | 'high' | 'master', userName?: string, userAvatar?: string) => void;
  userCoins: number;
  onCoinsChange?: (coins: number) => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onOpenAdminTools?: (tab: 'telegram' | 'architecture' | 'code' | 'deploy') => void;
}

interface GameSectionInfo {
  type: GameType | 'texas' | 'zhajinhua' | 'blackjack' | 'niuniu';
  playableType: GameType;
  title: string;
  subtitle: string;
  category: 'poker' | 'fast' | 'mahjong' | 'casino';
  tag: string;
  tagColor: string;
  playersText: string;
  pace: string;
  multiplierText: string;
  desc: string;
  features: string[];
  icon: string;
  bannerGradient: string;
}

const GAME_SECTIONS: GameSectionInfo[] = [
  {
    type: 'doudizhu',
    playableType: 'doudizhu',
    title: '斗地主',
    subtitle: 'CLASSIC LANDLORD',
    category: 'poker',
    tag: '人气王',
    tagColor: 'from-amber-500 to-yellow-600',
    playersText: '3 人对决',
    pace: '快节奏',
    multiplierText: '最高 1024 倍',
    desc: '叫分抢地主、二打一协作对决。炸弹王炸倍数连环翻滚，春天反春一战封神！',
    features: ['王炸/炸弹连环翻倍', '叫地主 1/2/3 分机制', '春天判定 ×2 倍', '防守农民配合反制'],
    icon: '👑',
    bannerGradient: 'from-amber-900/60 via-neutral-900 to-neutral-950'
  },
  {
    type: 'paodekuai',
    playableType: 'paodekuai',
    title: '跑得快',
    subtitle: 'RUN FAST (16 CARDS)',
    category: 'fast',
    tag: '极速出牌',
    tagColor: 'from-rose-500 to-orange-600',
    playersText: '3 人极速',
    pace: '超快节奏',
    multiplierText: '最高 256 倍',
    desc: '16张经典玩法，黑桃3首发！有牌必出绝不保留，下家报单上家必须顶大牌！',
    features: ['黑桃3优先引牌', '有牌必打无权过牌', '下家报单一律顶大', '剩余牌张直接算分'],
    icon: '⚡',
    bannerGradient: 'from-rose-900/60 via-neutral-900 to-neutral-950'
  },
  {
    type: 'bigtwo',
    playableType: 'bigtwo',
    title: '锄大地',
    subtitle: 'BIG TWO / DA DI',
    category: 'poker',
    tag: '经典粤港',
    tagColor: 'from-emerald-500 to-teal-600',
    playersText: '4 人争霸',
    pace: '策略博弈',
    multiplierText: '最高 512 倍',
    desc: '方块3天命首出！黑桃>红桃>梅花>方块，2为顶天！双炒、三炒、未出牌包赔！',
    features: ['方块3绝对优先首发', '花色严格压制 (黑>红>梅>方)', '双炒/三炒多倍惩罚', '同花顺/铁支大杀'],
    icon: '♠️',
    bannerGradient: 'from-emerald-900/60 via-neutral-900 to-neutral-950'
  },
  {
    type: 'thirteen',
    playableType: 'thirteen',
    title: '十三水',
    subtitle: 'CHINESE POKER 13',
    category: 'poker',
    tag: '智谋摆牌',
    tagColor: 'from-purple-500 to-indigo-600',
    playersText: '4 人对局',
    pace: '高博弈',
    multiplierText: '最高 1080 水',
    desc: '13张手牌排兵布阵！头道3张/中道5张/尾道5张，严防倒水，争夺打枪与全垒打！',
    features: ['尾道≥中道≥头道排阵', '智能推荐理牌辅助', '特殊牌型一条龙(108水)', '打枪双倍/全垒打四倍'],
    icon: '💎',
    bannerGradient: 'from-purple-900/60 via-neutral-900 to-neutral-950'
  },
  {
    type: 'mahjong',
    playableType: 'mahjong',
    title: '四川血战麻将',
    subtitle: 'BLOODY MAHJONG 108',
    category: 'mahjong',
    tag: '血战到底',
    tagColor: 'from-cyan-500 to-blue-600',
    playersText: '4 人血战',
    pace: '连胡不休',
    multiplierText: '最高 64 番',
    desc: '纯筒条万108张！定缺门、刮风下雨碰杠齐发。一家胡牌局不散，血战到底决出胜负！',
    features: ['必须打尽定缺一门', '碰/直杠/暗杠刮风下雨', '一家胡牌继续打到底', '清一色/七对高番大牌'],
    icon: '🀄',
    bannerGradient: 'from-cyan-900/60 via-neutral-900 to-neutral-950'
  },
  {
    type: 'texas',
    playableType: 'doudizhu', // Maps to standard card simulation
    title: '德州扑克',
    subtitle: 'TEXAS HOLDEM',
    category: 'casino',
    tag: '巅峰博弈',
    tagColor: 'from-amber-600 to-red-600',
    playersText: '6-9 人桌',
    pace: '心战博弈',
    multiplierText: '全下 All-In',
    desc: '两张底牌与五张公共牌的最佳五张组合！翻牌前跟注、转牌加注、河牌All-In对决！',
    features: ['无限注 No Limit 规则', '底池赔率深层计算', '公共牌翻转推演', '诈唬与跟注心理战'],
    icon: '🃏',
    bannerGradient: 'from-yellow-900/60 via-neutral-900 to-neutral-950'
  },
  {
    type: 'zhajinhua',
    playableType: 'paodekuai',
    title: '炸金花',
    subtitle: 'GOLDEN FLOWER',
    category: 'casino',
    tag: '豪客对战',
    tagColor: 'from-red-500 to-rose-700',
    playersText: '5 人对决',
    pace: '极速刺激',
    multiplierText: '最高 500 倍',
    desc: '三张牌比大小！豹子、同花顺、金花、顺子、对子、单张。闷牌看牌，胜者为王！',
    features: ['看牌下注与闷牌翻倍', '喜钱豹子大奖', '比牌双倍下注', '一掷千金刺激博弈'],
    icon: '💰',
    bannerGradient: 'from-red-900/60 via-neutral-900 to-neutral-950'
  },
  {
    type: 'blackjack',
    playableType: 'bigtwo',
    title: '21点黑杰克',
    subtitle: 'BLACKJACK 21',
    category: 'casino',
    tag: '经典庄闲',
    tagColor: 'from-indigo-500 to-blue-700',
    playersText: '1-7 人桌',
    pace: '策略深算',
    multiplierText: 'BJ 3:2 赔率',
    desc: '点数逼近21点且不爆牌！要牌、停牌、双倍下注、分牌投降，精准概率算牌致胜！',
    features: ['天然 BlackJack 1.5倍', '双倍下注 Double Down', '分牌与买保险机制', '庄家17点必须停牌'],
    icon: '🎲',
    bannerGradient: 'from-indigo-900/60 via-neutral-900 to-neutral-950'
  },
  {
    type: 'niuniu',
    playableType: 'thirteen',
    title: '经典抢庄牛牛',
    subtitle: 'NIU NIU BULL',
    category: 'casino',
    tag: '百人抢庄',
    tagColor: 'from-violet-500 to-fuchsia-700',
    playersText: '4-8 人桌',
    pace: '快节奏',
    multiplierText: '最高 5 倍',
    desc: '五张牌三张凑十，余两张看点数！牛牛、五花牛、四炸、五小牛，闲家推注抢庄翻倍！',
    features: ['自由抢庄倍数机制', '下注倍数自主推注', '牛牛 3倍 / 五花牛 4倍', '秒级开牌清算对账'],
    icon: '🐂',
    bannerGradient: 'from-fuchsia-900/60 via-neutral-900 to-neutral-950'
  }
];

const ROOM_TIERS = [
  { id: 'novice', name: '新手初探', base: 100, minCoin: 1000, desc: '底分 100 · 适合新手练习与热身' },
  { id: 'mid', name: '进阶博弈', base: 500, minCoin: 5000, desc: '底分 500 · 主流活跃竞技场次' },
  { id: 'high', name: '高手对决', base: 2000, minCoin: 20000, desc: '底分 2000 · 技压群雄风云擂台' },
  { id: 'master', name: '宗师巅峰', base: 10000, minCoin: 100000, desc: '底分 10000 · 豪客专区一掷千金' }
] as const;

export const Lobby: React.FC<LobbyProps> = ({
  onStartGame,
  userCoins,
  onCoinsChange,
  soundEnabled = true,
  onToggleSound,
  onOpenAdminTools
}) => {
  // Current user state
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(authService.getCurrentUser());

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isPointsModalOpen, setIsPointsModalOpen] = useState(false);

  // Selected game & tier dialog
  const [selectedGameForRoom, setSelectedGameForRoom] = useState<GameSectionInfo | null>(null);
  const [selectedTier, setSelectedTier] = useState<'novice' | 'mid' | 'high' | 'master'>('novice');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'poker' | 'fast' | 'mahjong' | 'casino'>('all');

  // Matchmaking animation state
  const [isMatching, setIsMatching] = useState(false);

  // Sync auth state
  useEffect(() => {
    const unsub = authService.subscribe(() => {
      const u = authService.getCurrentUser();
      setCurrentUser(u ? { ...u } : null);
      if (u && onCoinsChange) {
        onCoinsChange(u.points);
      }
    });
    return unsub;
  }, [onCoinsChange]);

  const handleOpenAuth = (mode: 'login' | 'register') => {
    sounds.playCardSelect();
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleOpenPoints = () => {
    sounds.playChips();
    setIsPointsModalOpen(true);
  };

  const handleLogout = () => {
    sounds.playCardSelect();
    authService.logout();
    setCurrentUser(null);
  };

  const handleCardClick = (game: GameSectionInfo) => {
    sounds.playCardSelect();
    setSelectedGameForRoom(game);
  };

  const handleConfirmStartGame = () => {
    if (!selectedGameForRoom) return;
    sounds.playChips();
    setIsMatching(true);

    setTimeout(() => {
      setIsMatching(false);
      const chosenTier = selectedTier;
      const gameToStart = selectedGameForRoom.playableType;
      const uName = currentUser ? currentUser.nickname : undefined;
      const uAvatar = currentUser ? currentUser.avatar : undefined;

      setSelectedGameForRoom(null);
      onStartGame(gameToStart, chosenTier, uName, uAvatar);
    }, 700);
  };

  // Filtered games
  const filteredGames = GAME_SECTIONS.filter(g => {
    if (categoryFilter === 'all') return true;
    return g.category === categoryFilter;
  });

  const activeCoins = currentUser ? currentUser.points : userCoins;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans select-none">
      
      {/* =========================================================================
          TOP BAR (严格按照要求: 左上角是注册登录，右上角积分管理，其他都不显示)
          ========================================================================= */}
      <header className="sticky top-0 z-40 bg-neutral-900/95 backdrop-blur-md border-b border-amber-900/40 shadow-2xl px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">

          {/* 左上角：注册登录 (未登录显示登录/注册按钮，已登录显示玩家昵称/头像/手机号/退出) */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              // 已登录状态
              <div className="flex items-center gap-2.5 bg-neutral-950/80 border border-amber-500/40 rounded-2xl p-1.5 pr-3 shadow-lg">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.nickname}
                  className="w-10 h-10 rounded-xl object-cover border border-amber-400/60 shadow"
                />
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm text-white tracking-wide">
                      {currentUser.nickname}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                      {currentUser.role === 'admin' ? '管理员' : '玩家'}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 font-mono flex items-center gap-1.5">
                    <span>{currentUser.phone}</span>
                    <span className="text-neutral-600">|</span>
                    <span className="text-amber-300 font-bold">🪙 {currentUser.points.toLocaleString()}</span>
                  </div>
                </div>

                {/* 切换/退出登录按钮 */}
                <div className="flex items-center gap-1 ml-1 pl-2 border-l border-neutral-800">
                  <button
                    onClick={() => handleOpenAuth('login')}
                    title="切换账号"
                    className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-amber-300 text-xs transition-colors cursor-pointer"
                  >
                    切换
                  </button>
                  <button
                    onClick={handleLogout}
                    title="退出登录"
                    className="p-1.5 rounded-lg bg-neutral-900 hover:bg-rose-950/60 text-neutral-400 hover:text-rose-400 text-xs transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              // 未登录状态：左上角注册登录
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenAuth('login')}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 hover:border-amber-500/50 transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-amber-400" />
                  <span>登录</span>
                </button>
                <button
                  onClick={() => handleOpenAuth('register')}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-neutral-950" />
                  <span>新用户注册</span>
                </button>
              </div>
            )}
          </div>

          {/* 中间简洁大厅标题 */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xl">🀄</span>
            <span className="font-black text-lg bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 bg-clip-text text-transparent tracking-wider">
              Go 棋牌游戏大厅
            </span>
          </div>

          {/* 右上角：积分管理 */}
          <div className="flex items-center gap-2.5">
            {/* 音效切换 (安静小按钮) */}
            {onToggleSound && (
              <button
                onClick={onToggleSound}
                className="w-9 h-9 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title={soundEnabled ? '静音' : '开启音效'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-neutral-500" />}
              </button>
            )}

            {/* 积分管理按钮 (核心功能) */}
            <button
              onClick={handleOpenPoints}
              className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-black text-xs sm:text-sm text-neutral-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-xl shadow-amber-500/25 transition-all flex items-center gap-2 cursor-pointer border border-amber-300/40 group active:scale-95"
            >
              <Coins className="w-4 h-4 text-neutral-950 group-hover:rotate-12 transition-transform animate-pulse" />
              <span>积分管理</span>
              <span className="hidden sm:inline-block bg-neutral-950/20 px-2 py-0.5 rounded-lg text-xs font-mono">
                {activeCoins.toLocaleString()}
              </span>
            </button>
          </div>

        </div>
      </header>

      {/* =========================================================================
          MAIN: 下面是各个游戏板块 (其他的都不要显示)
          ========================================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">

        {/* 游戏品类快速分类过滤 (精简优雅) */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-neutral-900">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-5 bg-gradient-to-b from-amber-400 to-yellow-600 rounded-full" />
            <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
              全部游戏板块
            </h2>
            <span className="text-xs text-neutral-500 font-mono">
              ({filteredGames.length} 款热门棋牌)
            </span>
          </div>

          {/* 分类筛选按钮 */}
          <div className="flex items-center gap-1.5 bg-neutral-900/80 p-1 rounded-xl border border-neutral-800 text-xs">
            {[
              { id: 'all', label: '🔥 全部板块' },
              { id: 'poker', label: '♠️ 经典扑克' },
              { id: 'fast', label: '⚡ 极速跑牌' },
              { id: 'mahjong', label: '🀄 麻将竞技' },
              { id: 'casino', label: '💎 豪华桌游' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  sounds.playCardSelect();
                  setCategoryFilter(cat.id as any);
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  categoryFilter === cat.id
                    ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* 各个游戏板块卡片网格 (核心展示) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGames.map((game) => (
            <div
              key={game.type}
              onClick={() => handleCardClick(game)}
              className="group relative rounded-2xl bg-neutral-900/90 border border-neutral-800 hover:border-amber-500/60 transition-all duration-300 p-5 shadow-xl hover:shadow-2xl hover:shadow-amber-500/10 cursor-pointer flex flex-col justify-between overflow-hidden"
            >
              {/* Card Background Glow */}
              <div className={`absolute inset-0 bg-gradient-to-b ${game.bannerGradient} opacity-30 group-hover:opacity-50 transition-opacity pointer-events-none`} />

              {/* Card Top: Icon & Tags */}
              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-4xl filter drop-shadow-md group-hover:scale-110 transition-transform">
                    {game.icon}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white bg-gradient-to-r ${game.tagColor} shadow`}>
                      {game.tag}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                      {game.pace}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-black text-white group-hover:text-amber-300 transition-colors flex items-center gap-2">
                    <span>{game.title}</span>
                  </h3>
                  <div className="text-[10px] text-neutral-500 font-mono tracking-wider">
                    {game.subtitle} · {game.playersText}
                  </div>
                </div>

                <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2">
                  {game.desc}
                </p>

                {/* Features Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {game.features.slice(0, 3).map((feat, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-950/80 border border-neutral-800 text-neutral-300"
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Bottom: Multiplier & Action Button */}
              <div className="relative z-10 pt-4 mt-4 border-t border-neutral-800/80 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-neutral-500">封顶倍数</div>
                  <div className="text-xs font-bold text-amber-400 font-mono">
                    {game.multiplierText}
                  </div>
                </div>

                <button
                  type="button"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-800 group-hover:bg-gradient-to-r group-hover:from-amber-400 group-hover:to-yellow-500 text-neutral-300 group-hover:text-neutral-950 transition-all flex items-center gap-1 shadow group-hover:shadow-amber-500/20"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>立即开局</span>
                </button>
              </div>
            </div>
          ))}
        </div>

      </main>

      {/* =========================================================================
          ROOM TIER SELECTOR & MATCH DIALOG
          ========================================================================= */}
      {selectedGameForRoom && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-amber-500/50 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden relative flex flex-col">
            <div className="h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 w-full" />

            {/* Dialog Header */}
            <div className="p-5 pb-3 flex items-center justify-between border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedGameForRoom.icon}</span>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span>{selectedGameForRoom.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                      {selectedGameForRoom.playersText}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400">{selectedGameForRoom.desc}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedGameForRoom(null)}
                className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tiers List */}
            <div className="p-5 space-y-4">
              <div className="text-xs font-bold text-neutral-300 flex items-center justify-between">
                <span>选择对局场次与底分:</span>
                <span className="text-amber-400 font-mono text-[11px]">
                  可用积分: {activeCoins.toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ROOM_TIERS.map(tier => {
                  const isSelected = selectedTier === tier.id;
                  const hasEnough = activeCoins >= tier.minCoin;
                  return (
                    <div
                      key={tier.id}
                      onClick={() => {
                        if (hasEnough) {
                          sounds.playCardSelect();
                          setSelectedTier(tier.id);
                        }
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg shadow-amber-500/10'
                          : hasEnough
                          ? 'bg-neutral-950/80 hover:bg-neutral-800 border-neutral-800 text-neutral-300'
                          : 'bg-neutral-950/40 border-neutral-900 text-neutral-600 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-sm text-white">{tier.name}</span>
                        <span className="text-xs font-mono font-bold text-amber-400">底分 {tier.base}</span>
                      </div>
                      <div className="text-[11px] text-neutral-400 mb-1.5">{tier.desc}</div>
                      <div className="text-[10px] text-neutral-500 font-mono">
                        准入: ≥ {tier.minCoin.toLocaleString()} 积分
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleConfirmStartGame}
                disabled={isMatching || activeCoins < ROOM_TIERS.find(t => t.id === selectedTier)!.minCoin}
                className="w-full py-3.5 rounded-xl font-black text-sm tracking-wide text-neutral-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMatching ? (
                  <>
                    <Zap className="w-4 h-4 animate-spin text-neutral-950" />
                    <span>正在急速撮合组桌中...</span>
                  </>
                ) : (
                  <>
                    <Swords className="w-4 h-4 text-neutral-950" />
                    <span>进入 {selectedGameForRoom.title} · {ROOM_TIERS.find(t => t.id === selectedTier)!.name}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          REGISTER / LOGIN MODAL
          ========================================================================= */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onSuccess={(user) => {
          setCurrentUser(user);
          if (onCoinsChange) onCoinsChange(user.points);
        }}
      />

      {/* =========================================================================
          POINTS MANAGEMENT MODAL
          ========================================================================= */}
      <PointsManagementModal
        isOpen={isPointsModalOpen}
        onClose={() => setIsPointsModalOpen(false)}
        onPointsUpdated={() => {
          const u = authService.getCurrentUser();
          if (u) {
            setCurrentUser({ ...u });
            if (onCoinsChange) onCoinsChange(u.points);
          }
        }}
      />

    </div>
  );
};
