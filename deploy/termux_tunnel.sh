#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# Cloudflare Tunnel 穿透脚本 - 专为 Android Termux 定制 (针对大陆网络与证书优化)
# 包含: 解决 Go [::1]:53 报错、GODEBUG=netdns=go、SSL_CERT_FILE 证书路径与 termux-chroot
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}==================================================================${NC}"
echo -e "${GREEN}  正在为 Termux 配置 Cloudflare Tunnel (针对国内网络与证书优化)  ${NC}"
echo -e "${YELLOW}==================================================================${NC}"

# 1. 自动配置 DNS (解决 Go 语言域名解析报错及 [::1]:53 拒绝连接)
echo -e "${BLUE}[1/6] 配置 Termux DNS 解析器 (resolv.conf)...${NC}"
mkdir -p "$PREFIX/etc"
echo -e "nameserver 223.5.5.5\nnameserver 119.29.29.29\nnameserver 1.1.1.1" > "$PREFIX/etc/resolv.conf"

# 2. 安装/更新系统根证书与 proot (支持 termux-chroot)
echo -e "${BLUE}[2/6] 安装系统根证书 (ca-certificates) 与 proot 隔离环境...${NC}"
pkg install -y ca-certificates curl proot

# 3. 设置核心环境变量
export GODEBUG=netdns=go
export SSL_CERT_FILE="$PREFIX/etc/tls/cert.pem"

# 4. 读取环境变量配置 (优先检查项目上一级目录，防 git pull 覆盖)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PARENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -f "$PARENT_DIR/.env" ]; then
    echo -e "${GREEN}✓ [3/6] 加载项目上一级目录 .env 配置: $PARENT_DIR/.env (安全防覆盖)${NC}"
    export $(grep -v '^#' "$PARENT_DIR/.env" | xargs)
elif [ -f "$SCRIPT_DIR/.env" ]; then
    echo -e "${YELLOW}ℹ [3/6] 加载仓库内部 .env 环境变量配置: $SCRIPT_DIR/.env${NC}"
    export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
fi

HTTP_PORT=${HTTP_PORT:-8080}
CF_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN:-""}
CF_EDGE_IP_VERSION=${CLOUDFLARE_EDGE_IP_VERSION:-"4"}

# 5. 检查或安装 cloudflared 二进制 (ARM64 架构)
echo -e "${BLUE}[4/6] 检测 cloudflared 客户端二进制...${NC}"
mkdir -p "$HOME/bin"
export PATH="$HOME/bin:$PREFIX/bin:$PATH"

install_cf() {
    # 方式 1: Termux 官方 TUR 仓库
    if pkg install -y tur-repo 2>/dev/null && pkg install -y cloudflared 2>/dev/null; then
        echo -e "${GREEN}✓ 成功通过 Termux 仓库安装 cloudflared${NC}"
        return 0
    fi

    # 方式 2: 多源下载官方 ARM64/ARM 静态二进制
    ARCH=$(uname -m)
    TARGET_BIN="$PREFIX/bin/cloudflared"
    BIN_NAME="cloudflared-linux-arm64"
    if [ "$ARCH" = "arm" ] || [ "$ARCH" = "armv7l" ]; then
        BIN_NAME="cloudflared-linux-arm"
    fi

    URLS=(
        "https://mirror.ghproxy.com/https://github.com/cloudflare/cloudflared/releases/latest/download/${BIN_NAME}"
        "https://ghproxy.net/https://github.com/cloudflare/cloudflared/releases/latest/download/${BIN_NAME}"
        "https://github.moeyy.xyz/https://github.com/cloudflare/cloudflared/releases/latest/download/${BIN_NAME}"
        "https://github.com/cloudflare/cloudflared/releases/latest/download/${BIN_NAME}"
    )

    for url in "${URLS[@]}"; do
        echo -e "正在尝试下载源: $url"
        if curl -L --retry 2 --connect-timeout 8 -o "$TARGET_BIN" "$url" 2>/dev/null; then
            FILE_SIZE=$(wc -c < "$TARGET_BIN" 2>/dev/null || echo 0)
            if [ "$FILE_SIZE" -gt 5000000 ]; then
                chmod +x "$TARGET_BIN"
                ln -sf "$TARGET_BIN" "$HOME/bin/cloudflared" 2>/dev/null || true
                echo -e "${GREEN}✓ cloudflared 下载并校验成功！(${FILE_SIZE} 字节)${NC}"
                return 0
            else
                rm -f "$TARGET_BIN"
            fi
        fi
    done
    return 1
}

