#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "=================================================================="
echo "  正在为 Android Termux 部署 Go 棋牌游戏大厅全栈单体服务..."
echo "=================================================================="

if command -v termux-wake-lock >/dev/null 2>&1; then
    echo "[1/7] 申请 Termux 后台唤醒锁 (Wake-Lock)..."
    termux-wake-lock
fi

echo "[2/7] 配置 Termux DNS 解析器..."
mkdir -p "$PREFIX/etc"
echo -e "nameserver 223.5.5.5\nnameserver 119.29.29.29" > "$PREFIX/etc/resolv.conf"

echo "[3/7] 安装系统依赖..."
pkg update -y
pkg install -y golang redis git make nodejs-lts ca-certificates curl proot

export GODEBUG=netdns=go
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[4/7] 启动 Redis 服务..."
mkdir -p "$HOME/.redis"
if ! pgrep redis-server >/dev/null; then
    redis-server --daemonize yes --dir "$HOME/.redis" --bind 127.0.0.1 --port 6379
fi

echo "[5/7] 编译 Go 核心后端..."
cd "$SCRIPT_DIR"
[ -d "pkg" ] && rm -rf "server_go/pkg" && cp -r "pkg" "server_go/"
[ -d "proto" ] && rm -rf "server_go/proto" && cp -r "proto" "server_go/"

cd "$SCRIPT_DIR/server_go"
find pkg -name "go.mod" -delete
find pkg -name "go.sum" -delete

# 用 Node.js 修复所有子包包名，确保 package 与物理目录名一致
node -e '
const fs = require("fs");
const path = require("path");
function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (let e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.isFile() && e.name.endsWith(".go")) {
            const pName = path.basename(dir);
            let c = fs.readFileSync(full, "utf8");
            c = c.replace(/^([ \t]*package\s+)[a-zA-Z0-9_]+/gm, `$1${pName}`);
            fs.writeFileSync(full, c, "utf8");
        }
    }
}
walk("pkg");
'

# 修复包名映射与引用路径
find . -name "*.go" -type f -exec sed -i 's|redissync|redis_sync|g' {} +
find . -name "*.go" -type f -exec sed -i 's|"monolith/|"game/monolith/|g' {} +
find . -name "*.go" -type f -exec sed -i 's|"example\.com/monolith/|"game/monolith/|g' {} +

# 自动清理未使用的导入
if [ -f "pkg/config/env.go" ]; then
    sed -i '/"fmt"/d' pkg/config/env.go
fi
if [ -f "main.go" ]; then
    sed -i '/"strconv"/d' main.go
fi

rm -f go.mod go.sum
echo -e "module game/monolith\n\ngo 1.22.0\n\nreplace game/monolith => .\n\nrequire (\n\tgithub.com/redis/go-redis/v9 v9.5.1\n\tgithub.com/cespare/xxhash/v2 v2.2.0\n\tgithub.com/dgryski/go-rendezvous v0.0.0-20200823014737-9f7001d12a5f\n)" > go.mod

export CGO_ENABLED=0
export GO111MODULE=on
export GOPROXY="https://goproxy.cn,direct"
export GOSUMDB=off
mkdir -p "bin"

echo "正在下载并深度同步所有依赖..."
go mod tidy

echo "正在编译后端二进制..."
go build -ldflags="-s -w" -o "bin/gamehall-monolith" .
echo "Go 二进制编译成功！"

echo "[6/7] 打包前端静态资源..."
cd "$SCRIPT_DIR"
if [ ! -d "dist" ]; then
    npm install --legacy-peer-deps --silent
    npm run build
fi

echo "[7/7] 启动棋牌大厅服务..."
pkill -f "gamehall-monolith" || true
export HTTP_PORT=8080
export GRPC_PORT=50051
export REDIS_ADDR="127.0.0.1:6379"
nohup "$SCRIPT_DIR/server_go/bin/gamehall-monolith" > "$HOME/gamehall.log" 2>&1 &
PID=$!

sleep 2
if ps -p $PID > /dev/null; then
    LOCAL_IP=$(ip -4 addr show wlan0 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' || echo "127.0.0.1")
    echo "=================================================================="
    echo "  ✓ 部署成功！Go 棋牌游戏大厅正在后台稳定运行 (PID: $PID)"
    echo "  本地访问地址: http://127.0.0.1:8080"
    echo "  局域网访问地址: http://${LOCAL_IP}:8080"
    echo "  运行日志位置: cat $HOME/gamehall.log"
    echo "=================================================================="
else
    echo "启动失败，请检查日志: cat $HOME/gamehall.log"
    exit 1
fi
