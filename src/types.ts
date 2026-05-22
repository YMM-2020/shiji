export type MemoryType =
  | 'identity'
  | 'preference'
  | 'relationship'
  | 'project'
  | 'knowledge'
  | 'goal'

export type MemoryStatus = 'active' | 'dormant' | 'archived'

export interface EvolutionEntry {
  timestamp: string
  action: 'created' | 'confidence_changed' | 'content_edited' | 'type_changed' | 'linked' | 'unlinked'
  detail: string
  delta?: number
}

export interface Memory {
  id: string
  type: MemoryType
  content: string
  summary: string
  confidence: number
  source: 'user_stated' | 'inferred' | 'extracted_from_behavior' | 'manual'
  sourceDetail: string
  createdAt: string
  updatedAt: string
  lastAccessedAt: string
  accessCount: number
  status: MemoryStatus
  locked: boolean
  relatedMemories: string[]
  tags: string[]
  evolution: EvolutionEntry[]
}

export interface MemoryStats {
  total: number
  byType: Record<MemoryType, number>
  byConfidence: { high: number; medium: number; low: number }
  byStatus: { active: number; dormant: number; archived: number }
  pendingReview: number
  conflicts: number
  weeklyNew: { date: string; count: number }[]
}

export const MEMORY_TYPE_LABELS: Record<MemoryType, string> = {
  identity: '身份事实',
  preference: '偏好习惯',
  relationship: '人际关系',
  project: '进行中项目',
  knowledge: '知识认知',
  goal: '目标意图',
}

export const MEMORY_TYPE_ICONS: Record<MemoryType, string> = {
  identity: '👤',
  preference: '🎨',
  relationship: '👥',
  project: '📋',
  knowledge: '🧠',
  goal: '🎯',
}

export const MEMORY_TYPE_COLORS: Record<MemoryType, string> = {
  identity: '#3b82f6',
  preference: '#8b5cf6',
  relationship: '#ec4899',
  project: '#f59e0b',
  knowledge: '#10b981',
  goal: '#ef4444',
}

export type ViewType = 'chat' | 'dashboard' | 'graph' | 'timeline'

// ── Chat session types ──

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface ChatSession {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: ChatMessage[]
}

// ── Extracted trait (passive observation) ──

export interface ExtractedTrait {
  /** The raw text segment that triggered this extraction */
  snippet: string
  /** Extracted trait content */
  trait: string
  /** Inferred memory type */
  type: MemoryType
  /** Confidence of the extraction */
  confidence: number
}
