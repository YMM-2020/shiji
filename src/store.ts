import { useState, useCallback, useMemo, useEffect } from 'react'
import { Memory, MemoryStats, ViewType } from './types'
import { mockMemories, computeStats } from './data/mockData'

function storageKey(userId: string | null) {
  return userId ? `ai-memories-${userId}` : 'ai-memories'
}

function loadMemories(userId: string | null): Memory[] {
  if (!userId) return []
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveMemories(userId: string | null, memories: Memory[]) {
  if (!userId) return
  localStorage.setItem(storageKey(userId), JSON.stringify(memories))
}

async function fetchMemoriesFromAPI(): Promise<Memory[]> {
  try {
    const token = localStorage.getItem('ai-auth')
    const authHeader: Record<string, string> = {}
    if (token) {
      try { authHeader['Authorization'] = `Bearer ${JSON.parse(token).token}` } catch {}
    }
    const res = await fetch('/api/memories', { headers: authHeader })
    if (res.ok) {
      const data = await res.json()
      return data.map((m: any) => ({
        id: m.id,
        type: m.type,
        content: m.content,
        summary: m.summary,
        confidence: m.confidence,
        source: m.source,
        sourceDetail: m.sourceDetail || '',
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        lastAccessedAt: m.lastAccessedAt,
        accessCount: m.accessCount,
        status: m.status,
        locked: m.locked,
        tags: m.tags,
        relatedMemories: m.relatedMemories,
        evolution: m.evolution,
      }))
    }
  } catch { /* ignore */ }
  return []
}

export function useMemoryStore(userId: string | null) {
  const [memories, setMemories] = useState<Memory[]>(() => loadMemories(userId))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<ViewType>('dashboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')

  // Reload when userId changes — sync from API + localStorage
  useEffect(() => {
    const local = loadMemories(userId)
    setMemories(local)
    setSelectedId(null)
    // Merge with API data
    if (userId) {
      fetchMemoriesFromAPI().then((apiMemories) => {
        if (apiMemories.length > 0) {
          setMemories((prev) => {
            const existing = new Set(prev.map((m) => m.id))
            const merged = [...prev]
            for (const m of apiMemories) {
              if (!existing.has(m.id)) merged.push(m)
            }
            return merged
          })
        }
      })
    }
  }, [userId])

  useEffect(() => {
    saveMemories(userId, memories)
  }, [memories, userId])

  const stats: MemoryStats = useMemo(() => computeStats(memories), [memories])

  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      if (filterType !== 'all' && m.type !== filterType) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          m.content.toLowerCase().includes(q) ||
          m.summary.toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [memories, filterType, searchQuery])

  const selectedMemory = useMemo(
    () => memories.find((m) => m.id === selectedId) || null,
    [memories, selectedId],
  )

  const selectMemory = useCallback((id: string | null) => setSelectedId(id), [])

  const updateMemory = useCallback((id: string, updates: Partial<Memory>) => {
    setMemories((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m
        return {
          ...m,
          ...updates,
          updatedAt: new Date().toISOString(),
          evolution: [
            ...m.evolution,
            { timestamp: new Date().toISOString(), action: 'content_edited' as const, detail: '用户手动编辑' },
          ],
        }
      }),
    )
  }, [])

  const deleteMemory = useCallback((id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id))
    setSelectedId((prev) => (prev === id ? null : prev))
  }, [])

  const createMemory = useCallback((memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt' | 'lastAccessedAt' | 'accessCount' | 'evolution'>) => {
    const now = new Date().toISOString()
    const newMemory: Memory = {
      ...memory,
      id: 'mem_' + Date.now(),
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      accessCount: 0,
      evolution: [{ timestamp: now, action: 'created', detail: '用户手动创建' }],
    }
    setMemories((prev) => [newMemory, ...prev])
    return newMemory
  }, [])

  const confirmMemory = useCallback((id: string) => {
    setMemories((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m
        return {
          ...m,
          confidence: 1.0,
          source: 'user_stated' as const,
          updatedAt: new Date().toISOString(),
          evolution: [...m.evolution, { timestamp: new Date().toISOString(), action: 'confidence_changed', detail: '用户确认', delta: 1.0 - m.confidence }],
        }
      }),
    )
  }, [])

  const weakenMemory = useCallback((id: string) => {
    setMemories((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m
        const newConf = Math.max(0.1, m.confidence - 0.2)
        return {
          ...m,
          confidence: newConf,
          updatedAt: new Date().toISOString(),
          evolution: [...m.evolution, { timestamp: new Date().toISOString(), action: 'confidence_changed', detail: '用户主动降权', delta: -0.2 }],
        }
      }),
    )
  }, [])

  const toggleLock = useCallback((id: string) => {
    setMemories((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m
        return { ...m, locked: !m.locked, updatedAt: new Date().toISOString(), evolution: [...m.evolution, { timestamp: new Date().toISOString(), action: 'content_edited', detail: m.locked ? '解锁记忆' : '锁定记忆' }] }
      }),
    )
  }, [])

  const linkMemories = useCallback((id1: string, id2: string) => {
    setMemories((prev) =>
      prev.map((m) => {
        if (m.id === id1 && !m.relatedMemories.includes(id2)) {
          return { ...m, relatedMemories: [...m.relatedMemories, id2], updatedAt: new Date().toISOString(), evolution: [...m.evolution, { timestamp: new Date().toISOString(), action: 'linked', detail: `关联到 ${id2}` }] }
        }
        if (m.id === id2 && !m.relatedMemories.includes(id1)) {
          return { ...m, relatedMemories: [...m.relatedMemories, id1], updatedAt: new Date().toISOString(), evolution: [...m.evolution, { timestamp: new Date().toISOString(), action: 'linked', detail: `关联到 ${id1}` }] }
        }
        return m
      }),
    )
  }, [])

  const addTag = useCallback((id: string, tag: string) => {
    setMemories((prev) =>
      prev.map((m) => {
        if (m.id !== id || m.tags.includes(tag)) return m
        return { ...m, tags: [...m.tags, tag], updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  const removeTag = useCallback((id: string, tag: string) => {
    setMemories((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m
        return { ...m, tags: m.tags.filter((t) => t !== tag), updatedAt: new Date().toISOString() }
      }),
    )
  }, [])

  return {
    memories,
    filteredMemories,
    stats,
    selectedId,
    selectedMemory,
    activeView,
    searchQuery,
    filterType,
    setActiveView,
    setSearchQuery,
    setFilterType,
    selectMemory,
    updateMemory,
    deleteMemory,
    createMemory,
    confirmMemory,
    weakenMemory,
    toggleLock,
    linkMemories,
    addTag,
    removeTag,
  }
}
