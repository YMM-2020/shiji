/**
 * NLU (Natural Language Understanding) engine for memory commands.
 *
 * Replaces brittle keyword-matching with a pattern-based classifier that handles
 * natural Chinese expressions, negation, and entity extraction.
 */

// ── Intent types ──
export type Intent =
  | 'create'    // 记住 / 添加新记忆
  | 'correct'   // 纠正 / 修改已有记忆
  | 'delete'    // 忘掉 / 删除记忆
  | 'search'    // 搜索 / 查找记忆
  | 'query'     // 询问 AI 对自己的了解
  | 'export'    // 导出记忆
  | 'organize'  // 整理 / 归类记忆
  | 'chat'      // 闲聊 / 无法识别

// ── Parsed result ──
export interface ParsedIntent {
  intent: Intent
  confidence: number
  /** The main subject/target of the command */
  target: string
  /** For corrections: the new value to replace with */
  newValue: string
  /** Memory type hint extracted from the command */
  typeHint: string | null
  /** Original input */
  raw: string
}

// ── Pattern definition ──
interface IntentPattern {
  intent: Intent
  /** Regex patterns (matched against normalized input) */
  patterns: RegExp[]
  /** Base confidence boost from this pattern */
  confidence: number
}

// ── Negation markers ──
const NEGATION = /(?:不要|别|不用|不想|不是要|不需要|别给我|少给我)/

