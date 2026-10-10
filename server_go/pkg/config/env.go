package config

import (
	"bufio"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// Config represents server-wide configuration parameters
type Config struct {
	HttpPort        int
	GrpcPort        int
	RedisAddr       string
	RedisPass       string
	WorkerPoolCount int
	HouseRakeRate   float64

	// Telegram Bot
	TelegramBotToken string
	TelegramAdminID  int64

	// Cloudflare Tunnel
	CloudflareToken  string
	CloudflareEdgeIP string
	DnsNameservers   string

	// Env source tracking
	LoadedEnvPath string
}

// LoadEnv attempts to load environment variables from prioritized paths:
// 1. $ENV_FILE_PATH
// 2. ../.env (Project parent directory - protected from git pull overwrite)
// 3. ../../.env (Binary or subfolder parent)
// 4. ./.env (Current working directory fallback)
func LoadEnv() string {
	candidatePaths := []string{}

	if custom := os.Getenv("ENV_FILE_PATH"); custom != "" {
		candidatePaths = append(candidatePaths, custom)
	}

	// 1. Parent directory (Recommended: git pull updates won't overwrite this file)
	candidatePaths = append(candidatePaths, "../.env")
	// 2. Two levels up (e.g., if binary is running from server_go/bin)
	candidatePaths = append(candidatePaths, "../../.env")
	// 3. Current working directory fallback
	candidatePaths = append(candidatePaths, ".env")

	for _, path := range candidatePaths {
		absPath, err := filepath.Abs(path)
		if err != nil {
			absPath = path
		}

		if info, err := os.Stat(absPath); err == nil && !info.IsDir() {
			if err := parseAndSetEnv(absPath); err == nil {
				log.Printf("[Config] ✓ 成功从环境配置文件加载配置: %s (防 Git Pull 覆盖)", absPath)
				return absPath
			}
		}
	}

	log.Println("[Config] ℹ 未检测到外部 .env 文件，将使用系统环境变量与默认值")
	return ""
}

func parseAndSetEnv(filePath string) error {
	file, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])

		// Strip surrounding single or double quotes
		if (strings.HasPrefix(val, "\"") && strings.HasSuffix(val, "\"")) ||
			(strings.HasPrefix(val, "'") && strings.HasSuffix(val, "'")) {
			if len(val) >= 2 {
				val = val[1 : len(val)-1]
			}
		}

		// Set to OS environment if not already explicitly exported in current shell
		if os.Getenv(key) == "" {
			os.Setenv(key, val)
		}
	}
	return scanner.Err()
}

// LoadConfig loads and normalizes all server configurations
func LoadConfig() *Config {
	loadedPath := LoadEnv()

	httpPort := 8080
	if p := os.Getenv("HTTP_PORT"); p != "" {
		if val, err := strconv.Atoi(p); err == nil {
			httpPort = val
		}
	}

	grpcPort := 50051
	if p := os.Getenv("GRPC_PORT"); p != "" {
		if val, err := strconv.Atoi(p); err == nil {
			grpcPort = val
		}
	}

	redisAddr := "127.0.0.1:6379"
	if addr := os.Getenv("REDIS_ADDR"); addr != "" {
		redisAddr = addr
	}

	redisPass := os.Getenv("REDIS_PASS")

	workerCount := 64
	if w := os.Getenv("WORKER_POOL_COUNT"); w != "" {
		if val, err := strconv.Atoi(w); err == nil {
			workerCount = val
		}
	}

	rakeRate := 0.05
	if r := os.Getenv("HOUSE_RAKE_RATE"); r != "" {
		if val, err := strconv.ParseFloat(r, 64); err == nil {
			rakeRate = val
		}
	}

	var tgAdminID int64
	if idStr := os.Getenv("TELEGRAM_ADMIN_ID"); idStr != "" {
		tgAdminID, _ = strconv.ParseInt(idStr, 10, 64)
	}

	edgeIP := "4"
	if ip := os.Getenv("CLOUDFLARE_EDGE_IP_VERSION"); ip != "" {
		edgeIP = ip
	}

	dns := "223.5.5.5,119.29.29.29,1.1.1.1"
	if d := os.Getenv("DNS_NAMESERVERS"); d != "" {
		dns = d
	}

	return &Config{
		HttpPort:         httpPort,
		GrpcPort:         grpcPort,
		RedisAddr:        redisAddr,
		RedisPass:        redisPass,
		WorkerPoolCount:  workerCount,
		HouseRakeRate:    rakeRate,
		TelegramBotToken: os.Getenv("TELEGRAM_BOT_TOKEN"),
		TelegramAdminID:  tgAdminID,
		CloudflareToken:  os.Getenv("CLOUDFLARE_TUNNEL_TOKEN"),
		CloudflareEdgeIP: edgeIP,
		DnsNameservers:   dns,
		LoadedEnvPath:    loadedPath,
	}
}

// PrintSummary outputs a safe configuration overview (masking secrets)
func (c *Config) PrintSummary() {
	maskedToken := "未配置"
	if c.TelegramBotToken != "" {
		if len(c.TelegramBotToken) > 10 {
			maskedToken = c.TelegramBotToken[:6] + "..." + c.TelegramBotToken[len(c.TelegramBotToken)-4:]
		} else {
			maskedToken = "已配置(***)"
		}
	}

	maskedCfToken := "未配置 (Quick Tunnel 模式)"
	if c.CloudflareToken != "" {
		if len(c.CloudflareToken) > 12 {
			maskedCfToken = c.CloudflareToken[:6] + "..." + c.CloudflareToken[len(c.CloudflareToken)-4:]
		} else {
			maskedCfToken = "已配置(***)"
		}
	}

	log.Println("----------------------------------------------------------------")
	log.Printf("  HTTP 服务端口:        :%d", c.HttpPort)
	log.Printf("  gRPC 网格端口:        :%d", c.GrpcPort)
	log.Printf("  Redis 实例地址:       %s", c.RedisAddr)
	log.Printf("  并发无锁队列池:       %d 组 Goroutines", c.WorkerPoolCount)
	log.Printf("  抽水比率 (House Rake): %.1f%%", c.HouseRakeRate*100)
	log.Printf("  Telegram Bot:         %s (管理员ID: %d)", maskedToken, c.TelegramAdminID)
	log.Printf("  Cloudflare Tunnel:    %s (IPv%s)", maskedCfToken, c.CloudflareEdgeIP)
	if c.LoadedEnvPath != "" {
		log.Printf("  配置文件来源:         %s", c.LoadedEnvPath)
	} else {
		log.Println("  配置文件来源:         系统环境变量 / 默认值")
	}
	log.Println("----------------------------------------------------------------")
}
