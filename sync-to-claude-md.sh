#!/bin/bash
# Sync AI Memory Context to project CLAUDE.md files
# Usage: ./sync-to-claude-md.sh [project-path] [--force]
set -e

MEMORY_API="${MEMORY_API_URL:-http://localhost:3001}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FORCE="${2:-${1:-}}"
[[ "$FORCE" != "--force" ]] && FORCE=""

# Dedup: skip if synced within last 10 min (unless --force)
STAMP_FILE="$HOME/.cache/ai-memory-sync-stamp"
mkdir -p "$(dirname "$STAMP_FILE")"
if [[ -z "$FORCE" ]] && [[ -f "$STAMP_FILE" ]]; then
  LAST=$(cat "$STAMP_FILE" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  if [[ $((NOW - LAST)) -lt 600 ]]; then
    exit 0  # Silent skip, synced recently
  fi
fi

# Ensure API is running
if ! curl -s --max-time 3 -o /dev/null -w "%{http_code}" "$MEMORY_API/api/export/compact" 2>/dev/null | grep -q 200; then
  if [[ -n "$FORCE" ]]; then
    cd "$SCRIPT_DIR" && npx tsx server/index.ts &
    sleep 2
  else
    exit 0  # Backend not running, skip silently
  fi
fi

# Fetch memory context
CONTEXT=$(curl -s --max-time 5 "$MEMORY_API/api/export/compact" 2>/dev/null)
if [[ -z "$CONTEXT" ]] || ! echo "$CONTEXT" | grep -q "\["; then
  exit 0  # Empty context, skip
fi

# Content hash for dedup
NEW_HASH=$(echo "$CONTEXT" | shasum -a 256 | cut -d' ' -f1)

# Default project paths
PROJECTS=(
  "${1:-/Users/meiyang/Desktop/first-cc}"
)

WRAPPED=$(cat <<INNER
$CONTEXT
INNER
)

SYNCED=0
for PROJECT in "${PROJECTS[@]}"; do
  [[ "$PROJECT" == "--force" ]] && continue
  CLAUDE_MD="$PROJECT/CLAUDE.md"
  [[ ! -f "$CLAUDE_MD" ]] && continue

  # Check if content changed
  CURRENT=$(sed -n '/<!-- MEMORY-CONTEXT-START -->/,/<!-- MEMORY-CONTEXT-END -->/p' "$CLAUDE_MD" 2>/dev/null | shasum -a 256 | cut -d' ' -f1)
  if [[ "$CURRENT" == "$NEW_HASH"* ]] && [[ -z "$FORCE" ]]; then
    continue  # No change
  fi

  TS=$(date '+%Y-%m-%d %H:%M:%S')
  REPLACEMENT=$(cat <<EOF
<!-- MEMORY-CONTEXT-START -->
<!-- Auto-generated from AI Memory System. Sync: $TS -->
## 用户偏好与上下文

$WRAPPED
<!-- MEMORY-CONTEXT-END -->
EOF
)

  if grep -q "MEMORY-CONTEXT-START" "$CLAUDE_MD"; then
    python3 -c "
import re
c = open('$CLAUDE_MD').read()
r = '''$REPLACEMENT'''
open('$CLAUDE_MD', 'w').write(re.sub(
    r'<!-- MEMORY-CONTEXT-START -->.*<!-- MEMORY-CONTEXT-END -->',
    r.replace('\\\\', '\\\\\\\\'),
    c, flags=re.DOTALL
))
"
  else
    echo "" >> "$CLAUDE_MD"
    echo "$REPLACEMENT" >> "$CLAUDE_MD"
  fi
  echo "✅ Synced $CLAUDE_MD"
  SYNCED=$((SYNCED + 1))
done

if [[ $SYNCED -gt 0 ]]; then
  date +%s > "$STAMP_FILE"
fi
