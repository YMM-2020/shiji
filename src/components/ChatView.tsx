import { useState, useRef, useEffect } from 'react'
import { ChatSession, ChatMessage as ChatMsg, ExtractedTrait, MEMORY_TYPE_LABELS, MEMORY_TYPE_COLORS } from '../types'
import { Send, Sparkles, Eye, User, Bot, Plus, Trash2, Edit3, Check, X } from 'lucide-react'

interface ChatViewProps {
  session: ChatSession | null
  sessions: ChatSession[]
  activeSessionId: string | null
  isProcessing: boolean
  lastExtractions: ExtractedTrait[]
  onSend: (content: string) => void
  onNewChat: () => void
  onSelectSession: (id: string) => void
  onDeleteSession: (id: string) => void
  onRenameSession: (id: string, title: string) => void
  onClearExtractions: () => void
}

export default function ChatView({
  session,
  sessions,
  activeSessionId,
  isProcessing,
  lastExtractions,
  onSend,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onClearExtractions,
}: ChatViewProps) {
  const [input, setInput] = useState('')
  const [showSidebar, setShowSidebar] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [session?.messages])

  // Focus input on mount and session change
  useEffect(() => {
    inputRef.current?.focus()
  }, [activeSessionId])

  const handleSend = () => {
    if (!input.trim() || isProcessing) return
    onSend(input)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const startRename = (id: string, current: string) => {
    setEditingId(id)
    setEditTitle(current)
  }

  const commitRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameSession(id, editTitle.trim())
    }
    setEditingId(null)
  }

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex h-full">
      {/* Session Sidebar */}
      {showSidebar && (
        <div className="w-64 border-r border-gray-200 bg-white flex flex-col shrink-0">
          <div className="p-3">
            <button
              onClick={onNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
            >
              <Plus size={16} />
              新对话
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`group flex items-center rounded-lg transition-colors ${
                  s.id === activeSessionId
                    ? 'bg-primary-50 border border-primary-100'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                {editingId === s.id ? (
                  <div className="flex items-center gap-1 p-2 flex-1">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(s.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                      autoFocus
                    />
                    <button onClick={() => commitRename(s.id)} className="p-1 hover:bg-gray-100 rounded">
                      <Check size={12} className="text-emerald-500" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1 hover:bg-gray-100 rounded">
                      <X size={12} className="text-gray-400" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => onSelectSession(s.id)}
                      className="flex-1 text-left px-3 py-2.5 text-sm text-gray-700 truncate"
                    >
                      {s.title}
                    </button>
                    <div className="hidden group-hover:flex items-center gap-0.5 pr-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); startRename(s.id, s.title) }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Edit3 size={12} className="text-gray-400" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteSession(s.id) }}
                        className="p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={12} className="text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-8">暂无对话记录</p>
            )}
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="h-12 border-b border-gray-200 bg-white flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-1 hover:bg-gray-100 rounded text-gray-400"
              title="切换侧栏"
            >
              <Eye size={16} />
            </button>
            <span className="text-sm text-gray-600 font-medium truncate">
              {session?.title || '新对话'}
            </span>
            {session && session.messages.length > 0 && (
              <span className="text-xs text-gray-400">
                {session.messages.length} 条消息
              </span>
            )}
          </div>
          {session && (
            <span className="text-xs text-gray-400">
              {new Date(session.createdAt).toLocaleDateString('zh-CN')}
            </span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {!session || session.messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary-50 rounded-2xl flex items-center justify-center">
                  <Sparkles size={28} className="text-primary-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-700 mb-2">视己</h2>
                <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                  在工作中向我提问、讨论方案、或者随便聊聊。<br />
                  我会在对话中<strong className="text-primary-500">自动观察</strong>你的偏好和习惯，<br />
                  帮你建立属于自己的认知图谱。
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    '帮我分析一下微服务拆分的方案',
                    'React 和 Vue 哪个更适合我的项目',
                    '我在重构一个旧系统，有什么建议',
                    '推荐几个适合学习 Rust 的资源',
                  ].map((s, i) => (
                    <button
                      key={i}
                      onClick={() => onSend(s)}
                      className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs text-gray-500 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {session.messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-400 px-4 py-3 rounded-2xl rounded-bl-md">
                    <span className="inline-flex gap-1">
                      <span className="animate-bounce">●</span>
                      <span className="animate-bounce" style={{ animationDelay: '0.15s' }}>●</span>
                      <span className="animate-bounce" style={{ animationDelay: '0.3s' }}>●</span>
                    </span>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {/* Trait extraction notification */}
        {lastExtractions.length > 0 && (
          <div className="mx-4 mb-2">
            <div className="max-w-3xl mx-auto bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
              <Sparkles size={16} className="text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-700 mb-1">
                  🧠 从刚才的对话中观察到：
                </p>
                <div className="space-y-1">
                  {lastExtractions.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-amber-600">
                      <span
                        className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                        style={{
                          backgroundColor: MEMORY_TYPE_COLORS[t.type] + '20',
                          color: MEMORY_TYPE_COLORS[t.type],
                        }}
                      >
                        {MEMORY_TYPE_LABELS[t.type]}
                      </span>
                      <span>{t.trait}</span>
                      <span className="text-amber-400">({Math.round(t.confidence * 100)}%)</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={onClearExtractions}
                  className="text-xs text-amber-500 hover:text-amber-700 mt-1"
                >
                  知道了
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="max-w-3xl mx-auto flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                session
                  ? '输入消息，Enter 发送，Shift+Enter 换行...'
                  : '开始一段对话，我会在交流中了解你...'
              }
              rows={1}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none disabled:opacity-50"
              style={{ maxHeight: '120px' }}
              onInput={(e) => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 120) + 'px'
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              className="px-4 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 self-end"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function linkify(text: string): React.ReactNode {
  const urlRegex = /(https?:\/\/[^\s<>"')\]）]+)/g
  return text.split(urlRegex).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline decoration-1 underline-offset-2">
        {part}
      </a>
    ) : (
      part
    )
  )
}

function MessageBubble({ msg }: { msg: ChatMsg }) {
  return (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className="flex gap-3 max-w-[85%]">
        {msg.role === 'assistant' && (
          <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
            <Bot size={14} className="text-primary-600" />
          </div>
        )}
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            msg.role === 'user'
              ? 'bg-primary-500 text-white rounded-br-md'
              : 'bg-gray-100 text-gray-700 rounded-bl-md'
          }`}
        >
          {linkify(msg.content)}
        </div>
        {msg.role === 'user' && (
          <div className="w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center shrink-0 mt-0.5">
            <User size={14} className="text-white" />
          </div>
        )}
      </div>
    </div>
  )
}
