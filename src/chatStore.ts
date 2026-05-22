import { useState, useCallback, useMemo, useEffect } from 'react'
import { ChatSession, ChatMessage, ExtractedTrait, MemoryType } from './types'
import { useMemoryStore } from './store'

// ── Trait extraction patterns ──
// Each pattern matches user messages and extracts potential traits
interface ExtractionRule {
  pattern: RegExp
  type: MemoryType
  template: (match: RegExpMatchArray) => { trait: string; summary: string } | null
}

const EXTRACTION_RULES: ExtractionRule[] = [
  // Identity — "我是/做 X"
  {
    pattern: /我(?:是|做|干)(?:\s*一[个名位]?\s*|\s*的?\s*)(.+?)(?:[，。！,\.]|$)/,
    type: 'identity',
    template: (m) => {
      let role = m[1].trim()
      // Strip trailing 的
      role = role.replace(/的$/, '').trim()
      if (role.length < 2 || role.length > 30) return null
      return { trait: `用户是${role}`, summary: role.slice(0, 25) }
    },
  },
  {
    pattern: /我(?:在|base|住)(?:在)?(.+?)(?:工作|上班|生活|办公)/,
    type: 'identity',
    template: (m) => ({ trait: `用户在${m[1]}工作/生活`, summary: `base ${m[1]}` }),
  },
  {
    pattern: /我(?:毕业|读|上)(?:于|的|过)?(.+?)(?:大学|学院|学校|硕士|博士|本科)/,
    type: 'identity',
    template: (m) => ({ trait: `用户毕业于${m[1]}${m[0].includes('硕士') ? '硕士' : m[0].includes('博士') ? '博士' : '本科'}`, summary: `毕业于${m[1]}` }),
  },
  {
    pattern: /我(?:有|干了|做了)(\d+)(?:年|年多)(?:的)?(?:开发|编程|工作)?经验/,
    type: 'identity',
    template: (m) => ({ trait: `用户拥有${m[1]}年开发经验`, summary: `${m[1]}年经验` }),
  },
  // Preference
  {
    pattern: /我(?:喜欢|偏好|习惯|倾向于|爱)(?:用|使用)?(.+?)(?:，|。|！|$|\.|\,|\s{2})/,
    type: 'preference',
    template: (m) => {
      const pref = m[1].trim()
      if (pref.length > 30 || pref.length < 2) return null
      return { trait: `用户偏好 ${pref}`, summary: `偏好 ${pref}` }
    },
  },
  {
    pattern: /我(?:不喜欢|讨厌|反感|受不了)(.+?)(?:，|。|！|$)/,
    type: 'preference',
    template: (m) => {
      const pref = m[1].trim()
      if (pref.length > 30 || pref.length < 2) return null
      return { trait: `用户不喜欢 ${pref}`, summary: `不喜欢 ${pref}` }
    },
  },
  {
    pattern: /(?:我)?(?:觉得|认为|感觉|感觉上)(.+?)(?:更(?:好|优|合适|适合|靠谱|强|快|重要|方便|简单|顺手))|(?:我)?(?:觉得|认为|感觉)(.+?)(?:比较好|比较好用|不错|更好一些)/,
    type: 'preference',
    template: (m) => {
      const pref = (m[1] || m[2] || '').trim()
      if (pref.length < 1 || pref.length > 30) return null
      return { trait: `用户偏好 ${pref}`, summary: `偏好 ${pref.slice(0, 20)}` }
    },
  },
  // Project
  {
    pattern: /(?:我)?(?:在|正在|最近在?)(?:做|搞|弄|开发|写|搭|构建|搭建|迁移|重构|优化|研究|调研)(?:一个?|的)?(.+?)(?:项目|需求|功能|模块|系统|平台)/,
    type: 'project',
    template: (m) => {
      const verb = m[0].match(/(?:做|搞|弄|开发|写|搭|构建|搭建|迁移|重构|优化|研究|调研)/)![0]
      return { trait: `用户正在${verb}${m[1]}项目`, summary: `${m[1]}项目` }
    },
  },
  {
    pattern: /(?:要把?|在)(?:单体|旧系统|老项目|应用|服务|代码)(?:拆|迁移|重构|改造|升级|优化)(?:成|到|为)?(.+?)(?:，|。|！|$)/,
    type: 'project',
    template: (m) => {
      const action = m[0].includes('拆') ? '拆分' : m[0].includes('迁移') ? '迁移' : m[0].includes('重构') ? '重构' : '改造'
      return { trait: `用户正在${action}系统到${m[1].trim().slice(0, 20)}`, summary: `${action}: ${m[1].trim().slice(0, 20)}` }
    },
  },
  {
    pattern: /(?:我)?(?:最近)?(?:在|正在)(?:研究|调研|学|学习|看|读|入门|搞)(.+?)(?:，|。|！|$)/,
    type: 'project',
    template: (m) => {
      const topic = m[1].trim()
      if (topic.length > 20 || topic.length < 2) return null
      return { trait: `用户正在学习/研究 ${topic}`, summary: `研究 ${topic.slice(0, 20)}` }
    },
  },
  // Knowledge — must express a clear opinion/conclusion
  {
    pattern: /(?:我)?(?:认为|觉得|理解|深知|认识到?)(.+?)(?:是|应该|需要|必须|值得|不值得|很重要|不重要|非常|绝对)(.+?)(?:，|。|！|$)/,
    type: 'knowledge',
    template: (m) => {
      const opinion = `${m[1].trim()}${m[2].trim()}`
      if (opinion.length < 4 || opinion.length > 60) return null
      return { trait: `用户认为${m[1].trim()}${m[2].trim()}`, summary: opinion.slice(0, 25) }
    },
  },
  {
    pattern: /(?:我)?(?:觉得|认为|感觉)(.+?)(?:比|相比|比起|相对于)(.+?)(?:更|还|还要|要)?(?:好|优|高|强|快|重要|有用|靠谱|大|划算)/,
    type: 'knowledge',
    template: (m) => ({ trait: `用户认为${m[1].trim()}比${m[2].trim()}更好`, summary: `${m[1].trim().slice(0, 12)} > ${m[2].trim().slice(0, 12)}` }),
  },
  // Goal
  {
    pattern: /我(?:打算|计划|准备|想要?|希望|目标是?)(?:在?|今年|明年|这个月|下个月|下季度)?(.+?)(?:，|。|！|$)/,
    type: 'goal',
    template: (m) => {
      const goal = m[1].trim()
      if (goal.length > 30 || goal.length < 3) return null
      return { trait: `用户计划 ${goal}`, summary: goal.slice(0, 25) }
    },
  },
  {
    pattern: /我(?:要|想|得)(?:学|掌握|精通|入门|了解|研究)(.+?)(?:，|。|！|$)/,
    type: 'goal',
    template: (m) => ({ trait: `用户想要学习/掌握 ${m[1].trim()}`, summary: `想学 ${m[1].trim().slice(0, 20)}` }),
  },
  // Relationship
  {
    pattern: /(?:我(?:们?|的))(?:同事|领导|老板|mentor|导师|朋友|下属|队友|搭档|技术总监|经理|负责人|老大|组长)(?:是|叫|名叫|名字是)?(.+?)(?:，|。|！|是|负责|做|搞|对|有)/,
    type: 'relationship',
    template: (m) => {
      const role = m[0].match(/(?:同事|领导|老板|mentor|导师|朋友|下属|队友|搭档|技术总监|经理|负责人|老大|组长)/)![0]
      return { trait: `用户的${role}是${m[1].trim()}`, summary: `${role}: ${m[1].trim().slice(0, 20)}` }
    },
  },
  {
    pattern: /我(?:带|在带|在带教|在教|mentor)(?:了|着|的)?(?:一个|个)?(.+?)(?:，|。|！|是|叫|他|她)/,
    type: 'relationship',
    template: (m) => ({ trait: `用户在带/mentor ${m[1].trim()}`, summary: `mentor ${m[1].trim().slice(0, 20)}` }),
  },
]

