#!/bin/bash
# Pre-push validation hook for Claude Code
# Blocks git push unless build passes and team review exists.
# Called by Claude Code PreToolUse hook on Bash(git push*)

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR"

# ---- Bypass: config-only commits (hooks, settings, docs) skip team review ----
# Check all unpushed commits, plus any uncommitted changes
CHANGED_FILES=$(git log origin/main..HEAD --name-only --pretty=format: 2>/dev/null | sort -u || true)
CHANGED_FILES="$CHANGED_FILES$(git diff HEAD --name-only 2>/dev/null || true)"
NON_CONFIG=$(echo "$CHANGED_FILES" | grep -v '^$' | grep -vE "^\.claude/|^docs/|^README|^CLAUDE|^\.gitignore" || true)
if [ -z "$NON_CONFIG" ]; then
  # Only config/docs changed, skip all gates
  exit 0
fi

# ---- Check 1: TypeScript ----
if ! npx tsc --noEmit > /dev/null 2>&1; then
  echo '{"decision":"block","reason":"TypeScript type check failed. Run npx tsc --noEmit to see errors."}'
  exit 0
fi

# ---- Check 2: Build ----
if ! npm run build > /dev/null 2>&1; then
  echo '{"decision":"block","reason":"Build failed. Run npm run build to see errors."}'
  exit 0
fi

# ---- Check 3: Team review ----
# Look for a team-review file modified in the last 4 hours (same session)
REVIEW_FILE=$(find "$PROJECT_DIR" -path "*/team-review-results*" -mmin -240 2>/dev/null | head -1)
if [ -z "$REVIEW_FILE" ]; then
  echo '{"decision":"block","reason":"Team review not completed this session. Run /initiate-team-review before pushing."}'
  exit 0
fi

# ---- Check 4: Auth smoke test (if auth files changed) ----
AUTH_CHANGED=$(git diff --cached --name-only 2>/dev/null | grep -E "middleware|login|auth|supabase/(server|middleware)" || true)
if [ -n "$AUTH_CHANGED" ]; then
  # Check if dev server was recently running (port 3000 or 3001)
  if ! lsof -i :3000 -i :3001 > /dev/null 2>&1; then
    echo '{"decision":"block","reason":"Auth files changed but no local dev server detected. Test login locally before pushing. Start dev server, sign in, verify dashboard loads."}'
    exit 0
  fi
fi

# All checks passed
exit 0