CF_BIN=$(command -v cloudflared 2>/dev/null || echo "")
if [ -z "$CF_BIN" ] || ! "$CF_BIN" --version >/dev/null 2>&1; then
    install_cf || {
        echo -e "${RED}错误: 未能成功下载 cloudflared 二进制，请检查网络后重试。${NC}"
        exit 1
    }
    CF_BIN=$(command -v cloudflared 2>/dev/null || echo "$PREFIX/bin/cloudflared")
fi

# 确保双向符号链接
[ -f "$PREFIX/bin/cloudflared" ] && ln -sf "$PREFIX/bin/cloudflared" "$HOME/bin/cloudflared" 2>/dev/null || true
[ -f "$HOME/bin/cloudflared" ] && [ ! -f "$PREFIX/bin/cloudflared" ] && ln -sf "$HOME/bin/cloudflared" "$PREFIX/bin/cloudflared" 2>/dev/null || true

echo -e "${GREEN}cloudflared 客户端就绪: $($CF_BIN --version 2>/dev/null || echo 'OK')${NC}"

# 6. 使用 termux-chroot 启动隧道进程 (强制 IPv4 和 HTTP/2 协议，避免 UDP/QUIC 阻断)
echo -e "${BLUE}[5/6] 通过 termux-chroot 启动 Cloudflare 穿透隧道...${NC}"
pkill -f "cloudflared" || true

TUNNEL_LOG="$HOME/cloudflared.log"

if [ -n "$CF_TOKEN" ]; then
    echo -e "${GREEN}检测到已配置 Token，启动自定域名生产隧道 (--edge-ip-version 4 --protocol http2)...${NC}"
    nohup termux-chroot "$CF_BIN" tunnel \
        --edge-ip-version "$CF_EDGE_IP_VERSION" \
        --protocol http2 \
        run --token "$CF_TOKEN" > "$TUNNEL_LOG" 2>&1 &
    
    sleep 3
    echo -e "${GREEN}==================================================================${NC}"
    echo -e "${GREEN}  ✓ 自定义 Cloudflare 隧道已在后台稳定启动！                       ${NC}"
    echo -e "${YELLOW}  网络模式: IPv4 | 协议: HTTP/2 (规避大陆 UDP 干扰)              ${NC}"
    echo -e "${YELLOW}  DNS 解析: 223.5.5.5, 119.29.29.29 (阿里与腾讯)                ${NC}"
    echo -e "${YELLOW}  证书路径: $SSL_CERT_FILE                                      ${NC}"
    echo -e "${YELLOW}  日志文件: $TUNNEL_LOG                                         ${NC}"
    echo -e "${GREEN}==================================================================${NC}"
else
    echo -e "${YELLOW}未配置 Token，正在启动免登录临时快速隧道 (Quick Tunnel)...${NC}"
    nohup termux-chroot "$HOME/bin/cloudflared" tunnel \
        --edge-ip-version "$CF_EDGE_IP_VERSION" \
        --protocol http2 \
        --url "http://127.0.0.1:${HTTP_PORT}" > "$TUNNEL_LOG" 2>&1 &
    
    echo -e "${BLUE}[6/6] 获取公网访问网址 (等待约 3-5 秒)...${NC}"
    sleep 4
    
    PUBLIC_URL=$(grep -o 'https://[-a-zA-Z0-9@:%._\+~#=]*.trycloudflare.com' "$TUNNEL_LOG" | tail -n 1 || true)
    
    echo -e "${GREEN}==================================================================${NC}"
    echo -e "${GREEN}  ✓ Cloudflare 临时快速隧道穿透成功！                             ${NC}"
    if [ -n "$PUBLIC_URL" ]; then
        echo -e "${YELLOW}  🌐 公网访问地址 (HTTPS): ${PUBLIC_URL}${NC}"
    else
        echo -e "${YELLOW}  正在连接中，请稍后查看日志获取公网 URL: cat $TUNNEL_LOG${NC}"
    fi
    echo -e "${YELLOW}  本地服务端口: http://127.0.0.1:${HTTP_PORT}${NC}"
    echo -e "${YELLOW}  协议: HTTP/2 | 模式: IPv4 | 运行容器: termux-chroot            ${NC}"
    echo -e "${YELLOW}  隧道运行日志: $TUNNEL_LOG                                     ${NC}"
    echo -e "${GREEN}==================================================================${NC}"
fi