// ── Intent patterns ──
// Order matters: more specific intents are checked first.
// Each intent's patterns MUST contain a mandatory trigger — no fully-optional groups.
const INTENT_PATTERNS: IntentPattern[] = [
  // ── CORRECT (纠正/修改) ── checked before create so "其实我..." → correct, not create
  {
    intent: 'correct',
    confidence: 0.92,
    patterns: [
      // Explicit correction verbs
      /(?:纠正|修正|修改|更新|改正|更改|变更|更正)(?:一下|一下啊)?\s*(?:关于)?\s*(.+)/,
      // "其实/实际上..." — strong correction signal
      /^(?:其实|实际上|说错了|搞错了|弄错了)\s*(?:我)?\s*(.+)/,
      // "不是/不对/错了, 是..."
      /(?:不是|不对|错了)(?:的|啊)?\s*[,，]\s*(?:是)?\s*(.+)/,
      // "之前说的X不对/错了/有误"
      /(?:之前|上次|以前)(?:说的|讲的|提到的)\s*(?:关于)?\s*(.+?)\s*(?:不对|错了|有误|不准确|需要改)/,
      // "我其实不..." — negation of self-description = correction
      /^我(?:其实|实际上)\s*(?:不|没有)\s*(.+)/,
      // "我不喜欢X，其实..." — first express dislike, then correct
      /^我(?:不|不喜欢|不愿意|不想|讨厌)\s*(.+?)[,，]\s*(?:其实|实际上|应该说|应该是)\s*(.+)/,
      // Short standalone corrections: "这不对", "那个错了"
      /^(?:这|那|这个|那个)\s*(?:不对|错了|有误|说错了)\s*$/,
      /^(?:这|那|这个|那个)\s*(?:不对|错了)\s*[,，]?\s*(?:应该|应当|得|要)(?:是|改成|换成|改为)?\s*(.+)/,
      // "改一下/改掉 X"
      /(?:改一下|改掉|改改|更正下|改下)\s*(.+)/,
      // "X不对，应该是Y"
      /(.+?)\s*(?:不对|错了|有误|不准确)\s*[,，]?\s*(?:应该|应当|得|要)(?:是|改成|换成|改为)\s*(.+)/,
      // "X不是Y，是Z，纠正" — trailing correction keyword
      /(.+?)\s*(?:，|,)\s*(?:纠正|修正|更正|改一下)\s*$/,
      /(.+?)\s+(?:纠正|修正|更正)\s*$/,
    ],
  },
  // ── DELETE (忘掉/删除) ── checked before create
  {
    intent: 'delete',
    confidence: 0.92,
    patterns: [
      /^(?:忘掉|忘记|删除|移除|去掉|清除|抹掉|删了?)\s*(?:关于|和|所有|全部)?\s*(.+)/,
      /^(?:不要|别再|别|少)(?:记住|记着|提起|说|提)\s*(.+)/,
      /(?:把|将)\s*(.+?)\s*(?:删掉|删除|忘掉|去掉|移除|清掉|删了)/,
      /^(?:清除|清空|重置)(?:所有|全部)?\s*(?:关于)?\s*(.+)/,
      /(.+?)\s*(?:这条|这个)\s*(?:删了|删掉|不要了|去掉)/,
    ],
  },
  // ── SEARCH (搜索/查找) ──
  {
    intent: 'search',
    confidence: 0.90,
    patterns: [
      /^(?:搜索|查找|搜|查)\s*(?:一下|一搜)?\s*(.+)/,
      /^(?:帮我|给我|麻烦)?\s*(?:找一下|找找|查一下|查查)\s*(.+)/,
      /(?:有没有|有没|是否有)\s*(?:关于|和)?\s*(.+?)\s*(?:的)?\s*(?:记忆|记录|信息)/,
      /^找\s*(?:一下)?\s*(?:关于)?\s*(.+?)\s*(?:的)?\s*(?:记忆|记录)/,
      /(.+?)\s*(?:在哪儿|在哪里|在哪|还记得吗)/,
      /(?:关于|和)\s*(.+?)\s*(?:你记得|你知道|你有印象)(?:什么|啥|吗)/,
    ],
  },
  // ── QUERY (询问对自己的了解) ──
  {
    intent: 'query',
    confidence: 0.90,
    patterns: [
      /^你(?:了?解|知道|记得|觉得|感觉|认为)(?:我|关于我|我这个人)(?:什么|啥|哪些|多少|怎么样|如何|怎样)[吗不呢啊]?\s*(.*)/,
      /^你知道我(?:有?什么|有?啥|有?哪些|的|有)(?:.+?)?(?:偏好|习惯|特点|风格|喜好|兴趣|情况)[吗不呢啊]?\s*(.*)/,
      /^你记得我(?:是|有|的)(?:.+?)[吗不呢啊]?\s*(.*)/,
      /^我(?:有|是)(?:什么|啥|哪些)(?:偏好|习惯|特点|风格|喜好)\s*(.*)/,
      /^(?:关于我)[，,]?\s*(?:你)?(?:知道|了解|记得)(?:什么|啥|哪些|多少)/,
      /^(?:关于我)(?:的|关于)?\s*(.+?)\s*[,，]?\s*(?:你)?(?:知道|了解|记得)(?:什么|啥|多少|吗|不)?\s*(.*)/,
      /^(?:说说|讲讲|告诉我)\s*(?:你(?:对)?)?(?:我|关于我)(?:的)?(?:了解|印象|认识|看法)/,
      /^你怎么看(?:我|我这个人|待我)/,
      /^你眼里的?(?:我|我这个人)(?:是|是什么|什么样|怎么样)/,
      /^(?:你觉得|你认为)(?:我|我这个人)(?:怎么样|如何|怎样|是什么样)/,
    ],
  },
  // ── EXPORT (导出) ──
  {
    intent: 'export',
    confidence: 0.92,
    patterns: [
      /^(?:导出|备份|下载|保存)\s*(?:所有|全部|我的)?\s*(?:记忆|数据|记录|上下文)/,
      /(?:把|将)(?:所有|全部|我的)?\s*(?:记忆|数据|记录)\s*(?:导出|备份|下载|存下来)/,
      /^(?:生成|创建|写)(?:一个|一份)?\s*(?:记忆)?\s*(?:导出|备份|文件)/,
    ],
  },
  // ── ORGANIZE (整理/归类) ──
  {
    intent: 'organize',
    confidence: 0.88,
    patterns: [
      /^(?:整理|归类|分类|梳理)\s*(?:一下)?\s*(?:我(?:的|关于))?\s*(.*)/,
      /(?:把|将)\s*(.+?)\s*(?:放(?:到|在)|归(?:到|入)|整理(?:到|成|一下)|分类(?:为|到|整理|一下))\s*(.*)/,
      /^把这些?(?:记忆|数据|记录)?\s*(?:分类|整理|归类|梳理)(?:一下)?\s*(.*)/,
    ],
  },
  // ── CREATE (记住/添加) ── checked LAST — only if nothing more specific matches
  {
    intent: 'create',
    confidence: 0.85,
    patterns: [
      // Must have an explicit memory action verb
      /^(?:请|帮我|给我|麻烦你?)\s*(?:记住|记下来?|记一下|记录|备注|mark)\s*(?:一下|下来)?\s*(.+)/,
      /^(?:记住|记下|记录|备注)\s*(?:一下|下来)?\s*(.+)/,
      /^(?:添加|新增|创建|写|加)(?:一条|一个)?(?:新(?:的)?)?(?:记忆|备注|记录)\s*[:：]?\s*(.+)/,
      // Identity declaration: "我是/我叫..."
      /^我(?:是|叫|的职位是|的角色是|base\s*(?:在|是))\s*(.+)/,
      // Possessive: "我的X是Y"
      /^我的\s*(.+?)\s*(?:是|：|:)\s*(.+)/,
      // Future directive: "以后都记住..."
      /^(?:以后|今后|从现在开始|接下来)(?:都)?\s*(?:记住|注意|知道)\s*(.+)/,
      // "告诉/提醒你关于我..."
      /^(?:告诉|通知|提醒)(?:你|一下)\s*(?:我|关于我)\s*(.+)/,
    ],
  },
]

