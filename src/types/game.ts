// Types for Card Games, Tiles, Rooms, State, gRPC & Redis

export type GameType = 'doudizhu' | 'bigtwo' | 'paodekuai' | 'thirteen' | 'mahjong';

export interface Card {
  id: string;
  suit: 'spade' | 'heart' | 'club' | 'diamond' | 'joker'; // 黑桃, 红桃, 梅花, 方块, 鬼牌
  rank: number; // 3-15 for 3-K, A(14), 2(15), 16: Black Joker, 17: Red Joker
  display: string; // "3", "4"..."10", "J", "Q", "K", "A", "2", "小王", "大王"
}

export type MahjongSuit = 'wan' | 'tiao' | 'tong'; // 万, 条, 筒

export interface MahjongTile {
  id: string;
  suit: MahjongSuit;
  value: number; // 1-9
  display: string; // "1万", "9条" etc.
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  coins: number;
  isHuman: boolean;
  cards: Card[];
  tiles?: MahjongTile[]; // For mahjong
  discardedTiles?: MahjongTile[]; // For mahjong pond
  melds?: MahjongMeld[]; // Pong, Kong
  ready: boolean;
  scoreDelta: number;
  role?: 'landlord' | 'peasant' | 'none'; // for Doudizhu
  arrangedHands?: {
    head: Card[];
    mid: Card[];
    tail: Card[];
  }; // for Thirteen Cards
  activeBubble?: {
    text: string;
    expiresAt: number;
  };
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  avatar: string;
  content: string;
  isQuick: boolean;
  timestamp: number;
}

export interface MahjongMeld {
  type: 'pong' | 'kong' | 'chow';
  tiles: MahjongTile[];
}

export interface PlayedHand {
  playerId: string;
  cards: Card[];
  typeDesc: string; // e.g. "单张", "对子", "顺子", "炸弹", "火箭"
  timestamp: number;
}

export interface RoomState {
  roomId: string;
  gameType: GameType;
  roomTier: 'novice' | 'mid' | 'high' | 'master';
  baseScore: number;
  multiplier: number;
  status: 'waiting' | 'bidding' | 'arranging' | 'playing' | 'settling' | 'finished';
  players: Player[];
  currentTurnIndex: number;
  lastPlayedHand: PlayedHand | null;
  lastPlayerId: string | null;
  passCount: number;
  landlordId: string | null;
  landlordCards: Card[];
  mahjongWallCount: number;
  drawnTile: MahjongTile | null;
  turnTimeLeft: number;
  settlementDetails?: SettlementRecord | null;
}

export interface SettlementPlayerResult {
  playerId: string;
  playerName: string;
  isHuman: boolean;
  isWinner: boolean;
  deltaCoins: number;
  currentCoins: number;
  details: string;
  remainingCards?: Card[];
  melds?: string[];
}

export interface SettlementRecord {
  roomId: string;
  gameType: GameType;
  baseScore: number;
  multiplier: number;
  houseRakeRate: number; // 5%
  totalPot: number;
  settledAt: string;
  results: SettlementPlayerResult[];
  specialPattern?: string; // "春天", "全垒打", "清一色"
}

export interface GrpcLogEntry {
  id: string;
  timestamp: string;
  service: 'Matchmaker' | 'RoomEngine' | 'SettlementLedger' | 'StateSync';
  method: string;
  latencyMs: number;
  status: 'OK' | 'ERROR';
  req: Record<string, unknown>;
  resp: Record<string, unknown>;
}

export interface RedisKeyEntry {
  key: string;
  type: 'HASH' | 'ZSET' | 'STRING' | 'STREAM' | 'SET';
  ttl: number; // seconds
  sizeBytes: number;
  summary: string;
  value: unknown;
}
