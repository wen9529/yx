package settlement

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sync"
	"time"
)

func newTxUUID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

type SettlementDelta struct {
	UserID     string `json:"userId"`
	Username   string `json:"username"`
	IsWinner   bool   `json:"isWinner"`
	RawScore   int64  `json:"rawScore"`
	TaxRake    int64  `json:"taxRake"`
	NetDelta   int64  `json:"netDelta"`
	FinalCoins int64  `json:"finalCoins"`
	Note       string `json:"note"`
}

type SettlementReport struct {
	TxID          string            `json:"txId"`
	RoomID        string            `json:"roomId"`
	GameType      string            `json:"gameType"`
	BaseScore     int               `json:"baseScore"`
	Multiplier    int               `json:"multiplier"`
	TotalPot      int64             `json:"totalPot"`
	HouseRake     int64             `json:"houseRake"`
	PlayerReports []SettlementDelta `json:"playerReports"`
	SettledAt     time.Time         `json:"settledAt"`
}

type SettlementEngine struct {
	mu         sync.Mutex
	rakeRate   float64 // 0.05 (5%)
	txLedger   []SettlementReport
	wallets    map[string]int64
}

func NewSettlementEngine(houseRakeRate float64) *SettlementEngine {
	return &SettlementEngine{
		rakeRate: houseRakeRate,
		txLedger: make([]SettlementReport, 0),
		wallets:  make(map[string]int64),
	}
}

// SetUserBalance sets starting balance for testing
func (e *SettlementEngine) SetUserBalance(userID string, amount int64) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.wallets[userID] = amount
}

func (e *SettlementEngine) GetUserBalance(userID string) int64 {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.wallets[userID]
}

// SettleGame performs atomic chip settlement with rake deduction
func (e *SettlementEngine) SettleGame(ctx context.Context, roomID, gameType string, baseScore, multiplier int, rawDeltas map[string]int64, usernames map[string]string) (*SettlementReport, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	txID := fmt.Sprintf("tx_set_%s_%s", time.Now().Format("20060102150405"), newTxUUID()[:6])

	var totalPot int64 = 0
	var totalRake int64 = 0
	var reports []SettlementDelta

	// 1. Calculate losers deductions first
	for uid, score := range rawDeltas {
		if score < 0 {
			loss := -score
			bal := e.wallets[uid]
			if bal < loss {
				loss = bal // Cap loss at user's max balance
			}
			e.wallets[uid] -= loss
			totalPot += loss

			reports = append(reports, SettlementDelta{
				UserID:     uid,
				Username:   usernames[uid],
				IsWinner:   false,
				RawScore:   score,
				TaxRake:    0,
				NetDelta:   -loss,
				FinalCoins: e.wallets[uid],
				Note:       fmt.Sprintf("输分: %d 底分x%d倍", loss, multiplier),
			})
		}
	}

	// 2. Allocate winnings to winners, deducting house rake
	winnerCount := 0
	for _, score := range rawDeltas {
		if score > 0 {
			winnerCount++
		}
	}

	for uid, score := range rawDeltas {
		if score > 0 {
			// Pro-rate or direct win
			winGross := score
			if totalPot > 0 && winGross > totalPot {
				winGross = totalPot
			}
			rake := int64(float64(winGross) * e.rakeRate)
			netWin := winGross - rake

			totalRake += rake
			e.wallets[uid] += netWin

			reports = append(reports, SettlementDelta{
				UserID:     uid,
				Username:   usernames[uid],
				IsWinner:   true,
				RawScore:   score,
				TaxRake:    rake,
				NetDelta:   netWin,
				FinalCoins: e.wallets[uid],
				Note:       fmt.Sprintf("获胜盈利 +%d (抽水 %d)", netWin, rake),
			})
		}
	}

	report := SettlementReport{
		TxID:          txID,
		RoomID:        roomID,
		GameType:      gameType,
		BaseScore:     baseScore,
		Multiplier:    multiplier,
		TotalPot:      totalPot,
		HouseRake:     totalRake,
		PlayerReports: reports,
		SettledAt:     time.Now(),
	}

	e.txLedger = append(e.txLedger, report)
	return &report, nil
}
