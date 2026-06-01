#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
STATE_DIR="${REPO_ROOT}/.automation"
mkdir -p "${STATE_DIR}"

START_MARKER="# carpool-auto-expand:start"
END_MARKER="# carpool-auto-expand:end"

quote_for_cron() {
  printf "'%s'" "$(printf "%s" "$1" | sed "s/'/'\\\\''/g")"
}

REPO_Q="$(quote_for_cron "${REPO_ROOT}")"
SCRIPT_Q="$(quote_for_cron "${REPO_ROOT}/scripts/auto-expand.sh")"
CRON_LINE="*/20 * * * * cd ${REPO_Q} && /bin/bash ${SCRIPT_Q} >/dev/null 2>&1"

CURRENT="$(mktemp "${TMPDIR:-/tmp}/carpool-cron-current.XXXXXX")"
NEXT="$(mktemp "${TMPDIR:-/tmp}/carpool-cron-next.XXXXXX")"
trap 'rm -f "${CURRENT}" "${NEXT}"' EXIT

crontab -l > "${CURRENT}" 2>/dev/null || true

awk -v start="${START_MARKER}" -v end="${END_MARKER}" '
  $0 == start { skip = 1; next }
  $0 == end { skip = 0; next }
  !skip { print }
' "${CURRENT}" > "${NEXT}"

{
  printf "%s\n" "${START_MARKER}"
  printf "%s\n" "${CRON_LINE}"
  printf "%s\n" "${END_MARKER}"
} >> "${NEXT}"

if [[ "${1:-}" == "--dry-run" ]]; then
  cat "${NEXT}"
  exit 0
fi

BACKUP="${STATE_DIR}/crontab.backup.$(date -u +"%Y%m%dT%H%M%SZ")"
cp "${CURRENT}" "${BACKUP}"
crontab "${NEXT}"

echo "Installed Carpool auto-expand cron schedule: every 20 minutes."
echo "Previous crontab backup: ${BACKUP}"
