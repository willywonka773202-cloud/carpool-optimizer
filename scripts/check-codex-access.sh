#!/usr/bin/env bash
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
STATE_DIR="${REPO_ROOT}/.automation"
TCC_DB="${HOME}/Library/Application Support/com.apple.TCC/TCC.db"

mkdir -p "${STATE_DIR}"

pass() {
  printf "PASS  %s\n" "$1"
}

warn() {
  printf "WARN  %s\n" "$1"
}

fail() {
  printf "FAIL  %s\n" "$1"
}

run_with_timeout() {
  local seconds="$1"
  shift
  "$@" >/tmp/carpool-access-check.out 2>/tmp/carpool-access-check.err &
  local pid=$!
  local elapsed=0
  while kill -0 "${pid}" 2>/dev/null; do
    if [[ "${elapsed}" -ge "${seconds}" ]]; then
      kill "${pid}" 2>/dev/null || true
      wait "${pid}" 2>/dev/null || true
      return 124
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  wait "${pid}"
}

printf "Codex access check for %s\n\n" "${REPO_ROOT}"

if [[ -w "${REPO_ROOT}" ]]; then
  probe="${STATE_DIR}/access-check.$$"
  if : > "${probe}" && rm -f "${probe}"; then
    pass "Workspace write access"
  else
    fail "Workspace write probe failed"
  fi
else
  fail "Workspace is not writable"
fi

if crontab -l 2>/dev/null | grep -q "# carpool-auto-expand:start"; then
  pass "20-minute auto-expand cron entry is installed"
else
  warn "20-minute auto-expand cron entry is not installed"
fi

if pgrep -f "Codex.app/Contents" >/dev/null; then
  pass "Codex app process is running"
else
  warn "Codex app process was not found"
fi

if pgrep -f "SkyComputerUseService" >/dev/null; then
  pass "Computer Use service is running"
else
  warn "Computer Use service was not found"
fi

if run_with_timeout 8 osascript -e 'tell application "System Events" to count application processes'; then
  pass "Automation access to System Events"
else
  warn "Automation access to System Events failed or timed out"
fi

if sqlite3 "${TCC_DB}" "SELECT count(*) FROM access;" >/dev/null 2>&1; then
  pass "Full Disk Access reaches protected TCC database"
else
  warn "Full Disk Access does not reach protected TCC database from Codex shell commands"
fi

rm -f /tmp/carpool-access-check.out /tmp/carpool-access-check.err
