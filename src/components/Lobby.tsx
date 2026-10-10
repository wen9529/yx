import React, { useState } from 'react';
import { GameType } from '../types/game';
import { Sparkles, Trophy, Users, Zap, ShieldCheck, Flame, ArrowRight, Play, Swords, MessageSquare, Send, Smile, ChevronDown, ChevronUp } from 'lucide-react';
import { sounds } from '../utils/sound';

interface LobbyProps {
  onStartGame: (gameType: GameType, tier: 'novice' | 'mid' | 'high' | 'master') => void;
  userCoins: number;
}

interface GameCardInfo {
  type: GameType;
  title: string;
  subtitle: string;
  tag: string;
  tagColor: string;
  playersText: string;
  pace: string;
  multiplierText: string;
  desc: string;
  features: string[];
  gradient: string;
  icon: string;
}

const GAMES: GameCardInfo[] = [
  {
    type: 'doudizhu',
    title: '斗地主',
    subtitle: 'CLASSIC LANDLORD',
    tag: '人气王',
    tagColor: 'from-amber-500 to-yellow-600',
    playersText: '3 人对决',
    pace: '快节奏',
    multiplierText: '最高 1024 倍',
    desc: '叫分抢地主、二打一协作对决。炸弹王炸倍数翻滚，春天反春一战封神！',
    features: ['王炸/炸弹连环翻倍', '叫地主 1/2/3 分机制', '春天判定 ×2 倍', '防守农民配合反制'],
    gradient: 'from-amber-950/80 via-neutral-900 to-amber-900/40',
    icon: '👑'
  },
  {
    type: 'bigtwo',
    title: '锄大地',
    subtitle: 'BIG TWO / DA DI',
    tag: '经典粤港',
    tagColor: 'from-emerald-500 to-teal-600',
    playersText: '4 人争霸',
    pace: '策略深沉',
    multiplierText: '最高 512 倍',
    desc: '方块3天命首出！黑桃>红桃>梅花>方块，2为顶天！双炒、三炒、未出牌包赔！',
    features: ['方块3绝对优先首发', '花色严格压制 (黑>红>梅>方)', '双炒/三炒多倍惩罚', '铁支/同花顺五张大杀'],
    gradient: 'from-emerald-950/80 via-neutral-900 to-teal-900/40',
    icon: '♠️'
  },
  {
    type: 'paodekuai',
    title: '跑得快',
    subtitle: 'RUN FAST (16 CARDS)',
    tag: '极速出牌',
    tagColor: 'from-rose-500 to-orange-600',
    playersText: '3 人极速',
    pace: '超快节奏',
    multiplierText: '最高 256 倍',
    desc: '16张经典玩法，黑桃3首发！有牌必出绝不保留，下家报单上家必须顶大牌！',
    features: ['黑桃3优先引牌', '有牌必打无权过牌', '下家报单一律顶大', '剩余牌张直接算分'],
    gradient: 'from-rose-950/80 via-neutral-900 to-red-900/40',
    icon: '⚡'
  },
  {
    type: 'thirteen',
    title: '十三水',
    subtitle: 'CHINESE POKER 13',
    tag: '智谋摆牌',
    tagColor: 'from-purple-500 to-indigo-600',
    playersText: '4 人对局',
    pace: '高博弈',
    multiplierText: '最高 1080 水',
    desc: '13张手牌排兵布阵！头道3张/中道5张/尾道5张，严防倒水，争夺打枪与全垒打！',
    features: ['尾道≥中道≥头道排阵', '智能推荐理牌辅助', '特殊牌型一条龙(108水)', '打枪双倍/全垒打四倍'],
    gradient: 'from-purple-950/80 via-neutral-900 to-indigo-900/40',
    icon: '💎'
  },
  {
    type: 'mahjong',
    title: '四川血战麻将',
    subtitle: 'BLOODY MAHJONG 108',
    tag: '血战到底',
    tagColor: 'from-cyan-500 to-blue-600',
    playersText: '4 人血战',
    pace: '连胡不休',
    multiplierText: '最高 64 番',
    desc: '纯筒条万108张！定缺门、刮风下雨碰杠齐发。一家胡牌局不散，血战到底决出胜负！',
    features: ['必须打尽定缺一门', '碰/直杠/暗杠刮风下雨', '一家胡牌继续打到底', '清一色/七对高番大牌'],
    gradient: 'from-cyan-950/80 via-neutral-900 to-blue-900/40',
    icon: '🀄'
  }
];