// ── Extracted trait uniqueness check ──
function isDuplicateTrait(traits: ExtractedTrait[], existing: string[]): boolean {
  const last = traits[traits.length - 1]
  if (!last) return true
  // Check against recent extractions
  const recent = traits.slice(-10)
  for (const t of recent.slice(0, -1)) {
    if (t.trait === last.trait) return true
    if (similarity(t.trait, last.trait) > 0.7) return true
  }
  // Check against existing memories
  for (const e of existing) {
    if (similarity(e, last.trait) > 0.6) return true
  }
  return false
}

function similarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/[\s，。！？、]+/).filter((w) => w.length > 1))
  const wordsB = new Set(b.split(/[\s，。！？、]+/).filter((w) => w.length > 1))
  if (wordsA.size === 0 || wordsB.size === 0) return 0
  const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)))
  return intersection.size / Math.max(wordsA.size, wordsB.size)
}

// ── Passive trait extraction from user message ──
export function extractTraits(
  message: string,
  existingMemories: { content: string; summary: string }[],
): ExtractedTrait[] {
  const results: ExtractedTrait[] = []
  const existingTexts = existingMemories.map((m) => m.content + ' ' + m.summary)

  for (const rule of EXTRACTION_RULES) {
    const match = message.match(rule.pattern)
    if (match) {
      const result = rule.template(match)
      if (result && result.trait.length >= 4 && result.trait.length <= 80) {
        const trait: ExtractedTrait = {
          snippet: match[0],
          trait: result.trait,
          type: rule.type,
          confidence: 0.55, // Start low — needs user confirmation or repeated pattern
        }
        results.push(trait)
      }
    }
  }

  // Filter duplicates
  return results.filter(() => {
    const isDup = isDuplicateTrait(results, existingTexts)
    return !isDup
  })
}

// ── Real LLM API call ──

async function callChatAPI(
  messages: { role: string; content: string }[],
  memoryContext: { type: string; content: string }[],
): Promise<string> {
  try {
    const token = localStorage.getItem('ai-auth')
    const authHeader: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) {
      try { authHeader['Authorization'] = `Bearer ${JSON.parse(token).token}` } catch {}
    }
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ messages, memoryContext }),
    })
    const data = await res.json()
    return data.reply || '抱歉，未收到回复。'
  } catch (e: any) {
    console.error('Chat API error:', e)
    return '抱歉，AI 服务连接失败。请确认后端已启动（npm run server），稍后重试。'
  }
}