// ── Entity extraction helpers ──

/** Strip leading intent-trigger words to extract the real target */
function extractTarget(input: string, intent: Intent, match: RegExpMatchArray): string {
  // Use the last capturing group which usually contains the content
  let captured = match.slice(1).filter(Boolean).pop() || ''
  // Strip leading punctuation & filler words
  captured = captured
    .replace(/^[,，、。\s]+/, '')
    .replace(/^(?:关于|和|所有|全部|我的|我)\s+/, '')
    .trim()
  return captured
}

/** Try to detect memory type from the command */
function detectTypeHint(input: string): string | null {
  const hints: [RegExp, string][] = [
    [/(?:偏好|喜欢|习惯|想要|倾向于|愿意|风格|口味)/, 'preference'],
    [/(?:我是|我叫|职位|角色|身份|base|住在|在.*工作|毕业于|学历)/, 'identity'],
    [/(?:同事|朋友|老板|经理|总监|mentor|团队|关系)/, 'relationship'],
    [/(?:项目|正在做|开发|迁移|重构|优化|调研|在搞)/, 'project'],
    [/(?:认为|觉得|观点|看法|理解|深知|认识)/, 'knowledge'],
    [/(?:计划|目标|想学|要学|打算|准备|推动)/, 'goal'],
    [/(?:代码|编程|命名|测试|构建|工具|框架|库|语言|前端|后端)/, 'preference'],
  ]
  for (const [regex, type] of hints) {
    if (regex.test(input)) return type
  }
  return null
}

/** Extract correction's new value after markers like "应该是"、"改成" */
function extractNewValue(input: string): string {
  const markers = [
    /(?:(?:应该|要|得|想)(?:是|改成|改为|换成|换成是))\s*(.+)/,
    /(?:改成|改为|换成|变为|变更为|修正为)\s*(.+)/,
    /(?:是|：|:)\s*(.+)/,
  ]
  for (const m of markers) {
    const match = input.match(m)
    if (match) return match[1].trim()
  }
  return ''
}

// ── Keyword boost map: intent → keywords that strongly signal it ──
const KEYWORD_SIGNALS: [Intent, RegExp, number][] = [
  ['correct', /(?:纠正|修正|改正|更正|改一下|改掉|其实|实际上|说错了|搞错了|不对|错了)/, 0.08],
  ['delete',  /(?:忘掉|忘记|删除|移除|删掉|去掉|清除|清空|不要了|删了)/, 0.08],
  ['search',  /(?:搜索|查找|找一下|查一下|有没有|在哪|还记得吗)/, 0.06],
  ['query',   /(?:你.*?(?:了解|知道|记得).*?我|你怎么看|你眼里|关于我.*?(?:知道|了解))/, 0.06],
  ['export',  /(?:导出|备份|下载|保存.*?(?:记忆|数据))/, 0.08],
  ['organize',/(?:整理|归类|分类|梳理)/, 0.06],
  ['create',  /(?:记住|记下|记录|备注|添加记忆|我是|我的.*?是)/, 0.04],
]

// ── Main classifier ──

