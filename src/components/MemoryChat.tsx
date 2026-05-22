import { useState, useRef, useEffect } from 'react'
import {
  ChatSession, ChatMessage as ChatMsg, ExtractedTrait,
  MEMORY_TYPE_LABELS, MEMORY_TYPE_COLORS,
} from '../types'
import {
  Send, Sparkles, Plus, Trash2, Edit3, Check, X,
  MessageSquare, ChevronDown, Bot, User,
} from 'lucide-react'

interface MemoryChatProps {
  sessions: ChatSession[]
  activeSession: ChatSession | null
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

const starters = [
  '帮我分析一下微服务拆分的方案',
  'React 和 Vue 哪个更适合我的项目',
  '我在重构一个旧系统，有什么建议',
  '推荐几个学习 Rust 的资源',
]

export default function MemoryChat({
  sessions,
  activeSession,
  activeSessionId,
  isProcessing,
  lastExtractions,
  onSend,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onClearExtractions,
}: MemoryChatProps) {
  const [input, setInput] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeSession?.messages, lastExtractions])

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

  const startRename = (id: string, cur: string) => { setEditingId(id); setEditTitle(cur) }
  const commitRename = (id: string) => {
    if (editTitle.trim()) onRenameSession(id, editTitle.trim())
    setEditingId(null)
  }

  return (
    <>
      {/* Header */}
      <div className="p-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary-100 rounded-lg flex items-center justify-center">
              <Sparkles size={14} className="text-primary-600" />
            </div>
            <h2 className="font-semibold text-gray-800 text-sm">AI 助手</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-1 rounded-md text-xs transition-colors ${showHistory ? 'bg-primary-50 text-primary-600' : 'text-gray-400 hover:bg-gray-100'}`}
              title="对话历史"
            >
              <ChevronDown size={14} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={onNewChat}
              className="p-1 rounded-md text-gray-400 hover:bg-gray-100 transition-colors"
              title="新建对话"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Session history dropdown */}
        {showHistory && (
          <div className="border-t border-gray-50 pt-2 max-h-40 overflow-y-auto space-y-0.5">
            {sessions.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">暂无历史对话</p>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  className={`group flex items-center rounded-md text-xs transition-colors ${
                    s.id === activeSessionId ? 'bg-primary-50' : 'hover:bg-gray-50'
                  }`}
                >
                  {editingId === s.id ? (
                    <div className="flex items-center gap-1 p-1.5 flex-1">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitRename(s.id); if (e.key === 'Escape') setEditingId(null) }}
                        className="flex-1 px-1.5 py-0.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                        autoFocus
                      />
                      <button onClick={() => commitRename(s.id)} className="p-0.5 hover:bg-gray-100 rounded"><Check size={10} className="text-emerald-500"/></button>
                      <button onClick={() => setEditingId(null)} className="p-0.5 hover:bg-gray-100 rounded"><X size={10} className="text-gray-400"/></button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => onSelectSession(s.id)} className="flex-1 text-left px-2 py-2 text-gray-700 truncate">
                        <MessageSquare size={10} className="inline mr-1 text-gray-400" />
                        {s.title}
                      </button>
                      <div className="hidden group-hover:flex items-center pr-1">
                        <button onClick={(e) => { e.stopPropagation(); startRename(s.id, s.title) }} className="p-0.5 hover:bg-gray-100 rounded"><Edit3 size={10} className="text-gray-400"/></button>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteSession(s.id) }} className="p-0.5 hover:bg-red-50 rounded"><Trash2 size={10} className="text-gray-400 hover:text-red-500"/></button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {!activeSession || activeSession.messages.length === 0 ? (
          <div className="text-center py-8 px-3">
            <div className="w-10 h-10 mx-auto mb-3 bg-primary-50 rounded-xl flex items-center justify-center">
              <Sparkles size={20} className="text-primary-500" />
            </div>
            <p className="text-sm text-gray-600 font-medium mb-1">有什么可以帮你？</p>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              问我任何工作/学习上的问题，<br />
              我会在对话中自动了解你。
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {starters.map((s, i) => (
                <button
                  key={i}
                  onClick={() => onSend(s)}
                  className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-full text-[11px] text-gray-500 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          activeSession.messages.map((msg) => (
            <ChatBubble key={msg.id} msg={msg} />
          ))
        )}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-400 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm">
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

      {/* Trait extraction notification */}
      {lastExtractions.length > 0 && (
        <div className="mx-3 mb-2 shrink-0">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5">
            <div className="flex items-start gap-2">
              <Sparkles size={14} className="text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-amber-700 mb-1">🧠 从对话中观察到：</p>
                {lastExtractions.map((t, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px] text-amber-600 mb-0.5">
                    <span
                      className="px-1 py-0.5 rounded-full text-[9px] font-medium shrink-0"
                      style={{ backgroundColor: MEMORY_TYPE_COLORS[t.type] + '20', color: MEMORY_TYPE_COLORS[t.type] }}
                    >
                      {MEMORY_TYPE_LABELS[t.type]}
                    </span>
                    <span className="truncate">{t.trait}</span>
                  </div>
                ))}
                <button onClick={onClearExtractions} className="text-[11px] text-amber-500 hover:text-amber-700 mt-1">知道了</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-gray-100 p-3 shrink-0">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="问任何问题，或聊聊你在做的事..."
            rows={1}
            disabled={isProcessing}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none disabled:opacity-50"
            style={{ maxHeight: '100px' }}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 100) + 'px'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="px-3 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 self-end"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </>
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

function ChatBubble({ msg }: { msg: ChatMsg }) {
  return (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className="flex gap-2 max-w-[90%]">
        {msg.role === 'assistant' && (
          <div className="w-6 h-6 rounded-md bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
            <Bot size={12} className="text-primary-600" />
          </div>
        )}
        <div
          className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            msg.role === 'user'
              ? 'bg-primary-500 text-white rounded-br-md'
              : 'bg-gray-100 text-gray-700 rounded-bl-md'
          }`}
        >
          {linkify(msg.content)}
        </div>
        {msg.role === 'user' && (
          <div className="w-6 h-6 rounded-md bg-primary-500 flex items-center justify-center shrink-0 mt-0.5">
            <User size={12} className="text-white" />
          </div>
        )}
      </div>
    </div>
  )
}
