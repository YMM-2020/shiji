import { Memory, MEMORY_TYPE_LABELS, MEMORY_TYPE_ICONS, MemoryType } from './types'

/** Generate a human-readable Markdown summary of all memories */
export function exportAsMarkdown(memories: Memory[]): string {
  const byType = new Map<MemoryType, Memory[]>()
  memories
    .filter((m) => m.status !== 'archived')
    .sort((a, b) => b.confidence - a.confidence)
    .forEach((m) => {
      const list = byType.get(m.type) || []
      list.push(m)
      byType.set(m.type, list)
    })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  let md = `# 视己 · 记忆图谱导出\n\n`
  md += `> 导出时间: ${now}  |  共 ${memories.length} 条记忆  |  活跃: ${memories.filter((m) => m.status === 'active').length}\n\n`
  md += `---\n\n`

  for (const [type, items] of byType) {
    md += `## ${MEMORY_TYPE_ICONS[type]} ${MEMORY_TYPE_LABELS[type]} (${items.length}条)\n\n`
    for (const m of items) {
      const stars = confidenceStars(m.confidence)
      const locked = m.locked ? ' 🔒' : ''
      md += `### ${m.summary}${locked}\n\n`
      md += `- **内容**: ${m.content}\n`
      md += `- **置信度**: ${stars} ${Math.round(m.confidence * 100)}%\n`
      md += `- **来源**: ${m.sourceDetail}\n`
      md += `- **标签**: ${m.tags.map((t: string) => `\`${t}\``).join(' ') || '无'}\n`
      if (m.relatedMemories.length > 0) {
        const related = m.relatedMemories
          .map((rid: string) => memories.find((x: Memory) => x.id === rid))
          .filter((x): x is Memory => x !== undefined)
          .map((x) => x.summary)
          .join('、')
        md += `- **关联**: ${related}\n`
      }
      md += '\n'
    }
  }
  return md
}

/** Generate a prompt-optimized context block for injecting into AI conversations */
export function exportAsPrompt(memories: Memory[]): string {
  const active = memories
    .filter((m) => m.status === 'active')
    .sort((a, b) => b.confidence - a.confidence)

  const highConf = active.filter((m) => m.confidence >= 0.8)
  const midConf = active.filter((m) => m.confidence >= 0.5 && m.confidence < 0.8)
  const lowConf = active.filter((m) => m.confidence < 0.5)

  let prompt = `## 用户记忆上下文 (Memory Context)\n\n`
  prompt += `以下是我对用户的已知认知，按置信度分层：\n\n`

  prompt += `### 已确认 (置信度 ≥ 80%)\n`
  for (const m of highConf) {
    prompt += `- [${MEMORY_TYPE_LABELS[m.type]}] ${m.content}\n`
  }

  if (midConf.length > 0) {
    prompt += `\n### 推测 (置信度 50-80%)\n`
    for (const m of midConf) {
      prompt += `- [${MEMORY_TYPE_LABELS[m.type]}] ${m.content} (置信度: ${Math.round(m.confidence * 100)}%)\n`
    }
  }

  if (lowConf.length > 0) {
    prompt += `\n### 待确认 (置信度 < 50%)\n`
    for (const m of lowConf) {
      prompt += `- [${MEMORY_TYPE_LABELS[m.type]}] ${m.content} (置信度: ${Math.round(m.confidence * 100)}%)\n`
    }
  }

  prompt += `\n---\n> 自动生成于 ${new Date().toLocaleString('zh-CN')} | 共 ${memories.length} 条记忆\n`
  return prompt
}

/** Generate a project-ready JSON export */
export function exportAsJSON(memories: Memory[]): string {
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    total: memories.length,
    stats: {
      byStatus: {
        active: memories.filter((m) => m.status === 'active').length,
        dormant: memories.filter((m) => m.status === 'dormant').length,
        archived: memories.filter((m) => m.status === 'archived').length,
      },
      byConfidence: {
        high: memories.filter((m) => m.confidence >= 0.8).length,
        medium: memories.filter((m) => m.confidence >= 0.5 && m.confidence < 0.8).length,
        low: memories.filter((m) => m.confidence < 0.5).length,
      },
    },
    memories: memories.map((m) => ({
      id: m.id,
      type: m.type,
      typeLabel: MEMORY_TYPE_LABELS[m.type],
      summary: m.summary,
      content: m.content,
      confidence: m.confidence,
      source: m.source,
      sourceDetail: m.sourceDetail,
      status: m.status,
      locked: m.locked,
      tags: m.tags,
      relatedMemories: m.relatedMemories,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    })),
  }
  return JSON.stringify(exportData, null, 2)
}

/** Generate a compact YAML-like format suitable for project config files */
export function exportAsCompact(memories: Memory[]): string {
  const lines: string[] = []
  lines.push('# 视己 · 记忆图谱')
  lines.push(`# Generated: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`)
  lines.push(`# Total: ${memories.length} memories`)
  lines.push('')

  const active = memories.filter((m) => m.status === 'active')
  for (const m of active) {
    const prefix = m.locked ? '🔒' : '  '
    const pct = Math.round(m.confidence * 100)
    lines.push(`${prefix}[${MEMORY_TYPE_LABELS[m.type]}] (${pct}%) ${m.content}`)
  }
  return lines.join('\n')
}

function confidenceStars(confidence: number): string {
  if (confidence >= 0.9) return '★★★★★'
  if (confidence >= 0.8) return '★★★★☆'
  if (confidence >= 0.6) return '★★★☆☆'
  if (confidence >= 0.4) return '★★☆☆☆'
  return '★☆☆☆☆'
}

/** Trigger file download in browser */
export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Copy text to clipboard */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  }
}
