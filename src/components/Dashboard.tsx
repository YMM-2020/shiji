import { MemoryStats, MEMORY_TYPE_COLORS, MEMORY_TYPE_LABELS, MEMORY_TYPE_ICONS, MemoryType } from '../types'
import { Memory } from '../types'
import {
  TrendingUp,
  AlertTriangle,
  Brain,
  Clock,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react'

interface DashboardProps {
  stats: MemoryStats
  memories: Memory[]
  onSelectMemory: (id: string) => void
}

export default function Dashboard({ stats, memories, onSelectMemory }: DashboardProps) {
  const typeKeys: MemoryType[] = ['identity', 'preference', 'relationship', 'project', 'knowledge', 'goal']
  const pendingMemories = memories.filter((m) => m.confidence < 0.7 && m.source === 'inferred')

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">视己 · 仪表盘</h2>
          <p className="text-gray-500 mt-1">观己所见，自成图景</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={<Brain size={20} />}
          label="记忆总数"
          value={stats.total}
          color="blue"
        />
        <StatCard
          icon={<CheckCircle2 size={20} />}
          label="高置信度"
          value={stats.byConfidence.high}
          sub={stats.total > 0 ? `${Math.round((stats.byConfidence.high / stats.total) * 100)}%` : undefined}
          color="green"
        />
        <StatCard
          icon={<HelpCircle size={20} />}
          label="待确认"
          value={stats.pendingReview}
          color="amber"
        />
        <StatCard
          icon={<AlertTriangle size={20} />}
          label="检测到冲突"
          value={stats.conflicts}
          color="red"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Type Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-4">记忆类型分布</h3>
          <div className="space-y-3">
            {typeKeys.map((t) => {
              const count = stats.byType[t] || 0
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0
              return (
                <div key={t} className="flex items-center gap-3">
                  <span className="text-lg w-8">{MEMORY_TYPE_ICONS[t]}</span>
                  <span className="text-sm text-gray-600 w-20">{MEMORY_TYPE_LABELS[t]}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: MEMORY_TYPE_COLORS[t],
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 w-8 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Confidence Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-4">置信度分布</h3>
          <div className="flex items-center justify-center h-40">
            <div className="relative w-36 h-36">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                {stats.total > 0 ? (() => {
                  const hLen = (stats.byConfidence.high / stats.total) * 88
                  const mLen = (stats.byConfidence.medium / stats.total) * 88
                  const lLen = (stats.byConfidence.low / stats.total) * 88
                  return <>
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#10b981" strokeWidth="5" strokeDasharray={`${hLen} 88`} strokeLinecap="round" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" strokeWidth="5" strokeDasharray={`${mLen} 88`} strokeDashoffset={-hLen} strokeLinecap="round" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#ef4444" strokeWidth="5" strokeDasharray={`${lLen} 88`} strokeDashoffset={-(hLen + mLen)} strokeLinecap="round" />
                  </>
                })() : (
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#e5e7eb" strokeWidth="5" strokeDasharray="88 88" />
                )}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-700">{stats.total}</div>
                  <div className="text-xs text-gray-400">条记忆</div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-gray-500">高 ({stats.byConfidence.high})</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-gray-500">中 ({stats.byConfidence.medium})</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-500">低 ({stats.byConfidence.low})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Trend + Pending Review */}
      <div className="grid grid-cols-2 gap-6">
        {/* Weekly New Memories */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-primary-500" />
            本周新增记忆趋势
          </h3>
          <div className="flex items-end gap-2 h-32">
            {stats.weeklyNew.map((d, i) => {
              const maxCount = Math.max(...stats.weeklyNew.map((x) => x.count), 1)
              const height = (d.count / maxCount) * 100
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-gray-700">{d.count}</span>
                  <div
                    className="w-full bg-primary-200 rounded-t-md transition-all duration-300"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-xs text-gray-400">{d.date}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pending Review */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Clock size={16} className="text-amber-500" />
            待审查记忆
          </h3>
          {pendingMemories.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">暂无待审查的记忆 👏</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {pendingMemories.slice(0, 4).map((m) => (
                <button
                  key={m.id}
                  onClick={() => onSelectMemory(m.id)}
                  className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-amber-200 hover:bg-amber-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm text-gray-700 line-clamp-2">{m.content}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">
                      {Math.round(m.confidence * 100)}%
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 mt-1">{m.sourceDetail}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  sub?: string
  color: 'blue' | 'green' | 'amber' | 'red'
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          <p className="text-sm text-gray-500">
            {label}
            {sub && <span className="ml-1 text-xs text-gray-400">({sub})</span>}
          </p>
        </div>
      </div>
    </div>
  )
}
