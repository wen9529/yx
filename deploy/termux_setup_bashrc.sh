#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# Termux ~/.bashrc 自动配置脚本
# 解决: 大陆 DNS 阻断 (禁用 1.1.1.1/8.8.8.8, 启用阿里 223.5.5.5 与腾讯 119.29.29.29)
# 解决: Go 语言域名解析报错 [::1]:53 connection refused
# 解决: CA 根证书路径缺失问题 (SSL_CERT_FILE)
# 解决: 移动蜂窝网络无 IPv6 导致连接卡死 (--edge-ip-version 4)
# 解决: UDP/QUIC 协议被运营商限速阻断 (--protocol http2)
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}==================================================================${NC}"
echo -e "${GREEN}  正在为 Termux 生成 ~/.bashrc 永久环境变量与自启动配置...          ${NC}"
echo -e "${YELLOW}==================================================================${NC}"

# 读取环境配置文件 (优先从上一级目录读取，防后续 git pull 覆盖)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PARENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CF_TOKEN=""

if [ -f "$PARENT_DIR/.env" ]; then
    echo -e "${GREEN}✓ 从项目上一级目录读取配置: $PARENT_DIR/.env${NC}"
    CF_TOKEN=$(grep -E '^CLOUDFLARE_TUNNEL_TOKEN=' "$PARENT_DIR/.env" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
elif [ -f "$SCRIPT_DIR/.env" ]; then
    echo -e "${YELLOW}ℹ 从仓库内部读取配置: $SCRIPT_DIR/.env${NC}"
    CF_TOKEN=$(grep -E '^CLOUDFLARE_TUNNEL_TOKEN=' "$SCRIPT_DIR/.env" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
fi

# 允许外部传入 Token 参数: ./deploy/termux_setup_bashrc.sh <YOUR_TOKEN>
if [ -n "$1" ]; then
    CF_TOKEN="$1"
fi

# 确保安装必要依赖
pkg update -y && pkg install -y ca-certificates proot curl

# 写入 ~/.bashrc
cat << 'EOF' > ~/.bashrc

# ==============================================================================
# 1. 自动配置 DNS (解决 Go 语言域名解析报错及 [::1]:53 拒绝连接)
# 大陆优化: 避开 1.1.1.1 与 8.8.8.8 封锁，强制使用阿里公共 DNS 与腾讯 DNSPod
# ==============================================================================
mkdir -p $PREFIX/etc
echo -e "nameserver 223.5.5.5\nnameserver 119.29.29.29\nnameserver 1.1.1.1" > $PREFIX/etc/resolv.conf

# ==============================================================================
# 2. 导出核心环境配置 (纯 Go DNS 栈与系统根证书)
# ==============================================================================
export GODEBUG=netdns=go
export SSL_CERT_FILE=$PREFIX/etc/tls/cert.pem
export PATH=$HOME/bin:$PATH

EOF

# 写入隧道自启动逻辑
if [ -n "$CF_TOKEN" ]; then
    cat << EOF >> ~/.bashrc
# ==============================================================================
# 3. 自动启动 Cloudflared 隧道 (自定 Token 模式)
# ==============================================================================
if ! pgrep -f cloudflared >/dev/null 2>&1; then
    echo "正在后台启动 Cloudflare 生产穿透隧道 (IPv4 + HTTP/2)..."
    termux-chroot cloudflared tunnel --edge-ip-version 4 --protocol http2 run --token ${CF_TOKEN} > \$HOME/cloudflared.log 2>&1 &
fi
EOF
else
    cat << 'EOF' >> ~/.bashrc
# ==============================================================================
# 3. 自动启动 Cloudflared 隧道 (临时 Quick Tunnel 模式)
# ==============================================================================
if ! pgrep -f cloudflared >/dev/null 2>&1; then
    echo "正在后台启动 Cloudflare 快速穿透隧道 (IPv4 + HTTP/2)..."
    termux-chroot cloudflared tunnel --edge-ip-version 4 --protocol http2 --url http://127.0.0.1:8080 > $HOME/cloudflared.log 2>&1 &
fi
EOF
fi

echo -e "${GREEN}✓ ~/.bashrc 配置已成功生成！${NC}"
echo -e "${BLUE}配置预览:${NC}"
cat ~/.bashrc

echo -e "${GREEN}==================================================================${NC}"
echo -e "${YELLOW}请执行以下命令使配置立即生效:${NC}"
echo -e "  source ~/.bashrc"
echo -e "${GREEN}==================================================================${NC}"
