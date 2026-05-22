import { useState, useMemo, useCallback } from 'react'
import { Memory, MemoryType, MEMORY_TYPE_LABELS, MEMORY_TYPE_COLORS, MEMORY_TYPE_ICONS } from '../types'
import {
  exportAsMarkdown,
  exportAsPrompt,
  exportAsJSON,
  exportAsCompact,
  downloadFile,
  copyToClipboard,
} from '../exportUtils'
import {
  X,
  Download,
  Copy,
  Check,
  FileText,
  FileJson,
  MessageSquare,
  FileCode,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'

type ExportFormat = 'markdown' | 'prompt' | 'json' | 'compact'

const ALL_TYPES: MemoryType[] = ['identity', 'preference', 'relationship', 'project', 'knowledge', 'goal']

const formatDefs: {
  key: ExportFormat
  label: string
  icon: React.ReactNode
  ext: string
  mime: string
  desc: string
}[] = [
  {
    key: 'markdown',
    label: 'Markdown 摘要',
    icon: <FileText size={16} />,
    ext: '.md',
    mime: 'text/markdown',
    desc: '人类可读的格式化文档，适合作为项目文档',
  },
  {
    key: 'prompt',
    label: 'Prompt 上下文',
    icon: <MessageSquare size={16} />,
    ext: '.md',
    mime: 'text/markdown',
    desc: '可直接注入 AI 对话，按置信度分层',
  },
  {
    key: 'compact',
    label: '简洁摘要',
    icon: <FileCode size={16} />,
    ext: '.txt',
    mime: 'text/plain',
    desc: '紧凑格式，适合放在项目 README 或配置中',
  },
  {
    key: 'json',
    label: 'JSON 结构化',
    icon: <FileJson size={16} />,
    ext: '.json',
    mime: 'application/json',
    desc: '完整结构化数据，适合程序化集成',
  },
]

interface ExportPanelProps {
  memories: Memory[]
  onClose: () => void
}

export default function ExportPanel({ memories, onClose }: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>('prompt')
  const [selectedTypes, setSelectedTypes] = useState<Set<MemoryType>>(new Set(ALL_TYPES))
  const [copied, setCopied] = useState(false)
  const [autoExport, setAutoExport] = useState(false)
  const [lastExport, setLastExport] = useState<string | null>(null)

  const filteredMemories = useMemo(() => {
    if (selectedTypes.size === ALL_TYPES.length) return memories
    return memories.filter((m) => selectedTypes.has(m.type))
  }, [memories, selectedTypes])

  const content = useMemo(() => {
    switch (format) {
      case 'markdown':
        return exportAsMarkdown(filteredMemories)
      case 'prompt':
        return exportAsPrompt(filteredMemories)
      case 'json':
        return exportAsJSON(filteredMemories)
      case 'compact':
        return exportAsCompact(filteredMemories)
    }
  }, [filteredMemories, format])

  const handleDownload = useCallback(() => {
    const def = formatDefs.find((d) => d.key === format)!
    const timestamp = new Date().toISOString().slice(0, 10)
    downloadFile(content, `ai-memories-${timestamp}${def.ext}`, def.mime)
    setLastExport(new Date().toLocaleTimeString('zh-CN'))
  }, [content, format])

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(content)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [content])

  const toggleType = useCallback((type: MemoryType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        if (next.size > 1) next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedTypes(new Set(ALL_TYPES))
  }, [])

  const clearAll = useCallback(() => {
    setSelectedTypes(new Set([ALL_TYPES[0]])) // keep at least one
  }, [])

  const toggleAutoExport = useCallback(() => {
    setAutoExport(!autoExport)
    if (!autoExport) {
      localStorage.setItem('ai-memory-auto-export', content)
      localStorage.setItem('ai-memory-auto-export-format', format)
      localStorage.setItem('ai-memory-auto-export-time', new Date().toISOString())
    }
  }, [autoExport, content, format])

  const updateAutoExport = useCallback(() => {
    if (autoExport) {
      localStorage.setItem('ai-memory-auto-export', content)
      localStorage.setItem('ai-memory-auto-export-format', format)
      localStorage.setItem('ai-memory-auto-export-time', new Date().toISOString())
      setLastExport(new Date().toLocaleTimeString('zh-CN'))
    }
  }, [autoExport, content, format])

  useMemo(() => {
    updateAutoExport()
  }, [content])

  const lineCount = content.split('\n').length
  const charCount = content.length

  // Count per type
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    ALL_TYPES.forEach((t) => {
      counts[t] = memories.filter((m) => m.type === t && m.status !== 'archived').length
    })
    return counts
  }, [memories])

  return (
    <div className="fixed inset-0 bg-black/40 z-30 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <ExternalLink size={18} className="text-primary-500" />
              导出记忆到项目
            </h3>
            <p className="text-sm text-gray-400 mt-0.5">
              按类型筛选后导出，可直接用于 AI 对话、项目文档或程序化集成
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Format Selection */}
        <div className="px-5 py-3 border-b border-gray-50">
          <div className="flex gap-2">
            {formatDefs.map((def) => (
              <button
                key={def.key}
                onClick={() => setFormat(def.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all ${
                  format === def.key
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {def.icon}
                {def.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {formatDefs.find((d) => d.key === format)!.desc}
          </p>
        </div>

        {/* Type Filter */}
        <div className="px-5 py-3 border-b border-gray-50">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-gray-500">按类型筛选：</span>
            <button onClick={selectAll} className="text-[11px] text-primary-500 hover:text-primary-700">
              全选
            </button>
            <button onClick={clearAll} className="text-[11px] text-gray-400 hover:text-gray-600">
              清除
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_TYPES.map((type) => {
              const selected = selectedTypes.has(type)
              const count = typeCounts[type] || 0
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    selected
                      ? 'shadow-sm'
                      : 'opacity-40 hover:opacity-70'
                  }`}
                  style={{
                    backgroundColor: selected ? MEMORY_TYPE_COLORS[type] + '18' : 'transparent',
                    color: MEMORY_TYPE_COLORS[type],
                    borderColor: MEMORY_TYPE_COLORS[type] + '40',
                  }}
                >
                  <span>{MEMORY_TYPE_ICONS[type]}</span>
                  <span>{MEMORY_TYPE_LABELS[type]}</span>
                  <span className="tabular-nums">({count})</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="px-5 py-2 flex items-center justify-between text-xs text-gray-400">
            <span>
              {lineCount} 行 | {charCount} 字符
            </span>
            <span>
              基于 {filteredMemories.length} 条记忆生成（共 {memories.filter((m) => m.status === 'active').length} 条活跃）
            </span>
          </div>
          <pre className="flex-1 overflow-y-auto px-5 py-3 bg-gray-50 mx-5 mb-3 rounded-xl text-sm font-mono text-gray-700 whitespace-pre-wrap">
{content}
          </pre>
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleAutoExport}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                autoExport
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              <RefreshCw size={14} className={autoExport ? 'text-emerald-500' : ''} />
              自动同步
            </button>
            {lastExport && (
              <span className="text-xs text-gray-400">上次导出: {lastExport}</span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {copied ? (
                <>
                  <Check size={16} className="text-emerald-500" />
                  已复制
                </>
              ) : (
                <>
                  <Copy size={16} />
                  复制到剪贴板
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
            >
              <Download size={16} />
              下载文件
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
