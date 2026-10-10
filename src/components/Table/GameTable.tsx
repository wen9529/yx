import React, { useState, useEffect, useRef } from 'react';
import { Card, GameType, MahjongTile, Player, RoomState, SettlementRecord } from '../../types/game';
import { sounds } from '../../utils/sound';
import confetti from 'canvas-confetti';
import { 
  Trophy, RotateCcw, ArrowLeft, Volume2, ShieldAlert, Sparkles, 
  Clock, Coins, Flame, ChevronRight, CheckCircle2, AlertTriangle, Play,
  MessageSquare, Send, Smile, X
} from 'lucide-react';
import { sortCards, sortMahjongTiles } from '../../services/simulationEngine';

const QUICK_PHRASES = [
  "快点吧，我等的花儿都谢了！",
  "手气不错，今天赢大奖！",
  "对家碰得漂亮，配合默契！",
  "承让承让，这把小赢一把！",
  "怎么又断线了？别墨迹，赶紧出牌！",
  "青山不改绿水长流，下把再战！",
  "搏一搏，单车变摩托！",
  "这把全看运气了，冲啊！"
];

const QUICK_EMOJIS = ["🍻", "🎉", "🚀", "💣", "💰", "👏", "😎", "😭", "🙏", "🔥", "🧧", "🀄"];

interface GameTableProps {
  roomState: RoomState;
  onLeaveRoom: () => void;
  onPlayAgain: () => void;
  onUpdateRoomState: (updater: (prev: RoomState) => RoomState) => void;
}

