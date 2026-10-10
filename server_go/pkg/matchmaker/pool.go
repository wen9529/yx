import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sync"
	"sync/atomic"
	"time"
)

func newMatchUUID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

type GameType string

const (
	TypeDoudizhu   GameType = "doudizhu"
	TypeBigTwo     GameType = "bigtwo"
	TypePaoDeKuai  GameType = "paodekuai"
	TypeThirteen   GameType = "thirteen"
	TypeMahjong    GameType = "mahjong"
)

type RoomTier string

const (
	TierNovice RoomTier = "novice" // 底分 100
	TierMid    RoomTier = "mid"    // 底分 500
	TierHigh   RoomTier = "high"   // 底分 2000
	TierMaster RoomTier = "master" // 底分 10000
)

// MatchTicket represents player in matchmaking queue
type MatchTicket struct {
	TicketID      string
	UserID        string
	Username      string
	Coins         int64
	GameType      GameType
	Tier          RoomTier
	EnqueuedAt    time.Time
	ResultChan    chan MatchResult
	Cancelled     uint32
}

type MatchResult struct {
	Success       bool
	RoomID        string
	GameType      GameType
	Tier          RoomTier
	BaseScore     int
	MatchedPeers  []PeerInfo
	ServerShardID string
	LatencyMs     int64
}

type PeerInfo struct {
	UserID   string `json:"userId"`
	Username string `json:"username"`
	IsBot    bool   `json:"isBot"`
	Coins    int64  `json:"coins"`
}

// MatchmakingPool orchestrates high-concurrency queues
type MatchmakingPool struct {
	mu           sync.RWMutex
	queues       map[string][]*MatchTicket // key: game:tier
	activeCounts map[string]int64
	maxTimeout   time.Duration
	workerCount  int
	stopChan     chan struct{}
	totalMatched uint64
	totalQueued  uint64
}

func NewMatchmakingPool(workerCount int, maxWaitTimeout time.Duration) *MatchmakingPool {
	return &MatchmakingPool{
		queues:       make(map[string][]*MatchTicket),
		activeCounts: make(map[string]int64),
		maxTimeout:   maxWaitTimeout,
		workerCount:  workerCount,
		stopChan:     make(chan struct{}),
	}
}

// Start spawns worker goroutines to process queues concurrently
func (p *MatchmakingPool) Start(ctx context.Context) {
	for i := 0; i < p.workerCount; i++ {
		go p.workerLoop(ctx, i)
	}
}

func (p *MatchmakingPool) Stop() {
	close(p.stopChan)
}

func (p *MatchmakingPool) queueKey(game GameType, tier RoomTier) string {
	return fmt.Sprintf("%s:%s", game, tier)
}

// Enqueue adds ticket to matching queue
func (p *MatchmakingPool) Enqueue(ticket *MatchTicket) {
	atomic.AddUint64(&p.totalQueued, 1)
	p.mu.Lock()
	defer p.mu.Unlock()

	k := p.queueKey(ticket.GameType, ticket.Tier)
	p.queues[k] = append(p.queues[k], ticket)
	p.activeCounts[k]++
}

// Cancel removes ticket
func (p *MatchmakingPool) Cancel(ticketID string) bool {
	p.mu.Lock()
	defer p.mu.Unlock()

	for k, list := range p.queues {
		for i, t := range list {
			if t.TicketID == ticketID {
				atomic.StoreUint32(&t.Cancelled, 1)
				p.queues[k] = append(list[:i], list[i+1:]...)
				p.activeCounts[k]--
				return true
			}
		}
	}
	return false
}

// requiredPlayers returns players required per game
func requiredPlayers(game GameType) int {
	switch game {
	case TypeDoudizhu, TypePaoDeKuai:
		return 3
	default:
		return 4 // BigTwo, Thirteen, Mahjong
	}
}

// workerLoop drains and pairs queues
func (p *MatchmakingPool) workerLoop(ctx context.Context, workerID int) {
	ticker := time.NewTicker(30 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-p.stopChan:
			return
		case <-ticker.C:
			p.processQueueBatch()
		}
	}
}

func (p *MatchmakingPool) processQueueBatch() {
	p.mu.Lock()
	defer p.mu.Unlock()

	for k, list := range p.queues {
		if len(list) == 0 {
			continue
		}

		firstTicket := list[0]
		need := requiredPlayers(firstTicket.GameType)

		// 1. If we have enough real players, pair them directly
		if len(list) >= need {
			matched := list[:need]
			p.queues[k] = list[need:]
			p.activeCounts[k] -= int64(need)
			p.dispatchRoom(matched, firstTicket.GameType, firstTicket.Tier, false)
			continue
		}

		// 2. Check timeout for oldest player -> fill with smart Bot AI
		now := time.Now()
		if now.Sub(firstTicket.EnqueuedAt) >= p.maxTimeout {
			matched := list[:1]
			p.queues[k] = list[1:]
			p.activeCounts[k]--
			p.dispatchRoom(matched, firstTicket.GameType, firstTicket.Tier, true)
		}
	}
}

func (p *MatchmakingPool) dispatchRoom(players []*MatchTicket, game GameType, tier RoomTier, fillBots bool) {
	atomic.AddUint64(&p.totalMatched, uint64(len(players)))
	roomID := fmt.Sprintf("rm_%s_%s", game, newMatchUUID()[:8])
	baseScore := 100
	switch tier {
	case TierMid:
		baseScore = 500
	case TierHigh:
		baseScore = 2000
	case TierMaster:
		baseScore = 10000
	}

	needed := requiredPlayers(game)
	var peers []PeerInfo

	for _, t := range players {
		peers = append(peers, PeerInfo{
			UserID:   t.UserID,
			Username: t.Username,
			IsBot:    false,
			Coins:    t.Coins,
		})
	}

	if fillBots {
		botNames := []string{"雀神阿财", "赌怪高进", "赌圣阿星", "九指神丐", "东方不败", "常胜将军"}
		for i := len(players); i < needed; i++ {
			bName := botNames[(time.Now().Nanosecond()+i)%len(botNames)]
			peers = append(peers, PeerInfo{
				UserID:   fmt.Sprintf("bot_%d", time.Now().UnixNano()%10000+int64(i)),
				Username: bName,
				IsBot:    true,
				Coins:    int64(baseScore * 100),
			})
		}
	}

	shardID := fmt.Sprintf("node-shanghai-%d", (time.Now().UnixNano()%4)+1)

	for _, t := range players {
		if atomic.LoadUint32(&t.Cancelled) == 1 {
			continue
		}
		t.ResultChan <- MatchResult{
			Success:       true,
			RoomID:        roomID,
			GameType:      game,
			Tier:          tier,
			BaseScore:     baseScore,
			MatchedPeers:  peers,
			ServerShardID: shardID,
			LatencyMs:     time.Since(t.EnqueuedAt).Milliseconds(),
		}
	}
}
