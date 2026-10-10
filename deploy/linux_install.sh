#!/bin/bash
# ==============================================================================
# Go 棋牌游戏大厅 (Game Hall Monolith) - Linux (Ubuntu/Debian/CentOS/Rocky) 一键部署
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}==================================================================${NC}"
echo -e "${GREEN}  正在为 Linux 生产服务器部署 Go 棋牌游戏大厅全栈单体服务...      ${NC}"
echo -e "${YELLOW}==================================================================${NC}"

# 1. 检测包管理器并安装基础运行库
echo -e "${BLUE}[1/6] 检查系统环境并安装依赖 (Go 1.22+, Redis, Make, Git)...${NC}"

if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -y
    sudo apt-get install -y golang-go redis-server git make curl nodejs npm
elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y golang redis git make curl nodejs npm
elif command -v yum >/dev/null 2>&1; then
    sudo yum install -y epel-release
    sudo yum install -y golang redis git make curl nodejs npm
elif command -v pacman >/dev/null 2>&1; then
    sudo pacman -Syu --noconfirm go redis git make curl nodejs npm
else
    echo -e "${RED}未能识别系统包管理器，请手动安装 golang 与 redis。${NC}"
fi

# 2. 启动并启用 Redis 服务
echo -e "${BLUE}[2/6] 配置并启动 Redis 内存服务...${NC}"
sudo systemctl enable redis-server 2>/dev/null || sudo systemctl enable redis 2>/dev/null || true
sudo systemctl restart redis-server 2>/dev/null || sudo systemctl restart redis 2>/dev/null || true

if systemctl is-active --quiet redis-server || systemctl is-active --quiet redis; then
    echo -e "${GREEN}Redis 服务运行正常。${NC}"
else
    echo -e "${YELLOW}尝试前台或自定义启动 Redis...${NC}"
    redis-server --daemonize yes || true
fi

# 3. 编译 Go 二进制文件
echo -e "${BLUE}[3/6] 编译 Go 单体微内核高性能二进制...${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR/server_go"

mkdir -p "$SCRIPT_DIR/server_go/bin"
export CGO_ENABLED=0
export GOPROXY="https://goproxy.cn,https://proxy.golang.org,direct"
export GOSUMDB=off
go build -ldflags="-s -w" -o "$SCRIPT_DIR/server_go/bin/gamehall-monolith" ./main.go
chmod +x "$SCRIPT_DIR/server_go/bin/gamehall-monolith"

echo -e "${GREEN}Go 二进制编译完成: $SCRIPT_DIR/server_go/bin/gamehall-monolith${NC}"

# 4. 打包前端静态资源
cd "$SCRIPT_DIR"
if [ ! -d "dist" ]; then
    echo -e "${BLUE}[4/6] 构建前端资源...${NC}"
    npm install --silent
    npm run build
fi

# 5. 配置 Systemd 系统守护进程 (支持项目上一级目录 .env，防 git pull 覆盖)
echo -e "${BLUE}[5/6] 安装 Systemd 守护单元 (/etc/systemd/system/gamehall.service)...${NC}"
PARENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ ! -f "$PARENT_DIR/.env" ] && [ ! -f "$SCRIPT_DIR/.env" ] && [ -f "$SCRIPT_DIR/.env.example" ]; then
    echo -e "${YELLOW}ℹ [环境配置] 自动在项目上一级目录初始化 .env: $PARENT_DIR/.env (安全防覆盖)${NC}"
    cp "$SCRIPT_DIR/.env.example" "$PARENT_DIR/.env"
fi

CURRENT_USER=$(whoami)
SERVICE_FILE="/etc/systemd/system/gamehall.service"

sudo bash -c "cat > $SERVICE_FILE" <<EOF
[Unit]
Description=Go Game Hall Monolith (Chess & Cards High Concurrency Engine)
After=network.target redis.service redis-server.service

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$SCRIPT_DIR/server_go
EnvironmentFile=-$PARENT_DIR/.env
EnvironmentFile=-$SCRIPT_DIR/.env
Environment=HTTP_PORT=8080
Environment=GRPC_PORT=50051
Environment=REDIS_ADDR=127.0.0.1:6379
Environment=WORKER_POOL_COUNT=128
ExecStart=$SCRIPT_DIR/server_go/bin/gamehall-monolith
Restart=always
RestartSec=3s
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable gamehall
sudo systemctl restart gamehall

# 6. 验证部署结果
sleep 2
echo -e "${BLUE}[6/6] 验证服务运行状态...${NC}"
if systemctl is-active --quiet gamehall; then
    SERVER_IP=$(curl -s ifconfig.me || echo "127.0.0.1")
    echo -e "${GREEN}==================================================================${NC}"
    echo -e "${GREEN}  ✓ Linux Systemd 部署成功！游戏大厅正在稳定运行中                ${NC}"
    echo -e "${YELLOW}  Web 访问地址: http://${SERVER_IP}:8080${NC}"
    echo -e "${YELLOW}  gRPC 网格端口: 50051${NC}"
    echo -e "${YELLOW}  服务状态查询: sudo systemctl status gamehall${NC}"
    echo -e "${YELLOW}  实时运行日志: sudo journalctl -u gamehall -f${NC}"
    echo -e "${GREEN}==================================================================${NC}"
else
    echo -e "${RED}服务启动异常，请查看日志: journalctl -u gamehall -e${NC}"
    exit 1
fi
