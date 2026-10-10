import { Card, GameType, MahjongTile, Player, RoomState, SettlementRecord, GrpcLogEntry, RedisKeyEntry } from '../types/game';
import { sounds } from '../utils/sound';

// Create deck helpers
export function createPokerDeck(includeJokers = true): Card[] {
  const suits: Array<'spade' | 'heart' | 'club' | 'diamond'> = ['spade', 'heart', 'club', 'diamond'];
  const rankNames: Record<number, string> = {
    3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
    11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2'
  };
  const deck: Card[] = [];

  for (let r = 3; r <= 15; r++) {
    for (const suit of suits) {
      deck.push({
        id: `${suit}-${r}-${Math.random().toString(36).substring(2, 6)}`,
        suit,
        rank: r,
        display: rankNames[r] || String(r)
      });
    }
  }

  if (includeJokers) {
    deck.push({
      id: `joker-black-${Math.random().toString(36).substring(2, 6)}`,
      suit: 'joker',
      rank: 16,
      display: '小王'
    });
    deck.push({
      id: `joker-red-${Math.random().toString(36).substring(2, 6)}`,
      suit: 'joker',
      rank: 17,
      display: '大王'
    });
  }

  return shuffleArray(deck);
}

export function createMahjongTiles(): MahjongTile[] {
  const suits: Array<'wan' | 'tiao' | 'tong'> = ['wan', 'tiao', 'tong'];
  const tiles: MahjongTile[] = [];

  for (const suit of suits) {
    for (let v = 1; v <= 9; v++) {
      for (let c = 0; c < 4; c++) {
        const suitZh = suit === 'wan' ? '万' : suit === 'tiao' ? '条' : '筒';
        tiles.push({
          id: `mj-${suit}-${v}-${c}-${Math.random().toString(36).substring(2, 6)}`,
          suit,
          value: v,
          display: `${v}${suitZh}`
        });
      }
    }
  }

  return shuffleArray(tiles);
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    if (b.rank !== a.rank) {
      return b.rank - a.rank;
    }
    const suitOrder: Record<string, number> = { spade: 4, heart: 3, club: 2, diamond: 1, joker: 5 };
    return (suitOrder[b.suit] || 0) - (suitOrder[a.suit] || 0);
  });
}

export function sortMahjongTiles(tiles: MahjongTile[]): MahjongTile[] {
  const suitOrder: Record<string, number> = { wan: 1, tiao: 2, tong: 3 };
  return [...tiles].sort((a, b) => {
    if (a.suit !== b.suit) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return a.value - b.value;
  });
}

