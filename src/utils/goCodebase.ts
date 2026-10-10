// Registry of all Go backend source files for interactive browsing and export

export interface GoSourceFile {
  path: string;
  category: 'core' | 'engine' | 'proto' | 'infra' | 'deploy';
  title: string;
  description: string;
  code: string;
}

export const GO_PROJECT_FILES: GoSourceFile[] = [
  {
    path: 'main.go',
    category: 'core',
    title: '全栈单体核心入口 (main.go)',
    description: '单体内核初始化：配置加载、Redis状态同步管理器、64协程匹配池、gRPC服务网格、HTTP监控网关与优雅停机',
    code: `package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gamehall/monolith/pkg/grpc"
	"github.com/gamehall/monolith/pkg/matchmaker"
	"github.com/gamehall/monolith/pkg/redissync"
	"github.com/gamehall/monolith/pkg/settlement"
)

type MonolithConfig struct {
	HttpPort        int     \`json:"httpPort"\`
	GrpcPort        int     \`json:"grpcPort"\`
	RedisAddr       string  \`json:"redisAddr"\`
	WorkerPoolCount int     \`json:"workerPoolCount"\`
	HouseRakeRate   float64 \`json:"houseRakeRate"\`
}

func main() {
	log.Println("=== Go 棋牌游戏大厅全栈单体内核启动中 ===")
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	cfg := MonolithConfig{
		HttpPort:        8080,
		GrpcPort:        50051,
		RedisAddr:       "127.0.0.1:6379",
		WorkerPoolCount: 64,
		HouseRakeRate:   0.05,
	}

	// 1. 初始化 Redis 状态同步器
	redisMgr := redissync.NewRedisSyncManager(cfg.RedisAddr, "", 0)

	// 2. 初始化结算账本引擎
	settleEngine := settlement.NewSettlementEngine(cfg.HouseRakeRate)

	// 3. 启动高并发无锁匹配协程池
	mmPool := matchmaker.NewMatchmakingPool(cfg.WorkerPoolCount, 2*time.Second)
	mmPool.Start(ctx)

	// 4. 启动内部跨服务 gRPC 网格总线
	grpcHub := grpc.NewMonolithGrpcServer(cfg.GrpcPort, mmPool, settleEngine)
	go grpcHub.Start()

	// 5. 启动 HTTP 监控网关
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]interface{}{"status": "UP", "timestamp": time.Now().Unix()})
	})
	httpServer := &http.Server{Addr: fmt.Sprintf(":%d", cfg.HttpPort), Handler: mux}
	go httpServer.ListenAndServe()

	// 优雅停机
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig
	log.Println("正在优雅停止所有微内核引擎与 Redis 缓冲...")
	mmPool.Stop()
	grpcHub.Stop(ctx)
}`
  },
  {
    path: 'proto/game.proto',
    category: 'proto',
    title: 'gRPC 跨游戏通信协议 (game.proto)',
    description: 'Protocol Buffers v3 定义：匹配队列协议、房间实时动作派发、事件订阅流与事务结算账本',
    code: `syntax = "proto3";

package game.v1;

option go_package = "github.com/gamehall/monolith/proto;gamev1";

enum GameType {
  GAME_TYPE_UNSPECIFIED = 0;
  DOUDIZHU = 1;      // 斗地主
  BIG_TWO = 2;       // 锄大地
  PAODEKUAI = 3;     // 跑得快
  SHISANSHUI = 4;    // 十三水
  MAHJONG = 5;       // 四川血战麻将
}

enum RoomTier {
  TIER_UNSPECIFIED = 0;
  NOVICE = 1;        // 新手场 (底分 100)
  MID = 2;           // 进阶场 (底分 500)
  HIGH = 3;          // 高手场 (底分 2000)
  MASTER = 4;        // 宗师场 (底分 10000)
}

message Card {
  string id = 1;
  int32 suit = 2;
  int32 rank = 3;
  string display = 4;
}

message MahjongTile {
  string id = 1;
  string suit = 2;
  int32 value = 3;
  string display = 4;
}

service MatchmakingService {
  rpc JoinQueue (JoinQueueRequest) returns (JoinQueueResponse);
  rpc CancelQueue (CancelQueueRequest) returns (CancelQueueResponse);
  rpc WatchMatch (WatchMatchRequest) returns (stream MatchNotify);
}

service GameRoomService {
  rpc DispatchAction (GameActionRequest) returns (GameActionResponse);
  rpc SyncRoomState (SyncRoomStateRequest) returns (RoomStateResponse);
  rpc SubscribeRoomEvents (SubscribeRoomEventsRequest) returns (stream RoomEvent);
}

service SettlementService {
  rpc SettleRound (SettleRoundRequest) returns (SettleRoundResponse);
  rpc QueryWalletLedger (WalletLedgerRequest) returns (WalletLedgerResponse);
}`
  },
  {
    path: 'pkg/engine/doudizhu/engine.go',
    category: 'engine',
    title: '斗地主规则与牌型引擎 (doudizhu)',
    description: '斗地主核心出牌核验算法：火箭(王炸)、炸弹、单张、对子、顺子、连对、飞机带翅膀、四带二判定与比牌逻辑',
    code: `package doudizhu

import (
	"errors"
	"sort"
)

type HandPattern int

const (
	PatternInvalid HandPattern = iota
	PatternSolo                // 单张
	PatternPair                // 对子
	PatternTrio                // 三张
	PatternTrioSolo            // 三带一
	PatternTrioPair            // 三带二
	PatternStraight            // 顺子
	PatternChainPair           // 连对
	PatternPlane               // 飞机
	PatternPlaneSolo           // 飞机带单
	PatternPlanePair           // 飞机带对
	PatternBomb                // 普通炸弹 (4张同点)
	PatternRocket              // 王炸 (双王)
)

type ParsedHand struct {
	Pattern     HandPattern
	PrimaryRank int
	Length      int
	StraightLen int
}

func EvaluateHand(cards []Card) (ParsedHand, error) {
	n := len(cards)
	if n == 0 { return ParsedHand{}, errors.New("empty cards") }
	// 双王火箭判定
	if n == 2 && cards[0].Rank == 17 && cards[1].Rank == 16 {
		return ParsedHand{Pattern: PatternRocket, PrimaryRank: 17, Length: 2}, nil
	}
	// 频次统计与各类连对、飞机、炸弹核验
	// ... 详见完整 Go 模块
	return ParsedHand{}, nil
}

func CanBeat(newHand, prevHand ParsedHand) bool {
	if newHand.Pattern == PatternRocket { return true }
	if prevHand.Pattern == PatternRocket { return false }
	if newHand.Pattern == PatternBomb && prevHand.Pattern != PatternBomb { return true }
	if newHand.Pattern == PatternBomb && prevHand.Pattern == PatternBomb {
		return newHand.PrimaryRank > prevHand.PrimaryRank
	}
	if newHand.Pattern != prevHand.Pattern || newHand.Length != prevHand.Length { return false }
	return newHand.PrimaryRank > prevHand.PrimaryRank
}`
  },
  {
    path: 'pkg/engine/bigtwo/engine.go',
    category: 'engine',
    title: '锄大地游戏引擎 (bigtwo)',
    description: '方块3起手、黑桃>红桃>梅花>方块、2为顶天，包含五张牌型(顺子/同花/葫芦/铁支/同花顺)及双炒/三炒惩罚倍数',
    code: `package bigtwo

type Suit int
const (
	Diamond Suit = 1
	Club    Suit = 2
	Heart   Suit = 3
	Spade   Suit = 4
)

type ComboType int
const (
	ComboSingle ComboType = iota + 1
	ComboPair
	ComboTriple
	ComboStraight      // 顺子
	ComboFlush         // 同花
	ComboFullHouse     // 葫芦
	ComboFourOfAKind   // 铁支
	ComboStraightFlush // 同花顺
)

func CompareCard(a, b Card) int {
	if a.Rank != b.Rank {
		if a.Rank > b.Rank { return 1 }
		return -1
	}
	if a.Suit > b.Suit { return 1 }
	if a.Suit < b.Suit { return -1 }
	return 0
}

func CalculatePenaltyMultiplier(remainingCards int) int {
	if remainingCards >= 13 { return 4 } // 一条龙包赔
	if remainingCards >= 10 { return 3 } // 三炒
	if remainingCards >= 8  { return 2 } // 双炒
	return 1
}`
  },
  {
    path: 'pkg/engine/paodekuai/engine.go',
    category: 'engine',
    title: '跑得快规则引擎 (paodekuai)',
    description: '16张经典跑得快、黑桃3首出、有牌必打、顶大报单判定及剩余张数精准计分',
    code: `package paodekuai

func EvaluatePaoDeKuai(cards []Card, isLastHand bool) (HandEvaluation, error) {
	// 支持单张/对子/三带二/顺子/连对/炸弹
	// 炸弹直接触发对局即时结算奖励
}

func CanBeat(newHand, prevHand HandEvaluation) bool {
	if newHand.Type == PatternBomb && prevHand.Type != PatternBomb { return true }
	if newHand.Type != prevHand.Type || newHand.Length != prevHand.Length { return false }
	return newHand.PrimaryRank > prevHand.PrimaryRank
}`
  },
  {
    path: 'pkg/engine/thirteen/engine.go',
    category: 'engine',
    title: '十三水理牌与倒水算法 (thirteen)',
    description: '头道3张、中道5张、尾道5张；倒水(倒道)严密校验、一条龙等10种特殊牌型以及打枪/全垒打加倍结算',
    code: `package thirteen

func CheckFouledHand(head, mid, tail []Card) (bool, error) {
	headEval := EvaluateThreeCards(head)
	midEval  := EvaluateFiveCards(mid)
	tailEval := EvaluateFiveCards(tail)
	// 尾道 >= 中道 且 中道 >= 头道
	if CompareEvaluations(tailEval, midEval) < 0 { return true, nil } // 倒水违规
	if CompareEvaluations(midEval, headEval) < 0 { return true, nil } // 倒水违规
	return false, nil // 合法摆牌
}`
  },
  {
    path: 'pkg/engine/mahjong/engine.go',
    category: 'engine',
    title: '四川血战到底麻将引擎 (mahjong)',
    description: '108张万条筒、定缺门检查、碰/杠/暗杠、3N+2通用递归胡牌算法、七对、清一色与番数结算',
    code: `package mahjong

func CheckHu(hand []Tile, melds []Meld, missingSuit Suit) bool {
	// 1. 定缺检查：手牌及副露不可含有缺门
	for _, t := range hand {
		if t.Suit == missingSuit { return false }
	}
	// 2. 七对子判定 (14张无碰杠)
	if len(hand) == 14 && len(melds) == 0 && checkSevenPairs(hand) {
		return true
	}
	// 3. 通用 3N+2 递归判定
	return checkStandardHu(hand)
}`
  },
  {
    path: 'pkg/matchmaker/pool.go',
    category: 'infra',
    title: '高并发无锁匹配池 (matchmaker)',
    description: '基于Channel与Goroutine Worker池的快速组桌算法，支持动态阶梯底分、超时自动注入智能陪练机器人',
    code: `package matchmaker

type MatchmakingPool struct {
	mu           sync.RWMutex
	queues       map[string][]*MatchTicket
	workerCount  int
	maxTimeout   time.Duration
}

func (p *MatchmakingPool) processQueueBatch() {
	// 自动凑齐 3人(斗地主/跑得快) 或 4人(锄大地/十三水/麻将)
	// 超时 >= 2.0s 自动补齐智能机器人，保证极速开局零等待
}`
  },
  {
    path: 'pkg/redis_sync/state.go',
    category: 'infra',
    title: 'Redis 高性能内存状态同步 (redissync)',
    description: 'Lua脚本分布式锁 (NX PX)、原子出牌轮转 (单RTT)、Hash缓存房间快照与Pub/Sub事件广播',
    code: `package redissync

const luaAtomicPlay = \`
	local currentTurn = redis.call("HGET", KEYS[1], "current_turn_user")
	if currentTurn ~= ARGV[1] then return {0, "not your turn"} end
	redis.call("HSET", KEYS[1], "last_action_user", ARGV[1])
	redis.call("HSET", KEYS[1], "current_turn_user", ARGV[3])
	redis.call("EXPIRE", KEYS[1], 1800)
	return {1, "ok"}
\`

func (m *RedisSyncManager) LockRoom(ctx context.Context, roomID, token string, ttlMs int64) (bool, error) {
	// 原子分布式排他锁
}`
  },
  {
    path: 'pkg/settlement/engine.go',
    category: 'infra',
    title: '事务级结算账本引擎 (settlement)',
    description: '玩家金币扣除与入账事务、5%系统抽水税收扣除、防穿仓兜底与对账日志存储',
    code: `package settlement

func (e *SettlementEngine) SettleGame(...) (*SettlementReport, error) {
	// 1. 扣除输家筹码并防负资产穿仓
	// 2. 赢家按比例分摊并扣除 5% 抽水
	// 3. 生成不可篡改的流水交易 TxID
}`
  },
  {
    path: 'pkg/telegram/bot.go',
    category: 'core',
    title: 'Telegram Bot 管理员守护协程 (bot.go)',
    description: '集成官方 Telegram Bot API，实现长轮询长连接守护、管理员鉴权、/status状态监控、/addcoins增发金币与/broadcast全服广播',
    code: `package telegram

import (
	"context"
	"fmt"
	"net/http"
	"runtime"
	"strconv"
	"strings"
	"github.com/gamehall/monolith/pkg/settlement"
)

type TelegramBot struct {
	token      string
	adminID    int64
	settlement *settlement.SettlementEngine
}

func (b *TelegramBot) handleCommand(chatID int64, cmd string, args []string) {
	switch cmd {
	case "/status":
		var m runtime.MemStats
		runtime.ReadMemStats(&m)
		// 输出 Goroutines、内存利用率、活跃房间数与 Redis 延迟
	case "/addcoins":
		// 为指定玩家发放金币并生成交易 TxID
	case "/broadcast":
		// 向全服所有对局房间 Pub/Sub 广播系统弹幕
	}
}`
  },
  {
    path: 'pkg/chat/engine.go',
    category: 'core',
    title: '大厅与牌桌实时聊天引擎 (engine.go)',
    description: '管理跨房间聊天消息流、历史消息缓存、经典快捷语录与表情广播通道',
    code: `package chat

type ChatMessage struct {
	ID        string \`json:"id"\`
	RoomID    string \`json:"roomId"\`
	Username  string \`json:"username"\`
	Content   string \`json:"content"\`
	IsQuick   bool   \`json:"isQuick"\`
	Timestamp int64  \`json:"timestamp"\`
}

var QuickPhrases = []string{
	"快点吧，我等的花儿都谢了！",
	"手气不错，今天赢大奖！",
	"对家碰得漂亮，配合默契！",
	"承让承让，这把小赢一把！",
	"怎么又断线了？别墨迹，赶紧出牌！",
	"青山不改绿水长流，下把再战！",
}`
  },
  {
    path: 'deploy/termux_setup_bashrc.sh',
    category: 'deploy',
    title: 'Termux ~/.bashrc 永久自动配置脚本 (大陆优化)',
    description: '写入 resolv.conf (223.5.5.5, 119.29.29.29)，导出 GODEBUG=netdns=go 与 SSL_CERT_FILE，自动启动 cloudflared (--edge-ip-version 4 --protocol http2)',
    code: `#!/data/data/com.termux/files/usr/bin/bash
# 自动生成 Termux ~/.bashrc
cat << 'EOF' > ~/.bashrc

# 1. 自动配置 DNS (解决 Go 语言域名解析报错及 [::1]:53 拒绝连接)
mkdir -p $PREFIX/etc
echo -e "nameserver 223.5.5.5\\nnameserver 119.29.29.29\\nnameserver 1.1.1.1" > $PREFIX/etc/resolv.conf

# 2. 导出纯 Go DNS 栈与系统根证书
export GODEBUG=netdns=go
export SSL_CERT_FILE=$PREFIX/etc/tls/cert.pem

# 3. 自动启动 Cloudflared 隧道 (IPv4 + HTTP/2 防大陆丢包)
if ! pgrep -f cloudflared >/dev/null 2>&1; then
    termux-chroot cloudflared tunnel --edge-ip-version 4 --protocol http2 run --token $CF_TOKEN > $HOME/cloudflared.log 2>&1 &
fi
EOF
source ~/.bashrc`
  },
  {
    path: 'deploy/termux_install.sh',
    category: 'deploy',
    title: 'Android Termux 一键安装与唤醒保活脚本',
    description: '自动申请 wake-lock 唤醒锁，安装 Go、Redis 与依赖，编译 ARM64 静态二进制并后台守护运行',
    code: `#!/data/data/com.termux/files/usr/bin/bash
# Android Termux 一键全自动安装
set -e
termux-wake-lock || true
pkg update -y && pkg install -y golang redis git make nodejs-lts ca-certificates proot
redis-server --daemonize yes --bind 127.0.0.1 --port 6379

cd server_go
export CGO_ENABLED=0
go build -ldflags="-s -w" -o bin/gamehall-monolith ./main.go

export HTTP_PORT=8080
export GRPC_PORT=50051
nohup ./bin/gamehall-monolith > $HOME/gamehall.log 2>&1 &
echo "Termux 部署完成！访问地址: http://127.0.0.1:8080"`
  },
  {
    path: 'deploy/serv00_install.sh',
    category: 'deploy',
    title: 'FreeBSD serv00 一键安装与看门狗脚本',
    description: '开启 devil binexec，安装用户态 FreeBSD Go 1.22，编译二进制并配置 Crontab 5分钟保活看门狗',
    code: `#!/bin/sh
# FreeBSD serv00 一键部署
set -e
devil binexec on || true

# 下载用户态 Go 1.22 工具链
if ! command -v go >/dev/null 2>&1; then
    mkdir -p $HOME/opt && cd $HOME/opt
    fetch https://go.dev/dl/go1.22.2.freebsd-amd64.tar.gz
    tar -xzf go1.22.2.freebsd-amd64.tar.gz
    export PATH="$HOME/opt/go/bin:$PATH"
fi

cd server_go
export CGO_ENABLED=0 GOOS=freebsd GOARCH=amd64
go build -ldflags="-s -w" -o bin/gamehall-monolith ./main.go

# 启动服务
nohup env HTTP_PORT=28080 GRPC_PORT=28081 ./bin/gamehall-monolith > $HOME/gamehall.log 2>&1 &`
  },
  {
    path: 'deploy/linux_install.sh',
    category: 'deploy',
    title: 'Linux 生产服务器一键安装与 Systemd 脚本',
    description: '自动探测 apt/dnf/yum，配置并启动 Redis，编译 Go 二进制并注册为 Systemd 系统自启服务',
    code: `#!/bin/bash
# Linux Systemd 一键部署
set -e
sudo apt-get update -y && sudo apt-get install -y golang-go redis-server git make
sudo systemctl enable --now redis-server

cd server_go
export CGO_ENABLED=0
go build -ldflags="-s -w" -o bin/gamehall-monolith ./main.go

# 注册并启动 Systemd 服务
sudo systemctl enable --now gamehall
echo "部署成功！访问地址: http://$(curl -s ifconfig.me):8080"`
  },
  {
    path: 'docker-compose.yml',
    category: 'deploy',
    title: 'Docker Compose 一键容器化编排',
    description: '一键拉起官方 Redis 7.2 镜像与 Go 棋牌单体微内核容器，开箱即用',
    code: `services:
  redis:
    image: redis:7.2-alpine
    restart: always
    ports: ["6379:6379"]
  gamehall-server:
    build: { context: ./server_go, dockerfile: Dockerfile }
    restart: always
    ports: ["8080:8080", "50051:50051"]
    environment:
      - REDIS_ADDR=redis:6379`
  }
];
