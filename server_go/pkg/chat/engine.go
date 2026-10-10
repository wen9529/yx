package chat

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sync"
	"time"
)

func newShortID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

type ChatMessage struct {
	ID        string `json:"id"`
	RoomID    string `json:"roomId"`
	UserID    string `json:"userId"`
	Username  string `json:"username"`
	Avatar    string `json:"avatar"`
	Content   string `json:"content"`
	IsQuick   bool   `json:"isQuick"`
	Timestamp int64  `json:"timestamp"`
}

type ChatEngine struct {
	mu           sync.RWMutex
	roomHistory  map[string][]ChatMessage // roomId -> history
	maxHistory   int
}

func NewChatEngine(maxHistory int) *ChatEngine {
	return &ChatEngine{
		roomHistory: make(map[string][]ChatMessage),
		maxHistory:  maxHistory,
	}
}

// QuickPhrases provides built-in quick voice/text phrases for card games
var QuickPhrases = []string{
	"快点吧，我等的花儿都谢了！",
	"手气不错，今天赢大奖！",
	"对家碰得漂亮，配合默契！",
	"承让承让，这把小赢一把！",
	"怎么又断线了？别墨迹，赶紧出牌！",
	"青山不改绿水长流，下把再战！",
	"一手烂牌，这把只能指望对家了！",
	"搏一搏，单车变摩托！",
}

// SendMessage sends chat message to room and stores in history
func (e *ChatEngine) SendMessage(ctx context.Context, roomID, userID, username, avatar, content string, isQuick bool) ChatMessage {
	e.mu.Lock()
	defer e.mu.Unlock()

	msg := ChatMessage{
		ID:        fmt.Sprintf("msg_%s_%s", time.Now().Format("150405"), newShortID()[:4]),
		RoomID:    roomID,
		UserID:    userID,
		Username:  username,
		Avatar:    avatar,
		Content:   content,
		IsQuick:   isQuick,
		Timestamp: time.Now().UnixMilli(),
	}

	hist := e.roomHistory[roomID]
	hist = append(hist, msg)
	if len(hist) > e.maxHistory {
		hist = hist[len(hist)-e.maxHistory:]
	}
	e.roomHistory[roomID] = hist

	return msg
}

// GetHistory returns recent messages for a room
func (e *ChatEngine) GetHistory(roomID string) []ChatMessage {
	e.mu.RLock()
	defer e.mu.RUnlock()

	hist := e.roomHistory[roomID]
	res := make([]ChatMessage, len(hist))
	copy(res, hist)
	return res
}

func (m *ChatMessage) ToJSON() []byte {
	b, _ := json.Marshal(m)
	return b
}
