import { useState, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import MemoryGraph from './components/MemoryGraph'
import Timeline from './components/Timeline'
import MemoryDetail from './components/MemoryDetail'
import MemoryEditor from './components/MemoryEditor'
import MemoryChat from './components/MemoryChat'
import ExportPanel from './components/ExportPanel'
import LoginPage from './components/LoginPage'
import { useMemoryStore } from './store'
import { useChatStore } from './chatStore'
import { useAuth } from './authStore'
import { MemoryType } from './types'
import { MessageSquare, ExternalLink, LogOut } from 'lucide-react'

export default function App() {
  const auth = useAuth()
  const userId = auth.user?.id || null
  const memoryStore = useMemoryStore(userId)
  const chatStore = useChatStore(memoryStore, userId)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingMemory, setEditingMemory] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  const handleCreateNew = useCallback(() => {
    setEditingMemory(null)
    setEditorOpen(true)
  }, [])

  const handleEdit = useCallback((id: string) => {
    setEditingMemory(id)
    setEditorOpen(true)
  }, [])

  const handleSave = useCallback(
    (data: {
      type: MemoryType
      content: string
      summary: string
      confidence: number
      source: 'user_stated' | 'inferred' | 'extracted_from_behavior' | 'manual'
      sourceDetail: string
      status: 'active' | 'dormant' | 'archived'
      locked: boolean
      tags: string[]
      relatedMemories: string[]
    }) => {
      if (editingMemory) {
        memoryStore.updateMemory(editingMemory, data)
      } else {
        const created = memoryStore.createMemory(data)
        memoryStore.selectMemory(created.id)
      }
      setEditorOpen(false)
      setEditingMemory(null)
    },
    [editingMemory, memoryStore],
  )

  // ── Auth gate ──
  if (auth.loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div>
  }
  if (!auth.isLoggedIn) {
    return <LoginPage onSendCode={auth.sendCode} onLogin={auth.login} />
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        activeView={memoryStore.activeView}
        onViewChange={memoryStore.setActiveView}
        filterType={memoryStore.filterType}
        onFilterType={memoryStore.setFilterType}
        searchQuery={memoryStore.searchQuery}
        onSearchChange={memoryStore.setSearchQuery}
        onCreateNew={handleCreateNew}
        stats={{
          total: memoryStore.stats.total,
          pendingReview: memoryStore.stats.pendingReview,
          conflicts: memoryStore.stats.conflicts,
        }}
        userPhone={auth.user?.phone}
        onLogout={auth.logout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="h-12 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {memoryStore.activeView === 'dashboard' && '视己 · 仪表盘'}
              {memoryStore.activeView === 'graph' && '记忆图谱'}
              {memoryStore.activeView === 'timeline' && '时间线'}
            </span>
            {memoryStore.filterType !== 'all' && (
              <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full">
                已筛选
              </span>
            )}
            {memoryStore.searchQuery && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                搜索: {memoryStore.searchQuery}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              共 {memoryStore.filteredMemories.length} 条记忆
            </span>
            <button
              onClick={() => setExportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <ExternalLink size={14} />
              导出
            </button>
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                chatOpen
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <MessageSquare size={14} />
              AI 助手
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {memoryStore.activeView === 'dashboard' && (
              <Dashboard
                stats={memoryStore.stats}
                memories={memoryStore.memories}
                onSelectMemory={memoryStore.selectMemory}
              />
            )}
            {memoryStore.activeView === 'graph' && (
              <MemoryGraph
                memories={memoryStore.filteredMemories}
                selectedId={memoryStore.selectedId}
                onSelectMemory={memoryStore.selectMemory}
                onLinkMemories={memoryStore.linkMemories}
              />
            )}
            {memoryStore.activeView === 'timeline' && (
              <Timeline
                memories={memoryStore.filteredMemories}
                selectedId={memoryStore.selectedId}
                onSelectMemory={memoryStore.selectMemory}
              />
            )}
          </div>

          {/* AI Assistant Chat Panel — slide out from right */}
          {chatOpen && (
            <div className="w-96 border-l border-gray-200 bg-white shrink-0 flex flex-col">
              <MemoryChat
                sessions={chatStore.sessions}
                activeSession={chatStore.activeSession}
                activeSessionId={chatStore.activeSessionId}
                isProcessing={chatStore.isProcessing}
                lastExtractions={chatStore.lastExtractions}
                onSend={chatStore.sendMessage}
                onNewChat={chatStore.newChat}
                onSelectSession={chatStore.setActiveSessionId}
                onDeleteSession={chatStore.deleteChat}
                onRenameSession={chatStore.renameSession}
                onClearExtractions={chatStore.clearExtractions}
              />
            </div>
          )}
        </div>
      </div>

      {/* Memory Detail Slide-out */}
      {memoryStore.selectedMemory && (
        <MemoryDetail
          memory={memoryStore.selectedMemory}
          allMemories={memoryStore.memories}
          onClose={() => memoryStore.selectMemory(null)}
          onEdit={handleEdit}
          onDelete={memoryStore.deleteMemory}
          onConfirm={memoryStore.confirmMemory}
          onWeaken={memoryStore.weakenMemory}
          onToggleLock={memoryStore.toggleLock}
          onSelectMemory={memoryStore.selectMemory}
          onAddTag={memoryStore.addTag}
          onRemoveTag={memoryStore.removeTag}
          onLinkMemories={memoryStore.linkMemories}
        />
      )}

      {/* Memory Editor Modal */}
      {editorOpen && (
        <MemoryEditor
          memory={editingMemory ? memoryStore.memories.find((m) => m.id === editingMemory) || null : null}
          onSave={handleSave}
          onClose={() => {
            setEditorOpen(false)
            setEditingMemory(null)
          }}
        />
      )}

      {/* Export Panel Modal */}
      {exportOpen && (
        <ExportPanel
          memories={memoryStore.memories}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  )
}
