import { Memory, MEMORY_TYPE_LABELS, MEMORY_TYPE_ICONS, MEMORY_TYPE_COLORS } from '../types'
import {
  X,
  Edit3,
  Trash2,
  Lock,
  Unlock,
  CheckCircle,
  ThumbsDown,
  Link2,
  Tag,
  History,
  Eye,
} from 'lucide-react'

interface MemoryDetailProps {
  memory: Memory
  allMemories: Memory[]
  onClose: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onConfirm: (id: string) => void
  onWeaken: (id: string) => void
  onToggleLock: (id: string) => void
  onSelectMemory: (id: string) => void
  onAddTag: (id: string, tag: string) => void
  onRemoveTag: (id: string, tag: string) => void
  onLinkMemories: (id1: string, id2: string) => void
}

export default function MemoryDetail({
  memory,
  allMemories,
  onClose,
  onEdit,
  onDelete,
  onConfirm,
  onWeaken,
  onToggleLock,
  onSelectMemory,
  onAddTag,
  onRemoveTag,
}: MemoryDetailProps) {
  const relatedMemories = allMemories.filter((m) => memory.relatedMemories.includes(m.id))
  const confidenceColor =
    memory.confidence >= 0.8 ? 'text-emerald-600' : memory.confidence >= 0.5 ? 'text-amber-600' : 'text-red-500'
  const confidenceBg =
    memory.confidence >= 0.8 ? 'bg-emerald-50' : memory.confidence >= 0.5 ? 'bg-amber-50' : 'bg-red-50'

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-xl z-20 overflow-y-auto animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">记忆详情</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-md">
          <X size={18} className="text-gray-400" />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Type & Confidence */}
        <div className="flex items-center gap-3">
          <span
            className="px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: MEMORY_TYPE_COLORS[memory.type] + '20',
              color: MEMORY_TYPE_COLORS[memory.type],
            }}
          >
            {MEMORY_TYPE_ICONS[memory.type]} {MEMORY_TYPE_LABELS[memory.type]}
          </span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${confidenceBg} ${confidenceColor}`}>
            置信度 {Math.round(memory.confidence * 100)}%
          </span>
          {memory.locked && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
              <Lock size={10} /> 已锁定
            </span>
          )}
        </div>

        {/* Content */}
        <div>
          <p className="text-gray-800 leading-relaxed">{memory.content}</p>
        </div>

        {/* Meta info */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">来源</span>
            <span className="text-gray-600">
              {memory.source === 'user_stated'
                ? '用户明确告知'
                : memory.source === 'inferred'
                  ? 'AI 推断'
                  : memory.source === 'extracted_from_behavior'
                    ? '行为模式提取'
                    : '手动创建'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">来源详情</span>
            <span className="text-gray-600 max-w-[200px] text-right">{memory.sourceDetail}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">创建时间</span>
            <span className="text-gray-600">{formatDate(memory.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">最后更新</span>
            <span className="text-gray-600">{formatDate(memory.updatedAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">最近访问</span>
            <span className="text-gray-600">{formatDate(memory.lastAccessedAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">使用次数</span>
            <span className="text-gray-600">{memory.accessCount} 次</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">状态</span>
            <span className="text-gray-600">
              {memory.status === 'active' ? '🟢 活跃' : memory.status === 'dormant' ? '🟡 休眠' : '⚫ 归档'}
            </span>
          </div>
        </div>

        {/* Tags */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Tag size={14} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-600">标签</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {memory.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs group"
              >
                {tag}
                <button
                  onClick={() => onRemoveTag(memory.id, tag)}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-500"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            <button
              onClick={() => {
                const tag = prompt('输入新标签:')
                if (tag?.trim()) onAddTag(memory.id, tag.trim())
              }}
              className="px-2 py-0.5 border border-dashed border-gray-300 text-gray-400 rounded text-xs hover:border-primary-400 hover:text-primary-500"
            >
              + 添加
            </button>
          </div>
        </div>

        {/* Related Memories */}
        {relatedMemories.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link2 size={14} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-600">关联记忆</span>
            </div>
            <div className="space-y-1">
              {relatedMemories.map((rm) => (
                <button
                  key={rm.id}
                  onClick={() => onSelectMemory(rm.id)}
                  className="w-full text-left p-2 rounded-lg border border-gray-100 hover:border-primary-200 hover:bg-primary-50/50 transition-colors text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span>{MEMORY_TYPE_ICONS[rm.type]}</span>
                    <span className="text-gray-700 line-clamp-1">{rm.summary}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Evolution History */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <History size={14} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-600">演化历史</span>
          </div>
          <div className="space-y-2 border-l-2 border-gray-100 pl-3">
            {memory.evolution.slice(-5).reverse().map((evt, i) => (
              <div key={i} className="text-xs">
                <span className="text-gray-400">{formatDate(evt.timestamp)}</span>
                <span className="text-gray-600 ml-2">{evt.detail}</span>
                {evt.delta && (
                  <span className={evt.delta > 0 ? 'text-emerald-500 ml-1' : 'text-red-500 ml-1'}>
                    {evt.delta > 0 ? '+' : ''}{Math.round(evt.delta * 100)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => onConfirm(memory.id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
          >
            <CheckCircle size={14} />
            确认
          </button>
          <button
            onClick={() => onWeaken(memory.id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
          >
            <ThumbsDown size={14} />
            降权
          </button>
          <button
            onClick={() => onToggleLock(memory.id)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            {memory.locked ? <Unlock size={14} /> : <Lock size={14} />}
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(memory.id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            <Edit3 size={14} />
            编辑
          </button>
          <button
            onClick={() => {
              if (confirm('确定要删除这条记忆吗？')) onDelete(memory.id)
            }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
            删除
          </button>
        </div>
      </div>
    </div>
  )
}