const TIERS = [
  { id: 'novice', name: '新手初探', base: 100, minCoin: 1000, desc: '底分 100 · 适合热身与熟悉规则' },
  { id: 'mid', name: '进阶博弈', base: 500, minCoin: 5000, desc: '底分 500 · 智勇双全主流场次' },
  { id: 'high', name: '高手对决', base: 2000, minCoin: 20000, desc: '底分 2000 · 技压群雄风云擂台' },
  { id: 'master', name: '宗师巅峰', base: 10000, minCoin: 100000, desc: '底分 10000 · 豪客专区一掷千金' }
] as const;

export const Lobby: React.FC<LobbyProps> = ({ onStartGame, userCoins }) => {
  const [selectedGame, setSelectedGame] = useState<GameType>('doudizhu');
  const [selectedTier, setSelectedTier] = useState<'novice' | 'mid' | 'high' | 'master'>('novice');
  const [matchingStatus, setMatchingStatus] = useState<null | {
    step: number;
    text: string;
    elapsed: number;
  }>(null);

  // Lobby World Chat State
  const [lobbyChatOpen, setLobbyChatOpen] = useState(true);
  const [lobbyInput, setLobbyInput] = useState('');
  const [lobbyMessages, setLobbyMessages] = useState<Array<{ sender: string; text: string; time: string; isMe?: boolean }>>([
    { sender: '大厅系统', text: '欢迎进入 Go 棋牌大厅！支持锄大地、跑得快、斗地主、十三水、麻将五大经典玩法。', time: '刚刚' },
    { sender: '澳门牌王_辉哥', text: '十三水刚摆出一副五同，直接收了全桌各12水，舒服！', time: '1分钟前' },
    { sender: '地主克星_小刘', text: '锄大地高手场来人，方块3先出，防双炒！', time: '刚刚' }
  ]);

  const handleSendLobbyMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = lobbyInput.trim();
    if (!trimmed) return;
    sounds.playCardSelect();
    const now = new Date().toLocaleTimeString();
    setLobbyMessages(prev => [...prev, { sender: '我 (玩家)', text: trimmed, time: now, isMe: true }]);
    setLobbyInput('');

    // Simulate community response
    setTimeout(() => {
      const replies = [
        "好牌友，加个好友下把一起打！",
        "今天手气旺，赶紧去高手场试试！",
        "跑得快有牌必出才是精髓啊！",
        "麻将清一色碰杠直接起飞！"
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      setLobbyMessages(prev => [...prev, {
        sender: '在线牌友_' + Math.floor(100 + Math.random() * 900),
        text: randomReply,
        time: new Date().toLocaleTimeString()
      }]);
    }, 1500);
  };

  const activeGameInfo = GAMES.find(g => g.type === selectedGame)!;
  const currentTierInfo = TIERS.find(t => t.id === selectedTier)!;

  const handleStartMatchmaking = () => {
    sounds.playChips();
    setMatchingStatus({ step: 1, text: '连接 gRPC 匹配中心并提交 JoinQueueRequest...', elapsed: 0 });

    const interval = setInterval(() => {
      setMatchingStatus(prev => prev ? { ...prev, elapsed: prev.elapsed + 1 } : null);
    }, 500);

    // Step 2: Redis ZSet sorting & node assign
    setTimeout(() => {
      setMatchingStatus(prev => prev ? { ...prev, step: 2, text: 'Redis ZSet 队列排序完成，分配游戏房间节点 node-shanghai-03...' } : null);
    }, 600);

    // Step 3: Peer pairing
    setTimeout(() => {
      setMatchingStatus(prev => prev ? { ...prev, step: 3, text: '匹配对局选手成功！正在同步牌局分布式内存状态...' } : null);
    }, 1200);

    // Complete match & enter table
    setTimeout(() => {
      clearInterval(interval);
      setMatchingStatus(null);
      onStartGame(selectedGame, selectedTier);
    }, 1800);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">

      {/* Marquee Ticker */}
      <div className="bg-neutral-900/80 border border-amber-900/40 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-neutral-300 shadow-md">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="flex items-center gap-1 text-amber-400 font-bold shrink-0">
            <Flame className="w-4 h-4 text-amber-500 animate-bounce" />
            <span>实时快讯:</span>
          </span>
          <div className="whitespace-nowrap animate-[marquee_20s_linear_infinite] flex items-center gap-8 text-neutral-300">
            <span>🎉 恭喜玩家 [龙腾四海] 在 <b>斗地主·宗师场</b> 连出双王火箭与春天，独揽 <b>+320,000</b> 金币！</span>
            <span>💎 玩家 [雀神十三香] 在 <b>十三水·高手场</b> 摆出【一条龙】特殊牌型，豪取 <b>108水</b> 结算！</span>
            <span>⚡ <b>跑得快·进阶场</b> 极速匹配队列平均延迟仅 <b>1.2ms</b>，全服在线牌桌超 850 桌！</span>
            <span>🀄 玩家 [蜀道难] 在 <b>四川麻将</b> 刮风下雨连续自摸清一色，达成 4 连胜！</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-neutral-400 text-[11px] shrink-0 ml-4">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>高并发队列就绪 · 64 Workers</span>
        </div>
      </div>

      {/* Hero Architecture Header */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-neutral-950 via-neutral-900 to-amber-950/40 border border-amber-500/20 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Go语言微内核架构 · 单体高性能全栈方案</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            五大经典棋牌竞技场 <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 bg-clip-text text-transparent">
              微秒级实时对决与分布式结算系统
            </span>
          </h1>
          <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed">
            内置完整的锄大地、跑得快、斗地主、十三水及四川血战麻将游戏引擎。采用 gRPC 处理内部各游戏模块通信，Redis 结合 Lua 脚本实现内存状态秒级同步，无锁 Channel 协程池轻松支撑高并发实时组桌与记账对账。
          </p>
        </div>
      </div>

      {/* Game Selector Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-5 bg-amber-500 rounded-full" />
            <h2 className="text-lg font-bold text-white">选择游戏品类</h2>
          </div>
          <span className="text-xs text-neutral-400">选择游戏即可进入对局或查看专属规则与算法</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {GAMES.map((game) => {
            const isSelected = selectedGame === game.type;
            return (
              <div
                key={game.type}
                onClick={() => {
                  sounds.playCardSelect();
                  setSelectedGame(game.type);
                }}
                className={`group relative rounded-2xl p-5 cursor-pointer transition-all duration-300 border flex flex-col justify-between ${
                  isSelected
                    ? 'bg-gradient-to-b from-neutral-800 via-neutral-900 to-neutral-950 border-amber-500 shadow-xl shadow-amber-500/10 scale-[1.02]'
                    : 'bg-neutral-900/60 hover:bg-neutral-800/80 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {/* Header Tag */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl filter drop-shadow">{game.icon}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-gradient-to-r ${game.tagColor} shadow`}>
                      {game.tag}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-white group-hover:text-amber-300 transition-colors">
                    {game.title}
                  </h3>
                  <div className="text-[10px] text-neutral-400 font-mono tracking-wider mb-2">
                    {game.subtitle}
                  </div>

                  <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed mb-4">
                    {game.desc}
                  </p>
                </div>

                {/* Footer metadata */}
                <div className="pt-3 border-t border-neutral-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-neutral-300">
                    <span className="flex items-center gap-1 text-neutral-400">
                      <Users className="w-3 h-3 text-amber-400" />
                      {game.playersText}
                    </span>
                    <span className="font-semibold text-amber-400 font-mono">{game.multiplierText}</span>
                  </div>

                  <div className={`w-full py-2 rounded-xl text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 shadow-md'
                      : 'bg-neutral-800 text-neutral-300 group-hover:bg-neutral-700'
                  }`}>
                    {isSelected ? (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>已选定</span>
                      </>
                    ) : (
                      <span>点击选择</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Game Details & Room Tier Selector */}
      <div className="bg-neutral-900/90 border border-amber-900/30 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{activeGameInfo.icon}</span>
              <div>
                <h3 className="text-2xl font-black text-white flex items-center gap-2">
                  {activeGameInfo.title}
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {activeGameInfo.playersText} · {activeGameInfo.pace}
                  </span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">{activeGameInfo.desc}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeGameInfo.features.map((feat, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800/80 border border-neutral-700 text-xs text-neutral-300">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>{feat}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Tier Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-neutral-200">选择对局场次与底分</span>
            <span className="text-xs text-neutral-400">系统自动根据底分匹配势均力敌的对手</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {TIERS.map(t => {
              const isTierSelected = selectedTier === t.id;
              const hasEnoughCoins = userCoins >= t.minCoin;
              return (
                <div
                  key={t.id}
                  onClick={() => {
                    if (hasEnoughCoins) {
                      sounds.playCardSelect();
                      setSelectedTier(t.id);
                    }
                  }}
                  className={`rounded-xl p-4 border transition-all cursor-pointer relative ${
                    isTierSelected
                      ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-500/10'
                      : hasEnoughCoins
                      ? 'bg-neutral-800/50 hover:bg-neutral-800 border-neutral-800 text-neutral-300'
                      : 'bg-neutral-900/40 border-neutral-800/40 text-neutral-600 cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-white">{t.name}</span>
                    <span className="text-xs font-mono font-bold text-amber-400">底分 {t.base}</span>
                  </div>
                  <div className="text-[11px] text-neutral-400 mb-2">{t.desc}</div>
                  <div className="text-[10px] text-neutral-500 font-mono">
                    准入限制: ≥ {t.minCoin.toLocaleString()} 金币
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Match Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 bg-neutral-950/60 p-4 rounded-xl border border-neutral-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                已就绪: {activeGameInfo.title} · {currentTierInfo.name}
              </div>
              <div className="text-xs text-neutral-400 font-mono">
                底分: {currentTierInfo.base} 金币 · 系统抽水: 5% (赢家结算)
              </div>
            </div>
          </div>

          <button
            onClick={handleStartMatchmaking}
            disabled={matchingStatus !== null || userCoins < currentTierInfo.minCoin}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-sm tracking-wide text-neutral-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Swords className="w-4 h-4 text-neutral-950 group-hover:rotate-12 transition-transform" />
            <span>极速开始匹配对局</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Lobby World Chat & Live Community Feed */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setLobbyChatOpen(!lobbyChatOpen)}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>大厅实时公屏聊天室</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </h3>
              <p className="text-[10px] text-neutral-400">实时广播 · 跨房间交流 · Telegram 管理员通知同步通道</p>
            </div>
          </div>
          <button className="text-neutral-400 hover:text-white p-1 text-xs flex items-center gap-1 font-mono cursor-pointer">
            {lobbyChatOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {lobbyChatOpen && (
          <div className="space-y-3 pt-2">
            {/* Messages box */}
            <div className="h-44 overflow-y-auto bg-neutral-950 rounded-xl p-3 border border-neutral-800/80 space-y-2 text-xs font-mono">
              {lobbyMessages.map((msg, i) => (
                <div key={i} className={`flex items-start gap-2 ${msg.isMe ? 'text-amber-300' : 'text-neutral-300'}`}>
                  <span className="text-[10px] text-neutral-500 shrink-0 font-sans">[{msg.time}]</span>
                  <span className={`font-bold shrink-0 ${msg.isMe ? 'text-amber-400' : 'text-sky-400'}`}>{msg.sender}:</span>
                  <span className="text-neutral-200">{msg.text}</span>
                </div>
              ))}
            </div>

            {/* Quick Chips & Input */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {["来人斗地主！", "方块3谁先出？", "十三水直接摆一条龙！", "求带麻将！"].map((quick, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    sounds.playCardSelect();
                    setLobbyInput(quick);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 text-[11px] font-mono transition-colors cursor-pointer"
                >
                  {quick}
                </button>
              ))}
            </div>

            <form onSubmit={handleSendLobbyMessage} className="flex items-center gap-2">
              <input
                type="text"
                value={lobbyInput}
                onChange={(e) => setLobbyInput(e.target.value)}
                placeholder="发送公屏弹幕，与在线牌友互动..."
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 font-sans"
              />
              <button
                type="submit"
                disabled={!lobbyInput.trim()}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>发送</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Matchmaking Queue Modal */}
      {matchingStatus && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-amber-500/40 rounded-2xl max-w-md w-full p-6 text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 animate-pulse" />
            
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 text-2xl animate-spin">
              <Zap className="w-8 h-8 text-amber-400" />
            </div>

            <div className="space-y-2">
              <h4 className="text-lg font-bold text-white">
                正在高并发匹配房间中...
              </h4>
              <p className="text-xs text-neutral-400">
                {activeGameInfo.title} · {currentTierInfo.name} (底分 {currentTierInfo.base})
              </p>
            </div>

            {/* Stepper progress */}
            <div className="space-y-3 bg-neutral-950/80 p-4 rounded-xl border border-neutral-800 text-left font-mono text-xs">
              <div className="flex items-center gap-2 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>[gRPC] JoinQueue RPC 调用已接受</span>
              </div>
              <div className="flex items-center gap-2 text-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>{matchingStatus.text}</span>
              </div>
              <div className="text-[11px] text-neutral-500">
                耗时: {(matchingStatus.elapsed * 0.5).toFixed(1)}s · 目标延迟: &lt; 2.0s
              </div>
            </div>

            <button
              onClick={() => setMatchingStatus(null)}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              取消匹配排队
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
