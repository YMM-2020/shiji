import { useState } from 'react'
import { Memory, MemoryType, MEMORY_TYPE_LABELS, MEMORY_TYPE_ICONS } from '../types'
import { X } from 'lucide-react'

interface MemoryEditorProps {
  memory?: Memory | null
  onSave: (data: {
    type: MemoryType
    content: string
    summary: string
    confidence: number
    source: Memory['source']
    sourceDetail: string
    status: Memory['status']
    locked: boolean
    tags: string[]
    relatedMemories: string[]
  }) => void
  onClose: () => void
}

const typeKeys: MemoryType[] = ['identity', 'preference', 'relationship', 'project', 'knowledge', 'goal']

export default function MemoryEditor({ memory, onSave, onClose }: MemoryEditorProps) {
  const [type, setType] = useState<MemoryType>(memory?.type || 'preference')
  const [content, setContent] = useState(memory?.content || '')
  const [summary, setSummary] = useState(memory?.summary || '')
  const [confidence, setConfidence] = useState(memory?.confidence || 0.7)
  const [source, setSource] = useState<Memory['source']>(memory?.source || 'manual')
  const [sourceDetail, setSourceDetail] = useState(memory?.sourceDetail || '')
  const [status, setStatus] = useState<Memory['status']>(memory?.status || 'active')
  const [locked, setLocked] = useState(memory?.locked || false)
  const [tagsInput, setTagsInput] = useState(memory?.tags.join(', ') || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    onSave({
      type,
      content: content.trim(),
      summary: summary.trim() || content.trim().slice(0, 30),
      confidence,
      source,
      sourceDetail: sourceDetail.trim() || '用户手动创建',
      status,
      locked,
      tags: tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      relatedMemories: memory?.relatedMemories || [],
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-30 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">
            {memory ? '编辑记忆' : '创建新记忆'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-md">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">记忆类型</label>
            <div className="grid grid-cols-3 gap-2">
              {typeKeys.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
                    type === t
                      ? 'border-primary-300 bg-primary-50 text-primary-700 font-medium'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {MEMORY_TYPE_ICONS[t]} {MEMORY_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">记忆内容</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              placeholder="例如：用户偏好使用 React + TypeScript 进行前端开发..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
            />
          </div>

          {/* Summary */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">简短摘要</label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="一句话概括（不超过30字）"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          {/* Confidence */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              置信度: {Math.round(confidence * 100)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={confidence}
              onChange={(e) => setConfidence(parseFloat(e.target.value))}
              className="w-full accent-primary-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>低 (10%)</span>
              <span>高 (100%)</span>
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">来源</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as Memory['source'])}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              <option value="user_stated">用户明确告知</option>
              <option value="inferred">AI 推断</option>
              <option value="extracted_from_behavior">行为模式提取</option>
              <option value="manual">手动创建</option>
            </select>
          </div>

          {/* Source Detail */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">来源详情</label>
            <input
              type="text"
              value={sourceDetail}
              onChange={(e) => setSourceDetail(e.target.value)}
              placeholder="这条记忆的来源说明..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              标签（逗号分隔）
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="例如：前端技术栈, React, TypeScript"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">状态</label>
            <div className="flex gap-2">
              {(['active', 'dormant', 'archived'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    status === s
                      ? 'border-primary-300 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {s === 'active' ? '🟢 活跃' : s === 'dormant' ? '🟡 休眠' : '⚫ 归档'}
                </button>
              ))}
            </div>
          </div>

          {/* Locked */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600">锁定记忆</label>
            <button
              type="button"
              onClick={() => setLocked(!locked)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                locked ? 'bg-primary-500' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  locked ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
            <span className="text-xs text-gray-400">锁定后 AI 不能自动修改</span>
          </div>
        </form>

        <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            {memory ? '保存修改' : '创建记忆'}
          </button>
        </div>
      </div>
    </div>
  )
}