// ── Chat Store ──

function storageKey(userId: string | null) {
  return userId ? `ai-chat-${userId}` : 'ai-chat-sessions'
}

function loadSessions(userId: string | null): ChatSession[] {
  if (!userId) return []
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveSessions(userId: string | null, sessions: ChatSession[]) {
  if (!userId) return
  localStorage.setItem(storageKey(userId), JSON.stringify(sessions))
}

export function useChatStore(memoryStore: ReturnType<typeof useMemoryStore>, userId: string | null) {
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions(userId))
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    () => sessions[0]?.id || null,
  )
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastExtractions, setLastExtractions] = useState<ExtractedTrait[]>([])

  // Reload when userId changes
  useEffect(() => {
    const loaded = loadSessions(userId)
    setSessions(loaded)
    setActiveSessionId(loaded[0]?.id || null)
    setLastExtractions([])
  }, [userId])

  // Persist
  useEffect(() => {
    saveSessions(userId, sessions)
  }, [sessions, userId])

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) || null,
    [sessions, activeSessionId],
  )

  // Create new chat
  const newChat = useCallback(() => {
    const now = new Date().toISOString()
    const session: ChatSession = {
      id: 'chat_' + Date.now(),
      title: '新对话',
      createdAt: now,
      updatedAt: now,
      messages: [],
    }
    setSessions((prev) => [session, ...prev])
    setActiveSessionId(session.id)
    setLastExtractions([])
  }, [])

  // Delete chat
  const deleteChat = useCallback(
    (id: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== id))
      if (activeSessionId === id) {
        const remaining = sessions.filter((s) => s.id !== id)
        setActiveSessionId(remaining[0]?.id || null)
      }
    },
    [activeSessionId, sessions],
  )

  // Send message
  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim() || isProcessing) return

      let sessionId = activeSessionId

      // Auto-create session if none active
      if (!sessionId) {
        const now = new Date().toISOString()
        const newSession: ChatSession = {
          id: 'chat_' + Date.now(),
          title: content.slice(0, 30) || '新对话',
          createdAt: now,
          updatedAt: now,
          messages: [],
        }
        setSessions((prev) => [newSession, ...prev])
        sessionId = newSession.id
        setActiveSessionId(sessionId)
      }

      const userMsg: ChatMessage = {
        id: 'msg_' + Date.now(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString(),
      }

      // Update session with user message
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s
          const updated = {
            ...s,
            messages: [...s.messages, userMsg],
            updatedAt: new Date().toISOString(),
            // Auto-title from first user message
            title: s.messages.length === 0 ? content.slice(0, 30) + (content.length > 30 ? '...' : '') : s.title,
          }
          return updated
        }),
      )

      setIsProcessing(true)

      // Call real LLM API (async)
      ;(async () => {
        // Build memory context for the AI
        const memoryContext = memoryStore.memories
          .filter((m) => m.status === 'active')
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 15)
          .map((m) => ({ type: m.type, content: m.content }))

        // Get current session messages for API context
        const currentSession = sessions.find((s) => s.id === sessionId)
        const recentMessages = (currentSession?.messages || [])
          .slice(-20)
          .map((m) => ({ role: m.role, content: m.content }))

        const reply = await callChatAPI(
          [...recentMessages, { role: 'user', content: content.trim() }],
          memoryContext,
        )

        const assistantMsg: ChatMessage = {
          id: 'msg_' + (Date.now() + 1),
          role: 'assistant',
          content: reply,
          timestamp: new Date().toISOString(),
        }

        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== sessionId) return s
            return {
              ...s,
              messages: [...s.messages, assistantMsg],
              updatedAt: new Date().toISOString(),
            }
          }),
        )

        // Passive trait extraction from user message
        const observedTraits = extractTraits(content.trim(), memoryStore.memories.map((m) => ({ content: m.content, summary: m.summary })))

        if (observedTraits.length > 0) {
          const newExtractions: ExtractedTrait[] = []
          for (const t of observedTraits) {
            memoryStore.createMemory({
              type: t.type,
              content: t.trait,
              summary: t.trait.slice(0, 30),
              confidence: t.confidence,
              source: 'extracted_from_behavior',
              sourceDetail: '从对话中被动观察提取',
              status: 'active',
              locked: false,
              tags: ['自动提取'],
              relatedMemories: [],
            })
            newExtractions.push(t)
          }
          setLastExtractions(newExtractions)
        }

        setIsProcessing(false)
      })()
    },
    [activeSessionId, isProcessing, memoryStore],
  )

  // Rename session
  const renameSession = useCallback((id: string, title: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title } : s)),
    )
  }, [])

  return {
    sessions,
    activeSession,
    activeSessionId,
    isProcessing,
    lastExtractions,
    setActiveSessionId,
    newChat,
    deleteChat,
    sendMessage,
    renameSession,
    clearExtractions: () => setLastExtractions([]),
  }
}
