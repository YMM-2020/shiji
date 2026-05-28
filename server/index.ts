import express from 'express'
import cors from 'cors'
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import Anthropic from '@anthropic-ai/sdk'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, 'memories.db')

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

// ── SQLite wrapper ──

class DbWrapper {
  private db: SqlJsDatabase

  constructor(db: SqlJsDatabase) {
    this.db = db
  }

  exec(sql: string) {
    this.db.run(sql)
  }

  save(path: string) {
    const data = this.db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(path, buffer)
  }

  prepare(sql: string) {
    const stmt = this.db.prepare(sql)
    return {
      get: (...params: any[]) => {
        stmt.bind(params)
        if (stmt.step()) {
          const row = stmt.getAsObject()
          stmt.free()
          return row
        }
        stmt.free()
        return undefined
      },
      all: (...params: any[]) => {
        stmt.bind(params)
        const rows: any[] = []
        while (stmt.step()) {
          rows.push(stmt.getAsObject())
        }
        stmt.free()
        return rows
      },
      run: (...params: any[]) => {
        stmt.bind(params)
        stmt.step()
        stmt.free()
        return { changes: this.db.getRowsModified() }
      },
    }
  }
}

async function initDb(): Promise<DbWrapper> {
  const SQL = await initSqlJs()
  let sqlDb: SqlJsDatabase
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH)
    sqlDb = new SQL.Database(buffer)
    console.log('SQLite loaded from', DB_PATH)
  } else {
    sqlDb = new SQL.Database()
    console.log('SQLite created in memory')
  }
  return new DbWrapper(sqlDb)
}

// ── Start server ──

