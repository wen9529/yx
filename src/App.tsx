/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameType, RoomState } from './types/game';
import { initializeRoom } from './services/simulationEngine';
import { sounds } from './utils/sound';
import { Navbar } from './components/Navbar';
import { Lobby } from './components/Lobby';
import { GameTable } from './components/Table/GameTable';
import { ArchitectureMonitor } from './components/ArchitectureMonitor';
import { CodeExplorer } from './components/CodeExplorer';
import { DeploymentHub } from './components/DeploymentHub';
import { TelegramAdmin } from './components/TelegramAdmin';

export default function App() {
  const [coins, setCoins] = useState<number>(68888);
  const [activeTab, setActiveTab] = useState<'lobby' | 'table' | 'telegram' | 'architecture' | 'code' | 'deploy'>('lobby');
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [activeAnnouncement, setActiveAnnouncement] = useState<string | null>(null);

  // Top up gold coins
  const handleAddCoins = (amount: number = 10000) => {
    setCoins(prev => prev + amount);
    if (roomState) {
      setRoomState(prev => prev ? {
        ...prev,
        players: prev.players.map(p => p.isHuman ? { ...p, coins: p.coins + amount } : p)
      } : null);
    }
  };

  const handleBroadcastAnnouncement = (text: string) => {
    setActiveAnnouncement(text);
  };

  // Toggle Sound
  const handleToggleSound = () => {
    const next = sounds.toggle();
    setSoundEnabled(next);
  };

  // Start new game session
  const handleStartGame = (gameType: GameType, tier: 'novice' | 'mid' | 'high' | 'master') => {
    const newRoom = initializeRoom(gameType, tier, coins);
    setRoomState(newRoom);
    setActiveTab('table');
    sounds.playChips();
  };

  // Leave active room
  const handleLeaveRoom = () => {
    if (roomState) {
      // Sync coins from room's human player
      const human = roomState.players.find(p => p.isHuman);
      if (human) {
        setCoins(human.coins);
      }
    }
    setRoomState(null);
    setActiveTab('lobby');
  };

  // Play another round in current room
  const handlePlayAgain = () => {
    if (!roomState) return;
    const human = roomState.players.find(p => p.isHuman);
    const updatedCoins = human ? human.coins : coins;
    setCoins(updatedCoins);
    const newRoom = initializeRoom(roomState.gameType, roomState.roomTier, updatedCoins);
    setRoomState(newRoom);
    sounds.playChips();
  };

  const handleUpdateRoomState = (updater: (prev: RoomState) => RoomState) => {
    setRoomState(prev => (prev ? updater(prev) : null));
  };

  const getGameZhName = (gt: GameType) => {
    switch (gt) {
      case 'doudizhu': return '斗地主';
      case 'bigtwo': return '锄大地';
      case 'paodekuai': return '跑得快';
      case 'thirteen': return '十三水';
      case 'mahjong': return '四川麻将';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* Top Navbar */}
      <Navbar
        coins={coins}
        onAddCoins={handleAddCoins}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasActiveGame={roomState !== null}
        gameTypeTitle={roomState ? getGameZhName(roomState.gameType) : undefined}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />

      {/* Global Broadcast Announcement Banner from TG Bot or Admin */}
      {activeAnnouncement && (
        <div className="bg-gradient-to-r from-amber-600/90 via-red-600/90 to-amber-600/90 text-white px-4 py-2.5 shadow-lg border-b border-amber-400/40 flex items-center justify-between text-xs sm:text-sm font-bold">
          <div className="max-w-7xl mx-auto flex items-center gap-2.5 flex-1 overflow-hidden">
            <span className="text-base shrink-0">📢</span>
            <span className="bg-neutral-950/40 px-2 py-0.5 rounded text-[11px] font-mono tracking-wider border border-white/20 shrink-0">全服系统广播</span>
            <span className="font-sans tracking-wide truncate">{activeAnnouncement}</span>
          </div>
          <button
            onClick={() => setActiveAnnouncement(null)}
            className="text-white/80 hover:text-white px-2 py-1 text-xs rounded hover:bg-black/20 cursor-pointer shrink-0"
          >
            ✕ 关闭
          </button>
        </div>
      )}

      {/* Main Tab Content */}
      <main className="flex-1 pb-16">
        {activeTab === 'lobby' && (
          <Lobby
            onStartGame={handleStartGame}
            userCoins={coins}
          />
        )}

        {activeTab === 'table' && roomState && (
          <GameTable
            roomState={roomState}
            onLeaveRoom={handleLeaveRoom}
            onPlayAgain={handlePlayAgain}
            onUpdateRoomState={handleUpdateRoomState}
          />
        )}

        {activeTab === 'telegram' && (
          <TelegramAdmin
            onAddCoins={handleAddCoins}
            onBroadcastAnnouncement={handleBroadcastAnnouncement}
            currentCoins={coins}
          />
        )}

        {activeTab === 'architecture' && (
          <ArchitectureMonitor
            currentRoom={roomState}
          />
        )}

        {activeTab === 'code' && (
          <CodeExplorer />
        )}

        {activeTab === 'deploy' && (
          <DeploymentHub />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-6 text-center text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-400">Go 棋牌游戏大厅 Monolith</span>
            <span>·</span>
            <span>锄大地 · 跑得快 · 斗地主 · 十三水 · 四川麻将</span>
          </div>
          <div className="flex items-center gap-4 text-neutral-500">
            <span>gRPC Protocol Buffers v3</span>
            <span>Redis Lua 原子分布式锁</span>
            <span>无锁协程池实时撮合</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
