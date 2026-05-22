import { ViewType, MemoryType, MEMORY_TYPE_LABELS, MEMORY_TYPE_ICONS } from '../types'
import Logo from './Logo'
import {
  LayoutDashboard,
  GitGraph,
  Clock,
  Plus,
  Search,
  Brain,
  LogOut,
} from 'lucide-react'

interface SidebarProps {
  activeView: ViewType
  onViewChange: (v: ViewType) => void
  filterType: string
  onFilterType: (t: string) => void
  searchQuery: string
  onSearchChange: (q: string) => void
  onCreateNew: () => void
  stats: { total: number; pendingReview: number; conflicts: number }
  userPhone?: string
  onLogout?: () => void
}

const typeKeys: MemoryType[] = ['identity', 'preference', 'relationship', 'project', 'knowledge', 'goal']

export default function Sidebar({
  activeView,
  onViewChange,
  filterType,
  onFilterType,
  searchQuery,
  onSearchChange,
  onCreateNew,
  stats,
  userPhone,
  onLogout,
}: SidebarProps) {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100">
        <Logo />
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1">
        <button
          onClick={() => onViewChange('dashboard')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            activeView === 'dashboard'
              ? 'bg-primary-50 text-primary-700 font-medium'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <LayoutDashboard size={18} />
          视己仪表盘
        </button>
        <button
          onClick={() => onViewChange('graph')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            activeView === 'graph'
              ? 'bg-primary-50 text-primary-700 font-medium'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <GitGraph size={18} />
          记忆图谱
        </button>
        <button
          onClick={() => onViewChange('timeline')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            activeView === 'timeline'
              ? 'bg-primary-50 text-primary-700 font-medium'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Clock size={18} />
          时间线
        </button>
      </nav>

      {/* Quick Stats */}
      <div className="px-3 py-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
          记忆概览
        </p>
        <div className="space-y-1">
          <div className="flex justify-between items-center px-3 py-1.5 text-sm">
            <span className="text-gray-500">总数</span>
            <span className="font-semibold text-gray-700">{stats.total}</span>
          </div>
          <div className="flex justify-between items-center px-3 py-1.5 text-sm">
            <span className="text-gray-500">待确认</span>
            <span className="font-semibold text-amber-600">{stats.pendingReview}</span>
          </div>
          <div className="flex justify-between items-center px-3 py-1.5 text-sm">
            <span className="text-gray-500">冲突</span>
            <span className="font-semibold text-red-500">{stats.conflicts}</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索记忆..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Filter by Type */}
      <div className="px-3 py-2 flex-1 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
          记忆类型
        </p>
        <div className="space-y-0.5">
          <button
            onClick={() => onFilterType('all')}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
              filterType === 'all'
                ? 'bg-gray-100 text-gray-800 font-medium'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Brain size={14} />
            全部类型
          </button>
          {typeKeys.map((t) => (
            <button
              key={t}
              onClick={() => onFilterType(t)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                filterType === t
                  ? 'bg-gray-100 text-gray-800 font-medium'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span>{MEMORY_TYPE_ICONS[t]}</span>
              {MEMORY_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* User section */}
      {userPhone && (
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 truncate">{userPhone}</span>
            <button onClick={onLogout} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-500 transition-colors" title="退出登录">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Create Button */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={onCreateNew}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
        >
          <Plus size={16} />
          创建新记忆
        </button>
      </div>
    </aside>
  )
}
