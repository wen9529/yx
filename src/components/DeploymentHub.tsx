import React, { useState } from 'react';
import { 
  Smartphone, Cloud, Terminal, GitBranch, Copy, Check, Download, 
  ExternalLink, ShieldCheck, Zap, AlertTriangle, ArrowRight, Server, CheckCircle2,
  Lock, Settings, Globe, Bot, ShieldAlert
} from 'lucide-react';
import { sounds } from '../utils/sound';

export const DeploymentHub: React.FC = () => {
  const [selectedSystem, setSelectedSystem] = useState<'github' | 'termux' | 'serv00' | 'linux' | 'env-config'>('github');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form for interactive .env generation
  const [envForm, setEnvForm] = useState({
    httpPort: '8080',
    grpcPort: '50051',
    redisAddr: '127.0.0.1:6379',
    tgToken: '',
    tgAdminId: '',
    cfToken: '',
    cfDns: '223.5.5.5,119.29.29.29',
    cfIpVersion: '4'
  });

  const handleCopy = (key: string, text: string) => {
    sounds.playCardSelect();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const generatedEnvContent = `# ==============================================================================
# Go 棋牌游戏大厅单体系统生产环境配置 (.env)
# ==============================================================================

# 基础端口与服务配置
HTTP_PORT=${envForm.httpPort}
GRPC_PORT=${envForm.grpcPort}
WORKER_POOL_COUNT=64
HOUSE_RAKE_RATE=0.05

# Redis 内存状态服务
REDIS_ADDR=${envForm.redisAddr}
REDIS_PASS=

# Telegram Bot 管理员监控与指令系统配置
TELEGRAM_BOT_TOKEN=${envForm.tgToken}
TELEGRAM_ADMIN_ID=${envForm.tgAdminId}

# Cloudflare Tunnel 穿透隧道配置 (主要用于 Termux 与 Linux 公网访问)
CLOUDFLARE_TUNNEL_TOKEN=${envForm.cfToken}
# 大陆地区优化 DNS: 避免 1.1.1.1 和 8.8.8.8 被封锁阻断，使用阿里DNS与腾讯DNSPod
CLOUDFLARE_DNS=${envForm.cfDns}
# 强制使用 IPv4: Termux 与国内移动网络不支持 IPv6，强制 IPv4 避免握手卡死
CLOUDFLARE_EDGE_IP_VERSION=${envForm.cfIpVersion}
`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

      {/* Hero Banner */}
      <div className="bg-neutral-900/90 border border-amber-900/40 p-6 sm:p-8 rounded-2xl shadow-xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>全平台跨系统原生支持 · Cloudflare 穿透 · TG Bot 管理员</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white">
          多端部署、公网隧道穿透与 Telegram 管理中心
        </h2>
        <p className="text-xs sm:text-sm text-neutral-400 max-w-3xl leading-relaxed">
          全面适配 <b>Android Termux</b>（解决大陆 1.1.1.1 DNS 屏蔽、CA 根证书与 IPv4 强制约束）、<b>serv00</b>（FreeBSD 非 root 与 Crontab 保活）以及 <b>Linux</b>（Systemd 守护与 Docker 容器），并支持通过 Telegram Bot 远程管理全服。
        </p>
      </div>

      {/* Target System Tab Switcher */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button
          onClick={() => {
            sounds.playCardSelect();
            setSelectedSystem('github');
          }}
          className={`p-3.5 rounded-xl border transition-all text-left flex items-center gap-2.5 cursor-pointer ${
            selectedSystem === 'github'
              ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-500/10'
              : 'bg-neutral-900/60 hover:bg-neutral-800/80 border-neutral-800 text-neutral-400'
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-neutral-950 flex items-center justify-center text-amber-400 shrink-0">
            <GitBranch className="w-4 h-4" />
          </div>
          <div className="truncate">
            <div className="font-bold text-xs sm:text-sm text-white truncate">GitHub 流程</div>
            <div className="text-[10px] text-neutral-400 truncate">推送与跨端拉取</div>
          </div>
        </button>

        <button
          onClick={() => {
            sounds.playCardSelect();
            setSelectedSystem('termux');
          }}
          className={`p-3.5 rounded-xl border transition-all text-left flex items-center gap-2.5 cursor-pointer ${
            selectedSystem === 'termux'
              ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
              : 'bg-neutral-900/60 hover:bg-neutral-800/80 border-neutral-800 text-neutral-400'
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-neutral-950 flex items-center justify-center text-emerald-400 shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="truncate">
            <div className="font-bold text-xs sm:text-sm text-white truncate">Termux (手机)</div>
            <div className="text-[10px] text-neutral-400 truncate">国内DNS/证书/穿透</div>
          </div>
        </button>

        <button
          onClick={() => {
            sounds.playCardSelect();
            setSelectedSystem('serv00');
          }}
          className={`p-3.5 rounded-xl border transition-all text-left flex items-center gap-2.5 cursor-pointer ${
            selectedSystem === 'serv00'
              ? 'bg-cyan-500/10 border-cyan-500 text-white shadow-lg shadow-cyan-500/10'
              : 'bg-neutral-900/60 hover:bg-neutral-800/80 border-neutral-800 text-neutral-400'
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-neutral-950 flex items-center justify-center text-cyan-400 shrink-0">
            <Cloud className="w-4 h-4" />
          </div>
          <div className="truncate">
            <div className="font-bold text-xs sm:text-sm text-white truncate">FreeBSD serv00</div>
            <div className="text-[10px] text-neutral-400 truncate">非root与Devil保活</div>
          </div>
        </button>

        <button
          onClick={() => {
            sounds.playCardSelect();
            setSelectedSystem('linux');
          }}
          className={`p-3.5 rounded-xl border transition-all text-left flex items-center gap-2.5 cursor-pointer ${
            selectedSystem === 'linux'
              ? 'bg-purple-500/10 border-purple-500 text-white shadow-lg shadow-purple-500/10'
              : 'bg-neutral-900/60 hover:bg-neutral-800/80 border-neutral-800 text-neutral-400'
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-neutral-950 flex items-center justify-center text-purple-400 shrink-0">
            <Server className="w-4 h-4" />
          </div>
          <div className="truncate">
            <div className="font-bold text-xs sm:text-sm text-white truncate">Linux 云服务器</div>
            <div className="text-[10px] text-neutral-400 truncate">Systemd/Docker/隧道</div>
          </div>
        </button>

        <button
          onClick={() => {
            sounds.playCardSelect();
            setSelectedSystem('env-config');
          }}
          className={`p-3.5 rounded-xl border transition-all text-left flex items-center gap-2.5 cursor-pointer ${
            selectedSystem === 'env-config'
              ? 'bg-rose-500/10 border-rose-500 text-white shadow-lg shadow-rose-500/10'
              : 'bg-neutral-900/60 hover:bg-neutral-800/80 border-neutral-800 text-neutral-400'
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-neutral-950 flex items-center justify-center text-rose-400 shrink-0">
            <Settings className="w-4 h-4" />
          </div>
          <div className="truncate">
            <div className="font-bold text-xs sm:text-sm text-white truncate">.env 变量配置</div>
            <div className="text-[10px] text-neutral-400 truncate">TG Bot 与隧道Token</div>
          </div>
        </button>
      </div>

      {/* Detail Content Section */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">

        {/* 1. GitHub Push Workflow */}
        {selectedSystem === 'github' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-amber-400" />
                  <span>第一步：推送到 GitHub 仓库</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  将当前工程文件提交至你个人的 GitHub 仓库，随后在 Termux、serv00 和 Linux 中直接拉取部署。
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-300">
                  <span>Git 初始化与远程推送命令</span>
                  <button
                    onClick={() => handleCopy('git-push', `git init\ngit add .\ngit commit -m "feat: complete go game hall monolith"\ngit branch -M main\ngit remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git\ngit push -u origin main`)}
                    className="flex items-center gap-1 text-amber-400 hover:text-amber-300 text-xs font-mono"
                  >
                    {copiedKey === 'git-push' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'git-push' ? '已复制' : '复制命令'}</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed">
                  <div><span className="text-neutral-500"># 1. 初始化本地仓库</span></div>
                  <div>git init</div>
                  <div className="mt-1"><span className="text-neutral-500"># 2. 暂存所有工程文件、Go微内核代码与自动部署脚本</span></div>
                  <div>git add .</div>
                  <div className="mt-1"><span className="text-neutral-500"># 3. 提交版本变更</span></div>
                  <div>git commit -m "feat: complete go game hall monolith"</div>
                  <div className="mt-1"><span className="text-neutral-500"># 4. 指定主分支</span></div>
                  <div>git branch -M main</div>
                  <div className="mt-1"><span className="text-neutral-500"># 5. 关联你的 GitHub 远程仓库 (替换为你自己的仓库地址)</span></div>
                  <div>git remote add origin https://github.com/<span className="text-amber-300">YOUR_USERNAME</span>/<span className="text-amber-300">YOUR_REPO</span>.git</div>
                  <div className="mt-1"><span className="text-neutral-500"># 6. 一键推送</span></div>
                  <div>git push -u origin main</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-neutral-300 space-y-1">
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>仓库推送检查清单：</span>
                </div>
                <p className="text-neutral-400">
                  • 确认包含 <b>deploy/</b> 目录下的启动脚本与隧道脚本。<br />
                  • 确认包含 <b>.env.example</b> 模板文件，内含 Telegram Bot 与 Cloudflare 配置项。<br />
                  • 推送完成后，可在手机或服务器直接执行对应的自动化脚本。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2. Termux Deployment */}
        {selectedSystem === 'termux' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-neutral-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                  <span>Android Termux 专项部署与公网穿透</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  彻底解决大陆 DNS 屏蔽（禁用 1.1.1.1/8.8.8.8）、Termux 根证书缺失与移动网络无 IPv6 问题
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-mono self-start sm:self-auto">
                脚本: deploy/termux_install.sh & tunnel.sh
              </span>
            </div>

            {/* Special Termux China Constraints Card */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-amber-500/30 text-xs space-y-2">
              <div className="font-bold text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Termux 大陆环境特别注意与技术解决方案 (已在脚本中自动处理)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-neutral-400 text-[11px] pt-1">
                <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                  <b className="text-white">1. DNS 优化 (避开 1.1.1.1/8.8.8.8)</b>
                  <p className="mt-1">针对 1.1.1.1 及 8.8.8.8 的污染，自动写入 resolv.conf 重定向为阿里公共 DNS (<b>223.5.5.5</b>) 与腾讯 (<b>119.29.29.29</b>)，解决 Go 解析报 [::1]:53 故障。</p>
                </div>
                <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                  <b className="text-white">2. 强制使用 IPv4 传输</b>
                  <p className="mt-1">手机 4G/5G 移动蜂窝网络对 IPv6 握手常超时，显式配置 <code className="text-emerald-400">--edge-ip-version 4</code> 保证稳定传输。</p>
                </div>
                <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                  <b className="text-white">3. 系统根证书与 termux-chroot</b>
                  <p className="mt-1">安装 <code className="text-emerald-400">ca-certificates</code> 与 <code className="text-emerald-400">proot</code>，绑定 <code className="text-amber-300">SSL_CERT_FILE</code>，使用 <code className="text-cyan-400">termux-chroot</code> 映射 Linux 标准环境。</p>
                </div>
              </div>
            </div>

            {/* Permanent ~/.bashrc Recipe Card */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>终极实战方案：写入 ~/.bashrc 永久自动配置与开机拉起 (针对大陆DNS/证书/IPv4)</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy('termux-setup-sh', `./deploy/termux_setup_bashrc.sh`)}
                    className="text-cyan-400 hover:text-cyan-300 text-xs font-mono flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'termux-setup-sh' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'termux-setup-sh' ? '已复制一键命令' : '一键执行脚本'}</span>
                  </button>
                  <button
                    onClick={() => handleCopy('termux-bashrc', `cat << 'EOF' > ~/.bashrc\n\n# 1. 自动配置 DNS (解决 Go 语言域名解析报错及 [::1]:53 拒绝连接)\nmkdir -p $PREFIX/etc\necho -e "nameserver 223.5.5.5\\nnameserver 119.29.29.29\\nnameserver 1.1.1.1" > $PREFIX/etc/resolv.conf\n\n# 2. 启用 Go 原生 DNS 解析器并绑定系统根证书\nexport GODEBUG=netdns=go\nexport SSL_CERT_FILE=$PREFIX/etc/tls/cert.pem\n\n# 3. 自动后台启动 Cloudflared 隧道 (termux-chroot + 强制 IPv4 + HTTP/2 协议)\nif ! pgrep -f cloudflared >/dev/null 2>&1; then\n    # 若使用生产自定 Token (替换为你自己的 Token):\n    # termux-chroot cloudflared tunnel --edge-ip-version 4 --protocol http2 run --token eyJhIjoiMjgwZWFkZTliYTI2YzhmNzg3NmFkMzNlOTc5... > $HOME/cloudflared.log 2>&1 &\n    # 若使用临时快速穿透隧道 (无需 Token):\n    termux-chroot cloudflared tunnel --edge-ip-version 4 --protocol http2 --url http://127.0.0.1:8080 > $HOME/cloudflared.log 2>&1 &\nfi\nEOF\nsource ~/.bashrc`)}
                    className="text-emerald-400 hover:text-emerald-300 text-xs font-mono flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'termux-bashrc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'termux-bashrc' ? '已复制' : '复制 ~/.bashrc 源码'}</span>
                  </button>
                </div>
              </div>
              <pre className="p-3 rounded-lg bg-neutral-900 font-mono text-[11px] text-emerald-300 overflow-x-auto leading-relaxed">
{`cat << 'EOF' > ~/.bashrc

# 1. 自动配置 DNS (解决 Go 语言域名解析报错及 [::1]:53 拒绝连接)
mkdir -p $PREFIX/etc
echo -e "nameserver 223.5.5.5\\nnameserver 119.29.29.29\\nnameserver 1.1.1.1" > $PREFIX/etc/resolv.conf

# 2. 启用 Go 原生 DNS 解析器并绑定根证书
export GODEBUG=netdns=go
export SSL_CERT_FILE=$PREFIX/etc/tls/cert.pem

# 3. 自动启动 Cloudflared 隧道 (termux-chroot + 强制 IPv4 + HTTP/2 协议)
if ! pgrep -f cloudflared >/dev/null 2>&1; then
    # 若配置了自定 Token:
    # termux-chroot cloudflared tunnel --edge-ip-version 4 --protocol http2 run --token eyJhIjoiMjgwZWFkZTliYTI2YzhmNzg3NmFkMzNlOTc5...
    # 若使用免登录临时快速隧道 (Quick Tunnel):
    termux-chroot cloudflared tunnel --edge-ip-version 4 --protocol http2 --url http://127.0.0.1:8080 > $HOME/cloudflared.log 2>&1 &
fi
EOF
source ~/.bashrc`}
              </pre>
            </div>

            {/* Step 1: Install Game Hall */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-300">
                <span>步骤 1：Termux 启动游戏大厅核心服务</span>
                <button
                  onClick={() => handleCopy('termux-cmd', `pkg update -y && pkg install -y git\ngit clone https://github.com/YOUR_USER/gamehall-monolith.git\ncd gamehall-monolith\nchmod +x deploy/*.sh\n./deploy/termux_install.sh`)}
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-xs font-mono"
                >
                  {copiedKey === 'termux-cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'termux-cmd' ? '已复制' : '复制步骤1命令'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed">
pkg update -y && pkg install -y git
git clone https://github.com/<span className="text-amber-300">YOUR_USER</span>/gamehall-monolith.git
cd gamehall-monolith
chmod +x deploy/*.sh
./deploy/termux_install.sh
              </pre>
            </div>

            {/* Step 2: Start Cloudflare Tunnel */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-300">
                <span>步骤 2：启动 Cloudflare 隧道 (获取公网 HTTPS 访问域名)</span>
                <button
                  onClick={() => handleCopy('termux-tunnel-cmd', `./deploy/termux_tunnel.sh`)}
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-xs font-mono"
                >
                  {copiedKey === 'termux-tunnel-cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'termux-tunnel-cmd' ? '已复制' : '复制步骤2命令'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-xs text-cyan-300 overflow-x-auto leading-relaxed">
./deploy/termux_tunnel.sh
              </pre>
              <p className="text-[11px] text-neutral-400">
                执行后将在 3 秒内输出如 <code className="text-amber-300">https://xxxx.trycloudflare.com</code> 的专属公网 HTTPS 网址，任何人均可远程访问对局！
              </p>
            </div>
          </div>
        )}

        {/* 3. serv00 Deployment */}
        {selectedSystem === 'serv00' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-neutral-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-cyan-400" />
                  <span>FreeBSD serv00 一键部署方案</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  完美应对非 root 限制、Devil 端口映射、FreeBSD 用户态 Go 编译与 Crontab 自动保活看门狗
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-xs font-mono self-start sm:self-auto">
                脚本: deploy/serv00_install.sh
              </span>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-300">
                  <span>serv00 SSH 终端一键执行命令</span>
                  <button
                    onClick={() => handleCopy('serv00-cmd', `git clone https://github.com/YOUR_USER/gamehall-monolith.git\ncd gamehall-monolith\nchmod +x deploy/serv00_install.sh deploy/keepalive_serv00.sh\n./deploy/serv00_install.sh`)}
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-xs font-mono"
                  >
                    {copiedKey === 'serv00-cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'serv00-cmd' ? '已复制' : '复制命令'}</span>
                  </button>
                </div>

                <pre className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-xs text-cyan-400 overflow-x-auto leading-relaxed">
git clone https://github.com/<span className="text-amber-300">YOUR_USER</span>/gamehall-monolith.git
cd gamehall-monolith
chmod +x deploy/serv00_install.sh deploy/keepalive_serv00.sh
./deploy/serv00_install.sh
                </pre>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-1.5">
                  <span className="font-bold text-xs text-cyan-300">1. Devil 端口申请</span>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    serv00 无法使用 8080 等预设低端口，执行 <code className="text-cyan-400">devil port add tcp</code> 申请高位端口 (如 28080)。
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-1.5">
                  <span className="font-bold text-xs text-emerald-400">2. 用户态 Go 1.22</span>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    脚本自动将 FreeBSD amd64 版本的独立 Go 工具链解压至 <code className="text-emerald-400">~/opt/go</code>，无需 sudo 权限。
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-1.5">
                  <span className="font-bold text-xs text-amber-300">3. 24小时防杀看门狗</span>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    脚本自动注册 Crontab 每 5 分钟检查守护，一旦 serv00 清理进程，看门狗将在 5 分钟内自动复活服务。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Linux Server Deployment */}
        {selectedSystem === 'linux' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-neutral-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Server className="w-5 h-5 text-purple-400" />
                  <span>Linux 生产云服务器部署 (Ubuntu / Debian / CentOS)</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  支持 Systemd 开机自启服务、Docker Compose 一键启动与 Cloudflare 隧道穿透
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 text-xs font-mono self-start sm:self-auto">
                Docker / Systemd / Tunnel
              </span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Method 1: Docker Compose */}
                <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-purple-300">方案 1：Docker Compose 一键启动</span>
                    <button
                      onClick={() => handleCopy('docker-cmd', `git clone https://github.com/YOUR_USER/gamehall-monolith.git\ncd gamehall-monolith\ndocker compose up -d`)}
                      className="text-purple-400 hover:text-purple-300 text-xs font-mono flex items-center gap-1"
                    >
                      {copiedKey === 'docker-cmd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>复制</span>
                    </button>
                  </div>

                  <pre className="p-3 rounded-lg bg-neutral-900 font-mono text-xs text-emerald-400 overflow-x-auto">
git clone https://github.com/<span className="text-amber-300">YOUR_USER</span>/gamehall-monolith.git
cd gamehall-monolith
docker compose up -d
                  </pre>
                  <p className="text-[11px] text-neutral-400">
                    一键拉起官方 Redis 7.2 镜像和 Go 单体微内核容器，开箱即用。
                  </p>
                </div>

                {/* Method 2: Systemd script */}
                <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-amber-300">方案 2：Systemd 原生守护 (极致性能)</span>
                    <button
                      onClick={() => handleCopy('systemd-cmd', `git clone https://github.com/YOUR_USER/gamehall-monolith.git\ncd gamehall-monolith\nchmod +x deploy/linux_install.sh\n./deploy/linux_install.sh`)}
                      className="text-amber-400 hover:text-amber-300 text-xs font-mono flex items-center gap-1"
                    >
                      {copiedKey === 'systemd-cmd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>复制</span>
                    </button>
                  </div>

                  <pre className="p-3 rounded-lg bg-neutral-900 font-mono text-xs text-amber-300 overflow-x-auto">
git clone https://github.com/<span className="text-amber-300">YOUR_USER</span>/gamehall-monolith.git
cd gamehall-monolith
chmod +x deploy/linux_install.sh
./deploy/linux_install.sh
                  </pre>
                  <p className="text-[11px] text-neutral-400">
                    自动编译本地原生二进制、配置 <code className="text-amber-400">/etc/systemd/system/gamehall.service</code> 并开机自启。
                  </p>
                </div>
              </div>

              {/* Linux Tunnel start */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <Globe className="w-4 h-4" />
                    <span>可选：Linux 快速启动 Cloudflare 公网隧道</span>
                  </span>
                  <button
                    onClick={() => handleCopy('linux-tunnel-cmd', `chmod +x deploy/linux_tunnel.sh && ./deploy/linux_tunnel.sh`)}
                    className="text-cyan-400 hover:text-cyan-300 text-xs font-mono flex items-center gap-1"
                  >
                    {copiedKey === 'linux-tunnel-cmd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>复制隧道命令</span>
                  </button>
                </div>
                <pre className="p-3 rounded-lg bg-neutral-900 font-mono text-xs text-cyan-300 overflow-x-auto">
chmod +x deploy/linux_tunnel.sh && ./deploy/linux_tunnel.sh
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* 5. .env Configuration & Telegram Bot / Tunnel Generator */}
        {selectedSystem === 'env-config' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-neutral-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-rose-400" />
                  <span>.env 环境变量生成器与 Telegram Bot / 隧道配置</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  在线配置你的 Telegram Bot Token、管理员 ID 以及 Cloudflare 隧道参数，一键生成项目根目录的 .env 文件
                </p>
              </div>
              <button
                onClick={() => handleCopy('env-full', generatedEnvContent)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                {copiedKey === 'env-full' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'env-full' ? '已复制全部 .env' : '一键生成并复制 .env'}</span>
              </button>
            </div>

            {/* Input Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              
              {/* Telegram Config */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="font-bold text-white flex items-center gap-2">
                  <Bot className="w-4 h-4 text-amber-400" />
                  <span>Telegram Bot 管理员配置</span>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">TELEGRAM_BOT_TOKEN (从 @BotFather 获取):</label>
                  <input
                    type="text"
                    value={envForm.tgToken}
                    onChange={(e) => setEnvForm({ ...envForm, tgToken: e.target.value })}
                    placeholder="例: 123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">TELEGRAM_ADMIN_ID (管理员数字ID，从 @userinfobot 获取):</label>
                  <input
                    type="text"
                    value={envForm.tgAdminId}
                    onChange={(e) => setEnvForm({ ...envForm, tgAdminId: e.target.value })}
                    placeholder="例: 987654321"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="text-[11px] text-neutral-500">
                  支持管理员在 Telegram 发送 <code className="text-amber-400">/status</code>、<code className="text-amber-400">/addcoins</code>、<code className="text-amber-400">/broadcast</code> 控制全服。
                </div>
              </div>

              {/* Cloudflare Tunnel Config */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="font-bold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span>Cloudflare Tunnel 穿透配置 (Termux / Linux)</span>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">CLOUDFLARE_TUNNEL_TOKEN (留空则使用临时快速隧道):</label>
                  <input
                    type="text"
                    value={envForm.cfToken}
                    onChange={(e) => setEnvForm({ ...envForm, cfToken: e.target.value })}
                    placeholder="留空即自动生成临时 HTTPS 快速域名"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-neutral-400 block mb-1">优化 DNS (大陆防封锁):</label>
                    <input
                      type="text"
                      value={envForm.cfDns}
                      onChange={(e) => setEnvForm({ ...envForm, cfDns: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 block mb-1">IP 协议版本:</label>
                    <select
                      value={envForm.cfIpVersion}
                      onChange={(e) => setEnvForm({ ...envForm, cfIpVersion: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                    >
                      <option value="4">4 (强制 IPv4, 适配Termux)</option>
                      <option value="auto">auto (自动探测)</option>
                    </select>
                  </div>
                </div>
                <div className="text-[11px] text-neutral-500">
                  自动规避 1.1.1.1 阻断，利用阿里 223.5.5.5 和腾讯 DNSPod 确保隧道秒连。
                </div>
              </div>

            </div>

            {/* Live Preview of .env */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-300">
                <span>实时生成的 .env 文件预览</span>
              </div>
              <pre className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed max-h-64">
{generatedEnvContent}
              </pre>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
