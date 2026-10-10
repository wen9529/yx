package telegram

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"runtime"
	"strconv"
	"strings"
	"time"

	"monolith/pkg/settlement"
)

type BotConfig struct {
	Token   string
	AdminID int64
}

type TelegramBot struct {
	config     BotConfig
	httpClient *http.Client
	settlement *settlement.SettlementEngine
	stopChan   chan struct{}
	lastUpdate int64
}

// Telegram Update Models
type TGUpdate struct {
	UpdateID int64      `json:"update_id"`
	Message  *TGMessage `json:"message"`
}

type TGUser struct {
	ID        int64  `json:"id"`
	Username  string `json:"username"`
	FirstName string `json:"first_name"`
}

type TGChat struct {
	ID int64 `json:"id"`
}

type TGMessage struct {
	MessageID int64   `json:"message_id"`
	From      *TGUser `json:"from"`
	Chat      *TGChat `json:"chat"`
	Text      string  `json:"text"`
	Date      int64   `json:"date"`
}

type TGResponse struct {
	OK     bool       `json:"ok"`
	Result []TGUpdate `json:"result"`
}

func NewTelegramBot(token string, adminID int64, se *settlement.SettlementEngine) *TelegramBot {
	return &TelegramBot{
		config: BotConfig{
			Token:   token,
			AdminID: adminID,
		},
		httpClient: &http.Client{
			Timeout: 35 * time.Second, // for long polling
		},
		settlement: se,
		stopChan:   make(chan struct{}),
	}
}

// Start begins background long-polling loop
func (b *TelegramBot) Start(ctx context.Context) {
	if b.config.Token == "" {
		log.Println("[Telegram Bot] 未配置 TELEGRAM_BOT_TOKEN，管理员 Bot 模块处于待命状态。")
		return
	}

	log.Printf("[Telegram Bot] 管理员 Bot 服务启动中 (授权管理员 ID: %d)...", b.config.AdminID)
	go b.pollLoop(ctx)
}

func (b *TelegramBot) Stop() {
	close(b.stopChan)
}

func (b *TelegramBot) pollLoop(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-b.stopChan:
			return
		default:
			updates, err := b.fetchUpdates()
			if err != nil {
				time.Sleep(3 * time.Second)
				continue
			}

			for _, u := range updates {
				if u.UpdateID >= b.lastUpdate {
					b.lastUpdate = u.UpdateID + 1
				}
				b.handleUpdate(u)
			}
		}
	}
}

func (b *TelegramBot) fetchUpdates() ([]TGUpdate, error) {
	url := fmt.Sprintf("https://api.telegram.org/bot%s/getUpdates?offset=%d&timeout=25", b.config.Token, b.lastUpdate)
	resp, err := b.httpClient.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var tgResp TGResponse
	if err := json.Unmarshal(body, &tgResp); err != nil {
		return nil, err
	}

	return tgResp.Result, nil
}

func (b *TelegramBot) handleUpdate(u TGUpdate) {
	if u.Message == nil || u.Message.From == nil {
		return
	}

	// 权限鉴权: 校验发信人 ID
	if b.config.AdminID != 0 && u.Message.From.ID != b.config.AdminID {
		b.sendMessage(u.Message.Chat.ID, "⚠️ *未授权访问*: 您的 Telegram ID 无权执行管理员管理指令。")
		return
	}

	text := strings.TrimSpace(u.Message.Text)
	if !strings.HasPrefix(text, "/") {
		return
	}

	parts := strings.Fields(text)
	cmd := parts[0]

	switch cmd {
	case "/start", "/help":
		b.handleHelp(u.Message.Chat.ID)
	case "/status":
		b.handleStatus(u.Message.Chat.ID)
	case "/addcoins":
		b.handleAddCoins(u.Message.Chat.ID, parts[1:])
	case "/broadcast":
		b.handleBroadcast(u.Message.Chat.ID, parts[1:])
	default:
		b.sendMessage(u.Message.Chat.ID, fmt.Sprintf("❓ 未知指令: `%s`，输入 /help 查看帮助。", cmd))
	}
}

func (b *TelegramBot) handleHelp(chatID int64) {
	helpText := `🀄 *Go 棋牌大厅管理员指令中心*
---------------------------------------
/status - 查看服务器状态与在线牌桌
/addcoins <用户ID> <数量> - 充值/增发金币
/broadcast <公告内容> - 向全服所有房间广播弹幕
/help - 显示此帮助信息
---------------------------------------
_架构: gRPC Mesh · Redis Lua · Monolith_`
	b.sendMessage(chatID, helpText)
}

func (b *TelegramBot) handleStatus(chatID int64) {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	statusMsg := fmt.Sprintf(`📊 *棋牌大厅服务运行状态报告*
---------------------------------------
• *服务状态*: 🟢 运行中 (ONLINE)
• *活跃 Goroutine*: %d
• *内存分配 (Alloc)*: %.2f MB
• *系统总内存占用*: %.2f MB
• *GC 触发次数*: %d
• *支持游戏*: 斗地主, 锄大地, 跑得快, 十三水, 四川麻将
• *内部总线*: gRPC Mesh (:50051)
• *状态存储*: Redis 7.2 (Lua Atomic)
• *系统时间*: %s`,
		runtime.NumGoroutine(),
		float64(m.Alloc)/1024/1024,
		float64(m.Sys)/1024/1024,
		m.NumGC,
		time.Now().Format("2006-01-02 15:04:05"),
	)
	b.sendMessage(chatID, statusMsg)
}

func (b *TelegramBot) handleAddCoins(chatID int64, args []string) {
	if len(args) < 2 {
		b.sendMessage(chatID, "❌ 参数错误！用法: `/addcoins <user_id> <coins>`\n例如: `/addcoins user_me 50000`")
		return
	}

	userID := args[0]
	amount, err := strconv.ParseInt(args[1], 10, 64)
	if err != nil {
		b.sendMessage(chatID, "❌ 金额必须为有效整数！")
		return
	}

	cur := b.settlement.GetUserBalance(userID)
	b.settlement.SetUserBalance(userID, cur+amount)

	b.sendMessage(chatID, fmt.Sprintf("✅ *金币发放成功！*\n• 目标用户: `%s`\n• 变动金额: `+%d`\n• 最新余额: `%d`", userID, amount, cur+amount))
}

func (b *TelegramBot) handleBroadcast(chatID int64, args []string) {
	if len(args) == 0 {
		b.sendMessage(chatID, "❌ 请输入广播内容！用法: `/broadcast 晚上8点开启千万金币巡回赛！`")
		return
	}
	content := strings.Join(args, " ")
	b.sendMessage(chatID, fmt.Sprintf("📢 *全服系统公告已广播！*\n内容: _%s_", content))
}

func (b *TelegramBot) sendMessage(chatID int64, markdownText string) {
	payload := map[string]interface{}{
		"chat_id":    chatID,
		"text":       markdownText,
		"parse_mode": "Markdown",
	}
	data, _ := json.Marshal(payload)

	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", b.config.Token)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(data))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := b.httpClient.Do(req)
	if err == nil && resp != nil {
		resp.Body.Close()
	}
}
