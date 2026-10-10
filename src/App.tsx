/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameType, RoomState } from './types/game';
import { initializeRoom } from './services/simulationEngine';
import { authService } from './services/authService';
import { sounds } from './utils/sound';
import { Lobby } from './components/Lobby';
import { GameTable } from './components/Table/GameTable';
import { ArchitectureMonitor } from './components/ArchitectureMonitor';
import { CodeExplorer } from './components/CodeExplorer';
import { DeploymentHub } from './components/DeploymentHub';
import { TelegramAdmin } from './components/TelegramAdmin';
import { ArrowLeft, Layers } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());
  const [coins, setCoins] = useState<number>(currentUser ? currentUser.points : 68888);
  const [activeTab, setActiveTab] = useState<'lobby' | 'table' | 'telegram' | 'architecture' | 'code' | 'deploy'>('lobby');
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Sync auth state
  useEffect(() => {
    const unsub = authService.subscribe(() => {
      const u = authService.getCurrentUser();
      setCurrentUser(u ? { ...u } : null);
      if (u) {
        setCoins(u.points);
      }
    });
    return unsub;
  }, []);

  // Top up gold coins / points
  const handleAddCoins = (amount: number = 10000) => {
    setCoins(prev => {
      const next = prev + amount;
      const u = authService.getCurrentUser();
      if (u) {
        authService.updateUserPoints(u.phone, next);
      }
      return next;
    });

    if (roomState) {
      setRoomState(prev => prev ? {
        ...prev,
        players: prev.players.map(p => p.isHuman ? { ...p, coins: p.coins + amount } : p)
      } : null);
    }
  };

  // Toggle Sound
  const handleToggleSound = () => {
    const next = sounds.toggle();
    setSoundEnabled(next);
  };

  // Start new game session
  const handleStartGame = (
    gameType: GameType,
    tier: 'novice' | 'mid' | 'high' | 'master',
    userName?: string,
    userAvatar?: string
  ) => {
    const u = authService.getCurrentUser();
    const livePoints = u ? u.points : coins;
    const newRoom = initializeRoom(
      gameType,
      tier,
      livePoints,
      userName || u?.nickname,
      userAvatar || u?.avatar
    );
    setRoomState(newRoom);
    setActiveTab('table');
    sounds.playChips();
  };

  // Leave active room and return to lobby
  const handleLeaveRoom = () => {
    if (roomState) {
      const human = roomState.players.find(p => p.isHuman);
      if (human) {
        setCoins(human.coins);
        const u = authService.getCurrentUser();
        if (u) {
          authService.updateUserPoints(u.phone, human.coins);
        }
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
    const u = authService.getCurrentUser();
    if (u) {
      authService.updateUserPoints(u.phone, updatedCoins);
    }
    const newRoom = initializeRoom(
      roomState.gameType,
      roomState.roomTier,
      updatedCoins,
      u?.nickname,
      u?.avatar
    );
    setRoomState(newRoom);
    sounds.playChips();
  };

  const handleUpdateRoomState = (updater: (prev: RoomState) => RoomState) => {
    setRoomState(prev => (prev ? updater(prev) : null));
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">

      {/* Main Screen: Lobby or Table or Admin */}
      {activeTab === 'lobby' && (
        <Lobby
          onStartGame={handleStartGame}
          userCoins={coins}
          onCoinsChange={(newCoins) => setCoins(newCoins)}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onOpenAdminTools={(tab) => setActiveTab(tab)}
        />
      )}

      {activeTab === 'table' && roomState && (
        <div className="flex-1 flex flex-col">
          {/* Subtle in-table header bar to return to lobby */}
          <div className="bg-neutral-900/90 border-b border-amber-900/40 px-4 py-2.5 flex items-center justify-between text-xs">
            <button
              onClick={handleLeaveRoom}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span>返回大厅</span>
            </button>
            <div className="text-neutral-300 font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>实时对局牌桌进行中</span>
            </div>
            <div className="text-amber-300 font-mono font-bold">
              🪙 积分: {coins.toLocaleString()}
            </div>
          </div>

          <div className="flex-1">
            <GameTable
              roomState={roomState}
              onLeaveRoom={handleLeaveRoom}
              onPlayAgain={handlePlayAgain}
              onUpdateRoomState={handleUpdateRoomState}
            />
          </div>
        </div>
      )}

      {/* Admin views (if accessed) with explicit Back to Lobby button */}
      {activeTab !== 'lobby' && activeTab !== 'table' && (
        <div className="flex-1 flex flex-col">
          <div className="bg-neutral-900 border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setActiveTab('lobby')}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <Layers className="w-4 h-4" />
              <span>← 返回游戏大厅</span>
            </button>
            <span className="text-xs text-neutral-400 font-mono">
              管理员后台管理工具面板
            </span>
          </div>

          <main className="flex-1 pb-16">
            {activeTab === 'telegram' && (
              <TelegramAdmin
                onAddCoins={handleAddCoins}
                onBroadcastAnnouncement={() => {}}
                currentCoins={coins}
              />
            )}
            {activeTab === 'architecture' && (
              <ArchitectureMonitor currentRoom={roomState} />
            )}
            {activeTab === 'code' && (
              <CodeExplorer />
            )}
            {activeTab === 'deploy' && (
              <DeploymentHub />
            )}
          </main>
        </div>
      )}

    </div>
  );
}