// Generate starting room
export function initializeRoom(gameType: GameType, roomTier: 'novice' | 'mid' | 'high' | 'master', userCoins: number): RoomState {
  const baseScores = { novice: 100, mid: 500, high: 2000, master: 10000 };
  const baseScore = baseScores[roomTier];
  const roomId = `room_${gameType}_${Math.floor(1000 + Math.random() * 9000)}`;

  const humanPlayer: Player = {
    id: 'user_me',
    name: '雀圣至尊 (你)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    coins: userCoins,
    isHuman: true,
    cards: [],
    ready: true,
    scoreDelta: 0
  };

  const botProfiles = [
    { name: '财神高进', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80' },
    { name: '千面星仔', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80' },
    { name: '冷面赌魔', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&auto=format&fit=crop&q=80' }
  ];

  const playerCount = (gameType === 'doudizhu' || gameType === 'paodekuai') ? 3 : 4;
  const players: Player[] = [humanPlayer];

  for (let i = 0; i < playerCount - 1; i++) {
    const prof = botProfiles[i];
    players.push({
      id: `bot_${i + 1}`,
      name: prof.name,
      avatar: prof.avatar,
      coins: baseScore * 80 + Math.floor(Math.random() * 5000),
      isHuman: false,
      cards: [],
      ready: true,
      scoreDelta: 0
    });
  }

  let landlordCards: Card[] = [];
  let mahjongWallCount = 0;

  if (gameType === 'doudizhu') {
    const deck = createPokerDeck(true); // 54 cards
    landlordCards = deck.slice(51, 54);
    players[0].cards = sortCards(deck.slice(0, 17));
    players[1].cards = sortCards(deck.slice(17, 34));
    players[2].cards = sortCards(deck.slice(34, 51));
  } else if (gameType === 'bigtwo') {
    const deck = createPokerDeck(false); // 52 cards, no jokers
    players[0].cards = sortCards(deck.slice(0, 13));
    players[1].cards = sortCards(deck.slice(13, 26));
    players[2].cards = sortCards(deck.slice(26, 39));
    players[3].cards = sortCards(deck.slice(39, 52));
  } else if (gameType === 'paodekuai') {
    const deck = createPokerDeck(false).slice(0, 48); // 48 cards (16 per player)
    players[0].cards = sortCards(deck.slice(0, 16));
    players[1].cards = sortCards(deck.slice(16, 32));
    players[2].cards = sortCards(deck.slice(32, 48));
  } else if (gameType === 'thirteen') {
    const deck = createPokerDeck(false); // 52 cards (13 each)
    players.forEach((p, idx) => {
      p.cards = sortCards(deck.slice(idx * 13, (idx + 1) * 13));
      // Auto arrange for bots
      p.arrangedHands = {
        head: p.cards.slice(10, 13),
        mid: p.cards.slice(5, 10),
        tail: p.cards.slice(0, 5)
      };
    });
  } else if (gameType === 'mahjong') {
    const tiles = createMahjongTiles(); // 108 tiles
    players.forEach((p, idx) => {
      p.tiles = sortMahjongTiles(tiles.slice(idx * 13, (idx + 1) * 13));
      p.discardedTiles = [];
      p.melds = [];
    });
    // First player gets 14th tile
    players[0].tiles = sortMahjongTiles([...(players[0].tiles || []), tiles[52]]);
    mahjongWallCount = 108 - 53;
  }

  // Determine starting turn
  let initialTurnIndex = 0;
  let status: RoomState['status'] = 'playing';

  if (gameType === 'doudizhu') {
    status = 'bidding';
    initialTurnIndex = 0; // human bids first
  } else if (gameType === 'bigtwo') {
    // Player holding Diamond 3 (方块3) goes first
    for (let i = 0; i < players.length; i++) {
      if (players[i].cards.some(c => c.rank === 3 && c.suit === 'diamond')) {
        initialTurnIndex = i;
        break;
      }
    }
  } else if (gameType === 'paodekuai') {
    // Player holding Spade 3 (黑桃3) goes first
    for (let i = 0; i < players.length; i++) {
      if (players[i].cards.some(c => c.rank === 3 && c.suit === 'spade')) {
        initialTurnIndex = i;
        break;
      }
    }
  } else if (gameType === 'thirteen') {
    status = 'arranging';
  }

  return {
    roomId,
    gameType,
    roomTier,
    baseScore,
    multiplier: 1,
    status,
    players,
    currentTurnIndex: initialTurnIndex,
    lastPlayedHand: null,
    lastPlayerId: null,
    passCount: 0,
    landlordId: null,
    landlordCards,
    mahjongWallCount,
    drawnTile: null,
    turnTimeLeft: 20,
    settlementDetails: null
  };
}

// Generate gRPC log mock
export function createGrpcLog(service: GrpcLogEntry['service'], method: string, req: Record<string, unknown>, resp: Record<string, unknown>): GrpcLogEntry {
  const now = new Date();
  return {
    id: `grpc_${Math.random().toString(36).substring(2, 8)}`,
    timestamp: now.toLocaleTimeString() + '.' + String(now.getMilliseconds()).padStart(3, '0'),
    service,
    method,
    latencyMs: Math.floor(Math.random() * 3) + 1, // 1-3ms
    status: 'OK',
    req,
    resp
  };
}

// Generate Redis Keys Snapshot
export function generateRedisStateSnapshot(room: RoomState): RedisKeyEntry[] {
  return [
    {
      key: `game:room:${room.roomId}:state`,
      type: 'HASH',
      ttl: 1780,
      sizeBytes: 1420,
      summary: `状态: ${room.status} | 回合: ${room.players[room.currentTurnIndex]?.name} | 倍数: ${room.multiplier}x`,
      value: {
        game_type: room.gameType,
        tier: room.roomTier,
        status: room.status,
        base_score: room.baseScore,
        multiplier: room.multiplier,
        current_turn: room.players[room.currentTurnIndex]?.id,
        landlord_id: room.landlordId || 'none'
      }
    },
    {
      key: `lock:room:${room.roomId}`,
      type: 'STRING',
      ttl: 2,
      sizeBytes: 36,
      summary: 'Lua原子分布式锁 (NX PX 2000ms)',
      value: `token_worker_node_${room.roomId.substring(0, 8)}`
    },
    {
      key: `queue:zset:matchmaking:${room.gameType}`,
      type: 'ZSET',
      ttl: -1,
      sizeBytes: 8640,
      summary: `等待中匹配玩家数: ${Math.floor(18 + Math.random() * 20)}`,
      value: {
        total_queued: 24,
        score_range: 'timestamp:epoch_ms'
      }
    },
    {
      key: `channel:room:${room.roomId}:events`,
      type: 'STREAM',
      ttl: 3600,
      sizeBytes: 3240,
      summary: 'Pub/Sub 实时动作广播通道 (QPS: 42)',
      value: {
        last_event: room.lastPlayedHand ? room.lastPlayedHand.typeDesc : 'INIT',
        subscribers: room.players.length
      }
    },
    {
      key: `wallet:user:user_me`,
      type: 'HASH',
      ttl: -1,
      sizeBytes: 128,
      summary: `玩家筹码余额: ${room.players.find(p => p.isHuman)?.coins || 0}`,
      value: {
        coins: room.players.find(p => p.isHuman)?.coins || 0,
        vip_tier: 'Diamond',
        tx_count: 142
      }
    }
  ];
}
