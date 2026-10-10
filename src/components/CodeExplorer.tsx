import React, { useState } from 'react';
import { GO_PROJECT_FILES, GoSourceFile } from '../utils/goCodebase';
import { Code2, Copy, Check, Download, Folder, FileCode, Terminal, Sparkles, Layers } from 'lucide-react';
import { sounds } from '../utils/sound';

export const CodeExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<GoSourceFile>(GO_PROJECT_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'all' | 'core' | 'engine' | 'proto' | 'infra' | 'deploy'>('all');

  const filteredFiles = filterCategory === 'all'
    ? GO_PROJECT_FILES
    : GO_PROJECT_FILES.filter(f => f.category === filterCategory);

  const handleCopy = () => {
    sounds.playCardSelect();
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadAll = () => {
    sounds.playChips();
    // Bundle all files into a downloadable text script
    let bundle = `# ================================================================\n`;
    bundle += `#  Go 棋牌游戏大厅全栈单体核心工程完整源码 (Monolith Codebase)\n`;
    bundle += `#  包含: 锄大地, 跑得快, 斗地主, 十三水, 四川血战麻将\n`;
    bundle += `#  架构: gRPC 跨服务总线 + Redis 内存状态同步 + 高并发匹配结算\n`;
    bundle += `# ================================================================\n\n`;

    GO_PROJECT_FILES.forEach(f => {
      bundle += `\n# ==================== [FILE: ${f.path}] ====================\n`;
      bundle += `# ${f.description}\n`;
      bundle += f.code + `\n\n`;
    });

    const blob = new Blob([bundle], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gamehall-monolith-go-source.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900/90 border border-amber-900/40 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Code2 className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-black text-white">Go 语言工程代码浏览器与架构中心</h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            提供经过严格工程化设计的 Go 单体微服务内核源码，可直接用于本地编译、容器化交付或微服务化拆分
          </p>
        </div>

        <button
          onClick={handleDownloadAll}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-neutral-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>一键导出全套 Go 源码</span>
        </button>
      </div>

      {/* Main IDE Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[640px]">

        {/* Left Sidebar: File Tree */}
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            {/* Filter buttons */}
            <div className="flex flex-wrap gap-1 pb-3 border-b border-neutral-800 text-[11px]">
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-2.5 py-1 rounded-lg ${filterCategory === 'all' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:bg-neutral-800'}`}
              >
                全部
              </button>
              <button
                onClick={() => setFilterCategory('engine')}
                className={`px-2.5 py-1 rounded-lg ${filterCategory === 'engine' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:bg-neutral-800'}`}
              >
                五大引擎
              </button>
              <button
                onClick={() => setFilterCategory('infra')}
                className={`px-2.5 py-1 rounded-lg ${filterCategory === 'infra' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:bg-neutral-800'}`}
              >
                基础架构
              </button>
              <button
                onClick={() => setFilterCategory('proto')}
                className={`px-2.5 py-1 rounded-lg ${filterCategory === 'proto' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:bg-neutral-800'}`}
              >
                gRPC协议
              </button>
              <button
                onClick={() => setFilterCategory('deploy')}
                className={`px-2.5 py-1 rounded-lg ${filterCategory === 'deploy' ? 'bg-emerald-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:bg-neutral-800'}`}
              >
                部署脚本
              </button>
            </div>

            {/* File List */}
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredFiles.map((f) => {
                const isSelected = selectedFile.path === f.path;
                return (
                  <div
                    key={f.path}
                    onClick={() => {
                      sounds.playCardSelect();
                      setSelectedFile(f);
                    }}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500 text-white shadow-md'
                        : 'bg-neutral-950/60 hover:bg-neutral-800/60 border-neutral-800/80 text-neutral-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCode className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-400' : 'text-neutral-500'}`} />
                      <div className="truncate">
                        <div className="font-mono font-bold text-white truncate">{f.path}</div>
                        <div className="text-[10px] text-neutral-500 truncate">{f.title}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Architecture notes */}
          <div className="pt-3 border-t border-neutral-800 text-[11px] text-neutral-500 leading-relaxed">
            模块已实现纯静态零 CGO 构建，原生支持 Docker 多阶段构建与 Kubernetes Pod 弹性伸缩。
          </div>
        </div>

        {/* Right Code Display */}
        <div className="lg:col-span-3 bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
          
          {/* File Header Bar */}
          <div className="bg-neutral-900/90 border-b border-neutral-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/30">
                  {selectedFile.path}
                </span>
                <span className="text-sm font-bold text-white">{selectedFile.title}</span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">{selectedFile.description}</p>
            </div>

            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-medium transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">已复制到剪贴板</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>复制代码</span>
                </>
              )}
            </button>
          </div>

          {/* Code Viewer with Line Numbers */}
          <div className="flex-1 p-6 overflow-x-auto overflow-y-auto max-h-[580px] bg-[#0d1117] font-mono text-xs text-neutral-200 leading-relaxed select-text">
            <pre className="relative">
              <code>
                {selectedFile.code.split('\n').map((line, idx) => (
                  <div key={idx} className="flex hover:bg-neutral-800/40 px-2 py-0.5 -mx-2 rounded">
                    <span className="w-10 text-neutral-600 select-none text-right pr-4 font-mono text-[11px]">
                      {idx + 1}
                    </span>
                    <span className="flex-1">{line}</span>
                  </div>
                ))}
              </code>
            </pre>
          </div>

        </div>

      </div>

    </div>
  );
};
