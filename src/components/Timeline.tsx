import { Memory, MEMORY_TYPE_ICONS, MEMORY_TYPE_COLORS, MEMORY_TYPE_LABELS } from '../types'
import { Clock, GitCommit } from 'lucide-react'

interface TimelineProps {
  memories: Memory[]
  selectedId: string | null
  onSelectMemory: (id: string) => void
}

export default function Timeline({ memories, selectedId, onSelectMemory }: TimelineProps) {
  // Sort by creation date descending
  const sorted = [...memories].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  // Group by month
  const grouped: { label: string; memories: Memory[] }[] = []
  sorted.forEach((m) => {
    const date = new Date(m.createdAt)
    const label = `${date.getFullYear()}年${date.getMonth() + 1}月`
    const last = grouped[grouped.length - 1]
    if (last && last.label === label) {
      last.memories.push(m)
    } else {
      grouped.push({ label, memories: [m] })
    }
  })

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">记忆时间线</h2>
          <p className="text-gray-500 mt-1">按时间回溯 AI 对你的认知形成过程</p>
        </div>
      </div>

      <div className="max-w-3xl">
        {grouped.map((group, gi) => (
          <div key={gi} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                <Clock size={14} className="text-primary-600" />
              </div>
              <h3 className="font-semibold text-gray-700">{group.label}</h3>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {group.memories.length} 条
              </span>
            </div>

            <div className="relative pl-10">
              {/* Vertical line */}
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />

              <div className="space-y-3">
                {group.memories.map((m) => {
                  const isNew =
                    new Date(m.createdAt).getTime() > Date.now() - 7 * 86400000
                  return (
                    <div key={m.id} className="relative">
                      {/* Dot on the line */}
                      <div
                        className="absolute -left-[34px] top-4 w-3 h-3 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: MEMORY_TYPE_COLORS[m.type] }}
                      />

                      <button
                        onClick={() => onSelectMemory(m.id)}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          selectedId === m.id
                            ? 'border-primary-300 bg-primary-50/50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-sm">
                                {MEMORY_TYPE_ICONS[m.type]}
                              </span>
                              <span
                                className="text-xs px-1.5 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: MEMORY_TYPE_COLORS[m.type] + '15',
                                  color: MEMORY_TYPE_COLORS[m.type],
                                }}
                              >
                                {MEMORY_TYPE_LABELS[m.type]}
                              </span>
                              {isNew && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                  新
                                </span>
                              )}
                              {m.locked && (
                                <span className="text-xs">🔒</span>
                              )}
                            </div>
                            <p className="text-gray-700 text-sm leading-relaxed">{m.content}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                              <span>
                                {new Date(m.createdAt).toLocaleDateString('zh-CN')}
                              </span>
                              <span>
                                置信度 {Math.round(m.confidence * 100)}%
                              </span>
                              <span>使用 {m.accessCount} 次</span>
                            </div>
                          </div>

                          {/* Confidence bar */}
                          <div className="w-16 shrink-0">
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${m.confidence * 100}%`,
                                    backgroundColor:
                                      m.confidence >= 0.8
                                        ? '#10b981'
                                        : m.confidence >= 0.5
                                          ? '#f59e0b'
                                          : '#ef4444',
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