export function parseIntent(input: string): ParsedIntent {
  const raw = input.trim()
  if (!raw) {
    return { intent: 'chat', confidence: 0, target: '', newValue: '', typeHint: null, raw }
  }

  // Normalize: collapse whitespace, strip most punctuation (keep some for structure)
  const normalized = raw
    .replace(/\s+/g, ' ')
    .replace(/[。！？、；""'']/g, '')
    .trim()

  // Detect negation
  const negated = NEGATION.test(normalized)

  // Phase 1: Pattern matching
  const scores: { intent: Intent; confidence: number; match: RegExpMatchArray | null }[] = []

  for (const { intent, patterns, confidence } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      const match = normalized.match(pattern)
      if (match) {
        let score = confidence
        // Penalize if negated (unless intent is already delete)
        if (negated && intent !== 'delete') score -= 0.3
        // Boost for longer specific matches
        const matchedLen = match[0].length
        const coverage = matchedLen / normalized.length
        if (coverage > 0.5) score += 0.04
        if (coverage > 0.8) score += 0.04
        scores.push({ intent, confidence: Math.min(1, score), match })
        break
      }
    }
  }

  // Phase 2: Keyword signal boosting
  for (const [intent, regex, boost] of KEYWORD_SIGNALS) {
    if (regex.test(normalized)) {
      const existing = scores.find((s) => s.intent === intent)
      if (existing) {
        existing.confidence = Math.min(1, existing.confidence + boost)
      }
    }
  }

  // Phase 3: Penalize create when it conflicts with other strong signals
  const hasCreate = scores.find((s) => s.intent === 'create')
  const hasOther = scores.find((s) => s.intent !== 'create' && s.confidence >= 0.85)
  if (hasCreate && hasOther) {
    // Demote create — the other intent is more specific
    hasCreate.confidence -= 0.10
  }

  // Sort by confidence descending
  scores.sort((a, b) => b.confidence - a.confidence)

  if (scores.length === 0 || scores[0].confidence < 0.5) {
    const fallback = fuzzyFallback(normalized)
    if (fallback) {
      return {
        intent: fallback.intent,
        confidence: 0.45,
        target: normalized,
        newValue: '',
        typeHint: detectTypeHint(normalized),
        raw,
      }
    }
    return { intent: 'chat', confidence: 0, target: normalized, newValue: '', typeHint: null, raw }
  }

  const best = scores[0]

  // Handle negation: "不要记住 X" → delete
  if (negated && best.intent === 'create') {
    return {
      intent: 'delete',
      confidence: 0.72,
      target: extractTarget(normalized, 'delete', best.match!),
      newValue: '',
      typeHint: null,
      raw,
    }
  }

  const target = extractTarget(normalized, best.intent, best.match!)
  const newValue = best.intent === 'correct' ? extractNewValue(normalized) : ''
  const typeHint = detectTypeHint(normalized)

  return {
    intent: best.intent,
    confidence: Math.round(best.confidence * 100) / 100,
    target: target || normalized,
    newValue,
    typeHint,
    raw,
  }
}

/** Loose fallback when no pattern matches */
function fuzzyFallback(input: string): { intent: Intent } | null {
  const lower = input.toLowerCase()
  if (/(?:记住|记下|别忘了|提醒我)/.test(lower)) return { intent: 'create' }
  if (/(?:纠正|不对|错了|其实|改一下|重新)/.test(lower)) return { intent: 'correct' }
  if (/(?:忘掉|删除|不要了|删了|清除)/.test(lower)) return { intent: 'delete' }
  if (/(?:搜索|查找|找一下|在哪|有没有)/.test(lower)) return { intent: 'search' }
  if (/(?:导出|备份|下载|保存)/.test(lower)) return { intent: 'export' }
  if (/(?:你.*我|了解.*我|知道.*我|关于.*我)/.test(lower)) return { intent: 'query' }
  if (/(?:整理|归类|分类|梳理)/.test(lower)) return { intent: 'organize' }
  return null
}

/** Human-readable description of what was parsed */
export function describeParse(result: ParsedIntent): string {
  const { intent, confidence, target } = result
  const confStr = confidence >= 0.8 ? '高' : confidence >= 0.5 ? '中' : confidence > 0 ? '低' : '无'
  switch (intent) {
    case 'create':   return `[${confStr}置信度] 意图：创建记忆 → "${target}"`
    case 'correct':  return `[${confStr}置信度] 意图：纠正记忆 → "${target}"`
    case 'delete':   return `[${confStr}置信度] 意图：删除记忆 → "${target}"`
    case 'search':   return `[${confStr}置信度] 意图：搜索记忆 → "${target}"`
    case 'query':    return `[${confStr}置信度] 意图：询问认知 → "${target || '整体了解'}"`
    case 'export':   return `[${confStr}置信度] 意图：导出记忆`
    case 'organize': return `[${confStr}置信度] 意图：整理记忆 → "${target || '全部'}"`
    case 'chat':     return `[${confStr}置信度] 意图：闲聊/未识别`
  }
}
