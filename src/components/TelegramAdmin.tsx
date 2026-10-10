import React, { useState } from 'react';
import { 
  Bot, Send, ShieldCheck, Terminal, AlertCircle, CheckCircle2, 
  Coins, Radio, Activity, RefreshCw, Key, HelpCircle, ExternalLink,
  MessageSquare, Users, Cpu, ShieldAlert, Sparkles
} from 'lucide-react';
import { sounds } from '../utils/sound';

interface TelegramAdminProps {
  onAddCoins: (amount: number) => void;
  onBroadcastAnnouncement: (text: string) => void;
  currentCoins: number;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
  isMarkdown?: boolean;
}

export const TelegramAdmin: React.FC<TelegramAdminProps> = ({
  onAddCoins,
  onBroadcastAnnouncement,
  currentCoins
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [adminIdInput, setAdminIdInput] = useState('');
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'loading' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: ''
  });

  // Simulated Telegram Bot interactive chat terminal
  const [inputCmd, setInputCmd] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: `🤖 欢迎使用 Go 棋牌单体大厅 Telegram 管理员控制台！\n输入 /help 可查看所有可用管理员指令。`,
      time: '系统就绪'
    }
  ]);

  const handleRunCommand = (cmdText: string) => {
    const trimmed = cmdText.trim();
    if (!trimmed) return;
    sounds.playCardSelect();

    const now = new Date().toLocaleTimeString();
    const newMsg: ChatMessage = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: trimmed,
      time: now
    };

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    let replyText = '';

    switch (cmd) {
      case '/help':
      case '/start':
        replyText = `🀄 *Go 棋牌大厅管理员指令中心*
---------------------------------------
/status - 实时服务健康度、Goroutines 与内存监控
/addcoins <用户ID> <数量> - 账本事务级充值金币
/broadcast <公告内容> - 全服各房间广播实时通知
/stats - 查看撮合队列池 QPS 与局数统计
/kick <用户ID> - 强制断开指定违规玩家连接
/help - 显示此帮助清单
---------------------------------------
_底层引擎: gRPC Mesh (:50051) · Redis 7.2 Lua_`;
        break;

      case '/status':
        replyText = `📊 *棋牌单体微内核状态报告 (Online)*
---------------------------------------
• *服务状态*: 🟢 健康活跃 (HEALTHY)
• *当前玩家金币*: 💰 ${currentCoins.toLocaleString()}
• *活跃 Goroutine 协程*: 128
• *撮合队列平均延迟*: 0.18ms
• *Redis Lua 状态同步*: 0.22ms (原子操作)
• *支持游戏*: 斗地主, 锄大地, 跑得快, 十三水, 四川麻将
• *系统架构*: Linux / Termux / serv00 跨平台兼容
• *报告时间*: ${new Date().toLocaleString()}`;
        break;

      case '/addcoins':
        if (args.length < 2) {
          replyText = `❌ *参数错误*！格式: \`/addcoins <用户ID> <数量>\`\n例如: \`/addcoins user_me 50000\``;
        } else {
          const amt = parseInt(args[1], 10);
          if (isNaN(amt) || amt <= 0) {
            replyText = `❌ 增发金额必须为正整数！`;
          } else {
            onAddCoins(amt);
            sounds.playChips();
            replyText = `✅ *金币增发成功！*\n• 目标账户: \`${args[0]}\`\n• 变动金额: \`+${amt.toLocaleString()}\`\n• 交易TxID: \`tx_${Date.now().toString(36)}\`\n• 已同步至内存账本与用户前端界面。`;
          }
        }
        break;

      case '/broadcast':
        if (args.length === 0) {
          replyText = `❌ 请输入广播内容！\n例如: \`/broadcast 今晚8点全服开启锦标赛，获胜瓜分千万奖池！\``;
        } else {
          const broadcastMsg = args.join(' ');
          onBroadcastAnnouncement(broadcastMsg);
          sounds.playWin();
          replyText = `📢 *全服系统弹幕已广播！*\n已通过 Redis Pub/Sub 推送至所有游戏大厅与各房间玩家桌面：\n"${broadcastMsg}"`;
        }
        break;

      case '/stats':
        replyText = `📈 *全服撮合与运营指标统计*
---------------------------------------
• 历史撮合总局数: 4,520 局
• 斗地主: 1,840 局 | 锄大地: 1,120 局
• 跑得快: 790 局 | 十三水: 420 局 | 四川麻将: 350 局
• 抽水税收总计 (5%): 1,284,500 金币
• 机器人补位率: 8.5% (2秒无真人时平滑介入)`;
        break;

      case '/kick':
        if (args.length === 0) {
          replyText = `❌ 请指定目标用户ID！例如: \`/kick bot_002\``;
        } else {
          replyText = `⚠️ 已向分布式集群广播强制踢出指令: 用户 \`${args[0]}\` 已被切断 WebSocket/gRPC 连接并注销房间席位。`;
        }
        break;

      default:
        replyText = `❓ 未知管理员指令: \`${cmd}\`。\n请输入 \`/help\` 获取可用指令。`;
        break;
    }

    const botReply: ChatMessage = {
      id: 'bot_' + Date.now(),
      sender: 'bot',
      text: replyText,
      time: new Date().toLocaleTimeString(),
      isMarkdown: true
    };

    setMessages(prev => [...prev, newMsg, botReply]);
    setInputCmd('');
  };

  // Test Real Telegram Bot API
  const handleTestRealBot = async () => {
    if (!tokenInput.trim()) {
      setTestResult({ status: 'error', message: '请输入 TELEGRAM_BOT_TOKEN' });
      return;
    }

    setTestResult({ status: 'loading', message: '正在向 Telegram 官方 API 验证 Token...' });

    try {
      const res = await fetch(`https://api.telegram.org/bot${tokenInput.trim()}/getMe`);
      const data = await res.json();
      if (data.ok) {
        setTestResult({
          status: 'success',
          message: `✓ 验证通过！Bot 名称: @${data.result.username} (ID: ${data.result.id})`
        });

        // If admin ID is provided, send a greeting message
        if (adminIdInput.trim()) {
          fetch(`https://api.telegram.org/bot${tokenInput.trim()}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: adminIdInput.trim(),
              text: `🀄 *Go 棋牌游戏大厅*：管理员监控已联通！\n发送 /status 可查看实时状态。`,
              parse_mode: 'Markdown'
            })
          }).catch(() => {});
        }
      } else {
        setTestResult({
          status: 'error',
          message: `连接失败: ${data.description || 'Token 无效'}`
        });
      }
    } catch (e: any) {
      setTestResult({
        status: 'error',
        message: `网络请求失败 (若在大陆网络请确认已开启代理或配置域名映射): ${e.message}`
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

      {/* Header Banner */}
      <div className="bg-neutral-900/90 border border-amber-900/40 p-6 sm:p-8 rounded-2xl shadow-xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
          <Bot className="w-4 h-4" />
          <span>Telegram Bot 全服管理员控制中心</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white">
          远程指令中控、玩家充值与全服系统广播
        </h2>
        <p className="text-xs sm:text-sm text-neutral-400 max-w-3xl leading-relaxed">
          单体服务内置基于 Long-Polling 与 Webhook 的 Telegram 机器人守护协程。管理员可在手机 Telegram App 中直接发送 <code className="text-amber-300">/status</code>、<code className="text-amber-300">/addcoins</code>、<code className="text-amber-300">/broadcast</code>，对全服进行零延迟指令调度。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Interactive Telegram Bot Command Terminal Simulator (7 cols) */}
        <div className="lg:col-span-7 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 sm:p-6 flex flex-col h-[650px] shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Telegram 管理员交互终端</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h3>
                <span className="text-[10px] text-neutral-400 font-mono">@GameHallAdminBot · 授权 ID: 987654321</span>
              </div>
            </div>

            {/* Quick Command Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => handleRunCommand('/status')}
                className="px-2 py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] font-mono transition-colors"
              >
                /status
              </button>
              <button
                onClick={() => handleRunCommand('/addcoins user_me 50000')}
                className="px-2 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-mono transition-colors"
              >
                +5万金币
              </button>
              <button
                onClick={() => handleRunCommand('/broadcast 晚上8点开启锦标赛！')}
                className="px-2 py-1 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-mono transition-colors"
              >
                全服广播
              </button>
            </div>
          </div>

          {/* Terminal Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs my-3 bg-neutral-950 rounded-xl border border-neutral-800/80">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 mb-1">
                  <span>{m.sender === 'user' ? '管理员 (Admin)' : 'Telegram Bot'}</span>
                  <span>{m.time}</span>
                </div>
                <div
                  className={`max-w-[85%] rounded-xl p-3.5 leading-relaxed whitespace-pre-wrap ${
                    m.sender === 'user'
                      ? 'bg-amber-500/20 border border-amber-500/40 text-amber-200'
                      : 'bg-neutral-900 border border-neutral-800 text-neutral-200'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Command Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRunCommand(inputCmd);
            }}
            className="flex items-center gap-2 pt-2 border-t border-neutral-800"
          >
            <input
              type="text"
              value={inputCmd}
              onChange={(e) => setInputCmd(e.target.value)}
              placeholder="输入管理员指令, 例如: /status, /addcoins user_me 10000, /broadcast 公告内容"
              className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={!inputCmd.trim()}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>执行</span>
            </button>
          </form>
        </div>

        {/* Right Column: Real Telegram Configuration & Tutorials (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Live Telegram API Tester */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Key className="w-4 h-4 text-amber-400" />
              <span>真实 Telegram 机器人凭证配置与联通测试</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">TELEGRAM_BOT_TOKEN:</label>
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="例如: 123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white font-mono placeholder-neutral-700 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">TELEGRAM_ADMIN_ID (数字用户ID):</label>
                <input
                  type="text"
                  value={adminIdInput}
                  onChange={(e) => setAdminIdInput(e.target.value)}
                  placeholder="例如: 987654321"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white font-mono placeholder-neutral-700 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                onClick={handleTestRealBot}
                disabled={testResult.status === 'loading'}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-lg shadow-sky-600/20"
              >
                {testResult.status === 'loading' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>正在测试连接 Telegram API...</span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>测试 Bot Token 真实连通性</span>
                  </>
                )}
              </button>

              {testResult.message && (
                <div
                  className={`p-3 rounded-lg text-xs leading-relaxed ${
                    testResult.status === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                  }`}
                >
                  {testResult.message}
                </div>
              )}
            </div>
          </div>

          {/* Setup Guide Step-by-Step */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 space-y-3 shadow-xl text-xs">
            <div className="font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span>如何 2 分钟创建与配置你的专属 Telegram 机器人？</span>
            </div>

            <ol className="space-y-2.5 text-neutral-300 list-decimal list-inside leading-relaxed text-[11px]">
              <li className="p-2 rounded-lg bg-neutral-950 border border-neutral-800/80">
                <b className="text-amber-400">步骤 1：创建 Bot</b>
                <p className="text-neutral-400 mt-0.5">在 Telegram 中搜索并私聊官方机器人 <code className="text-amber-300">@BotFather</code>，发送 <code className="text-white font-mono">/newbot</code>，按提示输入名称获得 API Token。</p>
              </li>
              <li className="p-2 rounded-lg bg-neutral-950 border border-neutral-800/80">
                <b className="text-emerald-400">步骤 2：获取个人数字 ID</b>
                <p className="text-neutral-400 mt-0.5">私聊 <code className="text-emerald-300">@userinfobot</code> 或 <code className="text-emerald-300">@myidbot</code>，查看并复制你的个人纯数字 ID (例如 987654321)。</p>
              </li>
              <li className="p-2 rounded-lg bg-neutral-950 border border-neutral-800/80">
                <b className="text-cyan-400">步骤 3：写入 .env 环境变量</b>
                <p className="text-neutral-400 mt-0.5">将获取的 Token 与数字 ID 填入项目根目录的 <code className="text-cyan-300">.env</code> 文件中，随后启动 Go 服务，守护进程将自动常驻！</p>
              </li>
            </ol>
          </div>

        </div>

      </div>

    </div>
  );
};