async function start() {
  let db: DbWrapper
  try {
    db = await initDb()
  } catch (e: any) {
    console.error('Failed to init DB:', e.message)
    const SQL = await initSqlJs()
    db = new DbWrapper(new SQL.Database())
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_AUTH_TOKEN || '',
    baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.deepseek.com/anthropic',
  })

  // Init schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL,
      last_login_at TEXT NOT NULL
    )
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS verification_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      created_at TEXT NOT NULL,
      used INTEGER DEFAULT 0
    )
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      summary TEXT NOT NULL,
      confidence REAL NOT NULL DEFAULT 0.5,
      source TEXT NOT NULL DEFAULT 'manual',
      source_detail TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_accessed_at TEXT NOT NULL,
      access_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      locked INTEGER DEFAULT 0,
      tags TEXT DEFAULT '[]',
      related_memories TEXT DEFAULT '[]',
      evolution TEXT DEFAULT '[]'
    )
  `)

  // ── Auth middleware ──
  function requireAuth(req: any, res: any, next: any) {
    const header = req.headers.authorization || ''
    const token = header.replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: '请先登录' })
    const row = db.prepare('SELECT user_id FROM auth_tokens WHERE token = ?').get(token) as any
    if (!row) return res.status(401).json({ error: '登录已过期，请重新登录' })
    req.userId = row.user_id
    next()
  }

  // ── Auth routes ──
  app.post('/api/auth/send-code', (req, res) => {
    const { phone } = req.body
    if (!phone || !/^1\d{10}$/.test(phone)) return res.status(400).json({ error: '请输入正确的手机号' })
    db.prepare('INSERT INTO verification_codes (phone, code, created_at) VALUES (?, ?, ?)').run(phone, '1234', new Date().toISOString())
    res.json({ ok: true, message: '验证码已发送' })
  })

  app.post('/api/auth/login', (req, res) => {
    const { phone, code } = req.body
    if (!phone || !code) return res.status(400).json({ error: '请填写手机号和验证码' })
    const vc = db.prepare("SELECT * FROM verification_codes WHERE phone = ? AND used = 0 AND created_at > ? ORDER BY created_at DESC LIMIT 1").get(phone, new Date(Date.now() - 300000).toISOString()) as any
    if (!vc || vc.code !== code) return res.status(400).json({ error: '验证码错误或已过期' })
    db.prepare('UPDATE verification_codes SET used = 1 WHERE id = ?').run(vc.id)
    let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as any
    if (!user) {
      const id = 'user_' + Date.now()
      const now = new Date().toISOString()
      db.prepare('INSERT INTO users (id, phone, created_at, last_login_at) VALUES (?, ?, ?, ?)').run(id, phone, now, now)
      user = { id, phone }
    } else {
      db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(new Date().toISOString(), user.id)
    }
    const token = 'tok_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10)
    db.prepare('INSERT INTO auth_tokens (token, user_id, created_at) VALUES (?, ?, ?)').run(token, user.id, new Date().toISOString())
    res.json({ ok: true, token, userId: user.id, phone: user.phone })
  })

  app.get('/api/auth/me', requireAuth, (req: any, res) => {
    const user = db.prepare('SELECT id, phone, created_at, last_login_at FROM users WHERE id = ?').get(req.userId) as any
    if (!user) return res.status(401).json({ error: '用户不存在' })
    res.json({ ok: true, user: { id: user.id, phone: user.phone, createdAt: user.created_at, lastLoginAt: user.last_login_at } })
  })

  // ── Memory routes ──
  app.get('/api/memories', requireAuth, (req: any, res) => {
    const rows = db.prepare('SELECT * FROM memories WHERE user_id = ? ORDER BY created_at DESC').all(req.userId) as any[]
    res.json(rows.map(parseMemory))
  })

  app.get('/api/memories/:id', requireAuth, (req: any, res) => {
    const row = db.prepare('SELECT * FROM memories WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any
    if (!row) return res.status(404).json({ error: 'Memory not found' })
    db.prepare('UPDATE memories SET last_accessed_at = ?, access_count = access_count + 1 WHERE id = ?').run(new Date().toISOString(), req.params.id)
    res.json(parseMemory(row))
  })

  app.post('/api/memories', requireAuth, (req: any, res) => {
    const { type, content, summary, confidence, source, sourceDetail, tags, relatedMemories } = req.body
    const id = 'mem_' + Date.now()
    const now = new Date().toISOString()
    const evolution = JSON.stringify([{ timestamp: now, action: 'created', detail: '通过 API 创建' }])
    db.prepare('INSERT INTO memories (id, user_id, type, content, summary, confidence, source, source_detail, created_at, updated_at, last_accessed_at, tags, related_memories, evolution) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, req.userId, type, content, summary, confidence, source, sourceDetail || '', now, now, now, JSON.stringify(tags || []), JSON.stringify(relatedMemories || []), evolution)
    const row = db.prepare('SELECT * FROM memories WHERE id = ?').get(id) as any
    res.status(201).json(parseMemory(row))
  })

  app.put('/api/memories/:id', requireAuth, (req: any, res) => {
    const existing = db.prepare('SELECT * FROM memories WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any
    if (!existing) return res.status(404).json({ error: 'Memory not found' })
    const updates = req.body
    const now = new Date().toISOString()
    const evolution = JSON.parse(existing.evolution || '[]')
    evolution.push({ timestamp: now, action: 'content_edited', detail: '通过 API 更新' })
    db.prepare("UPDATE memories SET type=?, content=?, summary=?, confidence=?, source=?, source_detail=?, updated_at=?, status=?, locked=?, tags=?, related_memories=?, evolution=? WHERE id=?").run(updates.type || existing.type, updates.content || existing.content, updates.summary || existing.summary, updates.confidence ?? existing.confidence, updates.source || existing.source, updates.sourceDetail || existing.source_detail, now, updates.status || existing.status, updates.locked ? 1 : 0, JSON.stringify(updates.tags || JSON.parse(existing.tags || '[]')), JSON.stringify(updates.relatedMemories || JSON.parse(existing.related_memories || '[]')), JSON.stringify(evolution), req.params.id)
    const row = db.prepare('SELECT * FROM memories WHERE id = ?').get(req.params.id) as any
    res.json(parseMemory(row))
  })

  app.delete('/api/memories/:id', requireAuth, (req: any, res) => {
    const result = db.prepare('DELETE FROM memories WHERE id = ? AND user_id = ?').run(req.params.id, req.userId)
    if (result.changes === 0) return res.status(404).json({ error: 'Memory not found' })
    res.status(204).send()
  })

  app.get('/api/stats', requireAuth, (req: any, res) => {
    const rows = db.prepare('SELECT * FROM memories WHERE user_id = ?').all(req.userId) as any[]
    const memories = rows.map(parseMemory)
    const byType: Record<string, number> = {}
    let high = 0, medium = 0, low = 0, active = 0, dormant = 0, archived = 0
    memories.forEach((m) => {
      byType[m.type] = (byType[m.type] || 0) + 1
      if (m.confidence >= 0.8) high++; else if (m.confidence >= 0.5) medium++; else low++
      if (m.status === 'active') active++; else if (m.status === 'dormant') dormant++; else archived++
    })
    res.json({ total: memories.length, byType, byConfidence: { high, medium, low }, byStatus: { active, dormant, archived }, pendingReview: memories.filter((m: any) => m.confidence < 0.7 && m.source === 'inferred').length, conflicts: 0 })
  })

  function parseMemory(row: any) {
    return {
      id: row.id,
      type: row.type,
      content: row.content,
      summary: row.summary,
      confidence: row.confidence,
      source: row.source,
      sourceDetail: row.source_detail,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastAccessedAt: row.last_accessed_at,
      accessCount: row.access_count,
      status: row.status,
      locked: !!row.locked,
      tags: JSON.parse(row.tags || '[]'),
      relatedMemories: JSON.parse(row.related_memories || '[]'),
      evolution: JSON.parse(row.evolution || '[]'),
    }
  }

  const TYPE_LABELS: Record<string, string> = {
    identity: '身份事实', preference: '偏好习惯', relationship: '人际关系',
    project: '进行中项目', knowledge: '知识认知', goal: '目标意图',
  }

  // ── Chat endpoint ──
  app.post('/api/chat', requireAuth, async (req: any, res) => {
    try {
      const { messages, memoryContext } = req.body
      let systemPrompt = '你是"视己"AI 助手，在用户工作和学习过程中陪伴他们。你可以回答任何问题、提供建议、讨论技术方案。\n\n'
      if (memoryContext && memoryContext.length > 0) {
        systemPrompt += '## 你对用户的已知了解\n\n'
        systemPrompt += '以下是从之前对话中被动观察到的用户特征，可以自然地融入回答中，但不要刻意强调"我记住了什么"：\n\n'
        for (const mem of memoryContext.slice(0, 15)) {
          systemPrompt += `- [${TYPE_LABELS[mem.type] || mem.type}] ${mem.content}\n`
        }
        systemPrompt += '\n'
      }
      systemPrompt += '## 行为准则\n\n'
      systemPrompt += '- 用自然、友好的语气回复，像同事聊天一样\n'
      systemPrompt += '- 如果用户问到和你已知信息相关的内容，自然地关联上\n'
      systemPrompt += '- 回答要简洁实用，不要啰嗦\n'
      systemPrompt += '- 如果用户表达偏好、计划、观点、身份信息，这些会在后续被自动分析\n'
      systemPrompt += '- 始终使用中文回复\n'

      const apiMessages = (messages || []).map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
        content: m.content,
      }))

      const response = await anthropic.messages.create({
        model: 'deepseek-chat',
        max_tokens: 2000,
        system: systemPrompt,
        messages: apiMessages,
      })

      const textBlocks = response.content.filter((block) => block.type === 'text')
      const reply = textBlocks.map((block) => (block as { type: 'text'; text: string }).text).join('')
      res.json({ reply })
    } catch (error: any) {
      console.error('Chat API error:', error.message)
      res.json({ reply: '抱歉，AI 服务暂时不可用。请稍后重试。\n\n（提示：' + (error.message || '未知错误') + '）' })
    }
  })

  // ── Export endpoints ──
  app.get('/api/export/markdown', requireAuth, (req: any, res) => {
    const rows = db.prepare("SELECT * FROM memories WHERE status != 'archived' AND user_id = ? ORDER BY confidence DESC").all(req.userId) as any[]
    const memories = rows.map(parseMemory)
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const byType = new Map<string, any[]>()
    memories.forEach((m) => {
      const list = byType.get(m.type) || []
      list.push(m)
      byType.set(m.type, list)
    })
    let md = `# 视己 · 记忆图谱导出\n\n> 导出时间: ${now}  |  共 ${memories.length} 条记忆\n\n---\n\n`
    for (const [type, items] of byType) {
      md += `## ${TYPE_LABELS[type] || type} (${items.length}条)\n\n`
      for (const m of items) {
        md += `### ${m.summary}${m.locked ? ' 🔒' : ''}\n\n`
        md += `- **内容**: ${m.content}\n`
        md += `- **置信度**: ${Math.round(m.confidence * 100)}%\n`
        md += `- **来源**: ${m.sourceDetail}\n`
        md += `- **标签**: ${m.tags.map((t: string) => `\`${t}\``).join(' ') || '无'}\n\n`
      }
    }
    res.set('Content-Type', 'text/markdown; charset=utf-8')
    res.send(md)
  })

  app.get('/api/export/prompt', requireAuth, (req: any, res) => {
    const rows = db.prepare("SELECT * FROM memories WHERE status = 'active' AND user_id = ? ORDER BY confidence DESC").all(req.userId) as any[]
    const memories = rows.map(parseMemory)
    const high = memories.filter((m: any) => m.confidence >= 0.8)
    const mid = memories.filter((m: any) => m.confidence >= 0.5 && m.confidence < 0.8)
    let prompt = `## 用户记忆上下文 (Memory Context)\n\n### 已确认\n`
    high.forEach((m: any) => { prompt += `- [${TYPE_LABELS[m.type] || m.type}] ${m.content}\n` })
    if (mid.length) {
      prompt += `\n### 推测\n`
      mid.forEach((m: any) => { prompt += `- [${TYPE_LABELS[m.type] || m.type}] ${m.content} (${Math.round(m.confidence * 100)}%)\n` })
    }
    prompt += `\n---\n> 自动生成 | 共 ${memories.length} 条\n`
    res.set('Content-Type', 'text/markdown; charset=utf-8')
    res.send(prompt)
  })

  app.get('/api/export/compact', requireAuth, (req: any, res) => {
    const rows = db.prepare("SELECT * FROM memories WHERE status = 'active' AND user_id = ? ORDER BY confidence DESC").all(req.userId) as any[]
    const memories = rows.map(parseMemory)
    let text = `# 视己 · 记忆图谱\n# Generated: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}\n# Total: ${memories.length}\n\n`
    memories.forEach((m: any) => {
      text += `  [${TYPE_LABELS[m.type] || m.type}] (${Math.round(m.confidence * 100)}%) ${m.content}\n`
    })
    res.set('Content-Type', 'text/plain; charset=utf-8')
    res.send(text)
  })

  // Serve built frontend in production
  const distPath = join(__dirname, '..', 'dist')
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath))
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' })
      res.sendFile(join(distPath, 'index.html'))
    })
    console.log('Serving static files from', distPath)
  } else {
    console.log('dist/ not found, static serving disabled')
  }

  const PORT = process.env.PORT || 3001
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`)
  })
}

start().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