export const GameTable: React.FC<GameTableProps> = ({
  roomState,
  onLeaveRoom,
  onPlayAgain,
  onUpdateRoomState
}) => {
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  
  // Real-time Chat States
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatTab, setChatTab] = useState<'quick' | 'emoji' | 'history'>('quick');
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState<Array<{ sender: string; text: string; isMe: boolean; time: string }>>([
    { sender: '系统提示', text: '欢迎进入实时对局！支持快捷语、表情与自定义聊天。', isMe: false, time: '刚刚' }
  ]);
  
  const botTimerRef = useRef<NodeJS.Timeout | null>(null);

  const humanPlayer = roomState.players.find(p => p.isHuman)!;
  const isHumanTurn = roomState.currentTurnIndex === 0 && roomState.status === 'playing';

  // Send in-game chat message
  const handleSendChat = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sounds.playCardSelect();
    const timeStr = new Date().toLocaleTimeString();
    setChatLog(prev => [...prev, { sender: humanPlayer.name, text: trimmed, isMe: true, time: timeStr }]);
    setChatInput('');

    // Trigger speech bubble over human player
    onUpdateRoomState(prev => ({
      ...prev,
      players: prev.players.map((p, idx) => idx === 0 ? {
        ...p,
        activeBubble: { text: trimmed, expiresAt: Date.now() + 3500 }
      } : p)
    }));

    // Random AI bot reply simulation after 1.2s
    if (Math.random() > 0.3) {
      setTimeout(() => {
        const botReplies = [
          "别催别催，正在深思熟虑算牌呢！",
          "看我这把怎么力挽狂澜！",
          "手气正如火如荼呢，谁也挡不住！",
          "这把出完你可别后悔哦！",
          "哈哈，打得好！"
        ];
        const botIdx = 1 + Math.floor(Math.random() * (roomState.players.length - 1));
        const chosenReply = botReplies[Math.floor(Math.random() * botReplies.length)];
        onUpdateRoomState(prev => ({
          ...prev,
          players: prev.players.map((p, idx) => idx === botIdx ? {
            ...p,
            activeBubble: { text: chosenReply, expiresAt: Date.now() + 3500 }
          } : p)
        }));
        setChatLog(prev => [...prev, {
          sender: roomState.players[botIdx]?.name || '对手',
          text: chosenReply,
          isMe: false,
          time: new Date().toLocaleTimeString()
        }]);
      }, 1200);
    }
  };

  // Trigger bot action loop when it's bot's turn
  useEffect(() => {
    if (roomState.status === 'finished' || roomState.status === 'settling') {
      return;
    }

    // Thirteen cards auto-timer: if human arranges, countdown finishes
    if (roomState.status === 'arranging') {
      return;
    }

    const currentTurnPlayer = roomState.players[roomState.currentTurnIndex];
    if (!currentTurnPlayer || currentTurnPlayer.isHuman) {
      if (currentTurnPlayer?.isHuman && roomState.status === 'playing') {
        sounds.playTurnNotification();
      }
      return;
    }

    // Bot's turn
    const botDelay = 1000 + Math.random() * 800;
    botTimerRef.current = setTimeout(() => {
      handleBotTurn(roomState.currentTurnIndex);
    }, botDelay);

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, [roomState.currentTurnIndex, roomState.status]);

  // Handle Bot AI Logic
  const handleBotTurn = (botIndex: number) => {
    onUpdateRoomState(prev => {
      const bot = prev.players[botIndex];
      if (!bot || bot.isHuman || prev.status === 'finished') return prev;

      // Handle Doudizhu Bidding
      if (prev.status === 'bidding') {
        const bidScore = Math.random() > 0.4 ? 1 : 0;
        const nextTurn = (botIndex + 1) % prev.players.length;
        
        // If all 3 bid, make highest or bot 1 landlord
        if (nextTurn === 0) {
          // Bidding finished, assign landlord
          const landlordIdx = Math.random() > 0.5 ? 0 : botIndex;
          const landlordPlayer = prev.players[landlordIdx];
          const newPlayers = prev.players.map((p, idx) => ({
            ...p,
            role: idx === landlordIdx ? ('landlord' as const) : ('peasant' as const),
            cards: idx === landlordIdx ? sortCards([...p.cards, ...prev.landlordCards]) : p.cards
          }));

          setAnnouncement(`叫分结束！【${landlordPlayer.name}】成为地主 (+3张底牌)`);
          sounds.playChips();

          return {
            ...prev,
            status: 'playing',
            players: newPlayers,
            landlordId: landlordPlayer.id,
            currentTurnIndex: landlordIdx,
            multiplier: prev.multiplier * 2
          };
        }

        return {
          ...prev,
          currentTurnIndex: nextTurn
        };
      }

      // Handle Mahjong Bot Turn
      if (prev.gameType === 'mahjong') {
        // Bot discards their last tile
        if (!bot.tiles || bot.tiles.length === 0) return prev;
        const discardTile = bot.tiles[bot.tiles.length - 1];
        const updatedTiles = bot.tiles.slice(0, bot.tiles.length - 1);
        const updatedDiscarded = [...(bot.discardedTiles || []), discardTile];

        sounds.playTileClick();
        setAnnouncement(`${bot.name} 打出了 [${discardTile.display}]`);

        // Check if next player wins or draw
        const nextTurn = (botIndex + 1) % prev.players.length;
        return {
          ...prev,
          players: prev.players.map((p, idx) => idx === botIndex ? { ...p, tiles: updatedTiles, discardedTiles: updatedDiscarded } : p),
          currentTurnIndex: nextTurn
        };
      }

      // Handle Card Game Bot Turn (Doudizhu, BigTwo, PaoDeKuai)
      if (bot.cards.length === 0) return prev;

      // Simple smart bot play:
      // If table is free (lastPlayedHand is null or belongs to self), play smallest single or pair
      const canFreePlay = !prev.lastPlayedHand || prev.lastPlayerId === bot.id || prev.passCount >= prev.players.length - 1;
      
      let cardsToPlay: Card[] = [];
      let handDesc = '';

      if (canFreePlay) {
        // Play smallest card (last one since sorted descending)
        const smallestCard = bot.cards[bot.cards.length - 1];
        cardsToPlay = [smallestCard];
        handDesc = `单张 [${smallestCard.display}]`;
      } else {
        // Try to beat last single card
        const lastCard = prev.lastPlayedHand?.cards[0];
        if (lastCard && prev.lastPlayedHand?.cards.length === 1) {
          // Find smallest card that can beat it
          const beatable = [...bot.cards].reverse().find(c => {
            if (prev.gameType === 'bigtwo') {
              return c.rank > lastCard.rank;
            }
            return c.rank > lastCard.rank;
          });

          if (beatable) {
            cardsToPlay = [beatable];
            handDesc = `单张 [${beatable.display}]`;
          }
        }
      }

      if (cardsToPlay.length > 0) {
        sounds.playCardSnap();
        const remainingBotCards = bot.cards.filter(c => !cardsToPlay.some(p => p.id === c.id));
        const newPlayers = prev.players.map((p, idx) => idx === botIndex ? { ...p, cards: remainingBotCards } : p);

        // Check Win Condition
        if (remainingBotCards.length === 0) {
          return triggerSettlement(prev, bot.id, newPlayers);
        }

        return {
          ...prev,
          players: newPlayers,
          lastPlayedHand: {
            playerId: bot.id,
            cards: cardsToPlay,
            typeDesc: handDesc,
            timestamp: Date.now()
          },
          lastPlayerId: bot.id,
          passCount: 0,
          currentTurnIndex: (botIndex + 1) % prev.players.length
        };
      } else {
        // Bot Passes
        return {
          ...prev,
          passCount: prev.passCount + 1,
          currentTurnIndex: (botIndex + 1) % prev.players.length
        };
      }
    });
  };

  // Human card click
  const toggleCardSelect = (cardId: string) => {
    sounds.playCardSelect();
    setSelectedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  // Human Play Cards
  const handleHumanPlay = () => {
    if (!isHumanTurn) return;
    if (selectedCardIds.size === 0) {
      alert('请先选择要出的扑克牌！');
      return;
    }

    const cardsToPlay = humanPlayer.cards.filter(c => selectedCardIds.has(c.id));
    
    // Check Doudizhu / BigTwo / PaoDeKuai Bomb / Rocket
    let isBomb = false;
    let desc = `出牌 (${cardsToPlay.length}张)`;

    if (cardsToPlay.length === 1) {
      desc = `单张 [${cardsToPlay[0].display}]`;
    } else if (cardsToPlay.length === 2) {
      if (cardsToPlay[0].rank === 17 && cardsToPlay[1].rank === 16) {
        desc = '🚀 王炸 (火箭) 翻倍！';
        isBomb = true;
      } else if (cardsToPlay[0].rank === cardsToPlay[1].rank) {
        desc = `对子 [${cardsToPlay[0].display}]`;
      }
    } else if (cardsToPlay.length === 4 && cardsToPlay.every(c => c.rank === cardsToPlay[0].rank)) {
      desc = `💣 炸弹 [4张${cardsToPlay[0].display}] 翻倍！`;
      isBomb = true;
    }

    if (isBomb) {
      sounds.playBomb();
    } else {
      sounds.playCardSnap();
    }

    onUpdateRoomState(prev => {
      const remainingHumanCards = humanPlayer.cards.filter(c => !selectedCardIds.has(c.id));
      const newPlayers = prev.players.map((p, idx) => idx === 0 ? { ...p, cards: remainingHumanCards } : p);
      const newMultiplier = isBomb ? prev.multiplier * 2 : prev.multiplier;

      if (remainingHumanCards.length === 0) {
        return triggerSettlement({ ...prev, multiplier: newMultiplier }, humanPlayer.id, newPlayers);
      }

      return {
        ...prev,
        multiplier: newMultiplier,
        players: newPlayers,
        lastPlayedHand: {
          playerId: humanPlayer.id,
          cards: cardsToPlay,
          typeDesc: desc,
          timestamp: Date.now()
        },
        lastPlayerId: humanPlayer.id,
        passCount: 0,
        currentTurnIndex: 1
      };
    });

    setSelectedCardIds(new Set());
  };

  // Human Pass
  const handleHumanPass = () => {
    if (!isHumanTurn) return;

    // In PaoDeKuai, must beat rule
    if (roomState.gameType === 'paodekuai') {
      const hasCanBeat = humanPlayer.cards.some(c => roomState.lastPlayedHand && c.rank > roomState.lastPlayedHand.cards[0].rank);
      if (hasCanBeat && roomState.lastPlayerId !== humanPlayer.id) {
        setAnnouncement('【跑得快规则警告】手牌有可压大牌时必须出牌，不可跳过！');
        return;
      }
    }

    onUpdateRoomState(prev => ({
      ...prev,
      passCount: prev.passCount + 1,
      currentTurnIndex: 1
    }));
    setSelectedCardIds(new Set());
  };

  // Human Landlord Bid
  const handleBidLandlord = (bidScore: number) => {
    sounds.playChips();
    onUpdateRoomState(prev => {
      if (bidScore > 0) {
        const newPlayers = prev.players.map((p, idx) => ({
          ...p,
          role: idx === 0 ? ('landlord' as const) : ('peasant' as const),
          cards: idx === 0 ? sortCards([...p.cards, ...prev.landlordCards]) : p.cards
        }));
        setAnnouncement(`你叫了 ${bidScore} 分！成为地主并获得 3 张底牌！`);
        return {
          ...prev,
          status: 'playing',
          landlordId: humanPlayer.id,
          players: newPlayers,
          currentTurnIndex: 0,
          multiplier: prev.multiplier * (bidScore === 3 ? 3 : 2)
        };
      } else {
        setAnnouncement('你选择了不叫，轮到下家叫地主...');
        return {
          ...prev,
          currentTurnIndex: 1
        };
      }
    });
  };

  // Thirteen Cards Auto-Arrange & Submit
  const handleThirteenArrange = () => {
    sounds.playChips();
    // Auto sort cards into Head(3), Mid(5), Tail(5)
    const cards = [...humanPlayer.cards];
    const tail = cards.slice(0, 5);
    const mid = cards.slice(5, 10);
    const head = cards.slice(10, 13);

    onUpdateRoomState(prev => {
      const newPlayers = prev.players.map(p => {
        if (p.isHuman) {
          return {
            ...p,
            arrangedHands: { head, mid, tail }
          };
        }
        return p;
      });

      // Trigger Thirteen showdown settlement
      return triggerThirteenSettlement(prev, newPlayers);
    });
  };

  // Mahjong Discard
  const handleMahjongDiscard = (tile: MahjongTile) => {
    if (!isHumanTurn) return;
    sounds.playTileClick();

    onUpdateRoomState(prev => {
      const currentTiles = humanPlayer.tiles || [];
      const updatedTiles = currentTiles.filter(t => t.id !== tile.id);
      const updatedDiscarded = [...(humanPlayer.discardedTiles || []), tile];

      // Draw next tile for next player
      const nextTurn = (prev.currentTurnIndex + 1) % prev.players.length;

      return {
        ...prev,
        players: prev.players.map((p, idx) => idx === 0 ? { ...p, tiles: updatedTiles, discardedTiles: updatedDiscarded } : p),
        currentTurnIndex: nextTurn,
        mahjongWallCount: Math.max(0, prev.mahjongWallCount - 1)
      };
    });
    setSelectedTileId(null);
  };

  // Mahjong Hu action
  const handleMahjongHu = () => {
    sounds.playWin();
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    onUpdateRoomState(prev => triggerSettlement(prev, humanPlayer.id, prev.players));
  };

  // Trigger Settlement for Standard Games
  const triggerSettlement = (prev: RoomState, winnerId: string, currentPlayers: Player[]): RoomState => {
    const isHumanWin = winnerId === humanPlayer.id;
    const base = prev.baseScore;
    const mult = prev.multiplier;
    const pot = base * mult * (currentPlayers.length - 1);
    const rake = Math.floor(pot * 0.05); // 5% house rake
    const netWin = pot - rake;

    if (isHumanWin) {
      sounds.playWin();
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }

    const results = currentPlayers.map(p => {
      const win = p.id === winnerId;
      const delta = win ? netWin : -base * mult;
      return {
        playerId: p.id,
        playerName: p.name,
        isHuman: p.isHuman,
        isWinner: win,
        deltaCoins: delta,
        currentCoins: p.coins + delta,
        details: win ? `获胜盈利 +${delta} (系统抽水 5%: -${rake})` : `失败扣除 -${base * mult}`,
        remainingCards: p.cards
      };
    });

    const settlement: SettlementRecord = {
      roomId: prev.roomId,
      gameType: prev.gameType,
      baseScore: base,
      multiplier: mult,
      houseRakeRate: 0.05,
      totalPot: pot,
      settledAt: new Date().toLocaleTimeString(),
      results,
      specialPattern: isHumanWin ? '胜利大捷' : undefined
    };

    return {
      ...prev,
      status: 'finished',
      players: currentPlayers.map((p, idx) => ({ ...p, coins: p.coins + (results[idx]?.deltaCoins || 0) })),
      settlementDetails: settlement
    };
  };

  // Trigger Thirteen Showdown Settlement
  const triggerThirteenSettlement = (prev: RoomState, players: Player[]): RoomState => {
    sounds.playWin();
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });

    const base = prev.baseScore;
    const winCoins = base * 18;
    const rake = Math.floor(winCoins * 0.05);

    const results = players.map(p => {
      const win = p.isHuman;
      const delta = win ? winCoins - rake : -base * 6;
      return {
        playerId: p.id,
        playerName: p.name,
        isHuman: p.isHuman,
        isWinner: win,
        deltaCoins: delta,
        currentCoins: p.coins + delta,
        details: win ? `十三水·通杀打枪! 获得 +${delta} (抽水 -${rake})` : '输牌 -' + (base * 6),
        remainingCards: p.cards
      };
    });

    return {
      ...prev,
      status: 'finished',
      players: players.map((p, idx) => ({ ...p, coins: p.coins + (results[idx]?.deltaCoins || 0) })),
      settlementDetails: {
        roomId: prev.roomId,
        gameType: 'thirteen',
        baseScore: base,
        multiplier: 6,
        houseRakeRate: 0.05,
        totalPot: base * 18,
        settledAt: new Date().toLocaleTimeString(),
        results,
        specialPattern: '打枪全垒打 (通杀所有对手)'
      }
    };
  };

  const getGameZhName = (gt: GameType) => {
    switch (gt) {
      case 'doudizhu': return '经典斗地主';
      case 'bigtwo': return '锄大地 (Big Two)';
      case 'paodekuai': return '跑得快 (16张)';
      case 'thirteen': return '十三水 (Chinese Poker)';
      case 'mahjong': return '四川血战到底麻将';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">

      {/* Top Header Controls */}
      <div className="bg-neutral-900/90 border border-amber-900/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onLeaveRoom}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回大厅</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-white">{getGameZhName(roomState.gameType)}</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                房间: {roomState.roomId}
              </span>
            </div>
            <div className="text-xs text-neutral-400 font-mono mt-0.5">
              底分: <span className="text-amber-400 font-bold">{roomState.baseScore}</span> · 
              当前倍数: <span className="text-emerald-400 font-bold">{roomState.multiplier}x</span> · 
              状态: <span className="text-neutral-300 font-bold">{roomState.status.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Center / Right announcement */}
        <div className="flex items-center gap-3">
          {announcement && (
            <div className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-1.5 animate-pulse">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>{announcement}</span>
            </div>
          )}

          <button
            onClick={() => setShowChatModal(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>实时对局聊天</span>
          </button>

          <button
            onClick={() => setShowRuleModal(true)}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors"
          >
            规则说明
          </button>
        </div>
      </div>

      {/* The Felt Green Table Arena */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-emerald-950 via-[#0a3826] to-[#041f15] border-4 border-amber-900/60 p-6 min-h-[580px] flex flex-col justify-between shadow-[inset_0_0_80px_rgba(0,0,0,0.8)]">
        
        {/* Felt Watermark Pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center text-8xl font-black text-amber-100 select-none">
          ♠ ♥ ♦ ♣
        </div>

        {/* Top / Opponent Players Bar */}
        <div className="relative z-10 flex items-center justify-around w-full">
          {roomState.players.slice(1).map((bot, index) => {
            const isTurn = roomState.currentTurnIndex === index + 1;
            return (
              <div
                key={bot.id}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all relative ${
                  isTurn
                    ? 'bg-amber-500/20 border-2 border-amber-400 shadow-lg shadow-amber-500/20 scale-105'
                    : 'bg-neutral-900/70 border border-neutral-700/60'
                }`}
              >
                {/* Bot Speech Bubble */}
                {bot.activeBubble && Date.now() < bot.activeBubble.expiresAt && (
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-amber-300 text-neutral-950 font-black text-[11px] px-2.5 py-1 rounded-xl shadow-xl border border-amber-400 whitespace-nowrap z-30 animate-bounce">
                    {bot.activeBubble.text}
                  </div>
                )}

                <div className="relative">
                  <img
                    src={bot.avatar}
                    alt={bot.name}
                    className="w-12 h-12 rounded-full border-2 border-amber-500/40 object-cover"
                  />
                  {isTurn && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 animate-ping" />
                  )}
                  {bot.role === 'landlord' && (
                    <span className="absolute -bottom-1 -right-1 bg-amber-500 text-neutral-950 font-black text-[9px] px-1 rounded">
                      地主
                    </span>
                  )}
                </div>

                <div className="text-center">
                  <div className="text-xs font-bold text-white flex items-center justify-center gap-1">
                    <span>{bot.name}</span>
                    {isTurn && <span className="text-[10px] text-amber-300 font-mono animate-pulse">(思考中...)</span>}
                  </div>
                  <div className="text-[11px] font-mono text-amber-400">
                    💰 {bot.coins.toLocaleString()}
                  </div>
                </div>

                {/* Bot Cards count or tiles */}
                {roomState.gameType === 'mahjong' ? (
                  <div className="flex gap-1 text-[10px] text-neutral-400">
                    <span>剩余牌张: {bot.tiles?.length || 13}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-xs">🂠</span>
                    <span className="text-xs font-bold text-neutral-300">{bot.cards.length} 张手牌</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Center Table Play Area */}
        <div className="relative z-10 flex flex-col items-center justify-center my-6 space-y-4">
          
          {/* Doudizhu Landlord 3 Hole Cards */}
          {roomState.gameType === 'doudizhu' && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                地主底牌 (倍数 ×3)
              </span>
              <div className="flex gap-2">
                {roomState.landlordCards.map(c => (
                  <div
                    key={c.id}
                    className="w-10 h-14 bg-amber-100 rounded-lg shadow-md border border-amber-600 flex flex-col items-center justify-center text-xs font-black text-neutral-900"
                  >
                    <span>{c.display}</span>
                    <span className={c.suit === 'heart' || c.suit === 'diamond' ? 'text-red-600' : 'text-neutral-900'}>
                      {c.suit === 'spade' ? '♠' : c.suit === 'heart' ? '♥' : c.suit === 'club' ? '♣' : c.suit === 'diamond' ? '♦' : '★'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Table Center Played Cards Pool */}
          {roomState.lastPlayedHand ? (
            <div className="bg-neutral-950/70 border border-amber-500/30 rounded-2xl p-4 flex flex-col items-center gap-2 shadow-2xl backdrop-blur-sm min-w-[280px]">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-2">
                <span>出牌玩家: {roomState.players.find(p => p.id === roomState.lastPlayedHand?.playerId)?.name}</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-[10px]">
                  {roomState.lastPlayedHand.typeDesc}
                </span>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {roomState.lastPlayedHand.cards.map(c => (
                  <div
                    key={c.id}
                    className="w-12 h-16 bg-white rounded-xl shadow-lg border border-neutral-300 flex flex-col items-center justify-between p-1 select-none animate-in zoom-in duration-200"
                  >
                    <span className="text-xs font-black text-neutral-900 self-start">{c.display}</span>
                    <span className={`text-base leading-none ${c.suit === 'heart' || c.suit === 'diamond' ? 'text-red-600' : 'text-neutral-900'}`}>
                      {c.suit === 'spade' ? '♠' : c.suit === 'heart' ? '♥' : c.suit === 'club' ? '♣' : c.suit === 'diamond' ? '♦' : '★'}
                    </span>
                    <span className="text-[10px] font-black text-neutral-900 self-end">{c.display}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-xs font-semibold text-emerald-300/80 uppercase tracking-widest">
                等待首发引牌...
              </div>
              {roomState.gameType === 'bigtwo' && (
                <div className="text-[11px] text-amber-400 mt-1">持有【方块 3】的玩家优先出牌</div>
              )}
              {roomState.gameType === 'paodekuai' && (
                <div className="text-[11px] text-amber-400 mt-1">持有【黑桃 3】的玩家优先出牌，有牌必出！</div>
              )}
            </div>
          )}

          {/* Turn Timer Badge */}
          {isHumanTurn && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500 text-neutral-950 font-bold text-xs shadow-lg animate-bounce">
              <Clock className="w-3.5 h-3.5" />
              <span>轮到你了！请选择手牌出牌</span>
            </div>
          )}
        </div>

        {/* Bottom / Human Player Hand Controls */}
        <div className="relative z-10 flex flex-col items-center gap-3">
          
          {/* Action Buttons Bar */}
          <div className="flex items-center gap-3">
            {/* Doudizhu Bidding Buttons */}
            {roomState.status === 'bidding' && roomState.currentTurnIndex === 0 && (
              <div className="flex items-center gap-2 bg-neutral-950/80 p-2 rounded-2xl border border-amber-500/40">
                <button
                  onClick={() => handleBidLandlord(0)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-all"
                >
                  不叫
                </button>
                <button
                  onClick={() => handleBidLandlord(1)}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all"
                >
                  叫地主 (1分)
                </button>
                <button
                  onClick={() => handleBidLandlord(2)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all"
                >
                  叫地主 (2分)
                </button>
                <button
                  onClick={() => handleBidLandlord(3)}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-neutral-950 text-xs font-black shadow-lg shadow-amber-500/30 transition-all"
                >
                  叫地主 (3分顶天)
                </button>
              </div>
            )}

            {/* Thirteen Cards Arrange Buttons */}
            {roomState.gameType === 'thirteen' && roomState.status === 'arranging' && (
              <div className="flex items-center gap-2 bg-neutral-950/80 p-2 rounded-2xl border border-purple-500/40">
                <button
                  onClick={handleThirteenArrange}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 hover:from-purple-400 hover:to-indigo-400 text-white text-xs font-black shadow-lg shadow-purple-500/30 transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>智能推荐理牌并提交比牌 (头3/中5/尾5)</span>
                </button>
              </div>
            )}

            {/* Mahjong Play / Hu buttons */}
            {roomState.gameType === 'mahjong' && isHumanTurn && (
              <div className="flex items-center gap-2 bg-neutral-950/80 p-2 rounded-2xl border border-cyan-500/40">
                <button
                  onClick={handleMahjongHu}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-neutral-950 text-xs font-black shadow-lg shadow-emerald-500/30 transition-all"
                >
                  🀄 自摸胡牌！
                </button>
                <span className="text-xs text-neutral-300 px-2">点击下方任一张麻将即可打出</span>
              </div>
            )}

            {/* Standard Card Play Buttons */}
            {isHumanTurn && (roomState.gameType === 'doudizhu' || roomState.gameType === 'bigtwo' || roomState.gameType === 'paodekuai') && (
              <div className="flex items-center gap-2 bg-neutral-950/80 p-2 rounded-2xl border border-amber-500/40">
                <button
                  onClick={handleHumanPass}
                  disabled={!roomState.lastPlayedHand || roomState.lastPlayerId === humanPlayer.id}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  不要 / 过
                </button>
                <button
                  onClick={() => setSelectedCardIds(new Set())}
                  className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 text-xs font-medium transition-all"
                >
                  重选
                </button>
                <button
                  onClick={handleHumanPlay}
                  disabled={selectedCardIds.size === 0}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-neutral-950 text-xs font-black shadow-lg shadow-amber-500/30 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>出牌 ({selectedCardIds.size})</span>
                </button>
              </div>
            )}
          </div>

          {/* Cards Display Tray */}
          {roomState.gameType === 'mahjong' ? (
            /* Mahjong Tiles Tray */
            <div className="flex flex-wrap justify-center gap-1.5 bg-neutral-950/80 p-3 rounded-2xl border border-neutral-800 max-w-full">
              {humanPlayer.tiles?.map(tile => (
                <div
                  key={tile.id}
                  onClick={() => handleMahjongDiscard(tile)}
                  className="w-10 h-14 bg-gradient-to-b from-stone-100 to-stone-200 rounded-lg shadow-md border-b-4 border-r-2 border-stone-400 hover:border-amber-500 cursor-pointer flex flex-col items-center justify-center p-1 select-none transition-transform hover:-translate-y-2 group"
                >
                  <span className="text-xs font-black text-neutral-900 group-hover:text-amber-700">{tile.display}</span>
                  <span className="text-[10px] text-stone-500">{tile.suit.toUpperCase()}</span>
                </div>
              ))}
            </div>
          ) : (
            /* Poker Cards Hand Tray */
            <div className="flex flex-wrap justify-center gap-1 sm:gap-2 px-2 max-w-full">
              {humanPlayer.cards.map((c) => {
                const isSelected = selectedCardIds.has(c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => toggleCardSelect(c.id)}
                    className={`w-11 sm:w-14 h-16 sm:h-20 bg-white rounded-xl shadow-lg border border-neutral-300 flex flex-col justify-between p-1 select-none cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? '-translate-y-4 ring-2 ring-amber-400 shadow-amber-500/40 shadow-xl'
                        : 'hover:-translate-y-1'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] sm:text-xs font-black text-neutral-900">
                      <span>{c.display}</span>
                      <span className={c.suit === 'heart' || c.suit === 'diamond' ? 'text-red-600' : 'text-neutral-900'}>
                        {c.suit === 'spade' ? '♠' : c.suit === 'heart' ? '♥' : c.suit === 'club' ? '♣' : c.suit === 'diamond' ? '♦' : '★'}
                      </span>
                    </div>

                    <div className={`text-center text-sm sm:text-lg leading-none ${c.suit === 'heart' || c.suit === 'diamond' ? 'text-red-600' : 'text-neutral-900'}`}>
                      {c.suit === 'spade' ? '♠' : c.suit === 'heart' ? '♥' : c.suit === 'club' ? '♣' : c.suit === 'diamond' ? '♦' : '★'}
                    </div>

                    <div className="text-[9px] font-black text-neutral-900 self-end">
                      {c.display}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* User Profile Footer */}
          <div className="relative flex items-center gap-3 bg-neutral-950/80 px-4 py-1.5 rounded-full border border-neutral-800 text-xs">
            {humanPlayer.activeBubble && Date.now() < humanPlayer.activeBubble.expiresAt && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-amber-400 text-neutral-950 font-black text-[11px] px-2.5 py-1 rounded-xl shadow-xl border border-amber-500 whitespace-nowrap z-30 animate-bounce">
                {humanPlayer.activeBubble.text}
              </div>
            )}
            <img src={humanPlayer.avatar} alt="Avatar" className="w-5 h-5 rounded-full" />
            <span className="font-bold text-white">{humanPlayer.name}</span>
            <span className="text-neutral-500">|</span>
            <span className="font-mono text-amber-400">💰 {humanPlayer.coins.toLocaleString()}</span>
            {humanPlayer.role === 'landlord' && (
              <span className="bg-amber-500 text-neutral-950 text-[10px] font-black px-1.5 py-0.5 rounded">
                地主
              </span>
            )}
            <button
              onClick={() => setShowChatModal(true)}
              className="ml-2 text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px] font-bold"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>聊天互动</span>
            </button>
          </div>

        </div>
      </div>

      {/* Round Finished Settlement Modal */}
      {roomState.status === 'finished' && roomState.settlementDetails && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
          <div className="bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 border border-amber-500/50 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
            
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />

            {/* Header Trophy & Verdict */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-xl">
                <Trophy className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-2xl font-black text-white">
                对局结算完成 (TxID: {roomState.settlementDetails.roomId})
              </h3>
              <p className="text-xs text-neutral-400">
                游戏: {getGameZhName(roomState.settlementDetails.gameType)} · 底分 {roomState.settlementDetails.baseScore} · 倍数 {roomState.settlementDetails.multiplier}x
              </p>
            </div>

            {/* Settlement Player Results List */}
            <div className="space-y-2.5 bg-neutral-950/80 p-4 rounded-2xl border border-neutral-800">
              {roomState.settlementDetails.results.map((res, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
                    res.isWinner
                      ? 'bg-amber-500/10 border-amber-500/40 text-white'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {res.isWinner ? (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500 text-neutral-950 font-black text-[10px]">
                        胜
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-500 font-bold text-[10px]">
                        负
                      </span>
                    )}
                    <div>
                      <div className="font-bold text-white flex items-center gap-1">
                        <span>{res.playerName}</span>
                        {res.isHuman && <span className="text-[10px] text-amber-400 font-mono">(你)</span>}
                      </div>
                      <div className="text-[11px] text-neutral-400">{res.details}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`font-mono font-black text-sm ${res.deltaCoins >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {res.deltaCoins >= 0 ? `+${res.deltaCoins.toLocaleString()}` : res.deltaCoins.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-neutral-500 font-mono">
                      余额: {res.currentCoins.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions: Play Again or Return to Lobby */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={onLeaveRoom}
                className="flex-1 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-bold text-xs transition-colors"
              >
                返回游戏大厅
              </button>
              <button
                onClick={onPlayAgain}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-neutral-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>再来一局</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Rule Summary Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-xs text-neutral-300">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <span>{getGameZhName(roomState.gameType)} 规则指南</span>
              </h4>
              <button
                onClick={() => setShowRuleModal(false)}
                className="text-neutral-500 hover:text-neutral-300"
              >
                关闭
              </button>
            </div>

            <div className="space-y-3 leading-relaxed">
              {roomState.gameType === 'doudizhu' && (
                <>
                  <p><b>1. 叫分机制:</b> 玩家轮流叫 1分、2分、3分，最高分者成为地主并获得 3 张底牌。</p>
                  <p><b>2. 翻倍牌型:</b> 王炸（双王）与普通炸弹（4张同点）均会使本轮对局倍数翻倍！</p>
                  <p><b>3. 春天与反春:</b> 地主出完全部牌而农民一张未出（春天），或地主只出了首发一手牌即被农民打完（反春），倍数翻 2 倍。</p>
                </>
              )}
              {roomState.gameType === 'bigtwo' && (
                <>
                  <p><b>1. 方块3首出:</b> 牌局开始必须由持有【方块3】的玩家首出，且首手牌必须包含方块3。</p>
                  <p><b>2. 花色顺序:</b> 黑桃 &gt; 红桃 &gt; 梅花 &gt; 方块；点数 2 最大，3 最小。</p>
                  <p><b>3. 惩罚倍数:</b> 赢家走完后，剩余 8-9 张赔双倍（双炒），剩余 10-12 张赔三倍（三炒），一张未出（13张）赔四倍！</p>
                </>
              )}
              {roomState.gameType === 'paodekuai' && (
                <>
                  <p><b>1. 有牌必打:</b> 只要手牌有能压死上家的牌，必须打出，不能随意过牌！</p>
                  <p><b>2. 报单顶大:</b> 下家只剩 1 张手牌时，上家出单张必须出自己手中最大的单牌，防止放走下家。</p>
                  <p><b>3. 炸弹现结:</b> 只要打出炸弹，立即计分入账。</p>
                </>
              )}
              {roomState.gameType === 'thirteen' && (
                <>
                  <p><b>1. 三道摆放:</b> 13张手牌排成头道（3张）、中道（5张）、尾道（5张）。</p>
                  <p><b>2. 倒水违规:</b> 尾道必须大于等于中道，中道必须大于等于头道。若倒水则全赔！</p>
                  <p><b>3. 绝技全垒打:</b> 通杀所有对手将触发全垒打翻 4 倍奖励！</p>
                </>
              )}
              {roomState.gameType === 'mahjong' && (
                <>
                  <p><b>1. 定缺一门:</b> 开局选定缺门，必须打光缺门牌才能胡牌。</p>
                  <p><b>2. 血战到底:</b> 一家胡牌后牌局不结束，其他三家继续摸打，直到三家胡牌或摸完荒牌。</p>
                  <p><b>3. 刮风下雨:</b> 杠牌即时计分，清一色与七对为 4 倍大牌。</p>
                </>
              )}
            </div>

            <button
              onClick={() => setShowRuleModal(false)}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold"
            >
              我知道了
            </button>
          </div>
        </div>
      )}

      {/* Real-time In-Game Chat Modal */}
      {showChatModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-400" />
                <h4 className="text-sm font-bold text-white">实时牌桌聊天与互动</h4>
              </div>
              <button
                onClick={() => setShowChatModal(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Tabs */}
            <div className="flex items-center gap-2 border-b border-neutral-800 pb-2 text-xs">
              <button
                onClick={() => setChatTab('quick')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  chatTab === 'quick' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'
                }`}
              >
                经典快捷语
              </button>
              <button
                onClick={() => setChatTab('emoji')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  chatTab === 'emoji' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'
                }`}
              >
                趣味表情
              </button>
              <button
                onClick={() => setChatTab('history')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  chatTab === 'history' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'
                }`}
              >
                聊天记录 ({chatLog.length})
              </button>
            </div>

            {/* Tab 1: Quick Phrases */}
            {chatTab === 'quick' && (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {QUICK_PHRASES.map((phrase, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      handleSendChat(phrase);
                      setShowChatModal(false);
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/40 text-xs text-neutral-200 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <span>{phrase}</span>
                    <Send className="w-3.5 h-3.5 text-neutral-500 group-hover:text-amber-400 transition-colors" />
                  </button>
                ))}
              </div>
            )}

            {/* Tab 2: Emojis */}
            {chatTab === 'emoji' && (
              <div className="grid grid-cols-4 gap-2.5 p-2 max-h-56 overflow-y-auto">
                {QUICK_EMOJIS.map((emoji, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      handleSendChat(emoji);
                      setShowChatModal(false);
                    }}
                    className="h-12 text-2xl rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/40 flex items-center justify-center transition-all cursor-pointer hover:scale-110"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Tab 3: History */}
            {chatTab === 'history' && (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
                {chatLog.map((item, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded-xl ${
                      item.isMe
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-200 ml-4'
                        : 'bg-neutral-950 border border-neutral-800 text-neutral-300 mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-0.5">
                      <span className="font-bold">{item.sender}</span>
                      <span>{item.time}</span>
                    </div>
                    <div>{item.text}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Custom Input */}
            <div className="pt-2 border-t border-neutral-800 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendChat(chatInput);
                    setShowChatModal(false);
                  }
                }}
                placeholder="发送自定义聊天信息..."
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={() => {
                  handleSendChat(chatInput);
                  setShowChatModal(false);
                }}
                disabled={!chatInput.trim()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-neutral-950 text-xs font-bold transition-all disabled:opacity-40"
              >
                发送
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
